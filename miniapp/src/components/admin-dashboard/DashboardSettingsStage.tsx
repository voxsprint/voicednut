import { Suspense, lazy } from 'react';

import { ModuleSkeletonGrid } from '@/components/admin-dashboard/DashboardStateCards';

const SettingsPage = lazy(async () => {
  const mod = await import('@/pages/AdminDashboard/SettingsPage');
  return { default: mod.SettingsPage };
});

type VisibleSettingsModule = {
  id: string;
  label: string;
};

type DashboardSettingsStageProps = {
  isOpen: boolean;
  userLabel: string;
  sessionRole: string;
  pollingPaused: boolean;
  loading: boolean;
  busy: boolean;
  settingsStatusLabel: string;
  apiBaseLabel: string;
  featureFlagsCount: number | string;
  featureFlagsSourceLabel: string;
  featureFlagsUpdatedAtLabel: string;
  visibleModules: VisibleSettingsModule[];
  onTogglePolling: () => void;
  onSyncNow: () => void;
  onRetrySession: () => void;
  onJumpToModule: (moduleId: string) => void;
};

export function DashboardSettingsStage({
  isOpen,
  userLabel,
  sessionRole,
  pollingPaused,
  loading,
  busy,
  settingsStatusLabel,
  apiBaseLabel,
  featureFlagsCount,
  featureFlagsSourceLabel,
  featureFlagsUpdatedAtLabel,
  visibleModules,
  onTogglePolling,
  onSyncNow,
  onRetrySession,
  onJumpToModule,
}: DashboardSettingsStageProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <section id="va-view-stage-root" className="va-view-stage va-view-stage-settings" tabIndex={-1}>
      <Suspense fallback={<ModuleSkeletonGrid />}>
        <SettingsPage
          userLabel={userLabel}
          sessionRole={sessionRole}
          pollingPaused={pollingPaused}
          loading={loading}
          busy={busy}
          settingsStatusLabel={settingsStatusLabel}
          apiBaseLabel={apiBaseLabel}
          featureFlagsCount={featureFlagsCount}
          featureFlagsSourceLabel={featureFlagsSourceLabel}
          featureFlagsUpdatedAtLabel={featureFlagsUpdatedAtLabel}
          visibleModules={visibleModules}
          onTogglePolling={onTogglePolling}
          onSyncNow={onSyncNow}
          onRetrySession={onRetrySession}
          onJumpToModule={onJumpToModule}
        />
      </Suspense>
    </section>
  );
}
