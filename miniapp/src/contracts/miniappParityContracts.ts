export const BOT_PRIMARY_COMMANDS = {
  START: '/start',
  HELP: '/help',
  MENU: '/menu',
  GUIDE: '/guide',
  HEALTH: '/health',
  CALL: '/call',
  CALLLOG: '/calllog',
  SMS: '/sms',
  EMAIL: '/email',
  SMSSENDER: '/smssender',
  MAILER: '/mailer',
  SCRIPTS: '/scripts',
  PERSONA: '/persona',
  PROVIDER: '/provider',
  CALLERFLAGS: '/callerflags',
  USERS: '/users',
  ADMIN: '/admin',
  STATUS: '/status',
} as const;

export const BOT_COMPAT_COMMANDS = {
  PING: '/ping',
  SCHEDULESMS: '/schedulesms',
  SMSCONVERSATION: '/smsconversation',
  SMSSTATS: '/smsstats',
  SMSSTATUS: '/smsstatus',
  RECENTSMS: '/recentsms',
  EMAILSTATUS: '/emailstatus',
} as const;

export const BOT_CALLBACK_ACTIONS = [
  'CALL',
  'SMS',
  'EMAIL',
  'CALLLOG',
  'GUIDE',
  'HELP',
  'MENU',
  'HEALTH',
  'STATUS',
  'USERS',
  'USERS_LIST',
  'CALLER_FLAGS',
  'CALLER_FLAGS_LIST',
  'BULK_SMS',
  'BULK_SMS_PRECHECK',
  'BULK_SMS_SEND',
  'BULK_SMS_STATUS',
  'BULK_SMS_LIST',
  'BULK_SMS_STATS',
  'BULK_EMAIL',
  'BULK_EMAIL_PRECHECK',
  'BULK_EMAIL_SEND',
  'BULK_EMAIL_STATUS',
  'BULK_EMAIL_LIST',
  'BULK_EMAIL_STATS',
  'EMAIL_SEND',
  'EMAIL_STATUS',
  'EMAIL_TIMELINE',
  'EMAIL_BULK',
  'EMAIL_TEMPLATES',
  'EMAIL_HISTORY',
  'PROVIDER_STATUS',
  'PROVIDER_SET',
  'PROVIDER_CONFIRM',
  'PROVIDER_APPLY',
  'SCRIPTS',
  'PERSONA',
  'ADMIN_PANEL',
  'SMS_SEND',
  'SMS_SCHEDULE',
  'SMS_STATUS',
  'SMS_CONVO',
  'SMS_STATS',
  'SMS_RECENT',
  'SMS_RECENT_PAGE',
  'CALLLOG_RECENT',
  'CALLLOG_SEARCH',
  'CALLLOG_DETAILS',
  'CALLLOG_EVENTS',
  'CALL_DETAILS',
] as const;

export const DASHBOARD_MODULE_IDS = [
  'ops',
  'sms',
  'mailer',
  'provider',
  'content',
  'calllog',
  'callerflags',
  'scriptsparity',
  'messaging',
  'persona',
  'users',
  'audit',
] as const;

export type DashboardModuleId = typeof DASHBOARD_MODULE_IDS[number];

export const DASHBOARD_STATIC_ROUTE_CONTRACTS = {
  ROOT: '/',
  SETTINGS: '/settings',
} as const;

export const DASHBOARD_MODULE_ROUTE_CONTRACTS: Record<DashboardModuleId, string> = {
  ops: '/ops',
  sms: '/sms',
  mailer: '/mailer',
  provider: '/provider',
  content: '/content',
  calllog: '/calllog',
  callerflags: '/callerflags',
  scriptsparity: '/scriptsparity',
  messaging: '/messaging',
  persona: '/persona',
  users: '/users',
  audit: '/audit',
};

