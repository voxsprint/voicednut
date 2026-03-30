import { UiButton, UiCard, UiSkeletonLine, UiStatePanel } from '@/components/ui/AdminPrimitives';
import { describeSessionBlockedReason } from '@/services/admin-dashboard/dashboardSessionErrors';

type ModuleErrorFallbackCardProps = {
  moduleLabel: string;
  onReload: () => void;
  reloadDisabled: boolean;
};

type SessionBlockedCardProps = {
  errorCode: string;
  onRetrySession: () => void;
  retryDisabled: boolean;
  onCloseMiniApp?: () => void;
  closeDisabled?: boolean;
};

type EmptyModulesCardProps = {
  onRefreshAccess: () => void;
  refreshDisabled: boolean;
};

type ModuleSkeletonGridProps = {
  labels?: string[];
};

type LoadingTelemetryCardProps = {
  visible: boolean;
  title: string;
  description: string;
};

const DEFAULT_SKELETON_LABELS = ['Loading module', 'Preparing data', 'Syncing controls'];

export function ModuleErrorFallbackCard({
  moduleLabel,
  onReload,
  reloadDisabled,
}: ModuleErrorFallbackCardProps) {
  return (
    <UiCard tone="fallback">
      <UiStatePanel
        tone="warning"
        title={`${moduleLabel} is temporarily unavailable`}
        description="This module hit a render-time error. Refresh data and reopen the module."
        actions={(
          <UiButton
            variant="secondary"
            onClick={onReload}
            disabled={reloadDisabled}
          >
            Reload Module Data
          </UiButton>
        )}
      />
    </UiCard>
  );
}

export function SessionBlockedCard({
  errorCode,
  onRetrySession,
  retryDisabled,
  onCloseMiniApp,
  closeDisabled = false,
}: SessionBlockedCardProps) {
  const normalizedCode = errorCode || 'miniapp_auth_invalid';
  const reason = describeSessionBlockedReason(normalizedCode);
  return (
    <section className="va-grid">
      <UiCard tone="blocked">
        <UiStatePanel
          tone="error"
          title="Mini App session blocked"
          description={(
            <>
              Code <strong>{normalizedCode}</strong>. {reason}
            </>
          )}
          actions={(
            <>
              <UiButton
                variant="secondary"
                onClick={onRetrySession}
                disabled={retryDisabled}
              >
                Retry Session
              </UiButton>
              {onCloseMiniApp ? (
                <UiButton
                  variant="primary"
                  onClick={onCloseMiniApp}
                  disabled={closeDisabled}
                >
                  Close Mini App
                </UiButton>
              ) : null}
            </>
          )}
        />
      </UiCard>
    </section>
  );
}

export function EmptyModulesCard({
  onRefreshAccess,
  refreshDisabled,
}: EmptyModulesCardProps) {
  return (
    <section className="va-grid">
      <UiCard tone="empty">
        <UiStatePanel
          title="No modules available"
          description="This role has no enabled modules yet. Ask an administrator to grant access, then refresh."
          actions={(
            <UiButton
              variant="primary"
              onClick={onRefreshAccess}
              disabled={refreshDisabled}
            >
              Refresh Access
            </UiButton>
          )}
        />
      </UiCard>
    </section>
  );
}

export function ModuleSkeletonGrid({
  labels = DEFAULT_SKELETON_LABELS,
}: ModuleSkeletonGridProps) {
  return (
    <section className="va-grid va-module-skeleton-grid">
      {labels.map((label) => (
        <UiCard key={label} className="va-module-skeleton-card">
          <div className="va-module-skeleton-title" />
          <UiSkeletonLine />
          <UiSkeletonLine short />
          <p className="va-muted">{label}...</p>
        </UiCard>
      ))}
    </section>
  );
}

export function LoadingTelemetryCard({
  visible,
  title,
  description,
}: LoadingTelemetryCardProps) {
  if (!visible) return null;
  return (
    <section className="va-grid">
      <UiCard>
        <UiStatePanel
          title={title}
          description={description}
          tone="info"
        />
      </UiCard>
    </section>
  );
}
