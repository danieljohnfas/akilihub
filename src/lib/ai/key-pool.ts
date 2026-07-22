import { LanguageModel } from 'ai';

export interface KeyEntry {
  id: string;
  name: string;
  model: LanguageModel;
  supportsStructured: boolean;
  coolUntil: number;
  errorCount: number;
  lastUsed: number;
  totalCalls: number;
  totalErrors: number;
}

/**
 * Pure in-memory key pool.
 * 
 * No async DB calls during generation — state lives entirely in-memory.
 * This is intentional: Supabase connection failures must NEVER block AI generation.
 * Telemetry is written fire-and-forget after success/failure, so the scraper keeps
 * running even if the DB is temporarily unreachable.
 */
class KeyPool {
  private keys: Map<string, KeyEntry> = new Map();

  register(entry: Omit<KeyEntry, 'coolUntil' | 'errorCount' | 'lastUsed' | 'totalCalls' | 'totalErrors'>) {
    this.keys.set(entry.id, {
      ...entry,
      coolUntil: 0,
      errorCount: 0,
      lastUsed: 0,
      totalCalls: 0,
      totalErrors: 0,
    });
  }

  /** Synchronous — no DB roundtrip. Returns the least-recently-used available key. */
  getNextKey(structuredOnly = false): KeyEntry | null {
    const now = Date.now();
    const available = Array.from(this.keys.values()).filter(
      k => k.coolUntil <= now && (!structuredOnly || k.supportsStructured)
    );
    if (available.length === 0) return null;
    
    // Sort by lastUsed to get the least recently used key
    const selectedKey = available.sort((a, b) => a.lastUsed - b.lastUsed)[0];
    
    // Update lastUsed immediately so concurrent requests round-robin across available keys
    // instead of dog-piling the exact same key.
    selectedKey.lastUsed = Date.now();
    
    return selectedKey;
  }

  /** Synchronous success mark — updates in-memory state only. */
  markSuccess(id: string) {
    const key = this.keys.get(id);
    if (!key) return;
    key.errorCount = 0;
    key.lastUsed = Date.now();
    key.totalCalls++;
    // Fire-and-forget telemetry write (doesn't block)
    this._persistAsync(id).catch(() => {});
  }

  /** Synchronous failure mark — updates in-memory state only. */
  markFailed(id: string) {
    const key = this.keys.get(id);
    if (!key) return;
    key.errorCount++;
    key.totalErrors++;
    key.totalCalls++;
    const backoffSec = Math.min(30 * Math.pow(2, key.errorCount - 1), 300);
    key.coolUntil = Date.now() + backoffSec * 1000;
    console.warn(`[KeyPool] ${key.name} cooling for ${backoffSec}s (error #${key.errorCount})`);
    // Fire-and-forget telemetry write (doesn't block)
    this._persistAsync(id).catch(() => {});
  }

  private _dbDepsPromise: Promise<any> | null = null;

  /** Attempts to write telemetry to DB, silently ignoring any errors. */
  private async _persistAsync(id: string): Promise<void> {
    try {
      // Dynamic import so the DB client isn't loaded at all in edge/script contexts
      // that don't need it. Also prevents circular dependency issues.
      // Cache the promise to prevent Node.js module loader deadlocks during concurrent imports.
      if (!this._dbDepsPromise) {
        this._dbDepsPromise = Promise.all([
          import('../db/client'),
          import('../db/schema/ai')
        ]);
      }
      
      const [{ db }, { aiTelemetry }] = await this._dbDepsPromise;
      const key = this.keys.get(id);
      if (!key) return;
      await db.insert(aiTelemetry).values({
        id: key.id,
        name: key.name,
        coolUntil: key.coolUntil,
        errorCount: key.errorCount,
        lastUsed: key.lastUsed,
        totalCalls: key.totalCalls,
        totalErrors: key.totalErrors,
        supportsStructured: key.supportsStructured,
      }).onConflictDoUpdate({
        target: aiTelemetry.id,
        set: {
          coolUntil: key.coolUntil,
          errorCount: key.errorCount,
          lastUsed: key.lastUsed,
          totalCalls: key.totalCalls,
          totalErrors: key.totalErrors,
          updatedAt: new Date(),
        }
      });
    } catch {
      // Silently ignore — telemetry is non-critical
    }
  }

  get size() { return this.keys.size; }

  getAvailableCount(): number {
    const now = Date.now();
    return Array.from(this.keys.values()).filter(k => k.coolUntil <= now).length;
  }

  getStatus(): Array<Omit<KeyEntry, 'model'> & { coolingFor: number; available: boolean }> {
    const now = Date.now();
    return Array.from(this.keys.values()).map(({ model: _model, ...rest }) => ({
      ...rest,
      available: rest.coolUntil <= now,
      coolingFor: Math.max(0, Math.ceil((rest.coolUntil - now) / 1000)),
    }));
  }
}

export const keyPool = new KeyPool();
