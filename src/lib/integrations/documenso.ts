/**
 * Documenso Integration (Self-Hosted)
 * Repo: https://github.com/documenso/documenso
 * 
 * Used for sending contracts, NDAs, and B2B agreements to employers
 * directly from our platform without paying for DocuSign.
 */

export class DocumensoClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.DOCUMENSO_API_URL || 'http://localhost:3002/api/v1';
    this.apiKey = process.env.DOCUMENSO_API_KEY || '';
  }

  /**
   * Send a contract for signature
   */
  async sendContract(documentTitle: string, signers: { email: string; name: string }[], pdfBuffer: Buffer) {
    if (!this.apiKey) {
      console.warn('[Documenso] Integration disabled: DOCUMENSO_API_KEY not set.');
      return null;
    }

    try {
      const formData = new FormData();
      formData.append('title', documentTitle);
      formData.append('signers', JSON.stringify(signers));
      
      const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
      formData.append('document', blob, 'contract.pdf');

      const response = await fetch(`${this.baseUrl}/documents/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: formData
      });

      return await response.json();
    } catch (error) {
      console.error('[Documenso] Error sending contract:', error);
      throw error;
    }
  }
}

export const documenso = new DocumensoClient();
