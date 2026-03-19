import { useCallback, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import { asRecord } from '@/services/admin-dashboard/dashboardPrimitives';
import { validateActionEnvelope } from '@/services/admin-dashboard/dashboardApiContracts';
import {
  getDashboardActionPolicy,
  validateDashboardActionPayload,
} from '@/services/admin-dashboard/dashboardActionGuards';

export type ActionRequestMeta = {
  action_id: string;
  request_id: string;
  idempotency_key: string;
  requested_at: string;
  request_timeout_ms: number;
  source: string;
  ui_module: string;
};

export type ActionTelemetry = {
  traceHint: string;
  action: string;
  status: 'idle' | 'running' | 'success' | 'error';
  at: string;
  latencyMs: number;
  error: string;
};

type ActivityStatus = 'info' | 'success' | 'error';

type RunActionOptions = {
  confirmText?: string;
  successMessage?: string;
};

export type DashboardActionConfirmDialog = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'warning' | 'danger';
};

type UseDashboardActionsOptions = {
  createActionMeta: (action: string) => ActionRequestMeta;
  request: <T>(path: string, options?: RequestInit) => Promise<T>;
  loadBootstrap: () => Promise<void> | void;
  pushActivity: (status: ActivityStatus, title: string, detail: string) => void;
  triggerHaptic: (
    mode: 'selection' | 'impact' | 'success' | 'warning' | 'error',
    impactStyle?: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft',
  ) => void;
  setBusyAction: (value: string) => void;
  setNotice: (value: string) => void;
  setError: (value: string) => void;
  setActionLatencyMsSamples: Dispatch<SetStateAction<number[]>>;
  actionLatencySampleLimit: number;
  confirmAction?: (dialog: DashboardActionConfirmDialog) => Promise<boolean>;
  hasCapability?: (capability: string) => boolean;
};

type UseDashboardActionsResult = {
  invokeAction: (
    action: string,
    payload: Record<string, unknown>,
    metaOverride?: Partial<ActionRequestMeta>,
  ) => Promise<unknown>;
  runAction: (
    action: string,
    payload: Record<string, unknown>,
    options?: RunActionOptions,
  ) => Promise<void>;
  actionTelemetry: ActionTelemetry;
};

