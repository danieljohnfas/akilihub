/**
 * Search-provider health tracking for the discovery scrapers.
 *
 * Two independent mechanisms:
 *
 *  1. Engine cooldowns (always on). When a provider reports that its credits/quota are gone, or is
 *     unreachable several times in a row, we skip it for a while instead of paying a network round
 *     trip (up to 10-15s for a DuckDuckGo connect timeout) on every single query. Cooldowns expire on
 *     their own, so a long-lived process recovers when the quota resets.
 *
 *  2. A circuit breaker (opt-in via `configureSearchBreaker`). Batch scripts enable it so that, when
 *     no engine returns anything for N queries in a row, the run stops with `SearchUnavailableError`
 *     instead of grinding through thousands of queries until the CI timeout kills it. Request-driven
 *     code (Inngest functions) never enables it, so a bad hour never turns into thrown errors there.
 */

export type SearchEngine = "exa" | "cse" | "serper" | "ddg";

export class SearchUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SearchUnavailableError";
  }
}

const DEFAULT_COOLDOWN_MS = 30 * 60 * 1000;
const NETWORK_FAILURES_BEFORE_COOLDOWN = 3;
export const DEFAULT_MAX_CONSECUTIVE_EMPTY = 10;

const cooldownUntil = new Map<SearchEngine, number>();
const networkFailures = new Map<SearchEngine, number>();

let breaker: { maxConsecutiveEmpty: number; consecutiveEmpty: number } | null = null;

function cooldownMs(): number {
  const minutes = Number(process.env.SEARCH_ENGINE_COOLDOWN_MINUTES);
  return Number.isFinite(minutes) && minutes > 0 ? minutes * 60_000 : DEFAULT_COOLDOWN_MS;
}

/** True when the provider has said "out of credits / rate limited" (as opposed to a bad request). */
export function isQuotaFailure(engine: SearchEngine, status: number, body = ""): boolean {
  switch (engine) {
    case "exa":
      return status === 402 || status === 429;
    case "serper":
      return status === 402 || status === 429 || (status === 400 && /credit/i.test(body));
    case "cse":
      return status === 429 || (status === 403 && /quota|rate/i.test(body));
    case "ddg":
      return status === 429;
  }
}

function startCooldown(engine: SearchEngine, reason: string): void {
  const ms = cooldownMs();
  cooldownUntil.set(engine, Date.now() + ms);
  networkFailures.delete(engine);
  console.warn(`[search-health] ${engine} skipped for ${Math.round(ms / 60_000)} min: ${reason}`);
}

/** Whether `engine` should be tried right now. */
export function engineAvailable(engine: SearchEngine): boolean {
  const until = cooldownUntil.get(engine);
  if (until === undefined) return true;
  if (Date.now() >= until) {
    cooldownUntil.delete(engine);
    return true;
  }
  return false;
}

/** Engines currently in cooldown (for error messages). */
export function enginesInCooldown(): SearchEngine[] {
  return (["exa", "cse", "serper", "ddg"] as const).filter((e) => !engineAvailable(e));
}

export function reportEngineHttpFailure(engine: SearchEngine, status: number, body = ""): void {
  if (isQuotaFailure(engine, status, body)) {
    startCooldown(engine, `quota or credits exhausted (HTTP ${status})`);
  }
}

export function reportEngineNetworkFailure(engine: SearchEngine): void {
  const count = (networkFailures.get(engine) ?? 0) + 1;
  networkFailures.set(engine, count);
  if (count >= NETWORK_FAILURES_BEFORE_COOLDOWN) {
    startCooldown(engine, `unreachable ${count} times in a row`);
  }
}

export function reportEngineSuccess(engine: SearchEngine): void {
  networkFailures.delete(engine);
}

/**
 * Enable the circuit breaker for this process. Call once at the top of a batch script.
 * `SEARCH_MAX_CONSECUTIVE_EMPTY` overrides the default of 10.
 */
export function configureSearchBreaker(maxConsecutiveEmpty?: number): void {
  const fromEnv = Number(process.env.SEARCH_MAX_CONSECUTIVE_EMPTY);
  const limit =
    maxConsecutiveEmpty ?? (Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : DEFAULT_MAX_CONSECUTIVE_EMPTY);
  breaker = { maxConsecutiveEmpty: Math.max(1, Math.floor(limit)), consecutiveEmpty: 0 };
}

/**
 * Record the result of one full multi-engine search. Throws `SearchUnavailableError` when the breaker
 * is enabled and no query has returned anything for `maxConsecutiveEmpty` queries in a row.
 */
export function recordSearchOutcome(urlCount: number): void {
  if (!breaker) return;
  if (urlCount > 0) {
    breaker.consecutiveEmpty = 0;
    return;
  }
  breaker.consecutiveEmpty += 1;
  if (breaker.consecutiveEmpty >= breaker.maxConsecutiveEmpty) {
    const streak = breaker.consecutiveEmpty;
    breaker.consecutiveEmpty = 0; // long-running daemons get a fresh window after they sleep
    const down = enginesInCooldown();
    throw new SearchUnavailableError(
      `No search engine returned any results for ${streak} consecutive queries` +
        (down.length ? ` (out of quota or unreachable: ${down.join(", ")})` : "") +
        ". Check the Exa/Serper/Google CSE credits and quotas.",
    );
  }
}

/** Test helper: forget all cooldowns and disable the breaker. */
export function resetSearchHealth(): void {
  cooldownUntil.clear();
  networkFailures.clear();
  breaker = null;
}