export const DASHBOARD_MODULE_SCREEN_CONTRACTS: Record<DashboardModuleId, {
  label: string;
  capability: string;
}> = {
  ops: {
    label: 'Ops Dashboard',
    capability: 'dashboard_view',
  },
  sms: {
    label: 'SMS Sender',
    capability: 'sms_bulk_manage',
  },
  mailer: {
    label: 'Mailer Console',
    capability: 'email_bulk_manage',
  },
  provider: {
    label: 'Provider Control',
    capability: 'provider_manage',
  },
  content: {
    label: 'Script Studio',
    capability: 'caller_flags_manage',
  },
  calllog: {
    label: 'Call Log Explorer',
    capability: 'dashboard_view',
  },
  callerflags: {
    label: 'Caller Flags Moderation',
    capability: 'caller_flags_manage',
  },
  scriptsparity: {
    label: 'Scripts Parity Expansion',
    capability: 'caller_flags_manage',
  },
  messaging: {
    label: 'Messaging Investigation',
    capability: 'dashboard_view',
  },
  persona: {
    label: 'Persona Manager',
    capability: 'caller_flags_manage',
  },
  users: {
    label: 'User & Role Admin',
    capability: 'users_manage',
  },
  audit: {
    label: 'Audit & Incidents',
    capability: 'dashboard_view',
  },
};

export type DashboardWorkflowStatus = 'aligned' | 'partial' | 'dashboard-composed' | 'shell-only';

export type DashboardPageWorkflowContract = {
  pageId: string;
  path: string;
  pageComponent: string;
  canonicalCommand: string;
  relatedCommands: readonly string[];
  capability: string | null;
  workflowStatus: DashboardWorkflowStatus;
  fallbackPath: string;
  moduleId: DashboardModuleId | null;
  notes: string;
};

