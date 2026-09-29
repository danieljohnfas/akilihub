import { describe, expect, it } from 'vitest';
import { buildWebSearchQuery } from '../tsquery';

describe('buildWebSearchQuery', () => {
  it('quotes multi-word keywords and ORs them', () => {
    expect(buildWebSearchQuery(['machine learning', 'Python'])).toBe('"machine learning" or "Python"');
  });

  it('keeps tech punctuation but strips operators/quotes that could change meaning', () => {
    expect(buildWebSearchQuery(['C++', 'node.js', 'a"b', '!(evil) | & :*'])).toBe('"C++" or "node.js" or "a b" or "evil"');
  });

  it('drops empties, single chars and duplicates, and caps the count', () => {
    expect(buildWebSearchQuery(['', 'a', 'sql', 'sql'])).toBe('"sql"');
    expect(buildWebSearchQuery(Array.from({ length: 20 }, (_, i) => `skill${i}`), 3).split(' or ')).toHaveLength(3);
  });

  it('returns an empty string when nothing usable remains', () => {
    expect(buildWebSearchQuery(['', ' ', '**'])).toBe('');
  });
});
