import { useCallback, useState } from 'react';

import { asRecord, type JsonMap } from '@/services/admin-dashboard/dashboardPrimitives';

type InvokeAction = (action: string, payload: Record<string, unknown>) => Promise<unknown>;

type RunInvestigationAction = (
  action: string,
  payload: Record<string, unknown>,
  onSuccess: (result: JsonMap) => void,
) => Promise<void>;

type UseInvestigationActionResult = {
  investigationBusy: string;
  investigationError: string;
  runInvestigationAction: RunInvestigationAction;
};

export function useInvestigationAction(invokeAction: InvokeAction): UseInvestigationActionResult {
  const [investigationBusy, setInvestigationBusy] = useState<string>('');
  const [investigationError, setInvestigationError] = useState<string>('');

  const runInvestigationAction = useCallback<RunInvestigationAction>(async (
    action,
    payload,
    onSuccess,
  ) => {
    setInvestigationBusy(action);
    setInvestigationError('');
    try {
      const data = await invokeAction(action, payload);
      onSuccess(asRecord(data));
    } catch (error) {
      setInvestigationError(error instanceof Error ? error.message : String(error));
    } finally {
      setInvestigationBusy('');
    }
  }, [invokeAction]);

  return {
    investigationBusy,
    investigationError,
    runInvestigationAction,
  };
}
