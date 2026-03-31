import type { FeatureFlagRegistryEntry } from '@/hooks/admin-dashboard/useDashboardFeatureFlags';
import {
  DASHBOARD_MODULE_IDS,
  DASHBOARD_MODULE_ROUTE_CONTRACTS,
  DASHBOARD_MODULE_SCREEN_CONTRACTS,
  DASHBOARD_ROUTE_SCREEN_CONTRACTS,
  DASHBOARD_STATIC_ROUTE_CONTRACTS,
  DASHBOARD_MODULE_ACTION_CONTRACTS,
  DASHBOARD_MODULE_COMMAND_CONTRACTS,
  type DashboardModuleId,
} from '@/contracts/miniappParityContracts';

export type DashboardModule = DashboardModuleId;

export type WorkspaceRoute = DashboardModule | 'settings' | null;

export type DashboardModuleDefinition = {
  id: DashboardModule;
  label: string;
  capability: string;
  command: string;
  actionContracts: string[];
};

export const MODULE_DEFINITIONS: DashboardModuleDefinition[] = DASHBOARD_MODULE_IDS.map((moduleId) => ({
  id: moduleId,
  label: DASHBOARD_MODULE_SCREEN_CONTRACTS[moduleId].label,
  capability: DASHBOARD_MODULE_SCREEN_CONTRACTS[moduleId].capability,
  command: DASHBOARD_MODULE_COMMAND_CONTRACTS[moduleId],
  actionContracts: [...DASHBOARD_MODULE_ACTION_CONTRACTS[moduleId]],
}));

export const DASHBOARD_WORKSPACE_ROUTE_PATHS = DASHBOARD_ROUTE_SCREEN_CONTRACTS
  .map((route) => route.path)
  .filter((path) => path !== DASHBOARD_STATIC_ROUTE_CONTRACTS.ROOT);

export const MODULE_CONTEXT: Record<DashboardModule, { subtitle: string; detail: string }> = {
  ops: {
    subtitle: 'Operational health, runtime posture, and queue visibility.',
    detail: 'Control plane overview for live operations.',
  },
  sms: {
    subtitle: 'Bulk SMS console for recipients, scheduling, and delivery posture.',
    detail: 'Outbound messaging pipeline.',
  },
  mailer: {
    subtitle: 'Email audience delivery, template variables, and deliverability health.',
    detail: 'Mailer orchestration workspace.',
  },
  provider: {
    subtitle: 'Preflight, provider switching, and rollback safety controls.',
    detail: 'Provider reliability and failover.',
  },
  content: {
    subtitle: 'Call script drafting, review lifecycle, and simulation controls.',
    detail: 'Conversation quality studio.',
  },
  calllog: {
    subtitle: 'Search calls, inspect call records, and review state transitions.',
    detail: 'Call trace and timeline explorer.',
  },
  callerflags: {
    subtitle: 'Inbound caller allow/block/spam moderation controls.',
    detail: 'Caller policy operations.',
  },
  scriptsparity: {
    subtitle: 'SMS scripts and email template parity tooling.',
    detail: 'Outbound script content workspace.',
  },
  messaging: {
    subtitle: 'Unified SMS and email diagnostics workspace.',
    detail: 'Message-level investigation center.',
  },
  persona: {
    subtitle: 'Built-in and custom persona catalog management.',
    detail: 'Persona visibility and governance.',
  },
  users: {
    subtitle: 'Role assignments, user oversight, and access governance.',
    detail: 'Access and permissions console.',
  },
  audit: {
    subtitle: 'Incident timeline, runbook actions, and immutable audit feed.',
    detail: 'Governance and incident response.',
  },
};

export const MODULE_ID_SET = new Set<DashboardModule>(DASHBOARD_MODULE_IDS);

export const MODULE_DEFAULT_ORDER: Record<DashboardModule, number> = {
  ops: 0,
  sms: 1,
  mailer: 2,
  provider: 3,
  content: 4,
  calllog: 5,
  callerflags: 6,
  scriptsparity: 7,
  messaging: 8,
  persona: 9,
  users: 10,
  audit: 11,
};

type DashboardModuleGroup = {
  id: 'operations' | 'messaging' | 'governance';
  label: string;
  subtitle: string;
  moduleIds: DashboardModule[];
};

export const MODULE_GROUPS: DashboardModuleGroup[] = [
  {
    id: 'operations',
    label: 'Operations',
    subtitle: 'Live reliability, incidents, and runtime telemetry.',
    moduleIds: ['ops', 'calllog', 'messaging', 'audit'],
  },
  {
    id: 'messaging',
    label: 'Messaging',
    subtitle: 'Outbound delivery workflows and provider controls.',
    moduleIds: ['sms', 'mailer', 'provider'],
  },
  {
    id: 'governance',
    label: 'Governance',
    subtitle: 'Content controls, persona policy, and access management.',
    moduleIds: ['content', 'scriptsparity', 'callerflags', 'persona', 'users'],
  },
];

export function moduleRoutePath(moduleId: DashboardModule): string {
  return DASHBOARD_MODULE_ROUTE_CONTRACTS[moduleId];
}

