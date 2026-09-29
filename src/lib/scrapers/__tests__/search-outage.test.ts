import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The search module pulls in the DB client, AI router and Firecrawl at import time; none of that is
// needed to exercise the search fallback chain.
vi.mock('../deterministic-extractor', () => ({}));
vi.mock('../../ai/location', () => ({ normalizeLocationAndGetRegionId: vi.fn() }));
vi.mock('../compliance-base', () => ({ fetchHtml: vi.fn(), htmlToTextEnriched: vi.fn() }));
vi.mock('../../sources/aggregators', () => ({ getAllAggregatorDomains: () => [] }));

import { searchGoogle } from '../broad-search-engine';
import { SearchUnavailableError, configureSearchBreaker, resetSearchHealth } from '../search-health';

/**
 * Reproduces the production outage from the GitHub Actions logs: Exa out of credits (402), Serper
 * "Not enough credits" (400), Google CSE over its daily quota (429), DuckDuckGo unreachable, SearXNG
 * returning nothing.
 */
function deadProviders() {
  const calls: Record<string, number> = { exa: 0, serper: 0, cse: 0, ddg: 0, searx: 0 };
  const fetchMock = vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes('api.exa.ai')) {
      calls.exa++;
      return new Response('{"tag":"NO_MORE_CREDITS"}', { status: 402 });
    }
    if (url.includes('google.serper.dev')) {
      calls.serper++;
      return new Response('{"message":"Not enough credits","statusCode":400}', { status: 400 });
    }
    if (url.includes('googleapis.com/customsearch')) {
      calls.cse++;
      return new Response('{"error":{"code":429,"message":"Quota exceeded"}}', { status: 429 });
    }
    if (url.includes('html.duckduckgo.com')) {
      calls.ddg++;
      throw new TypeError('fetch failed');
    }
    if (url.includes('searx.space')) {
      return new Response(JSON.stringify({ instances: {} }), { status: 200 });
    }
    calls.searx++;
    return new Response('<html></html>', { status: 200 });
  });
  return { calls, fetchMock };
}

beforeEach(() => {
  resetSearchHealth();
  vi.stubEnv('EXA_API_KEY', 'exa-test');
  vi.stubEnv('SERPER_API_KEY', 'serper-test');
  vi.stubEnv('GOOGLE_CSE_API_KEY', 'cse-test');
  vi.stubEnv('GOOGLE_CSE_ID', 'cx-test');
  for (const method of ['log', 'warn', 'error'] as const) vi.spyOn(console, method).mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  resetSearchHealth();
});

describe('search outage handling', () => {
  it('stops with SearchUnavailableError instead of looping forever when every provider is down', async () => {
    const { fetchMock } = deadProviders();
    vi.stubGlobal('fetch', fetchMock);
    configureSearchBreaker(5);

    let completed = 0;
    let caught: unknown;
    try {
      for (let i = 0; i < 1000; i++) {
        await searchGoogle(`query ${i}`, 10);
        completed++;
      }
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(SearchUnavailableError);
    expect(completed).toBe(4); // the 5th consecutive empty result trips the breaker
    expect((caught as Error).message).toMatch(/exa/);
  });

  it('stops calling providers that reported an exhausted quota', async () => {
    const { calls, fetchMock } = deadProviders();
    vi.stubGlobal('fetch', fetchMock);

    for (let i = 0; i < 6; i++) expect(await searchGoogle(`query ${i}`, 10)).toEqual([]);

    // One paid call each, then the engines are skipped (previously: one call per query, 6 each).
    expect(calls.exa).toBe(1);
    expect(calls.serper).toBe(1);
    expect(calls.cse).toBe(1);
    // DuckDuckGo is only skipped after 3 consecutive network failures.
    expect(calls.ddg).toBe(3);
  });

  it('does not throw without the breaker, so request-driven callers keep their old behaviour', async () => {
    const { fetchMock } = deadProviders();
    vi.stubGlobal('fetch', fetchMock);
    for (let i = 0; i < 15; i++) expect(await searchGoogle(`query ${i}`, 10)).toEqual([]);
  });

  it('keeps working when one provider still returns results', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        if (url.includes('api.exa.ai')) {
          return new Response(JSON.stringify({ results: [{ url: 'https://example.org/careers' }] }), { status: 200 });
        }
        return new Response('nope', { status: 500 });
      }),
    );
    configureSearchBreaker(2);
    for (let i = 0; i < 5; i++) {
      expect(await searchGoogle(`query ${i}`, 10)).toEqual(['https://example.org/careers']);
    }
  });
});
