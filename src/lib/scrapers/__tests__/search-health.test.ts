import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SearchUnavailableError,
  configureSearchBreaker,
  engineAvailable,
  enginesInCooldown,
  isQuotaFailure,
  recordSearchOutcome,
  reportEngineHttpFailure,
  reportEngineNetworkFailure,
  reportEngineSuccess,
  resetSearchHealth,
} from '../search-health';

beforeEach(() => {
  resetSearchHealth();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  resetSearchHealth();
});

describe('isQuotaFailure', () => {
  it('recognises the failures seen in the production logs', () => {
    expect(isQuotaFailure('exa', 402, '{"tag":"NO_MORE_CREDITS"}')).toBe(true);
    expect(isQuotaFailure('serper', 400, '{"message":"Not enough credits","statusCode":400}')).toBe(true);
    expect(isQuotaFailure('cse', 429, 'Quota exceeded for quota metric')).toBe(true);
  });

  it('does not treat ordinary errors as quota exhaustion', () => {
    expect(isQuotaFailure('exa', 500)).toBe(false);
    expect(isQuotaFailure('exa', 400, 'bad request')).toBe(false);
    expect(isQuotaFailure('serper', 400, 'invalid query')).toBe(false);
    expect(isQuotaFailure('cse', 400)).toBe(false);
    expect(isQuotaFailure('ddg', 500)).toBe(false);
  });
});

describe('engine cooldowns', () => {
  it('skips an engine after a quota failure and brings it back when the cooldown ends', () => {
    vi.useFakeTimers();
    expect(engineAvailable('exa')).toBe(true);

    reportEngineHttpFailure('exa', 402, 'NO_MORE_CREDITS');
    expect(engineAvailable('exa')).toBe(false);
    expect(engineAvailable('cse')).toBe(true); // other engines are unaffected
    expect(enginesInCooldown()).toEqual(['exa']);

    vi.advanceTimersByTime(29 * 60_000);
    expect(engineAvailable('exa')).toBe(false);
    vi.advanceTimersByTime(2 * 60_000);
    expect(engineAvailable('exa')).toBe(true);
  });

  it('honours SEARCH_ENGINE_COOLDOWN_MINUTES', () => {
    vi.useFakeTimers();
    vi.stubEnv('SEARCH_ENGINE_COOLDOWN_MINUTES', '5');
    reportEngineHttpFailure('serper', 402);
    vi.advanceTimersByTime(6 * 60_000);
    expect(engineAvailable('serper')).toBe(true);
  });

  it('ignores non-quota HTTP errors', () => {
    reportEngineHttpFailure('exa', 500, 'oops');
    expect(engineAvailable('exa')).toBe(true);
  });

  it('cools DuckDuckGo down only after repeated network failures, and a success resets the count', () => {
    reportEngineNetworkFailure('ddg');
    reportEngineNetworkFailure('ddg');
    reportEngineSuccess('ddg');
    reportEngineNetworkFailure('ddg');
    reportEngineNetworkFailure('ddg');
    expect(engineAvailable('ddg')).toBe(true);

    reportEngineNetworkFailure('ddg');
    expect(engineAvailable('ddg')).toBe(false);
  });
});

describe('circuit breaker', () => {
  it('is off by default: empty results never throw', () => {
    for (let i = 0; i < 100; i++) expect(() => recordSearchOutcome(0)).not.toThrow();
  });

  it('throws SearchUnavailableError after N consecutive empty searches', () => {
    configureSearchBreaker(3);
    recordSearchOutcome(0);
    recordSearchOutcome(0);
    expect(() => recordSearchOutcome(0)).toThrow(SearchUnavailableError);
  });

  it('a successful search resets the streak', () => {
    configureSearchBreaker(3);
    recordSearchOutcome(0);
    recordSearchOutcome(0);
    recordSearchOutcome(4);
    recordSearchOutcome(0);
    recordSearchOutcome(0);
    expect(() => recordSearchOutcome(0)).toThrow(SearchUnavailableError);
  });

  it('names the engines that are out of quota in the message', () => {
    configureSearchBreaker(1);
    reportEngineHttpFailure('exa', 402);
    reportEngineHttpFailure('serper', 400, 'Not enough credits');
    expect(() => recordSearchOutcome(0)).toThrow(/exa, serper/);
  });

  it('gives a long-running process a fresh window after it trips', () => {
    configureSearchBreaker(2);
    recordSearchOutcome(0);
    expect(() => recordSearchOutcome(0)).toThrow(SearchUnavailableError);
    expect(() => recordSearchOutcome(0)).not.toThrow();
  });

  it('reads SEARCH_MAX_CONSECUTIVE_EMPTY from the environment', () => {
    vi.stubEnv('SEARCH_MAX_CONSECUTIVE_EMPTY', '2');
    configureSearchBreaker();
    recordSearchOutcome(0);
    expect(() => recordSearchOutcome(0)).toThrow(SearchUnavailableError);
  });
});
