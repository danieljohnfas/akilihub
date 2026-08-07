/**
 * query-resilience.ts
 *
 * Resilient Database Query & Batching Utilities.
 *
 * Purpose:
 *   Provides retry mechanisms with exponential backoff and jitter for long-running
 *   scraping daemons and Inngest background workers against PostgreSQL (Supabase/Neon).
 */

export interface RetryOptions {
  retries?: number;
  delayMs?: number;
  backoffFactor?: number;
  label?: string;
}

/**
 * Executes an async query or database action with exponential backoff retry.
 */
export async function executeWithRetry<T>(
  queryFn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const retries = options.retries ?? 3;
  const delayMs = options.delayMs ?? 1000;
  const backoffFactor = options.backoffFactor ?? 2;
  const label = options.label ?? 'DB Query';

  let attempt = 0;
  let lastError: unknown = null;

  while (attempt <= retries) {
    try {
      return await queryFn();
    } catch (err: unknown) {
      attempt++;
      lastError = err;
      const message = err instanceof Error ? err.message : String(err);

      if (attempt > retries) {
        console.error(`[${label}] All ${retries} retry attempts failed: ${message}`);
        throw err;
      }

      // Exponential backoff with jitter
      const waitTime = Math.round(
        delayMs * Math.pow(backoffFactor, attempt - 1) + Math.random() * 500
      );

      console.warn(
        `[${label}] Error on attempt ${attempt}/${retries} (${message}). Retrying in ${waitTime}ms...`
      );

      await new Promise(res => setTimeout(res, waitTime));
    }
  }

  throw lastError;
}

/**
 * Safely batches an array of items into fixed-size chunks for batch processing.
 */
export function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}