export const DASHBOARD_PAGE_WORKFLOW_CONTRACTS: readonly DashboardPageWorkflowContract[] = [
  {
    pageId: 'dashboard.home',
    path: DASHBOARD_STATIC_ROUTE_CONTRACTS.ROOT,
    pageComponent: 'AdminDashboardPage',
    canonicalCommand: BOT_PRIMARY_COMMANDS.ADMIN,
    relatedCommands: [BOT_PRIMARY_COMMANDS.MENU, BOT_PRIMARY_COMMANDS.START],
    capability: null,
    workflowStatus: 'shell-only',
    fallbackPath: DASHBOARD_STATIC_ROUTE_CONTRACTS.ROOT,
    moduleId: null,
    notes: 'Role-aware shell surface for admin navigation and module launch.',
  },
  {
    pageId: 'dashboard.module.ops',
    path: DASHBOARD_MODULE_ROUTE_CONTRACTS.ops,
    pageComponent: 'OpsDashboardPage',
    canonicalCommand: BOT_PRIMARY_COMMANDS.STATUS,
    relatedCommands: [BOT_PRIMARY_COMMANDS.HEALTH],
    capability: DASHBOARD_MODULE_SCREEN_CONTRACTS.ops.capability,
    workflowStatus: 'dashboard-composed',
    fallbackPath: DASHBOARD_STATIC_ROUTE_CONTRACTS.ROOT,
    moduleId: 'ops',
    notes: 'Operational health and runtime posture are composed from status and health bot workflows.',
  },
  {
    pageId: 'dashboard.module.sms',
    path: DASHBOARD_MODULE_ROUTE_CONTRACTS.sms,
    pageComponent: 'SmsSenderPage',
    canonicalCommand: BOT_PRIMARY_COMMANDS.SMSSENDER,
    relatedCommands: [BOT_PRIMARY_COMMANDS.SMS],
    capability: DASHBOARD_MODULE_SCREEN_CONTRACTS.sms.capability,
    workflowStatus: 'dashboard-composed',
    fallbackPath: DASHBOARD_STATIC_ROUTE_CONTRACTS.ROOT,
    moduleId: 'sms',
    notes: 'Bulk SMS sending preserves sender workflow while exposing Mini App batching controls.',
  },
  {
    pageId: 'dashboard.module.mailer',
    path: DASHBOARD_MODULE_ROUTE_CONTRACTS.mailer,
    pageComponent: 'MailerPage',
    canonicalCommand: BOT_PRIMARY_COMMANDS.MAILER,
    relatedCommands: [BOT_PRIMARY_COMMANDS.EMAIL],
    capability: DASHBOARD_MODULE_SCREEN_CONTRACTS.mailer.capability,
    workflowStatus: 'dashboard-composed',
    fallbackPath: DASHBOARD_STATIC_ROUTE_CONTRACTS.ROOT,
    moduleId: 'mailer',
    notes: 'Bulk email workflow stays aligned to the mailer command and backend job execution path.',
  },
  {
    pageId: 'dashboard.module.provider',
    path: DASHBOARD_MODULE_ROUTE_CONTRACTS.provider,
    pageComponent: 'ProviderControlPage',
    canonicalCommand: BOT_PRIMARY_COMMANDS.PROVIDER,
    relatedCommands: [BOT_PRIMARY_COMMANDS.STATUS],
    capability: DASHBOARD_MODULE_SCREEN_CONTRACTS.provider.capability,
    workflowStatus: 'aligned',
    fallbackPath: DASHBOARD_STATIC_ROUTE_CONTRACTS.ROOT,
    moduleId: 'provider',
    notes: 'Provider switch, preflight, and rollback behavior mirrors the bot command contract.',
  },
  {
    pageId: 'dashboard.module.content',
    path: DASHBOARD_MODULE_ROUTE_CONTRACTS.content,
    pageComponent: 'ScriptStudioPage',
    canonicalCommand: BOT_PRIMARY_COMMANDS.SCRIPTS,
    relatedCommands: [BOT_PRIMARY_COMMANDS.PERSONA],
    capability: DASHBOARD_MODULE_SCREEN_CONTRACTS.content.capability,
    workflowStatus: 'partial',
    fallbackPath: DASHBOARD_STATIC_ROUTE_CONTRACTS.ROOT,
    moduleId: 'content',
    notes: 'Script lifecycle tooling is present, but full command parity still spans multiple pages.',
  },
  {
    pageId: 'dashboard.module.calllog',
    path: DASHBOARD_MODULE_ROUTE_CONTRACTS.calllog,
    pageComponent: 'CallLogExplorerPage',
    canonicalCommand: BOT_PRIMARY_COMMANDS.CALLLOG,
    relatedCommands: [BOT_PRIMARY_COMMANDS.CALL],
    capability: DASHBOARD_MODULE_SCREEN_CONTRACTS.calllog.capability,
    workflowStatus: 'aligned',
    fallbackPath: DASHBOARD_STATIC_ROUTE_CONTRACTS.ROOT,
    moduleId: 'calllog',
    notes: 'Call search, details, and events map directly to the calllog bot surface.',
  },
  {
    pageId: 'dashboard.module.callerflags',
    path: DASHBOARD_MODULE_ROUTE_CONTRACTS.callerflags,
    pageComponent: 'CallerFlagsModerationPage',
    canonicalCommand: BOT_PRIMARY_COMMANDS.CALLERFLAGS,
    relatedCommands: [],
    capability: DASHBOARD_MODULE_SCREEN_CONTRACTS.callerflags.capability,
    workflowStatus: 'aligned',
    fallbackPath: DASHBOARD_STATIC_ROUTE_CONTRACTS.ROOT,
    moduleId: 'callerflags',
    notes: 'Caller flag moderation remains a direct admin workflow translation.',
  },
  {
    pageId: 'dashboard.module.scriptsparity',
    path: DASHBOARD_MODULE_ROUTE_CONTRACTS.scriptsparity,
    pageComponent: 'ScriptsParityExpansionPage',
    canonicalCommand: BOT_PRIMARY_COMMANDS.SCRIPTS,
    relatedCommands: [BOT_PRIMARY_COMMANDS.SMS, BOT_PRIMARY_COMMANDS.EMAIL],
    capability: DASHBOARD_MODULE_SCREEN_CONTRACTS.scriptsparity.capability,
    workflowStatus: 'dashboard-composed',
    fallbackPath: DASHBOARD_STATIC_ROUTE_CONTRACTS.ROOT,
    moduleId: 'scriptsparity',
    notes: 'Script parity surface orchestrates SMS and email content support around the scripts command.',
  },
  {
    pageId: 'dashboard.module.messaging',
    path: DASHBOARD_MODULE_ROUTE_CONTRACTS.messaging,
    pageComponent: 'MessagingInvestigationPage',
    canonicalCommand: BOT_PRIMARY_COMMANDS.SMS,
    relatedCommands: [BOT_PRIMARY_COMMANDS.EMAIL],
    capability: DASHBOARD_MODULE_SCREEN_CONTRACTS.messaging.capability,
    workflowStatus: 'dashboard-composed',
    fallbackPath: DASHBOARD_STATIC_ROUTE_CONTRACTS.ROOT,
    moduleId: 'messaging',
    notes: 'Message diagnostics compose SMS and email investigation workflows into one operator view.',
  },
  {
    pageId: 'dashboard.module.persona',
    path: DASHBOARD_MODULE_ROUTE_CONTRACTS.persona,
    pageComponent: 'PersonaManagerPage',
    canonicalCommand: BOT_PRIMARY_COMMANDS.PERSONA,
    relatedCommands: [BOT_PRIMARY_COMMANDS.SCRIPTS],
    capability: DASHBOARD_MODULE_SCREEN_CONTRACTS.persona.capability,
    workflowStatus: 'aligned',
    fallbackPath: DASHBOARD_STATIC_ROUTE_CONTRACTS.ROOT,
    moduleId: 'persona',
    notes: 'Persona management remains command-native with shared backend validation.',
  },
  {
    pageId: 'dashboard.module.users',
    path: DASHBOARD_MODULE_ROUTE_CONTRACTS.users,
    pageComponent: 'UsersRolePage',
    canonicalCommand: BOT_PRIMARY_COMMANDS.USERS,
    relatedCommands: [BOT_PRIMARY_COMMANDS.ADMIN],
    capability: DASHBOARD_MODULE_SCREEN_CONTRACTS.users.capability,
    workflowStatus: 'aligned',
    fallbackPath: DASHBOARD_STATIC_ROUTE_CONTRACTS.ROOT,
    moduleId: 'users',
    notes: 'User listing and role-setting mirror the users command access model.',
  },
  {
    pageId: 'dashboard.module.audit',
    path: DASHBOARD_MODULE_ROUTE_CONTRACTS.audit,
    pageComponent: 'AuditIncidentsPage',
    canonicalCommand: BOT_PRIMARY_COMMANDS.ADMIN,
    relatedCommands: [BOT_PRIMARY_COMMANDS.STATUS],
    capability: DASHBOARD_MODULE_SCREEN_CONTRACTS.audit.capability,
    workflowStatus: 'dashboard-composed',
    fallbackPath: DASHBOARD_STATIC_ROUTE_CONTRACTS.ROOT,
    moduleId: 'audit',
    notes: 'Incident response and audit feeds are admin-native workflows composed into a focused page.',
  },
  {
    pageId: 'dashboard.settings',
    path: DASHBOARD_STATIC_ROUTE_CONTRACTS.SETTINGS,
    pageComponent: 'SettingsPage',
    canonicalCommand: BOT_PRIMARY_COMMANDS.ADMIN,
    relatedCommands: [BOT_PRIMARY_COMMANDS.MENU, BOT_PRIMARY_COMMANDS.HELP],
    capability: 'dashboard_view',
    workflowStatus: 'shell-only',
    fallbackPath: DASHBOARD_STATIC_ROUTE_CONTRACTS.ROOT,
    moduleId: null,
    notes: 'Shell settings for navigation, diagnostics, and support shortcuts tied to admin access.',
  },
] as const;

