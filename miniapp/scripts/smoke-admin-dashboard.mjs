import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

function resolvePath(relativePath) {
  return path.join(root, relativePath);
}

function expectFile(relativePath) {
  const target = resolvePath(relativePath);
  assert.ok(existsSync(target), `Expected file to exist: ${relativePath}`);
  return target;
}

function read(relativePath) {
  const target = expectFile(relativePath);
  return readFileSync(target, 'utf8');
}

function expectContains(relativePath, needle) {
  const content = read(relativePath);
  assert.ok(
    content.includes(needle),
    `Expected ${relativePath} to include: ${needle}`,
  );
}

function expectNotContains(relativePath, needle) {
  const content = read(relativePath);
  assert.ok(
    !content.includes(needle),
    `Expected ${relativePath} to not include: ${needle}`,
  );
}

function parseActionGuardKeys(content) {
  const actionMapMatch = content.match(/const ACTION_GUARDS:[\s\S]*?=\s*\{([\s\S]*?)\};/);
  assert.ok(actionMapMatch, 'Could not parse ACTION_GUARDS map');
  const body = actionMapMatch[1];
  const matches = [...body.matchAll(/'([^']+)'\s*:\s*[a-zA-Z0-9_]+/g)];
  return new Set(matches.map((entry) => entry[1]));
}

