import { describe, expect, it } from 'vitest';
import { buildGmailListQuery, normalizeGmailFromFilter } from '../../../src/cmd/tui/gmail-query.js';

describe('gmail query helpers', () => {
  it('wraps plain email as from: clause', () => {
    expect(normalizeGmailFromFilter('sample@adssu.edu.ph')).toBe('from:sample@adssu.edu.ph');
  });

  it('preserves explicit from: operator', () => {
    expect(normalizeGmailFromFilter('from:boss@company.com')).toBe('from:boss@company.com');
  });

  it('combines base query and from filter', () => {
    expect(buildGmailListQuery('in:inbox', 'sample@adssu.edu.ph')).toBe(
      'in:inbox from:sample@adssu.edu.ph',
    );
  });

  it('returns only from clause when base query is empty', () => {
    expect(buildGmailListQuery('', 'sample@adssu.edu.ph')).toBe('from:sample@adssu.edu.ph');
  });

  it('returns only base query when from filter is empty', () => {
    expect(buildGmailListQuery('in:inbox', '')).toBe('in:inbox');
  });
});