export const DASHBOARD_MODULE_PAGE_WORKFLOW_CONTRACTS = Object.fromEntries(
  DASHBOARD_PAGE_WORKFLOW_CONTRACTS
    .filter((contract): contract is DashboardPageWorkflowContract & { moduleId: DashboardModuleId } => contract.moduleId !== null)
    .map((contract) => [contract.moduleId, contract]),
) as Record<DashboardModuleId, DashboardPageWorkflowContract & { moduleId: DashboardModuleId }>;

export const DASHBOARD_MODULE_COMMAND_CONTRACTS: Record<DashboardModuleId, string> = Object.fromEntries(
  DASHBOARD_MODULE_IDS.map((moduleId) => [
    moduleId,
    DASHBOARD_MODULE_PAGE_WORKFLOW_CONTRACTS[moduleId].canonicalCommand,
  ]),
) as Record<DashboardModuleId, string>;

type DashboardRouteScreenContract = {
  routeId: string;
  path: string;
  screenLabel: string;
  capability: string | null;
  linkedCommand: string | null;
  moduleId: DashboardModuleId | null;
  fallbackPath: string;
};

export const DASHBOARD_ROUTE_SCREEN_CONTRACTS: DashboardRouteScreenContract[] = [
  {
    routeId: 'dashboard.root',
    path: DASHBOARD_STATIC_ROUTE_CONTRACTS.ROOT,
    screenLabel: 'Dashboard Home',
    capability: null,
    linkedCommand: BOT_PRIMARY_COMMANDS.ADMIN,
    moduleId: null,
    fallbackPath: DASHBOARD_STATIC_ROUTE_CONTRACTS.ROOT,
  },
  ...DASHBOARD_MODULE_IDS.map((moduleId) => ({
    routeId: `dashboard.module.${moduleId}`,
    path: DASHBOARD_MODULE_ROUTE_CONTRACTS[moduleId],
    screenLabel: DASHBOARD_MODULE_SCREEN_CONTRACTS[moduleId].label,
    capability: DASHBOARD_MODULE_SCREEN_CONTRACTS[moduleId].capability,
    linkedCommand: DASHBOARD_MODULE_COMMAND_CONTRACTS[moduleId],
    moduleId,
    fallbackPath: DASHBOARD_STATIC_ROUTE_CONTRACTS.ROOT,
  })),
  {
    routeId: 'dashboard.settings',
    path: DASHBOARD_STATIC_ROUTE_CONTRACTS.SETTINGS,
    screenLabel: 'Dashboard Settings',
    capability: 'dashboard_view',
    linkedCommand: BOT_PRIMARY_COMMANDS.ADMIN,
    moduleId: null,
    fallbackPath: DASHBOARD_STATIC_ROUTE_CONTRACTS.ROOT,
  },
];