export function useDashboardActions({
  createActionMeta,
  request,
  loadBootstrap,
  pushActivity,
  triggerHaptic,
  setBusyAction,
  setNotice,
  setError,
  setActionLatencyMsSamples,
  actionLatencySampleLimit,
  confirmAction,
  hasCapability,
}: UseDashboardActionsOptions): UseDashboardActionsResult {
  const [actionTelemetry, setActionTelemetry] = useState<ActionTelemetry>({
    traceHint: '',
    action: '',
    status: 'idle',
    at: '',
    latencyMs: 0,
    error: '',
  });

  const invokeAction = useCallback(async (
    action: string,
    payload: Record<string, unknown>,
    metaOverride?: Partial<ActionRequestMeta>,
  ): Promise<unknown> => {
    const actionPolicy = getDashboardActionPolicy(action);
    if (actionPolicy.capability && hasCapability && !hasCapability(actionPolicy.capability)) {
      throw new Error(`Missing capability "${actionPolicy.capability}" for ${action}`);
    }
    const actionMeta: ActionRequestMeta = {
      ...createActionMeta(action),
      ...metaOverride,
    };
    const guardError = validateDashboardActionPayload(action, payload);
    if (guardError) {
      throw new Error(`Invalid payload for ${action}: ${guardError}`);
    }

    const startedAt = Date.now();
    const traceHint = actionMeta.action_id.slice(-8);
    setActionTelemetry({
      traceHint,
      action,
      status: 'running',
      at: new Date(startedAt).toISOString(),
      latencyMs: 0,
      error: '',
    });

    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), actionMeta.request_timeout_ms);
    try {
      const rawResult = await request<{ success?: boolean; data?: unknown; error?: string } | null>('/miniapp/action', {
        method: 'POST',
        signal: abortController.signal,
        headers: {
          'X-Action-Id': actionMeta.action_id,
          'X-Idempotency-Key': actionMeta.idempotency_key,
        },
        body: JSON.stringify({ action, payload, meta: actionMeta }),
      });
      const envelopeCheck = validateActionEnvelope(rawResult);
      if (!envelopeCheck.ok) {
        throw new Error(envelopeCheck.error);
      }
      const result = asRecord(envelopeCheck.payload);
      const latencyMs = Math.max(0, Date.now() - startedAt);
      setActionTelemetry({
        traceHint,
        action,
        status: 'success',
        at: new Date().toISOString(),
        latencyMs,
        error: '',
      });
      return result.data;
    } catch (err) {
      const isAbortError = err instanceof DOMException && err.name === 'AbortError';
      const detail = isAbortError
        ? `Action timed out after ${actionMeta.request_timeout_ms}ms`
        : err instanceof Error
          ? err.message
          : String(err);
      const latencyMs = Math.max(0, Date.now() - startedAt);
      setActionTelemetry({
        traceHint,
        action,
        status: 'error',
        at: new Date().toISOString(),
        latencyMs,
        error: detail,
      });
      if (isAbortError) {
        throw new Error(detail);
      }
      throw new Error(detail);
    } finally {
      clearTimeout(timeout);
    }
  }, [createActionMeta, hasCapability, request]);

  const runAction = useCallback(async (
    action: string,
    payload: Record<string, unknown>,
    options: RunActionOptions = {},
  ): Promise<void> => {
    const actionPolicy = getDashboardActionPolicy(action);
    if (actionPolicy.capability && hasCapability && !hasCapability(actionPolicy.capability)) {
      const deniedDetail = `Blocked ${action}: missing capability ${actionPolicy.capability}`;
      setError(deniedDetail);
      triggerHaptic('warning');
      pushActivity('error', 'Action blocked', deniedDetail);
      return;
    }
    const actionMeta = createActionMeta(action);
    const traceHint = actionMeta.action_id.slice(-8);
    const requiresPolicyConfirmation = actionPolicy.risk === 'danger';
    const shouldConfirm = typeof window !== 'undefined' && (Boolean(options.confirmText) || requiresPolicyConfirmation);
    if (shouldConfirm) {
      const baseConfirmMessage = options.confirmText
        || `Execute ${action}?`;
      const consequenceLine = actionPolicy.confirmConsequence
        || (actionPolicy.risk === 'danger'
          ? 'This action impacts live operations.'
          : '');
      const irreversibleLine = actionPolicy.confirmIrreversible
        ? 'This action may be irreversible.'
        : '';
      const confirmMessage = [
        baseConfirmMessage,
        consequenceLine,
        irreversibleLine,
      ].filter(Boolean).join('\n\n');
      const allowed = confirmAction
        ? await confirmAction({
          title: actionPolicy.confirmTitle || 'Confirm action',
          message: confirmMessage,
          confirmLabel: actionPolicy.confirmLabel || (actionPolicy.risk === 'danger' ? 'Proceed' : 'Confirm'),
          cancelLabel: 'Cancel',
          tone: actionPolicy.confirmTone
            || (actionPolicy.risk === 'danger' ? 'danger' : 'warning'),
        })
        : window.confirm(confirmMessage);
      if (!allowed) {
        triggerHaptic('warning');
        pushActivity('info', 'Action cancelled', `Cancelled: ${action} (trace:${traceHint})`);
        return;
      }
    }

    setBusyAction(action);
    setNotice('');
    setError('');
    const startedAt = Date.now();
    try {
      await invokeAction(action, payload, actionMeta);
      const successMessage = options.successMessage || `Action completed: ${action}`;
      setNotice(`${successMessage} [${traceHint}]`);
      triggerHaptic('success');
      pushActivity('success', 'Action completed', `${successMessage} (trace:${traceHint})`);
      await Promise.resolve(loadBootstrap());
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      setError(detail);
      triggerHaptic('error');
      pushActivity('error', `Action failed: ${action}`, `${detail} (trace:${traceHint})`);
    } finally {
      const latencyMs = Math.max(0, Date.now() - startedAt);
      setActionLatencyMsSamples((prev) => [...prev, latencyMs].slice(-actionLatencySampleLimit));
      setBusyAction('');
    }
  }, [
    actionLatencySampleLimit,
    createActionMeta,
    invokeAction,
    loadBootstrap,
    pushActivity,
    setActionLatencyMsSamples,
    setBusyAction,
    setError,
    setNotice,
    triggerHaptic,
    confirmAction,
    hasCapability,
  ]);

  return {
    invokeAction,
    runAction,
    actionTelemetry,
  };
}
