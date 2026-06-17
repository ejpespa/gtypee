import { mergeNextPageToken } from './pagination.js';

export type PaginatedListState<T = unknown> = {
  pageHistory: (string | undefined)[];
  currentIndex: number;
  pageCache: Record<number, T[]>;
  refreshKey: number;
};

export function createPaginatedListState<T = unknown>(): PaginatedListState<T> {
  return {
    pageHistory: [undefined],
    currentIndex: 0,
    pageCache: {},
    refreshKey: 0,
  };
}

export function shouldSkipFetch<T>(
  state: PaginatedListState<T>,
  pageIndex: number,
): boolean {
  return state.pageCache[pageIndex] !== undefined;
}

export function applyPageResult<T>(
  state: PaginatedListState<T>,
  pageIndex: number,
  items: T[],
  nextPageToken: string | undefined,
): PaginatedListState<T> {
  return {
    ...state,
    pageCache: { ...state.pageCache, [pageIndex]: items },
    pageHistory: mergeNextPageToken(state.pageHistory, pageIndex, nextPageToken),
  };
}

export function resetPaginatedListState<T>(
  state: PaginatedListState<T>,
): PaginatedListState<T> {
  return {
    ...state,
    pageHistory: [undefined],
    currentIndex: 0,
    pageCache: {},
  };
}

export function incrementRefreshKey<T>(
  state: PaginatedListState<T>,
): PaginatedListState<T> {
  return {
    ...state,
    pageHistory: [undefined],
    currentIndex: 0,
    pageCache: {},
    refreshKey: state.refreshKey + 1,
  };
}