function main() {
  const requiredFiles = [
    'index.html',
    'src/pages/AdminDashboard/AdminDashboardPage.tsx',
    'src/hooks/admin-dashboard/useDashboardActivityFeed.ts',
    'src/hooks/admin-dashboard/useDashboardAbortCleanup.ts',
    'src/hooks/admin-dashboard/useDashboardActions.ts',
    'src/hooks/admin-dashboard/useDashboardAuthRefs.ts',
    'src/hooks/admin-dashboard/useDashboardBootstrapLifecycle.ts',
    'src/hooks/admin-dashboard/useDashboardFocusManagement.ts',
    'src/hooks/admin-dashboard/useDashboardHaptic.ts',
    'src/hooks/admin-dashboard/useDashboardKeyboardShortcuts.ts',
    'src/hooks/admin-dashboard/useDashboardModuleRouteGuards.ts',
    'src/hooks/admin-dashboard/useDashboardNotice.ts',
    'src/hooks/admin-dashboard/useDashboardProviderSwitchDefaults.ts',
    'src/hooks/admin-dashboard/useDashboardRecipientsImport.ts',
    'src/hooks/admin-dashboard/useDashboardSessionControls.ts',
    'src/hooks/admin-dashboard/useDashboardStoredPrefs.ts',
    'src/hooks/admin-dashboard/useDashboardSyncLoaders.ts',
    'src/hooks/admin-dashboard/useDashboardTelegramButtons.ts',
    'src/hooks/admin-dashboard/useDashboardWorkspaceRouteSync.ts',
    'src/hooks/admin-dashboard/providerSwitchPlanState.ts',
    'src/services/admin-dashboard/dashboardApiContracts.ts',
    'src/services/admin-dashboard/dashboardSessionErrors.ts',
    'src/services/admin-dashboard/dashboardActionGuards.ts',
    'src/services/admin-dashboard/dashboardVm/buildDashboardVm.ts',
    'src/services/admin-dashboard/dashboardVm/buildOpsVmSection.ts',
    'src/services/admin-dashboard/dashboardVm/buildSmsVmSection.ts',
    'src/services/admin-dashboard/dashboardVm/buildMailerVmSection.ts',
    'src/services/admin-dashboard/dashboardVm/buildProviderVmSection.ts',
    'src/services/admin-dashboard/dashboardVm/buildGovernanceVmSection.ts',
    'src/pages/AdminDashboard/dashboardPayloadTypes.ts',
    'src/pages/AdminDashboard/vmSelectors.ts',
    'src/components/admin-dashboard/DashboardOverviewMetrics.tsx',
    'src/components/admin-dashboard/DashboardShellFrame.tsx',
    'src/components/admin-dashboard/DashboardTopShell.tsx',
    'src/components/admin-dashboard/DashboardWorkspaceLauncher.tsx',
    'src/components/admin-dashboard/DashboardViewStage.tsx',
    'src/index.css',
  ];
  requiredFiles.forEach(expectFile);

  const requiredGuardedActions = [
    'provider.set',
    'provider.rollback',
    'provider.preflight',
    'sms.bulk.send',
    'sms.schedule.send',
    'email.bulk.send',
    'users.role.set',
    'callscript.update',
    'callscript.submit_review',
    'callscript.review',
    'callscript.promote_live',
    'callscript.simulate',
  ];
  const actionGuardContent = read('src/services/admin-dashboard/dashboardActionGuards.ts');
  const guardKeys = parseActionGuardKeys(actionGuardContent);
  requiredGuardedActions.forEach((action) => {
    assert.ok(guardKeys.has(action), `Missing action guard mapping for: ${action}`);
  });

  expectContains('src/hooks/admin-dashboard/useDashboardActions.ts', 'validateDashboardActionPayload');
  expectContains('src/hooks/admin-dashboard/useDashboardActions.ts', 'validateActionEnvelope');
  expectContains('src/hooks/admin-dashboard/useDashboardSyncLoaders.ts', 'validateBootstrapPayload');
  expectContains('src/hooks/admin-dashboard/useDashboardSyncLoaders.ts', 'validatePollPayload');
  expectContains('src/hooks/admin-dashboard/useDashboardSyncLoaders.ts', 'validateStreamPayload');
  expectContains('src/pages/AdminDashboard/AdminDashboardPage.tsx', 'useDashboardAbortCleanup');
  expectContains('src/pages/AdminDashboard/AdminDashboardPage.tsx', 'useDashboardActivityFeed');
  expectContains('src/pages/AdminDashboard/AdminDashboardPage.tsx', 'useDashboardAuthRefs');
  expectContains('src/pages/AdminDashboard/AdminDashboardPage.tsx', 'useDashboardHaptic');
  expectContains('src/pages/AdminDashboard/AdminDashboardPage.tsx', 'useDashboardNotice');
  expectContains('src/pages/AdminDashboard/AdminDashboardPage.tsx', 'useDashboardSyncLoaders');
  expectContains('src/pages/AdminDashboard/AdminDashboardPage.tsx', 'useDashboardProviderSwitchDefaults');
  expectContains('src/pages/AdminDashboard/AdminDashboardPage.tsx', 'useDashboardSessionControls');
  expectContains('src/services/admin-dashboard/dashboardTransport.ts', 'isSessionCacheEntryExpired');
  expectContains('src/services/admin-dashboard/dashboardApiClient.ts', 'Session token expired, refreshing.');
  expectContains('src/pages/AdminDashboard/AdminDashboardPage.tsx', 'const STREAM_STALE_FALLBACK_MS = 45000;');
  expectContains('src/hooks/admin-dashboard/useDashboardEventStream.ts', 'staleAfterMs');

  expectContains('src/pages/AdminDashboard/OpsDashboardPage.tsx', 'selectOpsPageVm(vm)');
  expectContains('src/pages/AdminDashboard/SmsSenderPage.tsx', 'selectSmsPageVm(vm)');
  expectContains('src/pages/AdminDashboard/MailerPage.tsx', 'selectMailerPageVm(vm)');
  expectContains('src/pages/AdminDashboard/ProviderControlPage.tsx', 'selectProviderPageVm(vm)');
  expectContains('src/pages/AdminDashboard/ScriptStudioPage.tsx', 'selectScriptStudioPageVm(vm)');
  expectContains('src/pages/AdminDashboard/UsersRolePage.tsx', 'selectUsersRolePageVm(vm)');
  expectContains('src/pages/AdminDashboard/AuditIncidentsPage.tsx', 'selectAuditIncidentsPageVm(vm)');
  expectContains('src/pages/AdminDashboard/UsersRolePage.tsx', 'onKeyDownCapture={handleSectionShortcutKeyDown}');
  expectContains('src/pages/AdminDashboard/UsersRolePage.tsx', 'if (key !== \'/\'');
  expectContains('src/pages/AdminDashboard/UsersRolePage.tsx', 'aria-keyshortcuts="Alt+R"');
  expectContains('src/pages/AdminDashboard/AuditIncidentsPage.tsx', 'onKeyDownCapture={handleSectionShortcutKeyDown}');
  expectContains('src/pages/AdminDashboard/AuditIncidentsPage.tsx', 'if (key !== \'/\'');
  expectContains('src/pages/AdminDashboard/AuditIncidentsPage.tsx', 'aria-keyshortcuts="Alt+R"');
  expectContains('src/pages/AdminDashboard/CallLogExplorerPage.tsx', 'Search & Inspect');
  expectContains('src/pages/AdminDashboard/CallLogExplorerPage.tsx', 'No call rows loaded');
  expectContains('src/pages/AdminDashboard/MessagingInvestigationPage.tsx', 'SMS Diagnostics');
  expectContains('src/pages/AdminDashboard/MessagingInvestigationPage.tsx', 'No SMS diagnostics loaded');
  expectContains('src/pages/AdminDashboard/AdminDashboardPage.tsx', 'resolveTelegramIdentity');
  expectNotContains('src/pages/AdminDashboard/AdminDashboardPage.tsx', 'va-nav-drawer-overlay');
  expectNotContains('src/components/admin-dashboard/DashboardChrome.tsx', 'onOpenNavigation');
  expectNotContains('src/pages/AdminDashboard/AdminDashboardPage.tsx', 'Focus active panel search');
  expectContains('src/components/App.tsx', 'const adminWorkspaceRoutes = [');
  expectContains('src/components/App.tsx', "path={path} element={<AdminDashboardPage />}");
  expectContains('src/pages/AdminDashboard/AdminDashboardPage.tsx', 'parseWorkspaceRoute');
  expectContains('src/pages/AdminDashboard/AdminDashboardPage.tsx', "location.hash.replace(/^#/, '')");
  expectContains('src/pages/AdminDashboard/AdminDashboardPage.tsx', 'const showOverviewMode = !focusedWorkspaceMode && !settingsOpen;');
  expectContains('src/pages/AdminDashboard/AdminDashboardPage.tsx', '<DashboardShellFrame');
  expectContains('src/pages/AdminDashboard/AdminDashboardPage.tsx', '<DashboardTopShell');
  expectContains('src/components/admin-dashboard/DashboardWorkspaceLauncher.tsx', 'className="va-overview-launcher"');
  expectContains('src/components/admin-dashboard/DashboardWorkspaceLauncher.tsx', 'id={`va-launcher-module-${module.id}`}');
  expectContains('src/pages/AdminDashboard/AdminDashboardPage.tsx', '<DashboardViewStage');
  expectContains('src/components/admin-dashboard/DashboardViewStage.tsx', '<DashboardOverviewMetrics');
  expectContains('src/components/admin-dashboard/DashboardViewStage.tsx', '<DashboardWorkspaceLauncher');
  expectContains('src/components/admin-dashboard/DashboardTopShell.tsx', '<DashboardFocusedHeader');
  expectContains('src/components/admin-dashboard/DashboardTopShell.tsx', 'MODULE_DETAIL_DEFAULT');
  expectContains('src/components/admin-dashboard/DashboardTopShell.tsx', 'refreshFailureDiagnostics={refreshFailureDiagnostics}');
  expectContains('src/components/admin-dashboard/DashboardStatusRail.tsx', 'Operator diagnostics');
  expectContains('src/components/admin-dashboard/DashboardStatusRail.tsx', 'Failure class');
  expectContains('src/components/admin-dashboard/DashboardStatusRail.tsx', 'Correlation ID');
  expectContains('src/components/admin-dashboard/DashboardStatusRail.tsx', 'Trace hint');
  expectContains('src/hooks/admin-dashboard/useDashboardSyncLoaders.ts', 'resolveErrorCorrelationId');
  expectContains('src/hooks/admin-dashboard/useDashboardSyncLoaders.ts', 'classifyRefreshFailureCode');
  expectContains('src/hooks/admin-dashboard/useDashboardSyncLoaders.ts', 'miniapp_init_data_expired');
  expectContains('src/hooks/admin-dashboard/useDashboardSyncLoaders.ts', 'miniapp_token_expired');
  expectContains('src/services/admin-dashboard/dashboardApiClient.ts', 'resolveResponseCorrelationId');
  expectContains('src/services/admin-dashboard/dashboardApiClient.ts', 'resolveResponseRequestId');
  expectContains('src/services/admin-dashboard/dashboardTransport.ts', 'miniapp_init_data_expired');
  expectContains('src/services/admin-dashboard/dashboardTransport.ts', 'miniapp_token_expired');
  expectContains('src/services/admin-dashboard/dashboardSessionErrors.ts', 'describeDashboardRefreshFailure');
  expectContains('src/services/admin-dashboard/dashboardApiClient.ts', 'resolveResponseTraceHint');
  expectContains('src/pages/AdminDashboard/AdminDashboardPage.tsx', 'refreshFailureDiagnostics={refreshFailureDiagnostics}');
  expectContains('src/pages/AdminDashboard/AdminDashboardPage.css', '.va-status-diagnostics');
  expectContains('src/pages/AdminDashboard/AdminDashboardPage.css', '.va-status-diagnostics-grid');
  expectContains('src/pages/AdminDashboard/AdminDashboardPage.tsx', "if (!visibleModules.some((module) => module.id === moduleId)) return;");
  expectContains('src/hooks/admin-dashboard/useDashboardModuleRouteGuards.ts', "navigate(fallbackPath, { replace: true });");
  expectContains('src/hooks/admin-dashboard/useDashboardKeyboardShortcuts.ts', "toggleSettings(false, { fallbackModule: nextModule.id });");
  expectContains('src/pages/AdminDashboard/AdminDashboardPage.css', '.va-launcher-card.is-active');
  expectContains('src/pages/AdminDashboard/AdminDashboardPage.css', '@media (pointer: coarse), (max-width: 768px)');
  expectContains('src/index.css', '@media (pointer: coarse)');
  expectContains('src/index.css', 'font-size: 16px;');
  expectContains('src/pages/AdminDashboard/AdminDashboardPage.tsx', 'VITE_ADMIN_DASHBOARD_DEV_FIXTURES');
  expectContains('src/pages/AdminDashboard/AdminDashboardPage.tsx', 'resolveDashboardFixtureRequest');
  expectContains('src/hooks/admin-dashboard/useDashboardBootstrapLifecycle.ts', 'Dev fixture mode enabled');
  expectContains('index.html', 'viewport-fit=cover');
  expectContains('index.html', 'interactive-widget=resizes-content');
  expectContains('src/components/admin-dashboard/DashboardChrome.tsx', 'export function DashboardFocusedHeader');

  process.stdout.write('miniapp smoke checks passed\n');
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`miniapp smoke checks failed: ${message}\n`);
  process.exit(1);
}
