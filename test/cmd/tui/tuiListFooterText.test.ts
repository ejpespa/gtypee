import { describe, expect, it } from 'vitest';
import { buildListFooterHint } from '../../../src/cmd/tui/tuiListFooterText.js';

describe('buildListFooterHint', () => {
  it('shows Enter view when detail is enabled', () => {
    expect(buildListFooterHint({ detailEnabled: true, backHint: 'ESC to return', loading: false }))
      .toContain('Enter view');
  });

  it('shows Enter — no detail when detail is disabled', () => {
    const hint = buildListFooterHint({ detailEnabled: false, backHint: 'ESC to return', loading: false });
    expect(hint).toContain('Enter — no detail');
    expect(hint).not.toContain('Enter view');
  });

  it('appends loading suffix when loading', () => {
    expect(buildListFooterHint({ detailEnabled: true, backHint: 'ESC', loading: true }))
      .toContain('Loading...');
  });
});