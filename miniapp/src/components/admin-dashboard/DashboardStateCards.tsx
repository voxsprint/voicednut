import { UiButton, UiCard, UiSkeletonLine, UiStatePanel } from '@/components/ui/AdminPrimitives';

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

function describeSessionBlockedReason(errorCode: string): string {
  const code = String(errorCode || '').trim();
  if (code === 'miniapp_init_data_expired') {
    return 'Telegram launch credentials expired. Reopen this Mini App from the bot menu, then retry.';
  }
  if (code === 'miniapp_missing_init_data') {
    return 'Telegram launch credentials are missing. Open this Mini App from Telegram and retry.';
  }
  if (code === 'miniapp_invalid_signature') {
    return 'Telegram launch credentials are invalid for this backend bot token. Reopen the Mini App from the correct bot.';
  }
  return 'Open this Mini App from the Telegram bot menu, then retry the session.';
}

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
