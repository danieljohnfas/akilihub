import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { stepCountIs } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';
import { AiUnavailableError, generateObjectWithFallback, generateTextWithFallback, isProviderFault, keyPool } from '../router';

const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
};
const stop = { unified: 'stop' as const, raw: undefined };

function textModel(text: string) {
  return new MockLanguageModelV4({
    doGenerate: async () => ({ content: [{ type: 'text', text }], finishReason: stop, usage, warnings: [] }),
  });
}

function failingModel(statusCode?: number) {
  return new MockLanguageModelV4({
    doGenerate: async () => {
      throw Object.assign(new Error(`boom ${statusCode ?? 'network'}`), statusCode ? { statusCode } : {});
    },
  });
}

function register(id: string, model: unknown, priority = 1) {
  keyPool.register({ id, name: id, model: model as never, supportsStructured: true, priority });
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  // Park every key registered by earlier tests so each test only sees the keys it registers itself.
  for (const k of keyPool.getAllKeys()) k.coolUntil = Date.now() + 3_600_000;
});

describe('isProviderFault', () => {
  it('only treats provider-side problems as cooldown-worthy', () => {
    expect(isProviderFault({ statusCode: 429 })).toBe(true);
    expect(isProviderFault({ statusCode: 401 })).toBe(true);
    expect(isProviderFault({ statusCode: 503 })).toBe(true);
    expect(isProviderFault(new Error('socket hang up'))).toBe(true);
    expect(isProviderFault({ statusCode: 400 })).toBe(false);
    expect(isProviderFault({ statusCode: 422 })).toBe(false);
    expect(isProviderFault(Object.assign(new Error('x'), { name: 'TypeValidationError' }))).toBe(false);
  });
});

describe('generateTextWithFallback', () => {
  it('falls through a rate-limited key to the next one and cools the bad key down', async () => {
    register('t-bad-429', failingModel(429), 1);
    register('t-good', textModel('hello'), 2);
    const res = await generateTextWithFallback({ prompt: 'hi' }, { interactive: true });
    expect(res.text).toBe('hello');
    const bad = keyPool.getAllKeys().find((k) => k.id === 't-bad-429')!;
    expect(bad.coolUntil).toBeGreaterThan(Date.now());
  });

  it('does NOT cool down a key for a request-caused 400', async () => {
    register('t-bad-400', failingModel(400), 1);
    register('t-good2', textModel('ok'), 2);
    await generateTextWithFallback({ prompt: 'hi' }, { interactive: true });
    expect(keyPool.getAllKeys().find((k) => k.id === 't-bad-400')!.coolUntil).toBe(0);
  });

  it('bounds attempts for interactive calls and throws AiUnavailableError', async () => {
    for (const k of keyPool.getAllKeys()) k.coolUntil = Date.now() + 3_600_000; // park everything else
    register('t-only-fail', failingModel(400), 0);
    await expect(generateTextWithFallback({ prompt: 'hi' }, { interactive: true, maxAttempts: 2 })).rejects.toBeInstanceOf(AiUnavailableError);
  });

  it('fails fast (no sleeping) when every key is cooling down and the call is interactive', async () => {
    for (const k of keyPool.getAllKeys()) k.coolUntil = Date.now() + 3_600_000;
    const started = Date.now();
    await expect(generateTextWithFallback({ prompt: 'hi' }, { interactive: true })).rejects.toBeInstanceOf(AiUnavailableError);
    expect(Date.now() - started).toBeLessThan(500);
  });

  it('supports v7 tools (inputSchema) with stopWhen — the shape the chat route uses', async () => {
    for (const k of keyPool.getAllKeys()) k.coolUntil = Date.now() + 3_600_000;
    let call = 0;
    const toolModel = new MockLanguageModelV4({
      doGenerate: async () => {
        call++;
        if (call === 1) {
          return {
            content: [{ type: 'tool-call', toolCallId: 'c1', toolName: 'searchJobs', input: JSON.stringify({ keyword: 'nairobi' }) }],
            finishReason: { unified: 'tool-calls' as const, raw: undefined },
            usage,
            warnings: [],
          };
        }
        return { content: [{ type: 'text', text: 'Found 1 job.' }], finishReason: stop, usage, warnings: [] };
      },
    });
    register('t-tools', toolModel, 0);

    const executed: string[] = [];
    const res = await generateTextWithFallback(
      {
        prompt: 'find jobs in nairobi',
        tools: {
          searchJobs: {
            description: 'Search jobs',
            inputSchema: z.object({ keyword: z.string() }),
            execute: async ({ keyword }: { keyword: string }) => {
              executed.push(keyword);
              return [{ title: 'Accountant' }];
            },
          },
        },
        stopWhen: stepCountIs(3),
      },
      { interactive: true }
    );

    expect(executed).toEqual(['nairobi']);
    expect(res.text).toBe('Found 1 job.');
  });
});

describe('generateObjectWithFallback', () => {
  it('returns schema-validated objects', async () => {
    for (const k of keyPool.getAllKeys()) k.coolUntil = Date.now() + 3_600_000;
    register(
      't-object',
      new MockLanguageModelV4({
        doGenerate: async () => ({ content: [{ type: 'text', text: JSON.stringify({ n: 7 }) }], finishReason: stop, usage, warnings: [] }),
      }),
      0
    );
    const out = await generateObjectWithFallback({ schema: z.object({ n: z.number() }), prompt: 'x' }, { interactive: true });
    expect(out.object).toEqual({ n: 7 });
  });
});
