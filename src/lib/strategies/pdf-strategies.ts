import { Strategy } from './engine';

export interface PdfInput {
  fileBuffer: Buffer;
  fileName: string;
}

export interface PdfResult {
  text: string;
  pageCount: number;
}

// 1. Primary: Stirling PDF OCR API
export class StirlingPdfStrategy implements Strategy<PdfInput, PdfResult> {
  name = 'Stirling PDF (Local API OCR)';
  
  async execute(input: PdfInput): Promise<PdfResult> {
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(input.fileBuffer)], { type: 'application/pdf' });
    formData.append('fileInput', blob, input.fileName);

    const response = await fetch('http://localhost:8081/api/v1/misc/ocr-pdf', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Stirling PDF OCR failed with status: ${response.status}`);
    }
    
    // Extract text from the output OCR'd PDF or directly if we use text-extraction API
    // (Stirling has /api/v1/misc/extract-text)
    // Assume response is JSON with extracted text for this example:
    return {
      text: "Extracted text via OCR",
      pageCount: 1
    };
  }
}

// 2. Fallback: NPM pdf-parse (Lightweight, non-OCR)
export class PdfParseStrategy implements Strategy<PdfInput, PdfResult> {
  name = 'pdf-parse (npm fallback)';
  
  async execute(input: PdfInput): Promise<PdfResult> {
    // We would dynamic import 'pdf-parse' here to avoid bundling it on the edge if unsupported
    // const pdfParse = (await import('pdf-parse')).default;
    // const data = await pdfParse(input.fileBuffer);
    
    return {
      text: "Extracted text via basic pdf-parse",
      pageCount: 1
    };
  }
}
