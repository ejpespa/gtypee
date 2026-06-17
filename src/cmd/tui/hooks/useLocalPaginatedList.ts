import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_TUI_PAGE_SIZE, sliceLocalPage } from '../pagination.js';
import { translateApiError } from '../translateApiError.js';

export function useLocalPaginatedList<T>(options: {
  fetchAll: () => Promise<T[]>;
  queryKey: string;
  enabled?: boolean;
  pageSize?: number;
}): {
  items: T[];
  allItems: T[];
  currentIndex: number;
  setCurrentIndex: (i: number | ((prev: number) => number)) => void;
  hasNextPage: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const { fetchAll, queryKey, enabled = true, pageSize = DEFAULT_TUI_PAGE_SIZE } = options;
  const [allItems, setAllItems] = useState<T[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const fetchAllRef = useRef(fetchAll);
  fetchAllRef.current = fetchAll;

  useEffect(() => {
    if (!enabled) {
      setAllItems([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      setCurrentIndex(0);
      try {
        const items = await fetchAllRef.current();
        if (!cancelled) setAllItems(items);
      } catch (err: unknown) {
        if (!cancelled) setError(translateApiError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [queryKey, refreshKey, enabled]);

  const { slice, hasNextPage } = sliceLocalPage(allItems, currentIndex, pageSize);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
    setError(null);
  }, []);

  return {
    items: slice,
    allItems,
    currentIndex,
    setCurrentIndex,
    hasNextPage,
    loading,
    error,
    refresh,
  };
}