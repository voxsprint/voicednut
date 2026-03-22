import { Suspense } from 'react';

import { DashboardFocusedModulePane } from '@/components/admin-dashboard/DashboardFocusedModulePane';
import { DashboardOverviewMetrics } from '@/components/admin-dashboard/DashboardOverviewMetrics';
import {
  EmptyModulesCard,
  ModuleSkeletonGrid,
  SessionBlockedCard,
} from '@/components/admin-dashboard/DashboardStateCards';
import {
  DashboardWorkspaceLauncher,
  type DashboardWorkspaceLauncherGroup,
} from '@/components/admin-dashboard/DashboardWorkspaceLauncher';
import type { DashboardModule } from '@/pages/AdminDashboard/dashboardShellConfig';
import type { DashboardVm } from '@/pages/AdminDashboard/types';

type DashboardViewStageProps = {
  settingsOpen: boolean;
  sessionBlocked: boolean;
  errorCode: string;
  loading: boolean;
  busy: boolean;
  onRetrySession: () => void;
  onCloseMiniApp?: () => void;
  closeDisabled: boolean;
  showOverviewMode: boolean;
  showFocusedModuleMode: boolean;
  isDashboardDegraded: boolean;
  syncModeLabel: string;
  openIncidentCount: number;
  queueBacklogTotal: number;
  lastSuccessfulPollLabel: string;
  visibleModulesCount: number;
  onRefreshAccess: () => void;
  showModuleSkeleton: boolean;
  groupedVisibleModules: DashboardWorkspaceLauncherGroup[];
  moduleShortcutIndexById: Record<string, number>;
  activeModule: DashboardModule;
  onSelectModule: (moduleId: DashboardModule) => void;
  moduleVm: DashboardVm;
  hasCapability: (capability: string) => boolean;
  moduleErrorBoundariesEnabled: boolean;
  moduleBoundaryKeySuffix: string;
  onReload: () => void;
};

export function DashboardViewStage({
  settingsOpen,
  sessionBlocked,
  errorCode,
  loading,
  busy,
  onRetrySession,
  onCloseMiniApp,
  closeDisabled,
  showOverviewMode,
  showFocusedModuleMode,
  isDashboardDegraded,
  syncModeLabel,
  openIncidentCount,
  queueBacklogTotal,
  lastSuccessfulPollLabel,
  visibleModulesCount,
  onRefreshAccess,
  showModuleSkeleton,
  groupedVisibleModules,
  moduleShortcutIndexById,
  activeModule,
  onSelectModule,
  moduleVm,
  hasCapability,
  moduleErrorBoundariesEnabled,
  moduleBoundaryKeySuffix,
  onReload,
}: DashboardViewStageProps): JSX.Element | null {
  if (settingsOpen) {
    return null;
  }

  return (
    <section id="va-view-stage-root" className="va-view-stage va-view-stage-dashboard" tabIndex={-1}>
      {sessionBlocked ? (
        <SessionBlockedCard
          errorCode={errorCode}
          onRetrySession={onRetrySession}
          retryDisabled={loading || busy}
          onCloseMiniApp={onCloseMiniApp}
          closeDisabled={closeDisabled}
        />
      ) : null}

      {!sessionBlocked && showOverviewMode ? (
        <>
          <DashboardOverviewMetrics
            isDashboardDegraded={isDashboardDegraded}
            syncModeLabel={syncModeLabel}
            openIncidentCount={openIncidentCount}
            queueBacklogTotal={queueBacklogTotal}
            lastSuccessfulPollLabel={lastSuccessfulPollLabel}
          />
          {visibleModulesCount === 0 ? (
            <EmptyModulesCard
              onRefreshAccess={onRefreshAccess}
              refreshDisabled={loading || busy}
            />
          ) : null}
          {showModuleSkeleton ? (
            <ModuleSkeletonGrid />
          ) : visibleModulesCount > 0 ? (
            <DashboardWorkspaceLauncher
              groupedVisibleModules={groupedVisibleModules}
              moduleShortcutIndexById={moduleShortcutIndexById}
              activeModule={activeModule}
              onSelectModule={onSelectModule}
            />
          ) : null}
        </>
      ) : null}

      {!sessionBlocked && showFocusedModuleMode ? (
        <>
          {visibleModulesCount === 0 ? (
            <EmptyModulesCard
              onRefreshAccess={onRefreshAccess}
              refreshDisabled={loading || busy}
            />
          ) : null}
          {showModuleSkeleton ? (
            <ModuleSkeletonGrid />
          ) : (
            <Suspense fallback={<ModuleSkeletonGrid />}>
              <DashboardFocusedModulePane
                activeModule={activeModule}
                moduleVm={moduleVm}
                hasCapability={hasCapability}
                moduleErrorBoundariesEnabled={moduleErrorBoundariesEnabled}
                moduleBoundaryKeySuffix={moduleBoundaryKeySuffix}
                onReload={onReload}
                reloadDisabled={loading || busy}
              />
            </Suspense>
          )}
        </>
      ) : null}
    </section>
  );
}
