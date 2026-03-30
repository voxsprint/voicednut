import type { ActionTelemetry } from '@/hooks/admin-dashboard/useDashboardActions';
import { UiBadge, UiCard, UiStatePanel } from '@/components/ui/AdminPrimitives';
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

type DashboardStatusRailProps = {
  loading: boolean;
  error: string;
  errorCode: string;
  refreshFailureDiagnostics: RefreshFailureDiagnostics | null;
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

export function DashboardStatusRail({
  loading,
  error,
  errorCode,
  refreshFailureDiagnostics,
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
  const hasActionTelemetry = actionTelemetry.action.length > 0;
  const isBusy = busyAction.length > 0;
  const refreshFailure = describeDashboardRefreshFailure(errorCode, error);
  const shouldShowOpsDiagnostics = syncHealthState !== 'healthy'
    || pollFailureCount > 0
    || streamFailureCount > 0
    || bridgeSoftFailures > 0
    || actionTelemetry.status === 'error'
    || error.length > 0;
  const diagCorrelationId = refreshFailureDiagnostics?.correlationId || 'n/a';
  const diagTraceHint = refreshFailureDiagnostics?.traceHint || actionTelemetry.traceHint || 'n/a';
  const diagFailureClass = refreshFailureDiagnostics?.failureClass || 'n/a';
  const diagEndpoint = refreshFailureDiagnostics?.endpoint || 'n/a';
  const diagCode = refreshFailureDiagnostics?.code || 'n/a';
  const diagRetries = refreshFailureDiagnostics?.retries ?? 0;
  const degradedCauseSummary = degradedCauses.length > 0
    ? degradedCauses.slice(0, 3).join('; ')
    : 'None';
  const syncBadgeVariant = syncHealthState === 'healthy'
    ? 'success'
    : (syncHealthState === 'blocked' || syncHealthState === 'offline')
      ? 'error'
      : 'info';
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
            <p className="va-status-diagnostics-title">Operator diagnostics</p>
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
