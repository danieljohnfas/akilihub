import { describe, expect, it } from 'vitest';
import { extractPdfText } from '../pdf';

/** Builds a tiny single-page PDF containing `text` (no external tooling needed). */
function makePdf(text: string): Buffer {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${`BT /F1 18 Tf 20 80 Td (${text}) Tj ET`.length} >>\nstream\nBT /F1 18 Tf 20 80 Td (${text}) Tj ET\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((o) => (pdf += `${String(o).padStart(10, '0')} 00000 n \n`));
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, 'latin1');
}

describe('extractPdfText (pdf-parse v2)', () => {
  it('reads text from a PDF', async () => {
    const text = await extractPdfText(makePdf('Senior Accountant CV'));
    expect(text).toContain('Senior Accountant CV');
  });

  it('rejects data that is not a PDF', async () => {
    await expect(extractPdfText(Buffer.from('this is not a pdf'))).rejects.toThrow();
  });
});
