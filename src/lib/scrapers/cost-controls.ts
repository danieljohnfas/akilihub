/** Scraper spend / kill-switch controls (env-driven). */

export function scrapersDisabled(): boolean {
  const v = (process.env.SCRAPE_DISABLED || '').toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

export function jobInsertTarget(): number {
  const n = Number(process.env.SCRAPE_JOB_TARGET || '200');
  return Number.isFinite(n) && n > 0 ? Math.min(n, 500) : 200;
}

/** Max second-pass runs allowed when under target (0 disables pass 2). */
export function jobSecondPassEnabled(): boolean {
  const v = (process.env.SCRAPE_JOB_SECOND_PASS || '1').toLowerCase();
  return !(v === '0' || v === 'false' || v === 'no');
}
