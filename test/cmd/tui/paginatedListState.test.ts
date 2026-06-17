import { describe, expect, it } from 'vitest';
import {
  applyPageResult,
  createPaginatedListState,
  incrementRefreshKey,
  resetPaginatedListState,
  shouldSkipFetch,
} from '../../../src/cmd/tui/paginatedListState.js';

describe('paginatedListState', () => {
  it('starts empty', () => {
    const state = createPaginatedListState();
    expect(state.pageHistory).toEqual([undefined]);
    expect(state.currentIndex).toBe(0);
    expect(state.pageCache).toEqual({});
    expect(state.refreshKey).toBe(0);
  });

  it('shouldSkipFetch when page is cached', () => {
    const state = applyPageResult(createPaginatedListState(), 0, [{ id: '1' }], 't2');
    expect(shouldSkipFetch(state, 0)).toBe(true);
    expect(shouldSkipFetch(state, 1)).toBe(false);
  });

  it('applyPageResult stores items and next token', () => {
    const state = applyPageResult(createPaginatedListState(), 0, [{ id: 'a' }], 'page-2');
    expect(state.pageCache[0]).toEqual([{ id: 'a' }]);
    expect(state.pageHistory[1]).toBe('page-2');
  });

  it('resetPaginatedListState clears cache and history', () => {
    const populated = applyPageResult(createPaginatedListState(), 0, [{ id: 'x' }], 't2');
    const reset = resetPaginatedListState(populated);
    expect(reset.pageCache).toEqual({});
    expect(reset.pageHistory).toEqual([undefined]);
    expect(reset.currentIndex).toBe(0);
    expect(reset.refreshKey).toBe(populated.refreshKey);
  });

  it('incrementRefreshKey bumps refresh key', () => {
    const state = incrementRefreshKey(createPaginatedListState());
    expect(state.refreshKey).toBe(1);
    expect(state.pageCache).toEqual({});
    expect(state.pageHistory).toEqual([undefined]);
    expect(state.currentIndex).toBe(0);
  });
});