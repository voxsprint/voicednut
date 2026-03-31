import { Link } from '@/components/Link/Link.tsx';
import { UiBadge, UiCard, UiDisclosure } from '@/components/ui/AdminPrimitives';
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
    <section className="va-section-block va-shell-guide-block" aria-label="Console guide">
      <UiDisclosure
        title="Guide and shortcuts"
        subtitle="Open the onboarding, launcher, or settings surfaces only when you need them."
      >
        <div className="va-grid">
          <UiCard>
            <h3>Console scope</h3>
            <div className="va-inline-metrics">
              <UiBadge>Home shell</UiBadge>
              <UiBadge>Coverage {dashboardHomeContract.workflowStatus}</UiBadge>
              <UiBadge>Fallback home</UiBadge>
            </div>
            <p className="va-muted">{dashboardHomeContract.notes}</p>
          </UiCard>

          <UiCard>
            <h3>Quick shortcuts</h3>
            <p className="va-muted">
              Use the console to open the right workspace for the task at hand. If a feature is
              not available for the current role, the app should route safely instead of exposing a
              dead end.
            </p>
            <div className="va-shortcut-list">
              <Link className="va-shortcut-link" to={MINIAPP_COMMAND_ROUTE_CONTRACTS.START}>
                <span className="va-shortcut-copy">
                  <strong>Start</strong>
                  <span>Open onboarding, access guidance, and the main launcher.</span>
                </span>
                <span className="va-shortcut-action">Open</span>
              </Link>
              <Link className="va-shortcut-link" to={MINIAPP_COMMAND_ROUTE_CONTRACTS.MENU}>
                <span className="va-shortcut-copy">
                  <strong>All workflows</strong>
                  <span>Open the quick launcher for workspaces available to this role.</span>
                </span>
                <span className="va-shortcut-action">Open</span>
              </Link>
              <Link className="va-shortcut-link" to={DASHBOARD_STATIC_ROUTE_CONTRACTS.SETTINGS}>
                <span className="va-shortcut-copy">
                  <strong>Settings</strong>
                  <span>Open app preferences, support shortcuts, and session controls.</span>
                </span>
                <span className="va-shortcut-action">Open</span>
              </Link>
            </div>
          </UiCard>
        </div>
      </UiDisclosure>
    </section>
  );
}
