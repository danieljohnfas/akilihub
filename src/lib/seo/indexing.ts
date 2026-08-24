import { google } from 'googleapis';

/**
 * Submit URLs to Google Indexing API
 * Requires GOOGLE_SERVICE_ACCOUNT_JSON in environment variables.
 */
export async function submitToGoogleIndexing(urls: string[], type: 'URL_UPDATED' | 'URL_DELETED' = 'URL_UPDATED') {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    console.warn('[Indexing API] Missing GOOGLE_SERVICE_ACCOUNT_JSON. Skipping index submission.');
    return;
  }

  try {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    
    const auth = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/indexing']
    });

    const indexing = google.indexing({
      version: 'v3',
      auth: auth
    });

    console.log(`[Indexing API] Submitting ${urls.length} URLs as ${type}...`);

    // The API allows batching up to 100 requests, but for simplicity we can send them sequentially or in small chunks
    // Or just use Promise.all for smaller batches
    const results = await Promise.allSettled(urls.map(url => 
      indexing.urlNotifications.publish({
        requestBody: {
          url: url,
          type: type
        }
      })
    ));

    const successes = results.filter(r => r.status === 'fulfilled').length;
    console.log(`[Indexing API] Successfully submitted ${successes}/${urls.length} URLs.`);
    
    return {
      successes,
      total: urls.length
    };
  } catch (err) {
    console.error('[Indexing API] Failed to submit URLs:', err);
  }
}