function normalizeWorkspacePath(pathname: string): string {
  const normalized = String(pathname || '/').trim().toLowerCase();
  const slug = normalized.replace(/^\/+|\/+$/g, '');
  return slug ? `/${slug}` : DASHBOARD_STATIC_ROUTE_CONTRACTS.ROOT;
}

const ROUTE_PATH_TO_WORKSPACE_ROUTE = new Map<string, WorkspaceRoute>(
  DASHBOARD_ROUTE_SCREEN_CONTRACTS.map((route) => ([
    normalizeWorkspacePath(route.path),
    route.moduleId ?? (route.routeId === 'dashboard.settings' ? 'settings' : null),
  ])),
);

const WORKSPACE_ROUTE_FALLBACK_PATHS: Partial<Record<Exclude<WorkspaceRoute, null>, string>> = (() => {
  const map: Partial<Record<Exclude<WorkspaceRoute, null>, string>> = {};
  DASHBOARD_ROUTE_SCREEN_CONTRACTS.forEach((route) => {
    const workspaceRoute: WorkspaceRoute = route.moduleId
      ?? (route.routeId === 'dashboard.settings' ? 'settings' : null);
    if (!workspaceRoute) return;
    map[workspaceRoute] = normalizeWorkspacePath(route.fallbackPath);
  });
  return map;
})();

export function parseWorkspaceRoute(pathname: string): WorkspaceRoute {
  const normalizedPath = normalizeWorkspacePath(pathname);
  return ROUTE_PATH_TO_WORKSPACE_ROUTE.get(normalizedPath) ?? null;
}

export function workspaceRouteFallbackPath(workspaceRoute: WorkspaceRoute): string {
  if (!workspaceRoute) return DASHBOARD_STATIC_ROUTE_CONTRACTS.ROOT;
  return WORKSPACE_ROUTE_FALLBACK_PATHS[workspaceRoute] ?? DASHBOARD_STATIC_ROUTE_CONTRACTS.ROOT;
}

export function resolveWorkspaceRouteFallbackPath(
  workspaceRoute: WorkspaceRoute,
  visibleModuleIds: DashboardModule[],
): string {
  const visibleModuleIdSet = new Set<DashboardModule>(visibleModuleIds);
  if (workspaceRoute && workspaceRoute !== 'settings' && visibleModuleIdSet.has(workspaceRoute)) {
    return moduleRoutePath(workspaceRoute);
  }

  const configuredFallbackPath = workspaceRouteFallbackPath(workspaceRoute);
  const configuredFallbackRoute = parseWorkspaceRoute(configuredFallbackPath);
  if (configuredFallbackRoute === 'settings') return configuredFallbackPath;
  if (configuredFallbackRoute && visibleModuleIdSet.has(configuredFallbackRoute)) {
    return moduleRoutePath(configuredFallbackRoute);
  }

  const [firstVisibleModuleId] = visibleModuleIds;
  if (firstVisibleModuleId) {
    return moduleRoutePath(firstVisibleModuleId);
  }

  return DASHBOARD_STATIC_ROUTE_CONTRACTS.ROOT;
}

export function moduleGlyph(moduleId: string): string {
  switch (moduleId) {
    case 'ops':
      return '◉';
    case 'sms':
      return '✉';
    case 'mailer':
      return '✦';
    case 'provider':
      return '⛭';
    case 'content':
      return '✎';
    case 'calllog':
      return '⌕';
    case 'callerflags':
      return '⚐';
    case 'scriptsparity':
      return '⌘';
    case 'messaging':
      return '✉';
    case 'persona':
      return '☰';
    case 'users':
      return '◎';
    case 'audit':
      return '⚑';
    default:
      return '•';
  }
}

export const FEATURE_FLAG_REGISTRY: FeatureFlagRegistryEntry[] = [
  {
    key: 'realtime_stream',
    defaultEnabled: false,
    description: 'Use live stream updates (disabled by default until backend stream contract is enabled).',
  },
  {
    key: 'module_skeletons',
    defaultEnabled: true,
    description: 'Render loading skeleton cards while module data hydrates.',
  },
  {
    key: 'module_error_boundaries',
    defaultEnabled: true,
    description: 'Isolate module rendering failures with recovery cards.',
  },
  {
    key: 'runtime_controls',
    defaultEnabled: true,
    description: 'Show runtime maintenance and canary controls.',
  },
  {
    key: 'provider_cards',
    defaultEnabled: true,
    description: 'Expose provider readiness and channel cards in Ops.',
  },
  {
    key: 'advanced_tables',
    defaultEnabled: true,
    description: 'Enable search, filters, and pagination in admin tables.',
  },
  {
    key: 'users_csv_export',
    defaultEnabled: true,
    description: 'Allow CSV export for user and role administration.',
  },
  {
    key: 'runbook_actions',
    defaultEnabled: true,
    description: 'Enable incident runbook quick actions.',
  },
  {
    key: 'incidents_csv_export',
    defaultEnabled: true,
    description: 'Allow CSV export for incident datasets.',
  },
  {
    key: 'audit_csv_export',
    defaultEnabled: true,
    description: 'Allow CSV export for audit timeline records.',
  },
];
