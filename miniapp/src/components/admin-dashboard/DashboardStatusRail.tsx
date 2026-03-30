import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { ActionTelemetry } from '@/hooks/admin-dashboard/useDashboardActions';
import type { DashboardAuthTelemetry } from '@/hooks/admin-dashboard/useDashboardSyncLoaders';
import { UiBadge, UiButton, UiCard, UiStatePanel } from '@/components/ui/AdminPrimitives';
import type { DashboardReliabilityState } from '@/services/admin-dashboard/dashboardReliabilityState';
import { describeDashboardRefreshFailure } from '@/services/admin-dashboard/dashboardSessionErrors';

export type RefreshFailureDiagnostics = {
  failureClass: string;
  endpoint: string;
  code: string;
  correlationId: string;
  traceHint: string;
  retries: number;
};

export type DashboardAuthTelemetryState = DashboardAuthTelemetry;

type DashboardStatusRailProps = {
  loading: boolean;
  error: string;
  errorCode: string;
  refreshFailureDiagnostics: RefreshFailureDiagnostics | null;
  authTelemetry: DashboardAuthTelemetryState;
  notice: string;
  noticeTone: 'info' | 'success' | 'warning' | 'error';
  busyAction: string;
  syncHealthState: DashboardReliabilityState;
  syncModeLabel: string;
  syncHealthMessage: string;
  streamModeLabel: string;
  streamLastEventLabel: string;
  lastPollLabel: string;
  lastSuccessfulPollLabel: string;
  nextPollLabel: string;
  pollFreshnessLabel: string;
  pollFailureCount: number;
  streamFailureCount: number;
  bridgeHardFailures: number;
  bridgeSoftFailures: number;
  degradedCauses: string[];
  actionTelemetry: ActionTelemetry;
};

type FailureGroup = {
  key: string;
  label: string;
  count: number;
};

type DiagnosticsCopyStatus = 'idle' | 'copied' | 'error';

function classifyErrorCodeFailureGroup(code: string): string {
  const normalizedCode = code.trim().toLowerCase();
  if (!normalizedCode) return 'runtime';
  if (normalizedCode.startsWith('miniapp_')) return 'session-auth';
  if (normalizedCode.startsWith('http_')) return 'http';
  return 'runtime';
}

function buildFailureGroups(options: {
  pollFailureCount: number;
  streamFailureCount: number;
  bridgeHardFailures: number;
  bridgeSoftFailures: number;
  refreshFailureClass: string;
  actionTelemetry: ActionTelemetry;
  errorCode: string;
  error: string;
}): FailureGroup[] {
  const groups = new Map<string, number>();
  const addGroup = (key: string, count: number): void => {
    const safeCount = Number.isFinite(count) ? Math.max(0, Math.trunc(count)) : 0;
    if (safeCount <= 0) return;
    groups.set(key, (groups.get(key) || 0) + safeCount);
  };
  const refreshFailureClass = options.refreshFailureClass.trim().toLowerCase();
  if (refreshFailureClass && refreshFailureClass !== 'n/a') {
    addGroup(refreshFailureClass, 1);
  }
  addGroup('poll-sync', options.pollFailureCount);
  addGroup('stream-sync', options.streamFailureCount);
  addGroup('bridge-hard', options.bridgeHardFailures);
  addGroup('bridge-soft', options.bridgeSoftFailures);
  if (options.actionTelemetry.status === 'error') {
    addGroup('action', 1);
  }
  if (options.error.trim()) {
    addGroup(classifyErrorCodeFailureGroup(options.errorCode), 1);
  }

  const groupLabels: Record<string, string> = {
    action: 'Action',
    'bridge-hard': 'Bridge hard',
    'bridge-soft': 'Bridge soft',
    http: 'HTTP',
    'poll-sync': 'Poll',
    runtime: 'Runtime',
    'session-auth': 'Session auth',
    'session-init-data': 'Init data',
    'session-token': 'Session token',
    'stream-sync': 'Stream',
    'sync-runtime': 'Sync runtime',
  };

  return Array.from(groups.entries())
    .map(([key, count]) => ({
      key,
      label: groupLabels[key] || key,
      count,
    }))
    .sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count;
      return left.label.localeCompare(right.label);
    });
}

