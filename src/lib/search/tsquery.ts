/**
 * Builds a `websearch_to_tsquery` input from LLM-extracted keywords.
 *
 * The old code joined keywords with " | " and passed them to `to_tsquery`, which throws a
 * syntax error for multi-word or punctuated keywords ("machine learning", "C++", "node.js"),
 * and the error was swallowed as "no matching jobs". `websearch_to_tsquery` never raises on
 * user text; each keyword becomes a quoted phrase and phrases are OR-ed.
 */
export function buildWebSearchQuery(keywords: string[], max = 8): string {
  const phrases: string[] = [];
  const seen = new Set<string>();
  for (const raw of keywords) {
    const cleaned = raw
      .replace(/["\\]/g, ' ')
      .replace(/[^\p{L}\p{N}+#.\-\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 60);
    const key = cleaned.toLowerCase();
    if (cleaned.length >= 2 && !seen.has(key)) {
      seen.add(key);
      phrases.push(`"${cleaned}"`);
    }
    if (phrases.length >= max) break;
  }
  return phrases.join(' or ');
}
