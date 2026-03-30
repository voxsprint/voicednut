import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
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

function expectRegex(relativePath, regex, description) {
  const content = read(relativePath);
  assert.ok(
    regex.test(content),
    `Expected ${relativePath} to match ${description}: ${String(regex)}`,
  );
}

function parseActionGuardKeys(content) {
  const actionMapMatch = content.match(/const ACTION_GUARDS:[\s\S]*?=\s*\{([\s\S]*?)\};/);
  assert.ok(actionMapMatch, 'Could not parse ACTION_GUARDS map');
  const body = actionMapMatch[1];
  const matches = [...body.matchAll(/'([^']+)'\s*:\s*[a-zA-Z0-9_]+/g)];
  return new Set(matches.map((entry) => entry[1]));
}

function parseStringListWithin(content, regex, label) {
  const match = content.match(regex);
  assert.ok(match, `Could not parse ${label}`);
  const body = match[1];
  return new Set([...body.matchAll(/'([^']+)'/g)].map((entry) => entry[1]));
}

function listSourceFiles(relativeDir, extensions = ['.ts', '.tsx']) {
  const rootDir = resolvePath(relativeDir);
  const files = [];
  const walk = (currentDir) => {
    const entries = readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(absolute);
        continue;
      }
      if (!extensions.some((ext) => absolute.endsWith(ext))) continue;
      files.push(absolute);
    }
  };
  if (existsSync(rootDir) && statSync(rootDir).isDirectory()) {
    walk(rootDir);
  }
  return files;
}

