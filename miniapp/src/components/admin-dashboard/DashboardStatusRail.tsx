import type { ActionTelemetry } from '@/hooks/admin-dashboard/useDashboardActions';
import { UiBadge, UiCard } from '@/components/ui/AdminPrimitives';
import type { DashboardReliabilityState } from '@/services/admin-dashboard/dashboardReliabilityState';

type DashboardStatusRailProps = {
  loading: boolean;
  error: string;
  notice: string;
  noticeTone: 'info' | 'success' | 'warning' | 'error';
  busyAction: string;
  syncHealthState: DashboardReliabilityState;
  syncModeLabel: string;
  syncHealthMessage: string;
  pollFailureCount: number;
  streamFailureCount: number;
  bridgeHardFailures: number;
  bridgeSoftFailures: number;
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

export function DashboardStatusRail({
  loading,
  error,
  notice,
  noticeTone,
  busyAction,
  syncHealthState,
  syncModeLabel,
  syncHealthMessage,
  pollFailureCount,
  streamFailureCount,
  bridgeHardFailures,
  bridgeSoftFailures,
  actionTelemetry,
}: DashboardStatusRailProps) {
  const hasActionTelemetry = actionTelemetry.action.length > 0;
  const isBusy = busyAction.length > 0;
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
      </UiCard>
      {loading ? <p className="va-muted" role="status" aria-live="polite">Preparing dashboard…</p> : null}
      {error ? <p className="va-error" role="alert" aria-live="assertive">{error}</p> : null}
      {notice ? (
        <p
          className={`va-notice is-${noticeTone}`}
          role={noticeTone === 'error' ? 'alert' : 'status'}
          aria-live={noticeTone === 'error' ? 'assertive' : 'polite'}
        >
          {notice}
        </p>
      ) : null}
    </section>
  );
}
