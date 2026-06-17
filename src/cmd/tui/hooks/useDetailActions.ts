import { useCallback, useState } from 'react';
import { translateApiError } from '../translateApiError.js';

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
      setActionStatus(`Error: ${translateApiError(err)}`);
    } finally {
      setActionBusy(false);
    }
  }, []);

  return { actionStatus, actionBusy, runAction, resetStatus };
}