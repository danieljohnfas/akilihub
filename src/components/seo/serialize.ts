/**
 * Serialises a JSON-LD object for embedding inside a <script type="application/ld+json"> tag.
 *
 * `JSON.stringify` alone is NOT safe here: a value containing `</script>` would close
 * the tag early and let scraped/AI-generated text inject markup (stored XSS).
 * Escaping `<`, `>`, `&` and the JS line separators keeps the payload valid JSON
 * while making it impossible to terminate the script element.
 */
const LINE_SEPARATOR = String.fromCharCode(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);

export function serializeJsonLd(schema: unknown): string {
  return JSON.stringify(schema)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .split(LINE_SEPARATOR).join('\\u2028')
    .split(PARAGRAPH_SEPARATOR).join('\\u2029');
}
