import { Cell, Navigation } from '@telegram-apps/telegram-ui';

import { Link } from '@/components/Link/Link.tsx';
import { UiBadge, UiCard } from '@/components/ui/AdminPrimitives';
import {
  DASHBOARD_PAGE_WORKFLOW_CONTRACTS,
  DASHBOARD_STATIC_ROUTE_CONTRACTS,
  MINIAPP_COMMAND_ROUTE_CONTRACTS,
} from '@/contracts/miniappParityContracts';

const dashboardHomeContract = DASHBOARD_PAGE_WORKFLOW_CONTRACTS.find(
  (contract) => contract.pageId === 'dashboard.home',
);

export function DashboardShellOwnershipCard() {
  if (!dashboardHomeContract) {
    return null;
  }

  return (
    <section className="va-section-block" aria-label="Dashboard shell contract">
      <header className="va-section-header">
        <h3 className="va-section-title">Dashboard shell contract</h3>
        <p className="va-muted">
          The dashboard root is an admin-owned shell. It can launch command workflows and composed
          workspaces, but it does not replace backend command validation or execution semantics.
        </p>
      </header>
      <section className="va-grid">
        <UiCard>
          <h3>Shell ownership</h3>
          <div className="va-inline-metrics">
            <UiBadge>Canonical {dashboardHomeContract.canonicalCommand}</UiBadge>
            <UiBadge>Parity {dashboardHomeContract.workflowStatus}</UiBadge>
            <UiBadge>Fallback {dashboardHomeContract.fallbackPath}</UiBadge>
          </div>
          <p className="va-card-eyebrow">Related commands</p>
          <div className="va-inline-tools">
            {dashboardHomeContract.relatedCommands.map((command) => (
              <UiBadge key={`dashboard-shell-${command}`}>{command}</UiBadge>
            ))}
          </div>
          <p className="va-muted">{dashboardHomeContract.notes}</p>
        </UiCard>

        <UiCard>
          <h3>Allowed shell handoffs</h3>
          <p className="va-muted">
            Use the shell to launch real command-native pages or approved composed workspaces. If a
            feature is unavailable for the current role, the shell must fall back safely instead of
            inventing a dashboard-only path.
          </p>
          <Link to={MINIAPP_COMMAND_ROUTE_CONTRACTS.START}>
            <Cell
              subtitle="Open the role-aware start workflow when the shell should hand off to command guidance."
              after={<Navigation>Open</Navigation>}
            >
              /start command page
            </Cell>
          </Link>
          <Link to={MINIAPP_COMMAND_ROUTE_CONTRACTS.MENU}>
            <Cell
              subtitle="Open the quick-actions command surface instead of replacing its visibility rules in the shell."
              after={<Navigation>Open</Navigation>}
            >
              /menu command page
            </Cell>
          </Link>
          <Link to={DASHBOARD_STATIC_ROUTE_CONTRACTS.SETTINGS}>
            <Cell
              subtitle="Open dashboard settings and support shortcuts without bypassing admin ownership."
              after={<Navigation>Open</Navigation>}
            >
              /settings shell support
            </Cell>
          </Link>
        </UiCard>
      </section>
    </section>
  );
}
