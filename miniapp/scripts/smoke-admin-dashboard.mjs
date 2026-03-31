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

function expectAnyContains(relativePath, needles) {
  const content = read(relativePath);
  assert.ok(
    needles.some((needle) => content.includes(needle)),
    `Expected ${relativePath} to include one of: ${needles.join(', ')}`,
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

function parseStringListWithin(content, regex, label) {
  const match = content.match(regex);
  assert.ok(match, `Could not parse ${label}`);
  const body = match[1];
  return new Set([...body.matchAll(/['"]([^'"]+)['"]/g)].map((entry) => entry[1]));
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

function parseMiniAppSupportedActions(content) {
  return parseStringListWithin(
    content,
    /const MINI_APP_SUPPORTED_ACTIONS = Object\.freeze\(\[([\s\S]*?)\]\);/s,
    'MINI_APP_SUPPORTED_ACTIONS',
  );
}

function parseActionAliases(actionGuardSource, parityContractsSource, actionContractMap) {
  const aliasMapMatch = actionGuardSource.match(/const ACTION_ALIASES:[\s\S]*?=\s*\{([\s\S]*?)\};/);
  const aliases = new Map();
  if (aliasMapMatch) {
    const body = aliasMapMatch[1];
    for (const match of body.matchAll(/'([^']+)'\s*:\s*'([^']+)'/g)) {
      aliases.set(match[1], match[2]);
    }
    return aliases;
  }

  const aliasRefMatch = actionGuardSource.match(/const ACTION_ALIASES\s*=\s*([A-Z0-9_]+)\s*;/);
  assert.ok(aliasRefMatch, 'Could not parse ACTION_ALIASES source');
  const aliasContractName = aliasRefMatch[1];
  const aliasContractRegex = new RegExp(
    `export const ${aliasContractName}(?::[^=]+)?\\s*=\\s*\\{([\\s\\S]*?)\\};`,
  );
  const aliasContractMatch = parityContractsSource.match(aliasContractRegex);
  assert.ok(aliasContractMatch, `Could not parse ${aliasContractName} contract map`);
  const body = aliasContractMatch[1];
  for (const match of body.matchAll(/'([^']+)'\s*:\s*'([^']+)'/g)) {
    aliases.set(match[1], match[2]);
  }
  for (const match of body.matchAll(/'([^']+)'\s*:\s*DASHBOARD_ACTION_CONTRACTS\.([A-Z0-9_]+)/g)) {
    const actionId = actionContractMap.get(match[2]);
    assert.ok(actionId, `Missing DASHBOARD_ACTION_CONTRACTS mapping for ${match[2]} in ${aliasContractName}`);
    aliases.set(match[1], actionId);
  }
  return aliases;
}

function parseActionContractMap(content) {
  const contractsMatch = content.match(/export const DASHBOARD_ACTION_CONTRACTS = \{([\s\S]*?)\} as const;/);
  assert.ok(contractsMatch, 'Could not parse DASHBOARD_ACTION_CONTRACTS');
  const contractMap = new Map();
  for (const match of contractsMatch[1].matchAll(/([A-Z0-9_]+):\s*'([a-z0-9._]+)'/g)) {
    contractMap.set(match[1], match[2]);
  }
  return contractMap;
}

function parseActionObjectKeys(content, constName, contractMap) {
  const objectMatch = content.match(new RegExp(`const ${constName}:[\\s\\S]*?=\\s*\\{([\\s\\S]*?)\\};`));
  assert.ok(objectMatch, `Could not parse ${constName}`);
  const objectBody = objectMatch[1];
  const keys = new Set();
  for (const match of objectBody.matchAll(/'([a-z0-9._]+)'\s*:/g)) {
    keys.add(match[1]);
  }
  for (const match of objectBody.matchAll(/\[DASHBOARD_ACTION_CONTRACTS\.([A-Z0-9_]+)\]\s*:/g)) {
    const actionId = contractMap.get(match[1]);
    assert.ok(actionId, `Missing DASHBOARD_ACTION_CONTRACTS mapping for ${match[1]} in ${constName}`);
    keys.add(actionId);
  }
  return keys;
}

function parseDashboardModuleActionIds(content, contractMap) {
  const moduleContractsMatch = content.match(/export const DASHBOARD_MODULE_ACTION_CONTRACTS = \{([\s\S]*?)\} as const;/);
  assert.ok(moduleContractsMatch, 'Could not parse DASHBOARD_MODULE_ACTION_CONTRACTS');
  const actionIds = new Set();
  const body = moduleContractsMatch[1];
  for (const match of body.matchAll(/DASHBOARD_ACTION_CONTRACTS\.([A-Z0-9_]+)/g)) {
    const actionId = contractMap.get(match[1]);
    assert.ok(actionId, `Missing DASHBOARD_ACTION_CONTRACTS mapping for ${match[1]} in DASHBOARD_MODULE_ACTION_CONTRACTS`);
    actionIds.add(actionId);
  }
  for (const match of body.matchAll(/'([a-z0-9._]+)'/g)) {
    actionIds.add(match[1]);
  }
  return actionIds;
}

function parseExtraSupportedActionIds(content, contractMap, moduleActionIds) {
  const extrasMatch = content.match(/const EXTRA_SUPPORTED_ACTION_IDS = \[([\s\S]*?)\];/);
  assert.ok(extrasMatch, 'Could not parse EXTRA_SUPPORTED_ACTION_IDS');
  const actionIds = new Set();
  const body = extrasMatch[1];
  if (body.includes('...DASHBOARD_MODULE_ACTION_IDS')) {
    for (const actionId of moduleActionIds) {
      actionIds.add(actionId);
    }
  }
  for (const match of body.matchAll(/DASHBOARD_ACTION_CONTRACTS\.([A-Z0-9_]+)/g)) {
    const actionId = contractMap.get(match[1]);
    assert.ok(actionId, `Missing DASHBOARD_ACTION_CONTRACTS mapping for ${match[1]} in EXTRA_SUPPORTED_ACTION_IDS`);
    actionIds.add(actionId);
  }
  for (const match of body.matchAll(/'([a-z0-9._]+)'/g)) {
    actionIds.add(match[1]);
  }
  return actionIds;
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
    'src/components/admin-dashboard/DashboardAvatar.tsx',
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
  const parityContractsSource = read('src/contracts/miniappParityContracts.ts');
  const actionContractMap = parseActionContractMap(parityContractsSource);
  const actionGuardContent = read('src/services/admin-dashboard/dashboardActionGuards.ts');
  const guardKeys = parseActionObjectKeys(actionGuardContent, 'ACTION_GUARDS', actionContractMap);
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
  expectContains('src/hooks/admin-dashboard/useDashboardActions.ts', 'isUnsupportedMiniAppActionError');
  expectContains('src/hooks/admin-dashboard/useDashboardActions.ts', "code !== 'miniapp_action_invalid'");
  expectContains('src/hooks/admin-dashboard/useDashboardActions.ts', 'Refreshing dashboard contract.');
  expectContains('src/hooks/admin-dashboard/useDashboardActions.ts', 'const refreshDashboardActionContract = useCallback(async (action: string) => {');
  expectRegex(
    'src/hooks/admin-dashboard/useDashboardActions.ts',
    /const refreshDashboardActionContract = useCallback\(async \(action: string\) => \{[\s\S]*?await Promise\.resolve\(loadBootstrap\(\)\);[\s\S]*?return resolveDashboardAction\(action\);[\s\S]*?\}, \[loadBootstrap\]\);/s,
    'refreshDashboardActionContract bootstrap reload path',
  );
  expectRegex(
    'src/hooks/admin-dashboard/useDashboardActions.ts',
    /if \(!actionResolution\.supported\) \{\s*actionResolution = await refreshDashboardActionContract\(action\);[\s\S]*?\}\s*if \(!actionResolution\.supported\) \{/s,
    'invokeAction refresh-before-block flow',
  );
  expectContains('src/hooks/admin-dashboard/useDashboardActions.ts', 'throw new Error(`Blocked action: "${resolvedAction}" is unavailable in this Mini App build.`);');
  expectRegex(
    'src/hooks/admin-dashboard/useDashboardActions.ts',
    /if \(!actionResolution\.supported\) \{\s*pushActivity\('info', 'Action contract refresh', `Refreshing dashboard contract for \$\{resolvedAction\}`\);\s*try \{\s*actionResolution = await refreshDashboardActionContract\(action\);[\s\S]*?\}\s*catch \(refreshErr\) \{[\s\S]*?\}\s*\}\s*if \(!actionResolution\.supported\) \{/s,
    'runAction refresh-before-block flow',
  );
  expectContains('src/hooks/admin-dashboard/useDashboardActions.ts', 'const unsupportedActionDetail = `Blocked action: "${resolvedAction}" is unavailable in this Mini App build after refreshing the dashboard contract.`;');
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
  expectContains('src/hooks/admin-dashboard/useDashboardSyncLoaders.ts', 'setDashboardSupportedActions(extractSupportedActions(payload));');
  expectContains('src/hooks/admin-dashboard/useDashboardSyncLoaders.ts', 'setDashboardSupportedActions(extractSupportedActions(nextPayload));');
  expectContains('src/services/admin-dashboard/dashboardApiContracts.ts', "'modules'");
  expectContains('src/pages/AdminDashboard/dashboardPayloadTypes.ts', 'modules?: unknown;');
  expectContains('src/services/admin-dashboard/dashboardLayout.ts', 'export type ServerModuleDefinition');
  expectContains('src/services/admin-dashboard/dashboardLayout.ts', 'export function parseServerModuleDefinitions');
  expectContains('src/hooks/admin-dashboard/useDashboardModuleLayout.ts', 'moduleDefinitionsPayload');
  expectContains('src/hooks/admin-dashboard/useDashboardModuleLayout.ts', 'parseServerModuleDefinitions');
  expectContains('src/hooks/admin-dashboard/useDashboardModuleLayout.ts', 'const serverModuleDefinitions = useMemo(');
  expectContains('src/hooks/admin-dashboard/useDashboardModuleLayout.ts', 'serverModule?.capability || module.capability');
  expectContains('src/hooks/admin-dashboard/useDashboardModuleLayout.ts', 'isDashboardActionSupported(action)');
  expectContains('src/hooks/admin-dashboard/useDashboardModuleLayout.ts', 'serverModuleDefinitions[module.id]?.enabled === false');
  expectContains('src/pages/AdminDashboard/AdminDashboardPage.tsx', 'const moduleDefinitionsPayload = pollPayload?.modules');
  expectContains('src/pages/AdminDashboard/AdminDashboardPage.tsx', 'moduleDefinitionsPayload,');
  expectContains('src/pages/AdminDashboard/AdminDashboardPage.tsx', 'visibleModules.find((module) => module.id === activeModule)?.label');
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
  expectContains('src/pages/AdminDashboard/MessagingInvestigationPage.tsx', "hasCapability('sms_bulk_manage')");
  expectContains('src/pages/AdminDashboard/MessagingInvestigationPage.tsx', "hasCapability('email_bulk_manage')");
  expectContains('src/pages/AdminDashboard/MessagingInvestigationPage.tsx', 'SMS diagnostics unavailable');
  expectContains('src/pages/AdminDashboard/MessagingInvestigationPage.tsx', 'Email diagnostics unavailable');
  expectContains('src/pages/AdminDashboard/vmSelectors.ts', "'hasCapability',");
  expectContains('src/pages/AdminDashboard/AdminDashboardPage.tsx', 'resolveTelegramIdentity');
  expectNotContains('src/pages/AdminDashboard/AdminDashboardPage.tsx', 'va-nav-drawer-overlay');
  expectNotContains('src/components/admin-dashboard/DashboardChrome.tsx', 'onOpenNavigation');
  expectNotContains('src/pages/AdminDashboard/AdminDashboardPage.tsx', 'Focus active panel search');
  expectContains('src/components/App.tsx', 'import { DASHBOARD_WORKSPACE_ROUTE_PATHS } from \'@/pages/AdminDashboard/dashboardShellConfig\';');
  expectContains('src/components/App.tsx', 'const adminWorkspaceRoutes = [...DASHBOARD_WORKSPACE_ROUTE_PATHS];');
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
  expectContains('src/components/admin-dashboard/DashboardChrome.tsx', 'import { DashboardAvatar }');
  expectContains('src/components/admin-dashboard/DashboardChrome.tsx', '<DashboardAvatar');
  expectContains('src/components/admin-dashboard/DashboardAvatar.tsx', 'className="va-profile-avatar-img"');
  expectContains('src/components/admin-dashboard/DashboardAvatar.tsx', 'className="va-profile-avatar-fallback"');
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
  expectContains('src/hooks/admin-dashboard/useDashboardTelegramButtons.ts', 'DASHBOARD_STATIC_ROUTE_CONTRACTS.ROOT');
  expectContains('src/hooks/admin-dashboard/useDashboardPullToRefresh.ts', 'refreshTriggerLockRef');
  expectContains('src/hooks/admin-dashboard/useDashboardPullToRefresh.ts', 'onReadyStateChange');
  expectContains('src/pages/AdminDashboard/AdminDashboardPage.tsx', 'onReadyStateChange: handlePullReadyStateChange');
  expectContains('src/components/ui/AdminPrimitives.tsx', 'export function UiMetricTile');
  expectContains('src/components/admin-dashboard/DashboardOverviewMetrics.tsx', '<UiMetricTile label="Sync mode" value={syncModeLabel} />');
  expectNotContains('src/components/admin-dashboard/DashboardOverviewMetrics.tsx', '<article className="va-overview-metric-card">');

  expectContains('src/services/admin-dashboard/dashboardActionGuards.ts', 'const ACTION_ALIASES');
  expectContains('src/services/admin-dashboard/dashboardActionGuards.ts', 'resolveDashboardActionId');
  expectContains('src/services/admin-dashboard/dashboardActionGuards.ts', 'isDashboardActionSupported');
  expectContains('src/services/admin-dashboard/dashboardActionGuards.ts', 'DASHBOARD_ACTION_CONTRACTS.CALLS_SEARCH');
  expectContains('src/services/admin-dashboard/dashboardActionGuards.ts', 'DASHBOARD_ACTION_CONTRACTS.SMS_MESSAGE_STATUS');
  expectContains('src/services/admin-dashboard/dashboardActionGuards.ts', 'DASHBOARD_ACTION_CONTRACTS.EMAIL_MESSAGE_STATUS');
  expectContains('src/services/admin-dashboard/dashboardActionGuards.ts', 'DASHBOARD_ACTION_CONTRACTS.SMSSCRIPT_LIST');
  expectContains('src/services/admin-dashboard/dashboardActionGuards.ts', 'DASHBOARD_ACTION_CONTRACTS.EMAILTEMPLATE_LIST');
  expectContains('src/contracts/miniappParityContracts.ts', 'export const DASHBOARD_MODULE_ROUTE_CONTRACTS');
  expectContains('src/contracts/miniappParityContracts.ts', 'export const DASHBOARD_MODULE_SCREEN_CONTRACTS');
  expectContains('src/contracts/miniappParityContracts.ts', 'export const DASHBOARD_ROUTE_SCREEN_CONTRACTS');
  expectContains('src/contracts/miniappParityContracts.ts', 'export const DASHBOARD_SETTINGS_SUPPORT_TOOL_CONTRACTS');
  expectContains('src/contracts/miniappParityContracts.ts', "moduleId: 'audit'");
  expectContains('src/contracts/miniappParityContracts.ts', "moduleId: 'provider'");
  expectContains('src/contracts/miniappParityContracts.ts', "moduleId: 'messaging'");
  expectContains('src/contracts/miniappParityContracts.ts', "routeId: 'dashboard.settings'");
  expectContains('src/contracts/miniappParityContracts.ts', 'fallbackPath: DASHBOARD_STATIC_ROUTE_CONTRACTS.ROOT');
  expectContains('src/pages/AdminDashboard/SettingsPage.tsx', "import { DASHBOARD_SETTINGS_SUPPORT_TOOL_CONTRACTS } from '@/contracts/miniappParityContracts';");
  expectContains('src/pages/AdminDashboard/SettingsPage.tsx', 'DASHBOARD_SETTINGS_SUPPORT_TOOL_CONTRACTS.map((tool) => {');
  expectContains('src/pages/AdminDashboard/SettingsPage.tsx', 'const moduleAvailable = hasModuleAccess(tool.moduleId);');
  expectContains('src/pages/AdminDashboard/SettingsPage.tsx', "onClick={moduleAvailable ? () => onJumpToModule(tool.moduleId) : undefined}");
  expectContains('src/pages/AdminDashboard/dashboardShellConfig.ts', 'label: DASHBOARD_MODULE_SCREEN_CONTRACTS[moduleId].label');
  expectContains('src/pages/AdminDashboard/dashboardShellConfig.ts', 'capability: DASHBOARD_MODULE_SCREEN_CONTRACTS[moduleId].capability');
  expectContains('src/pages/AdminDashboard/dashboardShellConfig.ts', 'export const DASHBOARD_WORKSPACE_ROUTE_PATHS = DASHBOARD_ROUTE_SCREEN_CONTRACTS');
  expectContains('src/pages/AdminDashboard/dashboardShellConfig.ts', '.filter((path) => path !== DASHBOARD_STATIC_ROUTE_CONTRACTS.ROOT);');
  expectContains('src/pages/AdminDashboard/dashboardShellConfig.ts', 'const ROUTE_PATH_TO_WORKSPACE_ROUTE = new Map<string, WorkspaceRoute>(');
  expectContains('src/pages/AdminDashboard/dashboardShellConfig.ts', "route.moduleId ?? (route.routeId === 'dashboard.settings' ? 'settings' : null),");
  expectContains('src/pages/AdminDashboard/dashboardShellConfig.ts', 'const WORKSPACE_ROUTE_FALLBACK_PATHS: Partial<Record<Exclude<WorkspaceRoute, null>, string>> = (() => {');
  expectContains('src/pages/AdminDashboard/dashboardShellConfig.ts', 'map[workspaceRoute] = normalizeWorkspacePath(route.fallbackPath);');
  expectContains('src/pages/AdminDashboard/dashboardShellConfig.ts', 'export function workspaceRouteFallbackPath(workspaceRoute: WorkspaceRoute): string {');
  expectContains('src/pages/AdminDashboard/dashboardShellConfig.ts', 'export function resolveWorkspaceRouteFallbackPath(');
  expectContains('src/pages/AdminDashboard/dashboardShellConfig.ts', 'const configuredFallbackPath = workspaceRouteFallbackPath(workspaceRoute);');
  expectContains('src/pages/AdminDashboard/dashboardShellConfig.ts', 'const [firstVisibleModuleId] = visibleModuleIds;');
  expectContains('src/pages/AdminDashboard/dashboardShellConfig.ts', 'DASHBOARD_MODULE_ROUTE_CONTRACTS[moduleId]');
  expectContains('src/hooks/admin-dashboard/useDashboardRouteGuards.ts', 'DASHBOARD_STATIC_ROUTE_CONTRACTS.ROOT');
  expectContains('src/hooks/admin-dashboard/useDashboardRouteGuards.ts', 'workspaceRouteFallbackPath: resolveWorkspaceRouteFallbackPath,');
  expectContains('src/hooks/admin-dashboard/useDashboardRouteGuards.ts', 'const visibleModuleIds = visibleModules.map((module) => module.id);');
  expectContains('src/hooks/admin-dashboard/useDashboardRouteGuards.ts', 'const fallbackPath = resolveWorkspaceRouteFallbackPath(workspaceRoute, visibleModuleIds);');
  expectContains('src/pages/AdminDashboard/AdminDashboardPage.tsx', 'workspaceRouteFallbackPath: resolveWorkspaceRouteFallbackPath,');
  expectContains('src/pages/AdminDashboard/AdminDashboardPage.tsx', 'DASHBOARD_STATIC_ROUTE_CONTRACTS.SETTINGS');
  expectContains('src/pages/AdminDashboard/AdminDashboardPage.tsx', 'DASHBOARD_STATIC_ROUTE_CONTRACTS.ROOT');
  expectContains('src/pages/AdminDashboard/useInvestigationAction.ts', 'resolveDashboardActionId');
  expectContains('src/pages/AdminDashboard/useInvestigationAction.ts', 'isDashboardActionSupported');
  expectContains('src/pages/AdminDashboard/useInvestigationAction.ts', 'invokeAction(actionToInvoke, payload)');
  expectNotContains('src/hooks/admin-dashboard/useDashboardProviderActions.ts', 'requestConfirmation');
  expectNotContains('src/hooks/admin-dashboard/useDashboardProviderActions.ts', 'window.confirm(');
  expectContains('src/hooks/admin-dashboard/useDashboardGovActions.ts', 'Unsupported runbook action');
  expectContains('src/pages/AdminDashboard/AuditIncidentsPage.tsx', 'isDashboardActionSupported');
  expectAnyContains(
    'src/pages/AdminDashboard/dashboardFixtureData.ts',
    [
      "action: 'runbook.provider.preflight'",
      'action: DASHBOARD_ACTION_CONTRACTS.RUNBOOK_PROVIDER_PREFLIGHT',
    ],
  );

  const backendAppPath = path.resolve(root, '../api/app.js');
  assert.ok(existsSync(backendAppPath), 'Expected backend action registry file to exist at ../api/app.js');
  const backendAppContent = readFileSync(backendAppPath, 'utf8');
  const backendSupportedActions = parseMiniAppSupportedActions(backendAppContent);
  const actionGuardSource = read('src/services/admin-dashboard/dashboardActionGuards.ts');
  const actionAliases = parseActionAliases(actionGuardSource, parityContractsSource, actionContractMap);
  const moduleActionIds = parseDashboardModuleActionIds(parityContractsSource, actionContractMap);
  const actionGuardIds = parseActionObjectKeys(actionGuardSource, 'ACTION_GUARDS', actionContractMap);
  const actionPolicyIds = parseActionObjectKeys(actionGuardSource, 'ACTION_POLICIES', actionContractMap);
  const extraActionIds = parseExtraSupportedActionIds(actionGuardSource, actionContractMap, moduleActionIds);
  const frontendSupportedActionIds = new Set([
    ...actionGuardIds,
    ...actionPolicyIds,
    ...extraActionIds,
  ]);

  const unsupportedFrontendActions = [...frontendSupportedActionIds]
    .filter((actionId) => !backendSupportedActions.has(actionId))
    .sort();
  assert.equal(
    unsupportedFrontendActions.length,
    0,
    `Frontend static action contracts missing from backend MINI_APP_SUPPORTED_ACTIONS: ${unsupportedFrontendActions.join(', ')}`,
  );

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
      backendSupportedActions.has(resolvedAction),
      `Action "${action}" resolves to "${resolvedAction}" which is unsupported by backend miniapp action handler`,
    );
  }

  const unsupportedAliasedTargets = [...actionAliases.entries()]
    .filter(([, actionId]) => !backendSupportedActions.has(actionId))
    .map(([alias, actionId]) => `${alias} -> ${actionId}`)
    .sort();
  assert.equal(
    unsupportedAliasedTargets.length,
    0,
    `Mini App alias contracts resolve to unsupported backend actions: ${unsupportedAliasedTargets.join(', ')}`,
  );

  process.stdout.write('miniapp smoke checks passed\n');
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`miniapp smoke checks failed: ${message}\n`);
  process.exit(1);
}
