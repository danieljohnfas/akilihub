import { LanguageModel } from 'ai';
import * as fs from 'fs';
import * as path from 'path';

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

const STATE_FILE = path.join(process.cwd(), '.ai-pool-state.json');

class KeyPool {
  private keys: Map<string, KeyEntry> = new Map();

  constructor() {
    this.loadState();
  }

  private loadState() {
    try {
      if (fs.existsSync(STATE_FILE)) {
        const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
        for (const [id, state] of Object.entries(data)) {
          if (this.keys.has(id)) {
            const key = this.keys.get(id)!;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            Object.assign(key, state as any);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load KeyPool state', e);
    }
  }

  private saveState() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const state: Record<string, any> = {};
      for (const [id, key] of this.keys.entries()) {
        state[id] = {
          coolUntil: key.coolUntil,
          errorCount: key.errorCount,
          lastUsed: key.lastUsed,
          totalCalls: key.totalCalls,
          totalErrors: key.totalErrors,
        };
      }
      fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    } catch (e) {
      // Ignore write errors in high-throughput
    }
  }

  register(entry: Omit<KeyEntry, 'coolUntil' | 'errorCount' | 'lastUsed' | 'totalCalls' | 'totalErrors'>) {
    this.keys.set(entry.id, {
      ...entry,
      coolUntil: 0,
      errorCount: 0,
      lastUsed: 0,
      totalCalls: 0,
      totalErrors: 0,
    });
    this.loadState(); // Sync up if another process already wrote state
  }

  getNextKey(structuredOnly = false): KeyEntry | null {
    this.loadState(); // Always get freshest state before picking
    const now = Date.now();
    const available = Array.from(this.keys.values()).filter(
      k => k.coolUntil <= now && (!structuredOnly || k.supportsStructured)
    );
    if (available.length === 0) return null;
    return available.sort((a, b) => a.lastUsed - b.lastUsed)[0];
  }

  markSuccess(id: string) {
    const key = this.keys.get(id);
    if (!key) return;
    key.errorCount = 0;
    key.lastUsed = Date.now();
    key.totalCalls++;
    this.saveState();
  }

  markFailed(id: string) {
    const key = this.keys.get(id);
    if (!key) return;
    key.errorCount++;
    key.totalErrors++;
    key.totalCalls++;
    const backoffSec = Math.min(30 * Math.pow(2, key.errorCount - 1), 300);
    key.coolUntil = Date.now() + backoffSec * 1000;
    console.warn(`[KeyPool] ${key.name} cooling for ${backoffSec}s (error #${key.errorCount})`);
    this.saveState();
  }

  get size() { return this.keys.size; }

  get availableCount() {
    this.loadState();
    const now = Date.now();
    return Array.from(this.keys.values()).filter(k => k.coolUntil <= now).length;
  }

  getStatus(): Array<Omit<KeyEntry, 'model'> & { coolingFor: number; available: boolean }> {
    this.loadState();
    const now = Date.now();
    return Array.from(this.keys.values()).map(({ model: _model, ...rest }) => ({
      ...rest,
      available: rest.coolUntil <= now,
      coolingFor: Math.max(0, Math.ceil((rest.coolUntil - now) / 1000)),
    }));
  }
}

export const keyPool = new KeyPool();
