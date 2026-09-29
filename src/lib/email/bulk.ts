import { Resend } from 'resend';
import { unsubscribeHeaders } from './unsubscribe';

export interface Recipient {
  id: string;
  email: string;
  name: string | null;
}

export interface BuiltEmail {
  from: string;
  subject: string;
  html: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Sends one personalised email per recipient through Resend batches.
 *
 * - Emails are rendered *per chunk* inside the caller's single Inngest step, so step output is a
 *   tiny summary instead of every rendered HTML body (Inngest caps step output at ~4MB, which the
 *   old prepare-then-send design would exceed after a few hundred subscribers).
 * - Every message carries List-Unsubscribe / List-Unsubscribe-Post headers.
 */
export async function sendBulk(
  recipients: Recipient[],
  build: (recipient: Recipient) => Promise<BuiltEmail>,
  opts: { chunkSize?: number; delayMs?: number } = {}
): Promise<{ skipped: true; reason: string } | { sent: number; batches: number }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { skipped: true, reason: 'RESEND_API_KEY not set' };

  const { chunkSize = 100, delayMs = 1000 } = opts;
  const resend = new Resend(apiKey);
  let sent = 0;
  let batches = 0;

  for (let i = 0; i < recipients.length; i += chunkSize) {
    const chunk = recipients.slice(i, i + chunkSize);
    const payloads = await Promise.all(
      chunk.map(async (r) => ({ ...(await build(r)), to: [r.email], headers: unsubscribeHeaders(r.id) }))
    );
    await (resend.batch as { send: (emails: typeof payloads) => Promise<unknown> }).send(payloads);
    sent += payloads.length;
    batches++;
    if (i + chunkSize < recipients.length) await sleep(delayMs);
  }
  return { sent, batches };
}
