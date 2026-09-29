import { describe, expect, it } from 'vitest';
import { escapeLike } from '../like';

describe('escapeLike', () => {
  it('escapes LIKE wildcards and the escape character so input matches literally', () => {
    expect(escapeLike('100%')).toBe('100\\%');
    expect(escapeLike('a_b')).toBe('a\\_b');
    expect(escapeLike('back\\slash')).toBe('back\\\\slash');
    expect(escapeLike('%_%')).toBe('\\%\\_\\%');
  });

  it('leaves ordinary text untouched', () => {
    expect(escapeLike('Nairobi accountant')).toBe('Nairobi accountant');
    expect(escapeLike('')).toBe('');
  });
});
