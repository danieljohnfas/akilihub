import { LanguageModel } from 'ai';

/**
 * Represents a single API key + model combination in the pool.
 */
export interface KeyEntry {
  id: string;           // unique: "groq-key1-llama70b"
  name: string;         // human-readable for logs
  model: LanguageModel;
  supportsStructured: boolean; // supports generateObject (JSON mode / tool use)
  coolUntil: number;    // epoch ms — skip this key until then
  errorCount: number;   // consecutive errors (resets on success)
  lastUsed: number;     // epoch ms — used for LRU round-robin
  totalCalls: number;
  totalErrors: number;
}

/**
 * KeyPool — Singleton that manages all AI provider keys with:
 * - LRU round-robin: always picks the least-recently-used available key
 * - Per-key exponential backoff: 30s → 60s → 120s → 300s on failures
 * - Per-key success reset: errorCount resets after a successful call
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

  /**
   * Returns the least-recently-used key that is not in cooldown.
   * Returns null if ALL keys are currently cooling.
   */
  getNextKey(structuredOnly = false): KeyEntry | null {
    const now = Date.now();
    const available = Array.from(this.keys.values()).filter(
      k => k.coolUntil <= now && (!structuredOnly || k.supportsStructured)
    );
    if (available.length === 0) return null;
    // LRU: pick key with the oldest lastUsed timestamp
    return available.sort((a, b) => a.lastUsed - b.lastUsed)[0];
  }

  markSuccess(id: string) {
    const key = this.keys.get(id);
    if (!key) return;
    key.errorCount = 0;
    key.lastUsed = Date.now();
    key.totalCalls++;
  }

  /**
   * Marks a key as failed and applies exponential backoff cooldown.
   * Cooldown: 30s × 2^(consecutive_errors - 1), capped at 5 minutes.
   */
  markFailed(id: string) {
    const key = this.keys.get(id);
    if (!key) return;
    key.errorCount++;
    key.totalErrors++;
    key.totalCalls++;
    const backoffSec = Math.min(30 * Math.pow(2, key.errorCount - 1), 300);
    key.coolUntil = Date.now() + backoffSec * 1000;
    console.warn(`[KeyPool] ${key.name} cooling for ${backoffSec}s (error #${key.errorCount})`);
  }

  /** How many keys are registered in total */
  get size() { return this.keys.size; }

  /** How many keys are currently available (not cooling) */
  get availableCount() {
    const now = Date.now();
    return Array.from(this.keys.values()).filter(k => k.coolUntil <= now).length;
  }

  /** Full status snapshot for the admin dashboard */
  getStatus(): Array<Omit<KeyEntry, 'model'> & { coolingFor: number; available: boolean }> {
    const now = Date.now();
    return Array.from(this.keys.values()).map(({ model: _model, ...rest }) => ({
      ...rest,
      available: rest.coolUntil <= now,
      coolingFor: Math.max(0, Math.ceil((rest.coolUntil - now) / 1000)),
    }));
  }
}

// Module-level singleton — persists across requests in the same Node.js process
export const keyPool = new KeyPool();
