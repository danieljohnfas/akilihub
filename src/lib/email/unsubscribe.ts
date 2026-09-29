const BASE_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://akilibrain.com').replace(/\/$/, '');

/** Page a human lands on (confirmation button; never mutates on GET). */
export function unsubscribePageUrl(userId: string): string {
  return `${BASE_URL}/unsubscribe?user_id=${encodeURIComponent(userId)}`;
}

/** Endpoint mail clients POST to for RFC 8058 one-click unsubscribe. */
export function unsubscribeEndpointUrl(userId: string): string {
  return `${BASE_URL}/api/unsubscribe?user_id=${encodeURIComponent(userId)}`;
}

/**
 * RFC 2369 / RFC 8058 headers. Gmail and Yahoo require one-click unsubscribe for bulk senders;
 * without these, marketing mail is far more likely to be filtered as spam.
 */
export function unsubscribeHeaders(userId: string): Record<string, string> {
  return {
    'List-Unsubscribe': `<${unsubscribeEndpointUrl(userId)}>, <${unsubscribePageUrl(userId)}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}
