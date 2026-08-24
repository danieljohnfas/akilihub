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
  priority: number;
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

  register(entry: Omit<KeyEntry, 'coolUntil' | 'errorCount' | 'lastUsed' | 'totalCalls' | 'totalErrors' | 'priority'> & { priority?: number }) {
    this.keys.set(entry.id, {
      ...entry,
      priority: entry.priority ?? 10,
      coolUntil: 0,
      errorCount: 0,
      lastUsed: 0,
      totalCalls: 0,
      totalErrors: 0,
    });
  }

  /** Synchronous — no DB roundtrip. Returns the highest-priority, least-recently-used available key. */
  getNextKey(structuredOnly = false): KeyEntry | null {
    const now = Date.now();
    const available = Array.from(this.keys.values()).filter(
      k => k.coolUntil <= now && (!structuredOnly || k.supportsStructured)
    );
    if (available.length === 0) return null;
    
    // Sort by priority (ascending: 1 > 2 > 3), then lastUsed (least recently used)
    const selectedKey = available.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.lastUsed - b.lastUsed;
    })[0];
    
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
    const backoffSec = Math.min(10 * Math.pow(2, key.errorCount - 1), 60);
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

  /**
   * Reads persisted cooldown state from the DB and applies it back into the
   * in-memory pool. Call this once at startup (after all keys are registered)
   * so that a Vercel cold start doesn't lose the backoff state built up in the
   * previous warm instance and immediately hammer rate-limited providers again.
   */
  async restoreFromDb(): Promise<void> {
    try {
      if (!this._dbDepsPromise) {
        this._dbDepsPromise = Promise.all([
          import('../db/client'),
          import('../db/schema/ai'),
        ]);
      }

      const [{ db }, { aiTelemetry }] = await this._dbDepsPromise;
      const rows = await db.select().from(aiTelemetry);
      const now = Date.now();
      let restored = 0;

      for (const row of rows) {
        const key = this.keys.get(row.id);
        if (!key) continue;

        // Restore running stats so the telemetry is cumulative, not per-instance
        key.totalCalls = row.totalCalls ?? key.totalCalls;
        key.totalErrors = row.totalErrors ?? key.totalErrors;

        // Only restore the cooldown if it's still active — stale cooldowns are ignored
        if (row.coolUntil && row.coolUntil > now) {
          key.coolUntil = row.coolUntil;
          key.errorCount = row.errorCount ?? key.errorCount;
          restored++;
        }
      }

      if (restored > 0) {
        console.log(`[KeyPool] Restored ${restored} active cooldown(s) from DB (cold-start recovery).`);
      }
    } catch {
      // Non-critical — silently ignore. The pool remains functional without restored state.
    }
  }
}

export const keyPool = new KeyPool();

