import { useCallback } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import type { ActivityStatus } from '@/hooks/admin-dashboard/useDashboardActivityFeed';
import {
  asRecord,
} from '@/services/admin-dashboard/dashboardPrimitives';
import {
  isSessionBootstrapBlockingCode,
} from '@/services/admin-dashboard/dashboardTransport';
import {
  validateBootstrapPayload,
  validatePollPayload,
  validateStreamPayload,
} from '@/services/admin-dashboard/dashboardApiContracts';
import {
  getDashboardErrorCode,
  isAbortError,
} from '@/pages/AdminDashboard/dashboardPayloadHelpers';
import type {
  CallScriptsPayload,
  DashboardApiPayload,
  MiniAppAuditPayload,
  MiniAppIncidentsPayload,
  MiniAppUsersPayload,
} from '@/pages/AdminDashboard/dashboardPayloadTypes';

type PushActivity = (status: ActivityStatus, title: string, detail: string) => void;

type UseDashboardSyncLoadersOptions = {
  request: <T,>(path: string, options?: RequestInit) => Promise<T>;
  pushActivity: PushActivity;
  stateEpochRef: MutableRefObject<number>;
  bootstrapRequestSeqRef: MutableRefObject<number>;
  pollRequestSeqRef: MutableRefObject<number>;
  bootstrapAbortRef: MutableRefObject<AbortController | null>;
  pollAbortRef: MutableRefObject<AbortController | null>;
  pollFailureNotedRef: MutableRefObject<boolean>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string>>;
  setPollFailureCount: Dispatch<SetStateAction<number>>;
  setBootstrap: Dispatch<SetStateAction<DashboardApiPayload | null>>;
  setPollPayload: Dispatch<SetStateAction<DashboardApiPayload | null>>;
  setLastPollAt: Dispatch<SetStateAction<number | null>>;
  setLastSuccessfulPollAt: Dispatch<SetStateAction<number | null>>;
  setUsersSnapshot: Dispatch<SetStateAction<MiniAppUsersPayload | null>>;
  setAuditSnapshot: Dispatch<SetStateAction<MiniAppAuditPayload | null>>;
  setIncidentsSnapshot: Dispatch<SetStateAction<MiniAppIncidentsPayload | null>>;
  setCallScriptsSnapshot: Dispatch<SetStateAction<CallScriptsPayload | null>>;
  setRuntimeCanaryInput: Dispatch<SetStateAction<string>>;
};

type UseDashboardSyncLoadersResult = {
  loadBootstrap: () => Promise<void>;
  loadPoll: () => Promise<boolean>;
  applyStreamPayload: (raw: unknown) => boolean;
};