function statusLabel(status: ActionTelemetry['status']): string {
  switch (status) {
    case 'running':
      return 'Running';
    case 'success':
      return 'Healthy';
    case 'error':
      return 'Errored';
    default:
      return 'Idle';
  }
}

function noticeToneToStateTone(
  tone: DashboardStatusRailProps['noticeTone'],
): 'info' | 'success' | 'warning' | 'error' {
  switch (tone) {
    case 'success':
      return 'success';
    case 'warning':
      return 'warning';
    case 'error':
      return 'error';
    default:
      return 'info';
  }
}

function noticeTitle(tone: DashboardStatusRailProps['noticeTone']): string {
  switch (tone) {
    case 'success':
      return 'Action completed';
    case 'warning':
      return 'Attention needed';
    case 'error':
      return 'Action failed';
    default:
      return 'Dashboard notice';
  }
}

function formatTelemetryTimestamp(value: number | null): string {
  if (!Number.isFinite(value) || value === null) return 'n/a';
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return 'n/a';
  return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

async function copyTextToClipboard(value: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Fall through to legacy copy path.
    }
  }
  if (typeof document === 'undefined') return false;
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);
  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  }
  document.body.removeChild(textarea);
  return copied;
}

export function DashboardStatusRail({
  loading,
  error,
  errorCode,
  refreshFailureDiagnostics,
  authTelemetry,
  notice,
  noticeTone,
  busyAction,
  syncHealthState,
  syncModeLabel,
  syncHealthMessage,
  streamModeLabel,
  streamLastEventLabel,
  lastPollLabel,
  lastSuccessfulPollLabel,
  nextPollLabel,
  pollFreshnessLabel,
  pollFailureCount,
  streamFailureCount,
  bridgeHardFailures,
  bridgeSoftFailures,
  degradedCauses,
  actionTelemetry,
}: DashboardStatusRailProps) {
  const [copyStatus, setCopyStatus] = useState<DiagnosticsCopyStatus>('idle');
  const copyResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasActionTelemetry = actionTelemetry.action.length > 0;
  const isBusy = busyAction.length > 0;
  const refreshFailure = describeDashboardRefreshFailure(errorCode, error);
  const shouldShowOpsDiagnostics = syncHealthState !== 'healthy'
    || pollFailureCount > 0
    || streamFailureCount > 0
    || bridgeSoftFailures > 0
    || authTelemetry.authDegraded
    || authTelemetry.expiryEvents > 0
    || authTelemetry.recoveryEvents > 0
    || actionTelemetry.status === 'error'
    || error.length > 0;
  const diagCorrelationId = refreshFailureDiagnostics?.correlationId || 'n/a';
  const diagTraceHint = refreshFailureDiagnostics?.traceHint || actionTelemetry.traceHint || 'n/a';
  const diagFailureClass = refreshFailureDiagnostics?.failureClass || 'n/a';
  const diagEndpoint = refreshFailureDiagnostics?.endpoint || 'n/a';
  const diagCode = refreshFailureDiagnostics?.code || 'n/a';
  const diagRetries = refreshFailureDiagnostics?.retries ?? 0;
  const failureGroups = buildFailureGroups({
    pollFailureCount,
    streamFailureCount,
    bridgeHardFailures,
    bridgeSoftFailures,
    refreshFailureClass: diagFailureClass,
    actionTelemetry,
    errorCode,
    error,
  });
  const failureGroupSummary = failureGroups.length > 0
    ? failureGroups.slice(0, 5).map((group) => `${group.label} (${group.count})`).join(', ')
    : 'None';
  const degradedCauseSummary = degradedCauses.length > 0
    ? degradedCauses.slice(0, 3).join('; ')
    : 'None';
  const authHealthLabel = authTelemetry.authDegraded
    ? 'Degraded'
    : authTelemetry.expiryEvents > 0
      ? 'Recovered'
      : 'Stable';
  const lastAuthExpiryLabel = formatTelemetryTimestamp(authTelemetry.lastExpiryAt);
  const lastAuthRecoveryLabel = formatTelemetryTimestamp(authTelemetry.lastRecoveryAt);
  const syncBadgeVariant = syncHealthState === 'healthy'
    ? 'success'
    : (syncHealthState === 'blocked' || syncHealthState === 'offline')
      ? 'error'
      : 'info';
  const diagnosticsSummary = useMemo(() => [
    `sync_mode=${syncModeLabel}`,
    `sync_health=${syncHealthState}`,
    `sync_message=${JSON.stringify(syncHealthMessage)}`,
    `stream_mode=${streamModeLabel}`,
    `stream_last_event=${JSON.stringify(streamLastEventLabel)}`,
    `poll_failure_count=${pollFailureCount}`,
    `stream_failure_count=${streamFailureCount}`,
    `bridge_hard_failures=${bridgeHardFailures}`,
    `bridge_soft_failures=${bridgeSoftFailures}`,
    `poll_freshness=${JSON.stringify(pollFreshnessLabel)}`,
    `last_poll=${JSON.stringify(lastPollLabel)}`,
    `last_successful_poll=${JSON.stringify(lastSuccessfulPollLabel)}`,
    `next_poll=${JSON.stringify(nextPollLabel)}`,
    `degraded_causes=${JSON.stringify(degradedCauseSummary)}`,
    `failure_class=${diagFailureClass}`,
    `failure_groups=${JSON.stringify(failureGroupSummary)}`,
    `endpoint=${diagEndpoint}`,
    `code=${diagCode}`,
    `error_code=${errorCode || 'n/a'}`,
    `correlation_id=${diagCorrelationId}`,
    `trace_hint=${diagTraceHint}`,
    `retries=${diagRetries}`,
    `auth_health=${authHealthLabel}`,
    `auth_expiries=${authTelemetry.expiryEvents}`,
    `auth_recoveries=${authTelemetry.recoveryEvents}`,
    `last_auth_expiry=${JSON.stringify(lastAuthExpiryLabel)}`,
    `last_auth_recovery=${JSON.stringify(lastAuthRecoveryLabel)}`,
    `last_expiry_code=${authTelemetry.lastExpiryCode}`,
    `last_failure_class=${authTelemetry.lastFailureClass}`,
    `last_recovery_source=${authTelemetry.lastRecoverySource}`,
    `action_name=${actionTelemetry.action || 'n/a'}`,
    `action_status=${actionTelemetry.status}`,
    `action_latency_ms=${actionTelemetry.latencyMs}`,
    `action_error=${JSON.stringify(actionTelemetry.error || 'n/a')}`,
    `notice_tone=${noticeTone}`,
    `notice=${JSON.stringify(notice || 'n/a')}`,
    `dashboard_error=${JSON.stringify(error || 'n/a')}`,
  ].join('\n'), [
    syncModeLabel,
    syncHealthState,
    syncHealthMessage,
    streamModeLabel,
    streamLastEventLabel,
    pollFailureCount,
    streamFailureCount,
    bridgeHardFailures,
    bridgeSoftFailures,
    pollFreshnessLabel,
    lastPollLabel,
    lastSuccessfulPollLabel,
    nextPollLabel,
    degradedCauseSummary,
    diagFailureClass,
    failureGroupSummary,
    diagEndpoint,
    diagCode,
    errorCode,
    diagCorrelationId,
    diagTraceHint,
    diagRetries,
    authHealthLabel,
    authTelemetry.expiryEvents,
    authTelemetry.recoveryEvents,
    lastAuthExpiryLabel,
    lastAuthRecoveryLabel,
    authTelemetry.lastExpiryCode,
    authTelemetry.lastFailureClass,
    authTelemetry.lastRecoverySource,
    actionTelemetry.action,
    actionTelemetry.status,
    actionTelemetry.latencyMs,
    actionTelemetry.error,
    noticeTone,
    notice,
    error,
  ]);

  const scheduleCopyStatusReset = useCallback(() => {
    if (copyResetTimeoutRef.current) {
      clearTimeout(copyResetTimeoutRef.current);
    }
    copyResetTimeoutRef.current = setTimeout(() => {
      setCopyStatus('idle');
      copyResetTimeoutRef.current = null;
    }, 2000);
  }, []);

  const handleCopyDiagnostics = useCallback(async () => {
    const generatedAt = new Date().toISOString();
    const copied = await copyTextToClipboard(
      `voicednut_dashboard_diagnostics\ngenerated_at=${generatedAt}\n${diagnosticsSummary}`,
    );
    setCopyStatus(copied ? 'copied' : 'error');
    scheduleCopyStatusReset();
  }, [diagnosticsSummary, scheduleCopyStatusReset]);

  useEffect(() => () => {
    if (copyResetTimeoutRef.current) {
      clearTimeout(copyResetTimeoutRef.current);
    }
  }, []);

  const copyButtonLabel = copyStatus === 'copied'
    ? 'Copied'
    : copyStatus === 'error'
      ? 'Copy failed'
      : 'Copy diagnostics';

  return (
    <section
      className={`va-status-rail ${isBusy ? 'is-busy' : ''}`}
      aria-label="Dashboard sync and action status"
    >
      <UiCard tone="status">
        <div className="va-status-chip-row">
          <UiBadge variant={syncBadgeVariant}>Sync {syncModeLabel}</UiBadge>
          <UiBadge>Poll failures {pollFailureCount}</UiBadge>
          <UiBadge>Stream failures {streamFailureCount}</UiBadge>
          <UiBadge>Bridge 5xx {bridgeHardFailures}</UiBadge>
          <UiBadge>Bridge 4xx/5xx {bridgeSoftFailures}</UiBadge>
          <UiBadge>Busy {busyAction || 'none'}</UiBadge>
        </div>
        <p className="va-status-line" role="status" aria-live="polite" aria-atomic="true">
          {syncHealthMessage}
        </p>
        <p className="va-status-line" role="status" aria-live="polite" aria-atomic="true">
          Auth stability {authHealthLabel} • Expiries {authTelemetry.expiryEvents} • Recoveries {authTelemetry.recoveryEvents}
        </p>
        {hasActionTelemetry ? (
          <p className="va-status-line" role="status" aria-live="polite" aria-atomic="true">
            Action {actionTelemetry.action} • Status {statusLabel(actionTelemetry.status)} • Trace {actionTelemetry.traceHint || 'n/a'} • Latency {actionTelemetry.latencyMs}ms
          </p>
        ) : null}
        {actionTelemetry.status === 'error' && actionTelemetry.error ? (
          <p className="va-error" role="alert" aria-live="assertive">{actionTelemetry.error}</p>
        ) : null}
        {shouldShowOpsDiagnostics ? (
          <div className="va-status-diagnostics" role="note" aria-label="Operator diagnostics">
            <div className="va-status-diagnostics-head">
              <p className="va-status-diagnostics-title">Operator diagnostics</p>
              <UiButton
                variant="chip"
                className={`va-status-diagnostics-copy ${copyStatus === 'copied' ? 'is-copied' : ''} ${copyStatus === 'error' ? 'is-error' : ''}`}
                onClick={() => {
                  void handleCopyDiagnostics();
                }}
                aria-label="Copy operator diagnostics"
              >
                {copyButtonLabel}
              </UiButton>
            </div>
            {copyStatus !== 'idle' ? (
              <p
                className={`va-status-diagnostics-copy-feedback ${copyStatus === 'error' ? 'is-error' : ''}`}
                role={copyStatus === 'error' ? 'alert' : 'status'}
                aria-live={copyStatus === 'error' ? 'assertive' : 'polite'}
              >
                {copyStatus === 'copied'
                  ? 'Diagnostics bundle copied to clipboard.'
                  : 'Clipboard unavailable. Copy failed.'}
              </p>
            ) : null}
            <div className="va-status-diagnostics-grid">
              <p className="va-status-diagnostics-item">
                <span>Sync mode</span>
                <strong>{syncModeLabel}</strong>
              </p>
              <p className="va-status-diagnostics-item">
                <span>Stream mode</span>
                <strong>{streamModeLabel}</strong>
              </p>
              <p className="va-status-diagnostics-item">
                <span>Last stream event</span>
                <strong>{streamLastEventLabel}</strong>
              </p>
              <p className="va-status-diagnostics-item">
                <span>Next poll</span>
                <strong>{nextPollLabel}</strong>
              </p>
              <p className="va-status-diagnostics-item">
                <span>Last poll</span>
                <strong>{lastPollLabel}</strong>
              </p>
              <p className="va-status-diagnostics-item">
                <span>Last successful poll</span>
                <strong>{lastSuccessfulPollLabel}</strong>
              </p>
              <p className="va-status-diagnostics-item">
                <span>Poll freshness</span>
                <strong>{pollFreshnessLabel}</strong>
              </p>
              <p className="va-status-diagnostics-item">
                <span>Degraded causes</span>
                <strong>{degradedCauseSummary}</strong>
              </p>
              <p className="va-status-diagnostics-item">
                <span>Failure class</span>
                <strong>{diagFailureClass}</strong>
              </p>
              <p className="va-status-diagnostics-item">
                <span>Auth health</span>
                <strong>{authHealthLabel}</strong>
              </p>
              <p className="va-status-diagnostics-item">
                <span>Auth expiries</span>
                <strong>{authTelemetry.expiryEvents}</strong>
              </p>
              <p className="va-status-diagnostics-item">
                <span>Auth recoveries</span>
                <strong>{authTelemetry.recoveryEvents}</strong>
              </p>
              <p className="va-status-diagnostics-item">
                <span>Failure groups</span>
                <strong>{failureGroupSummary}</strong>
              </p>
              <p className="va-status-diagnostics-item">
                <span>Endpoint</span>
                <strong>{diagEndpoint}</strong>
              </p>
              <p className="va-status-diagnostics-item">
                <span>Code</span>
                <strong>{diagCode}</strong>
              </p>
              <p className="va-status-diagnostics-item">
                <span>Correlation ID</span>
                <strong>{diagCorrelationId}</strong>
              </p>
              <p className="va-status-diagnostics-item">
                <span>Trace hint</span>
                <strong>{diagTraceHint}</strong>
              </p>
              <p className="va-status-diagnostics-item">
                <span>Retries</span>
                <strong>{diagRetries}</strong>
              </p>
              <p className="va-status-diagnostics-item">
                <span>Last auth expiry</span>
                <strong>{lastAuthExpiryLabel}</strong>
              </p>
              <p className="va-status-diagnostics-item">
                <span>Last auth recovery</span>
                <strong>{lastAuthRecoveryLabel}</strong>
              </p>
              <p className="va-status-diagnostics-item">
                <span>Last expiry code</span>
                <strong>{authTelemetry.lastExpiryCode}</strong>
              </p>
              <p className="va-status-diagnostics-item">
                <span>Recovery source</span>
                <strong>{authTelemetry.lastRecoverySource}</strong>
              </p>
            </div>
          </div>
        ) : null}
      </UiCard>
      {loading || error || notice ? (
        <div className="va-status-state-stack">
          {loading ? (
            <UiStatePanel
              compact
              title="Preparing dashboard"
              description="Loading latest telemetry, permissions, and module status."
            />
          ) : null}
          {error ? (
            <>
              <UiStatePanel
                tone="error"
                title={refreshFailure.title}
                description={refreshFailure.description}
              />
            </>
          ) : null}
          {notice ? (
            <UiStatePanel
              compact
              tone={noticeToneToStateTone(noticeTone)}
              title={noticeTitle(noticeTone)}
              description={notice}
            />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