export const DASHBOARD_SETTINGS_SUPPORT_TOOL_CONTRACTS = [
  {
    moduleId: 'audit',
    title: 'Incident runbooks',
    description: 'Open runbooks and incident timelines.',
  },
  {
    moduleId: 'provider',
    title: 'Provider diagnostics',
    description: 'Check provider readiness and preflight controls.',
  },
  {
    moduleId: 'messaging',
    title: 'Messaging diagnostics',
    description: 'Review SMS/email investigation and delivery health.',
  },
] as const satisfies ReadonlyArray<{
  moduleId: DashboardModuleId;
  title: string;
  description: string;
}>;

export const DASHBOARD_ACTION_CONTRACTS = {
  RUNTIME_STATUS: 'runtime.status',
  RUNTIME_MAINTENANCE_ENABLE: 'runtime.maintenance.enable',
  RUNTIME_MAINTENANCE_DISABLE: 'runtime.maintenance.disable',
  RUNTIME_CANARY_SET: 'runtime.canary.set',
  RUNTIME_CANARY_CLEAR: 'runtime.canary.clear',
  SMS_BULK_SEND: 'sms.bulk.send',
  SMS_SCHEDULE_SEND: 'sms.schedule.send',
  EMAIL_BULK_SEND: 'email.bulk.send',
  PROVIDER_PREFLIGHT: 'provider.preflight',
  PROVIDER_SET: 'provider.set',
  PROVIDER_ROLLBACK: 'provider.rollback',
  CALLSCRIPT_LIST: 'callscript.list',
  CALLSCRIPT_UPDATE: 'callscript.update',
  CALLSCRIPT_SUBMIT_REVIEW: 'callscript.submit_review',
  CALLSCRIPT_REVIEW: 'callscript.review',
  CALLSCRIPT_PROMOTE_LIVE: 'callscript.promote_live',
  CALLSCRIPT_SIMULATE: 'callscript.simulate',
  DLQ_CALL_REPLAY: 'dlq.call.replay',
  DLQ_EMAIL_REPLAY: 'dlq.email.replay',
  CALLS_LIST: 'calls.list',
  CALLS_SEARCH: 'calls.search',
  CALLS_GET: 'calls.get',
  CALLS_EVENTS: 'calls.events',
  CALLERFLAGS_LIST: 'callerflags.list',
  CALLERFLAGS_UPSERT: 'callerflags.upsert',
  SMSSCRIPT_LIST: 'smsscript.list',
  SMSSCRIPT_GET: 'smsscript.get',
  SMSSCRIPT_CREATE: 'smsscript.create',
  SMSSCRIPT_UPDATE: 'smsscript.update',
  SMSSCRIPT_DELETE: 'smsscript.delete',
  EMAILTEMPLATE_LIST: 'emailtemplate.list',
  EMAILTEMPLATE_GET: 'emailtemplate.get',
  EMAILTEMPLATE_CREATE: 'emailtemplate.create',
  EMAILTEMPLATE_UPDATE: 'emailtemplate.update',
  EMAILTEMPLATE_DELETE: 'emailtemplate.delete',
  SMS_MESSAGES_RECENT: 'sms.messages.recent',
  SMS_MESSAGES_CONVERSATION: 'sms.messages.conversation',
  SMS_MESSAGE_STATUS: 'sms.message.status',
  SMS_STATS: 'sms.stats',
  EMAIL_MESSAGE_STATUS: 'email.message.status',
  PERSONA_LIST: 'persona.list',
  USERS_LIST: 'users.list',
  USERS_ROLE_SET: 'users.role.set',
  AUDIT_FEED: 'audit.feed',
  INCIDENTS_SUMMARY: 'incidents.summary',
  EMAIL_BULK_JOB: 'email.bulk.job',
  EMAIL_BULK_HISTORY: 'email.bulk.history',
  RUNBOOK_SMS_RECONCILE: 'runbook.sms.reconcile',
  RUNBOOK_PAYMENT_RECONCILE: 'runbook.payment.reconcile',
  RUNBOOK_PROVIDER_PREFLIGHT: 'runbook.provider.preflight',
} as const;

