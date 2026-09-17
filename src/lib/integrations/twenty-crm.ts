/**
 * Twenty CRM Integration (Self-Hosted)
 * Repo: https://github.com/twentyhq/twenty
 * 
 * Used for piping scraped employers and B2B leads into our own self-hosted CRM 
 * instead of paying for Salesforce/Hubspot.
 */

export class TwentyCRMClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.TWENTY_API_URL || 'http://localhost:3000/api/v1';
    this.apiKey = process.env.TWENTY_API_KEY || '';
  }

  /**
   * Sync a scraped employer into the Twenty CRM Companies table
   */
  async upsertEmployer(employerData: { name: string; domain: string; industry?: string }) {
    if (!this.apiKey) {
      console.warn('[Twenty CRM] Integration disabled: TWENTY_API_KEY not set. Ready for activation.');
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/companies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          name: employerData.name,
          domainName: employerData.domain,
          targetIndustry: employerData.industry
        })
      });
      return await response.json();
    } catch (error) {
      console.error('[Twenty CRM] Error syncing employer:', error);
      throw error;
    }
  }
}

export const twentyCRM = new TwentyCRMClient();