export function useDashboardSyncLoaders({
  request,
  pushActivity,
  stateEpochRef,
  bootstrapRequestSeqRef,
  pollRequestSeqRef,
  bootstrapAbortRef,
  pollAbortRef,
  pollFailureNotedRef,
  setLoading,
  setError,
  setPollFailureCount,
  setBootstrap,
  setPollPayload,
  setLastPollAt,
  setLastSuccessfulPollAt,
  setUsersSnapshot,
  setAuditSnapshot,
  setIncidentsSnapshot,
  setCallScriptsSnapshot,
  setRuntimeCanaryInput,
}: UseDashboardSyncLoadersOptions): UseDashboardSyncLoadersResult {
  const loadBootstrap = useCallback(async (): Promise<void> => {
    const requestSeq = bootstrapRequestSeqRef.current + 1;
    bootstrapRequestSeqRef.current = requestSeq;
    const requestEpoch = stateEpochRef.current + 1;
    stateEpochRef.current = requestEpoch;
    if (bootstrapAbortRef.current) {
      bootstrapAbortRef.current.abort();
    }
    if (pollAbortRef.current) {
      pollAbortRef.current.abort();
    }
    const controller = new AbortController();
    bootstrapAbortRef.current = controller;
    setLoading(true);
    setError('');
    try {
      const rawPayload = asRecord(
        await request<DashboardApiPayload | null>('/miniapp/bootstrap', {
          signal: controller.signal,
        }),
      );
      const bootstrapValidation = validateBootstrapPayload(rawPayload);
      if (!bootstrapValidation.ok) {
        throw new Error(bootstrapValidation.error);
      }
      if (
        bootstrapRequestSeqRef.current !== requestSeq
        || stateEpochRef.current !== requestEpoch
      ) {
        return;
      }
      const payload = bootstrapValidation.payload as DashboardApiPayload;
      const now = Date.now();
      setBootstrap(payload);
      setPollPayload(payload);
      setLastPollAt(now);
      setLastSuccessfulPollAt(now);
      setPollFailureCount(0);
      setUsersSnapshot(payload.dashboard?.users || payload.users || null);
      setAuditSnapshot(payload.dashboard?.audit || payload.audit || null);
      setIncidentsSnapshot(payload.dashboard?.incidents || payload.incidents || null);
      setCallScriptsSnapshot(payload.dashboard?.call_scripts || payload.call_scripts || null);
      const runtimePayload = asRecord(payload.dashboard?.voice_runtime || payload.voice_runtime || {});
      const runtime = asRecord(runtimePayload.runtime);
      const overrideCanary = Number(runtime.canary_percent_override);
      if (Number.isFinite(overrideCanary)) {
        setRuntimeCanaryInput(String(Math.max(0, Math.min(100, Math.round(overrideCanary)))));
      }
      pushActivity('success', 'Dashboard synced', 'Bootstrap data loaded.');
    } catch (err) {
      if (isAbortError(err)) {
        return;
      }
      if (
        bootstrapRequestSeqRef.current !== requestSeq
        || stateEpochRef.current !== requestEpoch
      ) {
        return;
      }
      setPollFailureCount((prev) => prev + 1);
      const errorCodeFromError = getDashboardErrorCode(err);
      const blockedBySession = isSessionBootstrapBlockingCode(errorCodeFromError);
      const detail = err instanceof Error ? err.message : String(err);
      if (blockedBySession) {
        setError('');
        return;
      }
      setError(detail);
      pushActivity('error', 'Bootstrap failed', detail);
    } finally {
      if (bootstrapAbortRef.current === controller) {
        bootstrapAbortRef.current = null;
      }
      if (
        bootstrapRequestSeqRef.current === requestSeq
        && stateEpochRef.current === requestEpoch
      ) {
        setLoading(false);
      }
    }
  }, [
    bootstrapAbortRef,
    bootstrapRequestSeqRef,
    pollAbortRef,
    pushActivity,
    request,
    setAuditSnapshot,
    setBootstrap,
    setCallScriptsSnapshot,
    setError,
    setIncidentsSnapshot,
    setLastPollAt,
    setLastSuccessfulPollAt,
    setLoading,
    setPollFailureCount,
    setPollPayload,
    setRuntimeCanaryInput,
    setUsersSnapshot,
    stateEpochRef,
  ]);

  const loadPoll = useCallback(async (): Promise<boolean> => {
    const requestSeq = pollRequestSeqRef.current + 1;
    pollRequestSeqRef.current = requestSeq;
    const requestEpoch = stateEpochRef.current;
    if (pollAbortRef.current) {
      pollAbortRef.current.abort();
    }
    const controller = new AbortController();
    pollAbortRef.current = controller;
    const startedAt = Date.now();
    setLastPollAt(startedAt);
    try {
      const rawPayload = asRecord(
        await request<DashboardApiPayload | null>('/miniapp/jobs/poll', {
          signal: controller.signal,
        }),
      );
      const pollValidation = validatePollPayload(rawPayload);
      if (!pollValidation.ok) {
        throw new Error(pollValidation.error);
      }
      if (
        pollRequestSeqRef.current !== requestSeq
        || stateEpochRef.current !== requestEpoch
      ) {
        return false;
      }
      const payload = pollValidation.payload as DashboardApiPayload;
      setError('');
      setPollPayload(payload);
      setPollFailureCount(0);
      setLastSuccessfulPollAt(Date.now());
      if (payload.users) {
        setUsersSnapshot(payload.users);
      }
      if (payload.audit) {
        setAuditSnapshot(payload.audit);
      }
      if (payload.incidents) {
        setIncidentsSnapshot(payload.incidents);
      }
      if (pollFailureNotedRef.current) {
        pushActivity('success', 'Live sync recovered', 'Polling resumed successfully.');
      }
      pollFailureNotedRef.current = false;
      return true;
    } catch (err) {
      if (isAbortError(err)) {
        return false;
      }
      if (
        pollRequestSeqRef.current !== requestSeq
        || stateEpochRef.current !== requestEpoch
      ) {
        return false;
      }
      setPollFailureCount((prev) => prev + 1);
      const errorCodeFromError = getDashboardErrorCode(err);
      const blockedBySession = isSessionBootstrapBlockingCode(errorCodeFromError);
      const detail = err instanceof Error ? err.message : String(err);
      if (blockedBySession) {
        setError('');
        pollFailureNotedRef.current = false;
        return false;
      }
      setError(detail);
      if (!pollFailureNotedRef.current) {
        pushActivity('error', 'Live sync degraded', detail);
      }
      pollFailureNotedRef.current = true;
      return false;
    } finally {
      if (pollAbortRef.current === controller) {
        pollAbortRef.current = null;
      }
    }
  }, [
    pollAbortRef,
    pollFailureNotedRef,
    pollRequestSeqRef,
    pushActivity,
    request,
    setAuditSnapshot,
    setError,
    setIncidentsSnapshot,
    setLastPollAt,
    setLastSuccessfulPollAt,
    setPollFailureCount,
    setPollPayload,
    setUsersSnapshot,
    stateEpochRef,
  ]);

  const applyStreamPayload = useCallback((raw: unknown): boolean => {
    const envelope = asRecord(raw);
    const candidate = asRecord(envelope.payload ?? envelope.data ?? raw);
    const streamValidation = validateStreamPayload(candidate);
    if (!streamValidation.ok) {
      return false;
    }
    const nextPayload = streamValidation.payload as DashboardApiPayload;
    setPollPayload((prev) => ({
      ...(asRecord(prev) as DashboardApiPayload),
      ...nextPayload,
    }));
    setLastSuccessfulPollAt(Date.now());
    setPollFailureCount(0);
    setError('');

    const dashboardFromPayload = nextPayload.dashboard;
    const usersFromPayload = nextPayload.users || dashboardFromPayload?.users;
    const auditFromPayload = nextPayload.audit || dashboardFromPayload?.audit;
    const incidentsFromPayload = nextPayload.incidents || dashboardFromPayload?.incidents;
    if (usersFromPayload) setUsersSnapshot(usersFromPayload);
    if (auditFromPayload) setAuditSnapshot(auditFromPayload);
    if (incidentsFromPayload) setIncidentsSnapshot(incidentsFromPayload);
    return true;
  }, [
    setAuditSnapshot,
    setError,
    setIncidentsSnapshot,
    setLastSuccessfulPollAt,
    setPollFailureCount,
    setPollPayload,
    setUsersSnapshot,
  ]);

  return {
    loadBootstrap,
    loadPoll,
    applyStreamPayload,
  };
}
