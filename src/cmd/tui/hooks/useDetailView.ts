import { useCallback, useState } from 'react';

export function useDetailView() {
  const [title, setTitle] = useState<string | null>(null);
  const [lines, setLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clear = useCallback(() => {
    setTitle(null);
    setLines([]);
    setLoading(false);
    setError(null);
  }, []);

  const open = useCallback(async (options: {
    title: string;
    load: () => Promise<string[]>;
  }) => {
    setTitle(options.title);
    setLines([]);
    setError(null);
    setLoading(true);
    try {
      const result = await options.load();
      setLines(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load detail');
    } finally {
      setLoading(false);
    }
  }, []);

  const isOpen = title !== null || loading || error !== null;

  return { title, lines, loading, error, open, clear, isOpen };
}