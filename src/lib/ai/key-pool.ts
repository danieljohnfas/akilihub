import { LanguageModel } from 'ai';
import { db } from '@/lib/db/client';
import { aiTelemetry } from '@/lib/db/schema/ai';

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

class KeyPool {
  private keys: Map<string, KeyEntry> = new Map();

  async loadState() {
    try {
      const records = await db.select().from(aiTelemetry);
      for (const record of records) {
        if (this.keys.has(record.id)) {
          const key = this.keys.get(record.id)!;
          key.coolUntil = record.coolUntil;
          key.errorCount = record.errorCount;
          key.lastUsed = record.lastUsed;
          key.totalCalls = record.totalCalls;
          key.totalErrors = record.totalErrors;
        }
      }
    } catch (e) {
      console.warn('Failed to load KeyPool state from Supabase', e);
    }
  }

  async saveState(id: string) {
    try {
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
    } catch (e) {
      console.warn('Failed to save KeyPool state to Supabase', e);
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
  }

  async getNextKey(structuredOnly = false): Promise<KeyEntry | null> {
    await this.loadState();
    const now = Date.now();
    const available = Array.from(this.keys.values()).filter(
      k => k.coolUntil <= now && (!structuredOnly || k.supportsStructured)
    );
    if (available.length === 0) return null;
    return available.sort((a, b) => a.lastUsed - b.lastUsed)[0];
  }

  async markSuccess(id: string) {
    const key = this.keys.get(id);
    if (!key) return;
    key.errorCount = 0;
    key.lastUsed = Date.now();
    key.totalCalls++;
    await this.saveState(id);
  }

  async markFailed(id: string) {
    const key = this.keys.get(id);
    if (!key) return;
    key.errorCount++;
    key.totalErrors++;
    key.totalCalls++;
    const backoffSec = Math.min(30 * Math.pow(2, key.errorCount - 1), 300);
    key.coolUntil = Date.now() + backoffSec * 1000;
    console.warn(`[KeyPool] ${key.name} cooling for ${backoffSec}s (error #${key.errorCount})`);
    await this.saveState(id);
  }

  get size() { return this.keys.size; }

  async getAvailableCount() {
    await this.loadState();
    const now = Date.now();
    return Array.from(this.keys.values()).filter(k => k.coolUntil <= now).length;
  }

  async getStatus(): Promise<Array<Omit<KeyEntry, 'model'> & { coolingFor: number; available: boolean }>> {
    await this.loadState();
    const now = Date.now();
    return Array.from(this.keys.values()).map(({ model: _model, ...rest }) => ({
      ...rest,
      available: rest.coolUntil <= now,
      coolingFor: Math.max(0, Math.ceil((rest.coolUntil - now) / 1000)),
    }));
  }
}

export const keyPool = new KeyPool();
