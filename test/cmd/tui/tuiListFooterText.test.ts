import { describe, expect, it } from 'vitest';
import { buildKeybarLine, buildListFooterHint } from '../../../src/cmd/tui/tuiListFooterText.js';

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

describe('buildKeybarLine', () => {
  it('includes standard navigation keys', () => {
    const line = buildKeybarLine({ detailEnabled: true, refreshEnabled: true });
    expect(line).toContain('↑/↓');
    expect(line).toContain('Enter');
    expect(line).toContain('?');
    expect(line).toContain('r');
    expect(line).toContain('ESC');
  });

  it('omits refresh when disabled', () => {
    expect(buildKeybarLine({ detailEnabled: true, refreshEnabled: false })).not.toContain('r refresh');
  });
});