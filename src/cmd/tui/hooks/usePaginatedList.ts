import { useCallback, useEffect, useRef, useState } from 'react';
import { hasNextTokenPage } from '../pagination.js';
import {
  applyPageResult,
  createPaginatedListState,
  incrementRefreshKey,
  type PaginatedListState,
} from '../paginatedListState.js';
import { translateApiError } from '../translateApiError.js';

export type PaginatedFetchFn<T> = (
  pageToken: string | undefined,
) => Promise<{ items: T[]; nextPageToken?: string }>;

export function usePaginatedList<T>(options: {
  fetchPage: PaginatedFetchFn<T>;
  queryKey: string;
  enabled?: boolean;
}): {
  items: T[];
  currentIndex: number;
  setCurrentIndex: (i: number | ((prev: number) => number)) => void;
  hasNextPage: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const { fetchPage, queryKey, enabled = true } = options;
  const [state, setState] = useState<PaginatedListState<T>>(createPaginatedListState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const queryKeyRef = useRef(queryKey);
  const fetchPageRef = useRef(fetchPage);
  fetchPageRef.current = fetchPage;

  const { currentIndex, pageHistory, pageCache, refreshKey } = state;

  useEffect(() => {
    if (queryKeyRef.current !== queryKey) {
      queryKeyRef.current = queryKey;
      setState(createPaginatedListState());
      setError(null);
    }
  }, [queryKey]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setError(null);
      return;
    }

    if (pageCache[currentIndex] !== undefined) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const pageToken = pageHistory[currentIndex];

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchPageRef.current(pageToken);
        if (cancelled) return;
        setState((prev) =>
          applyPageResult(prev, currentIndex, result.items, result.nextPageToken),
        );
      } catch (err: unknown) {
        if (!cancelled) {
          setError(translateApiError(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [currentIndex, enabled, pageHistory, refreshKey, queryKey, pageCache]);

  const setCurrentIndex = useCallback((i: number | ((prev: number) => number)) => {
    setState((prev) => ({
      ...prev,
      currentIndex: typeof i === 'function' ? i(prev.currentIndex) : i,
    }));
  }, []);

  const refresh = useCallback(() => {
    setState((prev) => incrementRefreshKey(prev));
    setError(null);
  }, []);

  const items = pageCache[currentIndex] ?? [];
  const hasNextPage = hasNextTokenPage(pageHistory, currentIndex);

  return {
    items,
    currentIndex,
    setCurrentIndex,
    hasNextPage,
    loading,
    error,
    refresh,
  };
}