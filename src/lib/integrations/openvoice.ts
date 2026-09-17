/**
 * OpenVoice TTS Integration (Self-Hosted)
 * Repo: https://github.com/myshell-ai/OpenVoice
 * 
 * Used for providing highly localized African accent TTS for job descriptions,
 * enabling accessibility for low-literacy users without paying ElevenLabs.
 */

export class OpenVoiceClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.OPENVOICE_API_URL || 'http://localhost:5000/api/tts';
  }

  /**
   * Generates a voiceover buffer from text
   */
  async generateVoiceover(text: string, language: 'swahili' | 'english' = 'english', accentReferenceAudioPath?: string): Promise<Buffer | null> {
    if (process.env.NODE_ENV === 'production' && !process.env.OPENVOICE_API_URL) {
      console.warn('[OpenVoice] Integration disabled: OPENVOICE_API_URL not set.');
      return null;
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          language,
          reference_audio: accentReferenceAudioPath || 'default_african_accent.wav'
        })
      });

      if (!response.ok) throw new Error('Failed to generate TTS via OpenVoice');
      
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error('[OpenVoice] Error generating voiceover:', error);
      throw error;
    }
  }
}

export const openVoice = new OpenVoiceClient();
