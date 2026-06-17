import { useCallback, useState } from 'react';

export function useDetailActions() {
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const resetStatus = useCallback(() => {
    setActionStatus(null);
    setActionBusy(false);
  }, []);

  const runAction = useCallback(async (action: () => Promise<string>) => {
    setActionBusy(true);
    setActionStatus(null);
    try {
      const message = await action();
      setActionStatus(message);
    } catch (err: unknown) {
      setActionStatus(`Error: ${err instanceof Error ? err.message : 'Action failed'}`);
    } finally {
      setActionBusy(false);
    }
  }, []);

  return { actionStatus, actionBusy, runAction, resetStatus };
}