function parseActionCalls(content) {
  const matches = [...content.matchAll(/(?:runAction|invokeAction)\(\s*'([a-z0-9._]+)'/g)];
  return new Set(matches.map((match) => match[1]));
}

function parseBackendActions(content) {
  const matches = [...content.matchAll(/normalizedAction === "([a-z0-9._]+)"/g)];
  return new Set(matches.map((match) => match[1]));
}

function parseActionAliases(content) {
  const aliasMapMatch = content.match(/const ACTION_ALIASES:[\s\S]*?=\s*\{([\s\S]*?)\};/);
  assert.ok(aliasMapMatch, 'Could not parse ACTION_ALIASES map');
  const body = aliasMapMatch[1];
  const aliases = new Map();
  for (const match of body.matchAll(/'([^']+)'\s*:\s*'([^']+)'/g)) {
    aliases.set(match[1], match[2]);
  }
  return aliases;
}

function main() {
  const requiredFiles = [
    'index.html',
    'src/pages/AdminDashboard/AdminDashboardPage.tsx',
    'src/hooks/admin-dashboard/useDashboardActivityFeed.ts',
    'src/hooks/admin-dashboard/useDashboardAbortCleanup.ts',
    'src/hooks/admin-dashboard/useDashboardActions.ts',
    'src/hooks/admin-dashboard/useDashboardAuthRefs.ts',
    'src/hooks/admin-dashboard/useDashboardBootstrap.ts',
    'src/hooks/admin-dashboard/useDashboardFocusManagement.ts',
    'src/hooks/admin-dashboard/useDashboardHaptic.ts',
    'src/hooks/admin-dashboard/useDashboardShortcuts.ts',
    'src/hooks/admin-dashboard/useDashboardRouteGuards.ts',
    'src/hooks/admin-dashboard/useDashboardNotice.ts',
    'src/hooks/admin-dashboard/useDashboardProviderDefaults.ts',
    'src/hooks/admin-dashboard/useDashboardRecipientImport.ts',
    'src/hooks/admin-dashboard/useDashboardSessionControls.ts',
    'src/hooks/admin-dashboard/useDashboardStoredPrefs.ts',
    'src/hooks/admin-dashboard/useDashboardSyncLoaders.ts',
    'src/hooks/admin-dashboard/useDashboardTelegramButtons.ts',
    'src/hooks/admin-dashboard/useDashboardWorkspaceSync.ts',
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

  const transportContent = read('src/services/admin-dashboard/dashboardTransport.ts');
  const blockingCodes = parseStringListWithin(
    transportContent,
    /export function isSessionBootstrapBlockingCode\(code: string\): boolean \{\s*return \[([\s\S]*?)\]\.includes/s,
    'session bootstrap blocking code list',
  );
  [
    'miniapp_init_data_expired',
    'miniapp_token_expired',
    'miniapp_token_revoked',
    'miniapp_missing_init_data',
    'miniapp_invalid_signature',
  ].forEach((code) => {
    assert.ok(blockingCodes.has(code), `Missing session bootstrap blocking code: ${code}`);
  });

  const sessionErrorsContent = read('src/services/admin-dashboard/dashboardSessionErrors.ts');
  const tokenErrorCodes = parseStringListWithin(
    sessionErrorsContent,
    /const SESSION_TOKEN_ERROR_CODES = new Set<string>\(\[([\s\S]*?)\]\);/s,
    'session token error code set',
  );
  [
    'miniapp_token_expired',
    'miniapp_token_revoked',
    'miniapp_invalid_token',
    'miniapp_auth_required',
  ].forEach((code) => {
    assert.ok(tokenErrorCodes.has(code), `Missing token error mapping: ${code}`);
  });

  expectContains('src/hooks/admin-dashboard/useDashboardActions.ts', 'validateDashboardActionPayload');
  expectContains('src/hooks/admin-dashboard/useDashboardActions.ts', 'validateActionEnvelope');
  expectContains('src/hooks/admin-dashboard/useDashboardActions.ts', 'X-Idempotency-Key');
  expectContains('src/hooks/admin-dashboard/useDashboardActions.ts', 'inFlightRunActionKeysRef');
  expectContains('src/hooks/admin-dashboard/useDashboardActions.ts', 'Duplicate submit ignored');
  expectContains('src/hooks/admin-dashboard/useDashboardActions.ts', 'retryActionMetaCacheRef');
  expectContains('src/hooks/admin-dashboard/useDashboardActions.ts', 'requiresPolicyConfirmation = actionPolicy.risk === \'danger\'');
  expectContains('src/hooks/admin-dashboard/useDashboardActions.ts', 'options.optimisticUpdate');
  expectRegex(
    'src/hooks/admin-dashboard/useDashboardActions.ts',
    /if \(rollbackOptimisticUpdate\) \{\s*rollbackOptimisticUpdate\(\);\s*\}/s,
    'optimistic rollback execution',
  );
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
  expectContains('src/components/admin-dashboard/DashboardStatusRail.tsx', 'Failure groups');
  expectContains('src/components/admin-dashboard/DashboardStatusRail.tsx', 'buildFailureGroups');
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
  expectContains('src/services/admin-dashboard/dashboardApiClient.ts', 'allowExpired: true');
  expectContains('src/services/admin-dashboard/dashboardApiClient.ts', 'evictExpired: false');
  expectRegex(
    'src/services/admin-dashboard/dashboardApiClient.ts',
    /if \(!isSessionCacheEntryExpired\(cached\)\) \{\s*return cached\.token;\s*\}[\s\S]*?await refreshSession\(cached\.token\)[\s\S]*?clearSession\(\)[\s\S]*?requesting a new Telegram session/s,
    'expired cached token refresh fallback path',
  );
  expectRegex(
    'src/services/admin-dashboard/dashboardApiClient.ts',
    /else if \(tokenFromStateExpired\) \{[\s\S]*?await refreshSession\(tokenFromState\)[\s\S]*?clearSession\(\)[\s\S]*?activeToken = await createSession\(\);/s,
    'state token refresh fallback path',
  );
  expectRegex(
    'src/services/admin-dashboard/dashboardApiClient.ts',
    /if \(response\.status === 401 && retryCount < config\.sessionRefreshRetryCount\) \{[\s\S]*?await refreshSession\(activeToken\)[\s\S]*?return request<T>\(path, options, retryCount \+ 1, refreshedToken\);/s,
    '401 refresh-and-retry flow',
  );
  expectRegex(
    'src/hooks/admin-dashboard/useDashboardSyncLoaders.ts',
    /const blockedBySession = isSessionBootstrapBlockingCode\(errorCodeFromError\);[\s\S]*?if \(blockedBySession\) \{\s*setRefreshFailureDiagnostics\(null\);\s*setError\(''\);[\s\S]*?return;/s,
    'bootstrap session-blocking catch path',
  );
  expectRegex(
    'src/hooks/admin-dashboard/useDashboardSyncLoaders.ts',
    /const blockedBySession = isSessionBootstrapBlockingCode\(errorCodeFromError\);[\s\S]*?if \(blockedBySession\) \{\s*setRefreshFailureDiagnostics\(null\);\s*setError\(''\);[\s\S]*?pollFailureNotedRef\.current = false;\s*return false;/s,
    'poll session-blocking catch path',
  );
  expectContains('src/pages/AdminDashboard/AdminDashboardPage.tsx', 'refreshFailureDiagnostics={refreshFailureDiagnostics}');
  expectContains('src/pages/AdminDashboard/AdminDashboardPage.css', '.va-status-diagnostics');
  expectContains('src/pages/AdminDashboard/AdminDashboardPage.css', '.va-status-diagnostics-grid');
  expectContains('src/pages/AdminDashboard/AdminDashboardPage.tsx', "if (!visibleModules.some((module) => module.id === moduleId)) return;");
  expectContains('src/hooks/admin-dashboard/useDashboardRouteGuards.ts', "navigate(fallbackPath, { replace: true });");
  expectContains('src/hooks/admin-dashboard/useDashboardShortcuts.ts', "toggleSettings(false, { fallbackModule: nextModule.id });");
  expectContains('src/pages/AdminDashboard/AdminDashboardPage.css', '.va-launcher-card.is-active');
  expectContains('src/pages/AdminDashboard/AdminDashboardPage.css', '@media (pointer: coarse), (max-width: 768px)');
  expectContains('src/index.css', '@media (pointer: coarse)');
  expectContains('src/index.css', 'font-size: 16px;');
  expectContains('src/pages/AdminDashboard/AdminDashboardPage.tsx', 'VITE_ADMIN_DASHBOARD_DEV_FIXTURES');
  expectContains('src/pages/AdminDashboard/AdminDashboardPage.tsx', 'resolveDashboardFixtureRequest');
  expectContains('src/hooks/admin-dashboard/useDashboardBootstrap.ts', 'Dev fixture mode enabled');
  expectContains('index.html', 'viewport-fit=cover');
  expectContains('index.html', 'interactive-widget=resizes-content');
  expectContains('src/components/admin-dashboard/DashboardChrome.tsx', 'export function DashboardFocusedHeader');
  expectContains('src/components/admin-dashboard/DashboardChrome.tsx', 'function DashboardProfileAvatarButton');
  expectContains('src/components/admin-dashboard/DashboardChrome.tsx', '<DashboardProfileAvatarButton');
  expectContains('src/components/admin-dashboard/DashboardChrome.tsx', 'compact={compact}');
  expectContains('src/pages/AdminDashboard/AdminDashboardPage.css', '.va-header button:not(.va-profile-trigger)');
  expectContains('src/pages/AdminDashboard/AdminDashboardPage.css', '.va-header button:not(.va-profile-trigger):hover');
  expectContains('src/pages/AdminDashboard/AdminDashboardPage.css', '.va-header button:not(.va-profile-trigger):disabled');
  expectContains('src/pages/AdminDashboard/AdminDashboardPage.css', 'border-radius: 50%;');
  expectContains('src/pages/AdminDashboard/AdminDashboardPage.css', 'object-position: center;');
  expectContains('src/hooks/admin-dashboard/useDashboardTelegramButtons.ts', 'settingsLifecycleControl.unmount?.ifAvailable?.();');
  expectContains('src/hooks/admin-dashboard/useDashboardTelegramButtons.ts', 'backButtonLifecycleControl.mount?.ifAvailable?.();');
  expectContains('src/hooks/admin-dashboard/useDashboardTelegramButtons.ts', 'backButtonLifecycleControl.unmount?.ifAvailable?.();');
  expectContains('src/hooks/admin-dashboard/useDashboardPullToRefresh.ts', 'refreshTriggerLockRef');
  expectContains('src/hooks/admin-dashboard/useDashboardPullToRefresh.ts', 'onReadyStateChange');
  expectContains('src/pages/AdminDashboard/AdminDashboardPage.tsx', 'onReadyStateChange: handlePullReadyStateChange');
  expectContains('src/components/ui/AdminPrimitives.tsx', 'export function UiMetricTile');
  expectContains('src/components/admin-dashboard/DashboardOverviewMetrics.tsx', '<UiMetricTile label="Sync mode" value={syncModeLabel} />');
  expectNotContains('src/components/admin-dashboard/DashboardOverviewMetrics.tsx', '<article className="va-overview-metric-card">');

  expectContains('src/services/admin-dashboard/dashboardActionGuards.ts', 'const ACTION_ALIASES');
  expectContains('src/services/admin-dashboard/dashboardActionGuards.ts', 'resolveDashboardActionId');
  expectContains('src/services/admin-dashboard/dashboardActionGuards.ts', 'isDashboardActionSupported');
  expectContains('src/services/admin-dashboard/dashboardActionGuards.ts', "'calls.search'");
  expectContains('src/services/admin-dashboard/dashboardActionGuards.ts', "'sms.message.status'");
  expectContains('src/services/admin-dashboard/dashboardActionGuards.ts', "'email.message.status'");
  expectContains('src/services/admin-dashboard/dashboardActionGuards.ts', "'smsscript.list'");
  expectContains('src/services/admin-dashboard/dashboardActionGuards.ts', "'emailtemplate.list'");
  expectContains('src/pages/AdminDashboard/useInvestigationAction.ts', 'resolveDashboardActionId');
  expectContains('src/pages/AdminDashboard/useInvestigationAction.ts', 'isDashboardActionSupported');
  expectContains('src/pages/AdminDashboard/useInvestigationAction.ts', 'invokeAction(actionToInvoke, payload)');
  expectNotContains('src/hooks/admin-dashboard/useDashboardProviderActions.ts', 'requestConfirmation');
  expectNotContains('src/hooks/admin-dashboard/useDashboardProviderActions.ts', 'window.confirm(');
  expectContains('src/hooks/admin-dashboard/useDashboardGovActions.ts', 'Unsupported runbook action');
  expectContains('src/pages/AdminDashboard/AuditIncidentsPage.tsx', 'isDashboardActionSupported');
  expectContains('src/pages/AdminDashboard/dashboardFixtureData.ts', "action: 'runbook.provider.preflight'");

  const backendAppPath = path.resolve(root, '../api/app.js');
  assert.ok(existsSync(backendAppPath), 'Expected backend action registry file to exist at ../api/app.js');
  const backendActions = parseBackendActions(readFileSync(backendAppPath, 'utf8'));
  const actionAliases = parseActionAliases(read('src/services/admin-dashboard/dashboardActionGuards.ts'));
  const sourceFiles = [
    ...listSourceFiles('src/pages/AdminDashboard'),
    ...listSourceFiles('src/hooks/admin-dashboard'),
  ];
  const calledActions = new Set();
  for (const sourceFile of sourceFiles) {
    const content = readFileSync(sourceFile, 'utf8');
    const fileActions = parseActionCalls(content);
    for (const action of fileActions) {
      calledActions.add(action);
    }
  }
  for (const action of calledActions) {
    const resolvedAction = actionAliases.get(action) || action;
    assert.ok(
      backendActions.has(resolvedAction),
      `Action "${action}" resolves to "${resolvedAction}" which is unsupported by backend miniapp action handler`,
    );
  }

  process.stdout.write('miniapp smoke checks passed\n');
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`miniapp smoke checks failed: ${message}\n`);
  process.exit(1);
}
