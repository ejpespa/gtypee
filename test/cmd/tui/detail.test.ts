import { describe, expect, it } from 'vitest';
import { flattenDetailLines, textToDetailLines, wrapDetailLine } from '../../../src/cmd/tui/detail.js';

describe('tui detail helpers', () => {
  it('textToDetailLines splits on newlines', () => {
    expect(textToDetailLines('a\nb')).toEqual(['a', 'b']);
  });

  it('wrapDetailLine wraps long lines', () => {
    const wrapped = wrapDetailLine('one two three four five', 10);
    expect(wrapped.length).toBeGreaterThan(1);
    expect(wrapped.join(' ')).toContain('one');
  });

  it('flattenDetailLines wraps each line', () => {
    const lines = flattenDetailLines(['short', 'this is a much longer line that should wrap'], 12);
    expect(lines.length).toBeGreaterThan(2);
  });
});