export const DASHBOARD_ACTION_ALIAS_CONTRACTS: Record<string, string> = {
  'sms.reconcile': DASHBOARD_ACTION_CONTRACTS.RUNBOOK_SMS_RECONCILE,
  'payment.reconcile': DASHBOARD_ACTION_CONTRACTS.RUNBOOK_PAYMENT_RECONCILE,
  'provider.preflight.runbook': DASHBOARD_ACTION_CONTRACTS.RUNBOOK_PROVIDER_PREFLIGHT,
  'runbook.sms_reconcile': DASHBOARD_ACTION_CONTRACTS.RUNBOOK_SMS_RECONCILE,
  'runbook.payment_reconcile': DASHBOARD_ACTION_CONTRACTS.RUNBOOK_PAYMENT_RECONCILE,
  'runbook.provider_preflight': DASHBOARD_ACTION_CONTRACTS.RUNBOOK_PROVIDER_PREFLIGHT,
};

export const DASHBOARD_MODULE_ACTION_CONTRACTS = {
  ops: [DASHBOARD_ACTION_CONTRACTS.RUNTIME_STATUS],
  sms: [DASHBOARD_ACTION_CONTRACTS.SMS_BULK_SEND, DASHBOARD_ACTION_CONTRACTS.SMS_SCHEDULE_SEND],
  mailer: [DASHBOARD_ACTION_CONTRACTS.EMAIL_BULK_SEND],
  provider: [
    DASHBOARD_ACTION_CONTRACTS.PROVIDER_PREFLIGHT,
    DASHBOARD_ACTION_CONTRACTS.PROVIDER_SET,
    DASHBOARD_ACTION_CONTRACTS.PROVIDER_ROLLBACK,
  ],
  content: [DASHBOARD_ACTION_CONTRACTS.CALLSCRIPT_LIST, DASHBOARD_ACTION_CONTRACTS.CALLSCRIPT_UPDATE],
  calllog: [
    DASHBOARD_ACTION_CONTRACTS.CALLS_LIST,
    DASHBOARD_ACTION_CONTRACTS.CALLS_SEARCH,
    DASHBOARD_ACTION_CONTRACTS.CALLS_GET,
    DASHBOARD_ACTION_CONTRACTS.CALLS_EVENTS,
  ],
  callerflags: [DASHBOARD_ACTION_CONTRACTS.CALLERFLAGS_LIST, DASHBOARD_ACTION_CONTRACTS.CALLERFLAGS_UPSERT],
  scriptsparity: [DASHBOARD_ACTION_CONTRACTS.SMSSCRIPT_LIST, DASHBOARD_ACTION_CONTRACTS.EMAILTEMPLATE_LIST],
  messaging: [
    DASHBOARD_ACTION_CONTRACTS.SMS_MESSAGES_RECENT,
    DASHBOARD_ACTION_CONTRACTS.SMS_MESSAGES_CONVERSATION,
    DASHBOARD_ACTION_CONTRACTS.SMS_MESSAGE_STATUS,
  ],
  persona: [DASHBOARD_ACTION_CONTRACTS.PERSONA_LIST],
  users: [DASHBOARD_ACTION_CONTRACTS.USERS_LIST, DASHBOARD_ACTION_CONTRACTS.USERS_ROLE_SET],
  audit: [DASHBOARD_ACTION_CONTRACTS.AUDIT_FEED, DASHBOARD_ACTION_CONTRACTS.INCIDENTS_SUMMARY],
} as const;

export const DASHBOARD_MODULE_ACTION_IDS = Array.from(new Set(
  Object.values(DASHBOARD_MODULE_ACTION_CONTRACTS).flat(),
));
