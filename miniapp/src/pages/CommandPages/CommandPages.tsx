import type { FC } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Cell,
  List,
  Navigation,
  Placeholder,
  Section,
  Text,
} from '@telegram-apps/telegram-ui';

import '@/pages/AdminDashboard/AdminDashboardPage.css';
import { Link } from '@/components/Link/Link.tsx';
import { Page } from '@/components/Page.tsx';
import {
  BOT_CALLBACK_TO_DASHBOARD_ACTION_CONTRACTS,
  BOT_PRIMARY_COMMANDS,
  DASHBOARD_ACTION_CONTRACTS,
  DASHBOARD_MODULE_ROUTE_CONTRACTS,
  DASHBOARD_STATIC_ROUTE_CONTRACTS,
  MINIAPP_COMMAND_ACTION_CONTRACTS,
  MINIAPP_COMMAND_PAGE_CONTRACTS,
  MINIAPP_COMMAND_ROUTE_CONTRACTS,
  type MiniAppCommandAccessLevel,
  type MiniAppCommandActionId,
} from '@/contracts/miniappParityContracts';
import { useMiniAppCommandSession } from '@/hooks/useMiniAppCommandSession';
import {
  UiBadge,
  UiButton,
  UiCard,
  UiInput,
  UiSelect,
  UiStatePanel,
  UiTextarea,
} from '@/components/ui/AdminPrimitives';
import {
  asRecord,
  isLikelyEmail,
  isValidE164,
  normalizePhone,
  toInt,
  toText,
} from '@/services/admin-dashboard/dashboardPrimitives';
import { resolveDashboardAction } from '@/services/admin-dashboard/dashboardActionGuards';

type CommandPageId = Exclude<keyof typeof MINIAPP_COMMAND_PAGE_CONTRACTS, 'CALL'>;
type CallWorkflowMode = 'custom' | 'script';

type CommandContentSection = {
  header: string;
  items: readonly string[];
};

type CallCommandResponse = {
  success?: boolean;
  call_sid?: string;
  to?: string;
  status?: string;
  deduped?: boolean;
  warnings?: unknown[];
  provider?: string;
};

type CallCommandStatusResponse = {
  call?: unknown;
  recent_states?: unknown;
  live_console?: unknown;
  notification_status?: unknown;
  webhook_service_status?: unknown;
  enhanced_tracking?: unknown;
  error?: unknown;
};

type CallActiveResumeResponse = {
  success?: boolean;
  resumed?: boolean;
  call?: unknown;
  error?: unknown;
};

type CallScriptLifecycle = {
  live_at?: unknown;
};

type CallScriptPersonaConfig = {
  purpose?: unknown;
  emotion?: unknown;
  urgency?: unknown;
  technical_level?: unknown;
};

type CallScriptRecord = {
  id?: unknown;
  name?: unknown;
  description?: unknown;
  prompt?: unknown;
  first_message?: unknown;
  business_id?: unknown;
  voice_model?: unknown;
  objective_tags?: unknown;
  persona_config?: CallScriptPersonaConfig | null;
  flow_type?: unknown;
  flow_types?: unknown;
  version?: unknown;
  lifecycle_state?: unknown;
  lifecycle?: CallScriptLifecycle | null;
};

type CallScriptListResponse = {
  scripts?: unknown;
  total?: unknown;
};

type EmailCommandPreviewResponse = {
  success?: boolean;
  ok?: boolean;
  missing?: unknown;
  subject?: unknown;
  html?: unknown;
  text?: unknown;
  error?: unknown;
};

type EmailCommandMessageStatusResponse = {
  success?: boolean;
  message?: unknown;
  events?: unknown;
  error?: unknown;
};

type EmailCommandBulkHistoryJob = {
  job_id?: unknown;
  provider?: unknown;
  status?: unknown;
  created_at?: unknown;
  recipient_count?: unknown;
  sent_count?: unknown;
  failed_count?: unknown;
  script_id?: unknown;
  subject?: unknown;
};

type EmailCommandBulkHistoryResponse = {
  success?: boolean;
  jobs?: unknown;
  limit?: unknown;
  offset?: unknown;
};

type EmailCommandBulkSendResponse = {
  success?: boolean;
  bulk_job_id?: unknown;
  job_id?: unknown;
  deduped?: boolean;
  error?: unknown;
};

type EmailCommandBulkJobResponse = {
  success?: boolean;
  job?: unknown;
  error?: unknown;
};

type EmailCommandTemplateSummary = {
  template_id?: unknown;
  id?: unknown;
  name?: unknown;
  subject?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
  required_vars?: unknown;
  required_variables?: unknown;
};

type EmailCommandTemplateListResponse = {
  success?: boolean;
  templates?: unknown;
  total?: unknown;
  limit?: unknown;
  offset?: unknown;
};

type EmailCommandProviderStatusResponse = {
  success?: boolean;
  channel?: unknown;
  provider?: unknown;
  supported_providers?: unknown;
  email_provider?: unknown;
  email_supported_providers?: unknown;
  email_readiness?: unknown;
  providers?: unknown;
};

type SmsCommandMessageStatusResponse = {
  success?: boolean;
  message?: unknown;
  error?: unknown;
};

type SmsCommandMessagesResponse = {
  success?: boolean;
  messages?: unknown;
  error?: unknown;
};

type SmsCommandStatsResponse = {
  success?: boolean;
  total_messages?: unknown;
  total?: unknown;
  sent_messages?: unknown;
  received_messages?: unknown;
  delivered_count?: unknown;
  failed_count?: unknown;
  success_rate?: unknown;
  error?: unknown;
};

type SmsCommandBulkStatusOperation = {
  id?: unknown;
  created_at?: unknown;
  total_recipients?: unknown;
  successful?: unknown;
  failed?: unknown;
  message?: unknown;
  provider?: unknown;
};

type SmsCommandBulkStatusResponse = {
  success?: boolean;
  summary?: unknown;
  operations?: unknown;
  time_period_hours?: unknown;
  error?: unknown;
};

type SmsCommandProviderStatusResponse = {
  success?: boolean;
  channel?: unknown;
  provider?: unknown;
  supported_providers?: unknown;
  sms_provider?: unknown;
  sms_supported_providers?: unknown;
  sms_readiness?: unknown;
  providers?: unknown;
};

const CALL_WORKFLOW_MODE_OPTIONS: ReadonlyArray<{ id: CallWorkflowMode; label: string }> = [
  { id: 'custom', label: 'Custom prompt workflow' },
  { id: 'script', label: 'Script template workflow' },
];

const CALL_PURPOSE_OPTIONS: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'general', label: 'General' },
  { id: 'general_outreach', label: 'General outreach' },
  { id: 'identity_verification', label: 'Identity verification' },
  { id: 'appointment_confirmation', label: 'Appointment confirmation' },
  { id: 'service_recovery', label: 'Service recovery' },
  { id: 'payment_collection', label: 'Payment collection' },
];

const CALL_MOOD_OPTIONS: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'auto', label: 'Auto (use recommended)' },
  { id: 'neutral', label: 'Neutral / professional' },
  { id: 'frustrated', label: 'Empathetic troubleshooter' },
  { id: 'urgent', label: 'Urgent / high-priority' },
  { id: 'confused', label: 'Patient explainer' },
  { id: 'positive', label: 'Upbeat / encouraging' },
  { id: 'stressed', label: 'Reassuring & calming' },
];

const CALL_URGENCY_OPTIONS: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'auto', label: 'Auto (use recommended)' },
  { id: 'low', label: 'Low - casual follow-up' },
  { id: 'normal', label: 'Normal - timely assistance' },
  { id: 'high', label: 'High - priority handling' },
  { id: 'critical', label: 'Critical - emergency protocol' },
];

const CALL_TECH_LEVEL_OPTIONS: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'auto', label: 'Auto (general audience)' },
  { id: 'general', label: 'General audience' },
  { id: 'novice', label: 'Beginner-friendly' },
  { id: 'advanced', label: 'Advanced / technical specialist' },
];

const ACTIVE_CALL_CONSOLE_STORAGE_PREFIX = 'voxly-miniapp-active-call-console';

type CallbackParityRow = {
  callbackAction: string;
  dashboardAction: string;
  summary: string;
};

const SMS_CALLBACK_PARITY_ROWS: ReadonlyArray<CallbackParityRow> = [
  {
    callbackAction: 'SMS_SEND',
    dashboardAction: BOT_CALLBACK_TO_DASHBOARD_ACTION_CONTRACTS.SMS_SEND,
    summary: 'Single-recipient send (uses current recipient and message fields).',
  },
  {
    callbackAction: 'SMS_SCHEDULE',
    dashboardAction: BOT_CALLBACK_TO_DASHBOARD_ACTION_CONTRACTS.SMS_SCHEDULE,
    summary: 'Single-recipient schedule (requires schedule timestamp).',
  },
  {
    callbackAction: 'SMS_STATUS',
    dashboardAction: BOT_CALLBACK_TO_DASHBOARD_ACTION_CONTRACTS.SMS_STATUS,
    summary: 'Message status by SID.',
  },
  {
    callbackAction: 'SMS_CONVO',
    dashboardAction: BOT_CALLBACK_TO_DASHBOARD_ACTION_CONTRACTS.SMS_CONVO,
    summary: 'Conversation snapshot by phone.',
  },
  {
    callbackAction: 'SMS_RECENT',
    dashboardAction: BOT_CALLBACK_TO_DASHBOARD_ACTION_CONTRACTS.SMS_RECENT,
    summary: 'Recent messages list.',
  },
  {
    callbackAction: 'SMS_RECENT_PAGE:2',
    dashboardAction: BOT_CALLBACK_TO_DASHBOARD_ACTION_CONTRACTS.SMS_RECENT_PAGE,
    summary: 'Recent messages pagination callback pattern.',
  },
  {
    callbackAction: 'SMS_STATS',
    dashboardAction: BOT_CALLBACK_TO_DASHBOARD_ACTION_CONTRACTS.SMS_STATS,
    summary: 'Delivery stats snapshot.',
  },
  {
    callbackAction: 'BULK_SMS_PRECHECK',
    dashboardAction: BOT_CALLBACK_TO_DASHBOARD_ACTION_CONTRACTS.BULK_SMS_PRECHECK,
    summary: 'Bulk-SMS provider readiness callback using the live SMS provider status contract.',
  },
  {
    callbackAction: 'BULK_SMS_LIST',
    dashboardAction: BOT_CALLBACK_TO_DASHBOARD_ACTION_CONTRACTS.BULK_SMS_LIST,
    summary: 'Recent bulk-SMS job history callback.',
  },
  {
    callbackAction: 'BULK_SMS_STATUS:demo-job-id',
    dashboardAction: BOT_CALLBACK_TO_DASHBOARD_ACTION_CONTRACTS.BULK_SMS_STATUS,
    summary: 'Bulk-SMS job status callback pattern with inline job ID suffix.',
  },
  {
    callbackAction: 'BULK_SMS_STATS',
    dashboardAction: BOT_CALLBACK_TO_DASHBOARD_ACTION_CONTRACTS.BULK_SMS_STATS,
    summary: 'Bulk-SMS summary stats callback.',
  },
];

const EMAIL_CALLBACK_PARITY_ROWS: ReadonlyArray<CallbackParityRow> = [
  {
    callbackAction: 'EMAIL_SEND',
    dashboardAction: BOT_CALLBACK_TO_DASHBOARD_ACTION_CONTRACTS.EMAIL_SEND,
    summary: 'Single-recipient send (uses current recipient/content fields).',
  },
  {
    callbackAction: 'EMAIL_STATUS',
    dashboardAction: BOT_CALLBACK_TO_DASHBOARD_ACTION_CONTRACTS.EMAIL_STATUS,
    summary: 'Message status lookup by message ID.',
  },
  {
    callbackAction: 'EMAIL_STATUS:demo-message-id',
    dashboardAction: BOT_CALLBACK_TO_DASHBOARD_ACTION_CONTRACTS.EMAIL_STATUS,
    summary: 'Message status callback pattern with inline message ID suffix.',
  },
  {
    callbackAction: 'EMAIL_TIMELINE:demo-message-id',
    dashboardAction: BOT_CALLBACK_TO_DASHBOARD_ACTION_CONTRACTS.EMAIL_TIMELINE,
    summary: 'Message timeline callback pattern with inline message ID suffix.',
  },
  {
    callbackAction: 'EMAIL_TEMPLATES',
    dashboardAction: BOT_CALLBACK_TO_DASHBOARD_ACTION_CONTRACTS.EMAIL_TEMPLATES,
    summary: 'Email template catalog list.',
  },
  {
    callbackAction: 'EMAIL_HISTORY',
    dashboardAction: BOT_CALLBACK_TO_DASHBOARD_ACTION_CONTRACTS.EMAIL_HISTORY,
    summary: 'Recent bulk-email job history.',
  },
  {
    callbackAction: 'EMAIL_BULK:demo-job-id',
    dashboardAction: BOT_CALLBACK_TO_DASHBOARD_ACTION_CONTRACTS.EMAIL_BULK,
    summary: 'Bulk-email job status lookup callback pattern.',
  },
  {
    callbackAction: 'BULK_EMAIL_PRECHECK',
    dashboardAction: BOT_CALLBACK_TO_DASHBOARD_ACTION_CONTRACTS.BULK_EMAIL_PRECHECK,
    summary: 'Bulk-email provider readiness callback using the live email provider status contract.',
  },
  {
    callbackAction: 'BULK_EMAIL_SEND',
    dashboardAction: BOT_CALLBACK_TO_DASHBOARD_ACTION_CONTRACTS.BULK_EMAIL_SEND,
    summary: 'Bulk-email send callback using current recipient/content fields.',
  },
  {
    callbackAction: 'BULK_EMAIL_STATUS:demo-job-id',
    dashboardAction: BOT_CALLBACK_TO_DASHBOARD_ACTION_CONTRACTS.BULK_EMAIL_STATUS,
    summary: 'Bulk-email job status callback pattern with inline job ID suffix.',
  },
  {
    callbackAction: 'BULK_EMAIL_LIST',
    dashboardAction: BOT_CALLBACK_TO_DASHBOARD_ACTION_CONTRACTS.BULK_EMAIL_LIST,
    summary: 'Bulk-email history list callback.',
  },
  {
    callbackAction: 'BULK_EMAIL_PAGE:2',
    dashboardAction: BOT_CALLBACK_TO_DASHBOARD_ACTION_CONTRACTS.BULK_EMAIL_PAGE,
    summary: 'Bulk-email history pagination callback pattern.',
  },
  {
    callbackAction: 'BULK_EMAIL_STATS',
    dashboardAction: BOT_CALLBACK_TO_DASHBOARD_ACTION_CONTRACTS.BULK_EMAIL_STATS,
    summary: 'Bulk-email stats snapshot callback.',
  },
];

type CommandRuntimeSnapshot = {
  status: string;
  health: string;
  queueBacklogTotal: number;
  queueBacklogCallDlq: number;
  queueBacklogEmailDlq: number;
  runtimeEffectiveMode: string;
  runtimeConfiguredMode: string;
  runtimeCanaryPercent: number;
  runtimeCircuitState: string;
  activeCallsTotal: number;
  activeCallsLegacy: number;
  activeCallsVoiceAgent: number;
  bridgeStatuses: number[];
  pollAt: string;
  serverTime: string;
};

function toBridgeStatuses(value: unknown): number[] {
  return Object.values(asRecord(value))
    .map((entry) => Number(entry))
    .filter((entry) => Number.isFinite(entry) && entry >= 100 && entry <= 599);
}

function createCommandRuntimeSnapshot(payload: unknown): CommandRuntimeSnapshot {
  const root = asRecord(payload);
  const dashboard = asRecord(root.dashboard);
  const ops = asRecord(root.ops || dashboard.ops);
  const queueBacklog = asRecord(ops.queue_backlog);
  const voiceRuntime = asRecord(root.voice_runtime || dashboard.voice_runtime);
  const runtime = asRecord(voiceRuntime.runtime);
  const runtimeCircuit = asRecord(runtime.circuit);
  const activeCalls = asRecord(voiceRuntime.active_calls);
  const bridgeStatuses = toBridgeStatuses(root.bridge || dashboard.bridge);
  const pollAt = toText(root.poll_at || dashboard.poll_at, '');
  const serverTime = toText(root.server_time || dashboard.server_time, '');

  return {
    status: toText(ops.status, 'unknown').toLowerCase(),
    health: toText(ops.health, 'unknown').toLowerCase(),
    queueBacklogTotal: toInt(queueBacklog.total, 0),
    queueBacklogCallDlq: toInt(queueBacklog.dlq_call_open, 0),
    queueBacklogEmailDlq: toInt(queueBacklog.dlq_email_open, 0),
    runtimeEffectiveMode: toText(runtime.effective_mode, 'unknown').toLowerCase(),
    runtimeConfiguredMode: toText(runtime.configured_mode, 'unknown').toLowerCase(),
    runtimeCanaryPercent: toInt(runtime.effective_canary_percent, 0),
    runtimeCircuitState: asRecord(runtimeCircuit).is_open === true ? 'open' : 'closed',
    activeCallsTotal: toInt(activeCalls.total, 0),
    activeCallsLegacy: toInt(activeCalls.legacy, 0),
    activeCallsVoiceAgent: toInt(activeCalls.voice_agent, 0),
    bridgeStatuses,
    pollAt,
    serverTime,
  };
}

function getCommandRuntimeRows(
  pageId: CommandPageId,
  snapshot: CommandRuntimeSnapshot,
): Array<{ label: string; value: string }> {
  const baseRows = [
    {
      label: 'Overall posture',
      value: `status=${snapshot.status} | health=${snapshot.health}`,
    },
    {
      label: 'Queue backlog',
      value: `${snapshot.queueBacklogTotal} total | call DLQ ${snapshot.queueBacklogCallDlq} | email DLQ ${snapshot.queueBacklogEmailDlq}`,
    },
    {
      label: 'Bridge HTTP status trail',
      value: snapshot.bridgeStatuses.length > 0
        ? snapshot.bridgeStatuses.join(', ')
        : 'No bridge response status history in current bootstrap',
    },
    {
      label: 'Bootstrap timing',
      value: `poll_at=${snapshot.pollAt || 'n/a'} | server_time=${snapshot.serverTime || 'n/a'}`,
    },
  ];

  if (pageId === 'STATUS') {
    return [
      {
        label: 'Runtime mode',
        value: `effective=${snapshot.runtimeEffectiveMode} | configured=${snapshot.runtimeConfiguredMode} | canary=${snapshot.runtimeCanaryPercent}%`,
      },
      {
        label: 'Runtime circuit',
        value: snapshot.runtimeCircuitState,
      },
      {
        label: 'Active calls',
        value: `${snapshot.activeCallsTotal} total | legacy ${snapshot.activeCallsLegacy} | voice-agent ${snapshot.activeCallsVoiceAgent}`,
      },
      ...baseRows,
    ];
  }

  return baseRows;
}

function hasAccess(required: MiniAppCommandAccessLevel, current: MiniAppCommandAccessLevel): boolean {
  if (required === 'guest') return true;
  if (required === 'authorized') return current === 'authorized' || current === 'admin';
  return current === 'admin';
}

function describeAccessLevel(accessLevel: MiniAppCommandAccessLevel): string {
  if (accessLevel === 'admin') return 'Administrator access active';
  if (accessLevel === 'authorized') return 'Authorized operator access active';
  return 'Limited access only';
}

function buildActiveCallConsoleStorageKey(sessionTelegramId: string): string {
  return `${ACTIVE_CALL_CONSOLE_STORAGE_PREFIX}:${sessionTelegramId.trim() || 'anonymous'}`;
}

function readActiveCallConsoleSid(sessionTelegramId: string): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(buildActiveCallConsoleStorageKey(sessionTelegramId))?.trim() || '';
  } catch {
    return '';
  }
}

function writeActiveCallConsoleSid(sessionTelegramId: string, callSid: string): void {
  if (typeof window === 'undefined') return;
  const storageKey = buildActiveCallConsoleStorageKey(sessionTelegramId);
  try {
    const normalizedSid = callSid.trim();
    if (normalizedSid) {
      window.localStorage.setItem(storageKey, normalizedSid);
      return;
    }
    window.localStorage.removeItem(storageKey);
  } catch {
    // Ignore local storage failures. The live console still works for the current page session.
  }
}

function describeActionAvailability(
  actionId: MiniAppCommandActionId,
  accessLevel: MiniAppCommandAccessLevel,
): string {
  const action = MINIAPP_COMMAND_ACTION_CONTRACTS[actionId];
  if (!hasAccess(action.minAccess, accessLevel)) {
    return action.minAccess === 'admin'
      ? 'Admin access required'
      : 'Authorized access required';
  }
  if (!action.routePath) {
    return 'Mini App route not mounted yet';
  }
  if (action.availability === 'partial') {
    return 'Partial parity route';
  }
  return 'Available now';
}

function createCallIdempotencyKey(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return `call-${globalThis.crypto.randomUUID()}`;
  }
  return `call-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return 'Call request failed.';
}

function toErrorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const value = (error as { code?: unknown }).code;
    return typeof value === 'string' ? value : '';
  }
  return '';
}

function toWarningList(value: unknown): string[] {
  return Array.isArray(value)
    ? value
      .map((entry) => String(entry || '').trim())
      .filter(Boolean)
    : [];
}

function toOptionalRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function toPositiveInt(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

function toTextValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

function toTextList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((entry) => toTextValue(entry)).filter(Boolean)
    : [];
}

function toEmailHistoryRows(value: unknown): EmailCommandBulkHistoryJob[] {
  return Array.isArray(value) ? value as EmailCommandBulkHistoryJob[] : [];
}

function toEmailTemplateRows(value: unknown): EmailCommandTemplateSummary[] {
  return Array.isArray(value) ? value as EmailCommandTemplateSummary[] : [];
}

function toEventRows(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value
      .filter((entry) => Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry))
      .map((entry) => entry as Record<string, unknown>)
    : [];
}

function resolveCallConsoleStatus(
  liveConsole: Record<string, unknown> | null,
  call: Record<string, unknown> | null,
  recentStates: Array<Record<string, unknown>>,
): string {
  const liveStatus = toTextValue(liveConsole?.status);
  if (liveStatus) return liveStatus.toLowerCase();
  const callStatus = toTextValue(call?.status);
  if (callStatus) return callStatus.toLowerCase();
  const latestState = recentStates[0] || null;
  return toTextValue(latestState?.status, toTextValue(latestState?.state)).toLowerCase();
}

function resolveCallConsolePhase(
  liveConsole: Record<string, unknown> | null,
  call: Record<string, unknown> | null,
  recentStates: Array<Record<string, unknown>>,
): string {
  const livePhase = toTextValue(liveConsole?.phase_label, toTextValue(liveConsole?.phase));
  if (livePhase) return livePhase;
  const callPhase = toTextValue(call?.call_phase, toTextValue(call?.phase));
  if (callPhase) return callPhase;
  const latestState = recentStates[0] || null;
  return toTextValue(latestState?.phase_label, toTextValue(latestState?.phase, 'Pending provider update'));
}

function isTerminalCallStatus(status: string): boolean {
  return [
    'completed',
    'busy',
    'failed',
    'canceled',
    'cancelled',
    'no-answer',
    'no_answer',
    'voicemail',
    'ended',
  ].includes(status.trim().toLowerCase());
}

function summarizeCallStateRow(row: Record<string, unknown>): string {
  const status = toTextValue(row.status, toTextValue(row.state, 'unknown'));
  const phase = toTextValue(row.phase_label, toTextValue(row.phase));
  const at = toTextValue(row.created_at, toTextValue(row.updated_at, toTextValue(row.timestamp, 'n/a')));
  const source = toTextValue(row.source, '');
  const reason = toTextValue(row.reason, toTextValue(row.error_message));
  return [
    `status=${status || 'unknown'}`,
    phase ? `phase=${phase}` : '',
    source ? `source=${source}` : '',
    reason ? `detail=${reason}` : '',
    `at=${at || 'n/a'}`,
  ].filter(Boolean).join(' | ');
}

function summarizeCallNotificationRow(row: Record<string, unknown>): string {
  const notificationType = toTextValue(row.notification_type, 'unknown');
  const status = toTextValue(row.status, 'unknown');
  const sentAt = toTextValue(row.sent_at, toTextValue(row.created_at, 'n/a'));
  const deliveryMs = toText(row.delivery_time_ms, '');
  const errorMessage = toTextValue(row.error_message);
  return [
    `type=${notificationType}`,
    `status=${status}`,
    deliveryMs ? `delivery_ms=${deliveryMs}` : '',
    errorMessage ? `error=${errorMessage}` : '',
    `at=${sentAt}`,
  ].filter(Boolean).join(' | ');
}

function toJsonText(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return '';
  }
}

function summarizeEmailJob(job: EmailCommandBulkHistoryJob): string {
  const id = toTextValue(job.job_id, 'n/a');
  const provider = toTextValue(job.provider, 'unknown');
  const status = toTextValue(job.status, 'unknown');
  const sent = toInt(job.sent_count, 0);
  const failed = toInt(job.failed_count, 0);
  const recipients = toInt(job.recipient_count, 0);
  const createdAt = toTextValue(job.created_at, 'n/a');
  return `job=${id} | status=${status} | provider=${provider} | recipients=${recipients} | sent=${sent} | failed=${failed} | created=${createdAt}`;
}

function summarizeEmailTemplate(template: EmailCommandTemplateSummary): string {
  const templateId = toTextValue(template.template_id, toTextValue(template.id, toTextValue(template.name, 'n/a')));
  const subject = toTextValue(template.subject, '(no subject)');
  const updatedAt = toTextValue(template.updated_at, toTextValue(template.created_at, 'n/a'));
  const requiredVars = toTextList(template.required_vars).length > 0
    ? toTextList(template.required_vars)
    : toTextList(template.required_variables);
  const requiredVarsLabel = requiredVars.length > 0 ? requiredVars.join(', ') : 'none';
  return `template=${templateId} | subject=${subject} | required_vars=${requiredVarsLabel} | updated=${updatedAt}`;
}

function summarizeEmailBulkStats(stats: Record<string, unknown>): string {
  const total = toInt(stats.total_recipients ?? stats.total_jobs ?? stats.total, 0);
  const queued = toInt(stats.queued_count ?? stats.queued, 0);
  const sent = toInt(stats.sent_count ?? stats.sent, 0);
  const failed = toInt(stats.failed_count ?? stats.failed, 0);
  const successRate = toText(stats.success_rate, '0');
  return `total=${total} | queued=${queued} | sent=${sent} | failed=${failed} | success_rate=${successRate}%`;
}

function toBooleanRecord(value: unknown): Record<string, boolean> {
  const record = asRecord(value);
  const normalized = Object.entries(record).reduce<Record<string, boolean>>((result, [key, entry]) => {
    if (typeof entry === 'boolean') {
      result[key] = entry;
    }
    return result;
  }, {});
  return normalized;
}

function createEmailProviderSnapshot(payload: EmailCommandProviderStatusResponse | null): Record<string, unknown> | null {
  if (!payload) return null;
  const providers = asRecord(payload.providers);
  const emailProviders = asRecord(providers.email);
  const supportedProviders = toTextList(
    payload.email_supported_providers ?? payload.supported_providers ?? emailProviders.supported_providers,
  );
  const readiness = toBooleanRecord(payload.email_readiness ?? emailProviders.readiness);
  const provider = toTextValue(payload.email_provider ?? payload.provider ?? emailProviders.provider, 'unknown');
  const ready = provider ? readiness[provider] !== false : false;
  return {
    channel: toTextValue(payload.channel, 'email'),
    provider,
    ready,
    supported_providers: supportedProviders,
    readiness,
  };
}

function createSmsProviderSnapshot(payload: SmsCommandProviderStatusResponse | null): Record<string, unknown> | null {
  if (!payload) return null;
  const providers = asRecord(payload.providers);
  const smsProviders = asRecord(providers.sms);
  const supportedProviders = toTextList(
    payload.sms_supported_providers ?? payload.supported_providers ?? smsProviders.supported_providers,
  );
  const readiness = toBooleanRecord(payload.sms_readiness ?? smsProviders.readiness);
  const provider = toTextValue(payload.sms_provider ?? payload.provider ?? smsProviders.provider, 'unknown');
  const ready = provider ? readiness[provider] !== false : false;
  return {
    channel: toTextValue(payload.channel, 'sms'),
    provider,
    ready,
    supported_providers: supportedProviders,
    readiness,
  };
}

function toBulkSmsOperations(value: unknown): SmsCommandBulkStatusOperation[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => asRecord(entry) as SmsCommandBulkStatusOperation);
}

function summarizeBulkSmsOperation(operation: SmsCommandBulkStatusOperation): string {
  const id = toTextValue(operation.id, 'n/a');
  const provider = toTextValue(operation.provider, 'unknown');
  const total = toInt(operation.total_recipients, 0);
  const successful = toInt(operation.successful, 0);
  const failed = toInt(operation.failed, 0);
  const createdAt = toTextValue(operation.created_at, 'n/a');
  return `job=${id} | provider=${provider} | sent=${successful}/${total} | failed=${failed} | created=${createdAt}`;
}

function summarizeBulkSmsStats(stats: Record<string, unknown>): string {
  const totalJobs = toInt(stats.totalOperations ?? stats.total_jobs ?? stats.total, 0);
  const totalRecipients = toInt(stats.totalRecipients ?? stats.total_recipients, 0);
  const totalSuccessful = toInt(stats.totalSuccessful ?? stats.total_successful ?? stats.successful, 0);
  const totalFailed = toInt(stats.totalFailed ?? stats.total_failed ?? stats.failed, 0);
  const successRate = toInt(stats.successRate ?? stats.success_rate, 0);
  return `jobs=${totalJobs} | recipients=${totalRecipients} | success=${totalSuccessful} | failed=${totalFailed} | success_rate=${successRate}%`;
}

function summarizeSmsMessage(message: Record<string, unknown>): string {
  const messageSid = toText(message.message_sid, toText(message.sid, 'n/a'));
  const status = toText(message.status, 'unknown');
  const direction = toText(message.direction, '');
  const toNumber = toText(message.to_number, toText(message.to, 'n/a'));
  const fromNumber = toText(message.from_number, toText(message.from, 'n/a'));
  const body = toText(message.body, '').slice(0, 90);
  const bodySummary = body ? ` | body=${body}` : '';
  return `sid=${messageSid} | status=${status}${direction ? ` | direction=${direction}` : ''} | to=${toNumber} | from=${fromNumber}${bodySummary}`;
}

function parseCallbackToken(raw: string): { baseAction: string; suffix: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { baseAction: '', suffix: '' };
  const separatorIndex = trimmed.indexOf(':');
  if (separatorIndex < 0) {
    return { baseAction: trimmed.toUpperCase(), suffix: '' };
  }
  return {
    baseAction: trimmed.slice(0, separatorIndex).trim().toUpperCase(),
    suffix: trimmed.slice(separatorIndex + 1).trim(),
  };
}

function toCallScriptRows(value: unknown): CallScriptRecord[] {
  return Array.isArray(value) ? value as CallScriptRecord[] : [];
}

function toFlowTypeLabel(script: CallScriptRecord): string {
  const flowTypes = Array.isArray(script.flow_types)
    ? script.flow_types.map((entry) => String(entry || '').trim()).filter(Boolean)
    : [];
  if (flowTypes.length > 0) return flowTypes[0];
  return toTextValue(script.flow_type, 'general') || 'general';
}

function toFlowTypes(script: CallScriptRecord | null): string[] {
  if (!script) return [];
  const flowTypes = toTextList(script.flow_types);
  if (flowTypes.length > 0) return flowTypes;
  const flowType = toTextValue(script.flow_type);
  return flowType ? [flowType] : [];
}

function toPersonaConfig(value: unknown): CallScriptPersonaConfig | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as CallScriptPersonaConfig;
}

function extractScriptVariables(scriptText = ''): string[] {
  const matches = scriptText.match(/\{(\w+)\}/g) || [];
  return Array.from(new Set(matches.map((token) => token.replace(/[{}]/g, ''))));
}

function replacePlaceholders(text = '', values: Record<string, string>): string {
  let output = text;
  for (const [token, value] of Object.entries(values)) {
    const pattern = new RegExp(`{${token}}`, 'g');
    output = output.replace(pattern, value);
  }
  return output;
}

function getOptionLabel(
  options: ReadonlyArray<{ id: string; label: string }>,
  id: string,
  fallback: string,
): string {
  return options.find((option) => option.id === id)?.label || fallback;
}

function getCommandContent(
  pageId: CommandPageId,
  accessLevel: MiniAppCommandAccessLevel,
): CommandContentSection[] {
  if (pageId === 'START') {
    if (accessLevel === 'guest') {
      return [
        {
          header: 'Welcome posture',
          items: [
            'This page mirrors /start and keeps execution actions locked until your Telegram account is approved.',
            `Use ${BOT_PRIMARY_COMMANDS.HELP} to review available workflows and access expectations.`,
          ],
        },
        {
          header: 'Guest next steps',
          items: [
            `Open ${BOT_PRIMARY_COMMANDS.GUIDE} for workflow rules and safe usage practices.`,
            `Open ${BOT_PRIMARY_COMMANDS.MENU} for role-aware quick actions that currently exist in the Mini App.`,
            'Request admin approval in the main bot to unlock call, SMS, and email execution.',
          ],
        },
      ];
    }

    const sections: CommandContentSection[] = [
      {
        header: 'Welcome posture',
        items: [
          'This page mirrors /start as the role-aware command launcher for the Mini App.',
          'Actions below remain bound to existing bot/API workflows; this page does not invent independent execution logic.',
        ],
      },
      {
        header: 'Primary workflows',
        items: [
          `${BOT_PRIMARY_COMMANDS.CALL} launches outbound call workflows.`,
          `${BOT_PRIMARY_COMMANDS.SMS} and ${BOT_PRIMARY_COMMANDS.EMAIL} launch messaging and delivery workflows.`,
          `${BOT_PRIMARY_COMMANDS.CALLLOG} opens recent calls, search, details, and events.`,
        ],
      },
      {
        header: 'Utilities',
        items: [
          `${BOT_PRIMARY_COMMANDS.GUIDE}, ${BOT_PRIMARY_COMMANDS.HELP}, and ${BOT_PRIMARY_COMMANDS.MENU} remain available for navigation and operator guidance.`,
          `${BOT_PRIMARY_COMMANDS.HEALTH} exposes runtime posture and ${BOT_PRIMARY_COMMANDS.STATUS} provides deeper admin diagnostics.`,
        ],
      },
    ];

    if (accessLevel === 'admin') {
      sections.push({
        header: 'Admin extensions',
        items: [
          `${BOT_PRIMARY_COMMANDS.SMSSENDER} and ${BOT_PRIMARY_COMMANDS.MAILER} stay available through admin workspace routes.`,
          `${BOT_PRIMARY_COMMANDS.USERS}, ${BOT_PRIMARY_COMMANDS.CALLERFLAGS}, ${BOT_PRIMARY_COMMANDS.SCRIPTS}, and ${BOT_PRIMARY_COMMANDS.PROVIDER} remain command-owned admin workflows.`,
        ],
      });
    }

    return sections;
  }

  if (pageId === 'HELP') {
    if (accessLevel === 'guest') {
      return [
        {
          header: 'Access posture',
          items: [
            'You can review menus and guides, but execution remains locked until access is approved.',
            'The bot admin controls authorization from the main Telegram bot.',
          ],
        },
        {
          header: 'What this bot can do',
          items: [
            'Run AI-powered voice calls and message workflows.',
            'Track call, SMS, and email execution from the same backend.',
            'Let admins manage users, scripts, providers, and investigations.',
          ],
        },
      ];
    }
    const sections: CommandContentSection[] = [
      {
        header: 'Call tools',
        items: [
          `${BOT_PRIMARY_COMMANDS.CALL} opens the Mini App call composer for custom outbound calls.`,
          `${BOT_PRIMARY_COMMANDS.CALLLOG} opens recent calls, search, details, and events.`,
        ],
      },
      {
        header: 'Messaging tools',
        items: [
          `${BOT_PRIMARY_COMMANDS.SMS} opens the SMS center and diagnostics.`,
          `${BOT_PRIMARY_COMMANDS.EMAIL} opens email sending, status, and history workflows.`,
        ],
      },
      {
        header: 'Navigation',
        items: [
          `${BOT_PRIMARY_COMMANDS.MENU} reopens quick actions.`,
          `${BOT_PRIMARY_COMMANDS.GUIDE} shows operating guidance and number rules.`,
          `${BOT_PRIMARY_COMMANDS.HEALTH} and ${BOT_PRIMARY_COMMANDS.STATUS} surface runtime posture through the ops workspace.`,
        ],
      },
      {
        header: 'Quick usage',
        items: [
          'Use the quick-action list below to enter an existing Mini App workflow.',
          'Where parity is still partial or missing, the page shows the gap instead of redirecting blindly.',
        ],
      },
    ];
    if (accessLevel === 'admin') {
      sections.push({
        header: 'Admin toolkit',
        items: [
          `${BOT_PRIMARY_COMMANDS.USERS} manages access and roles.`,
          `${BOT_PRIMARY_COMMANDS.CALLERFLAGS} moderates inbound caller flags.`,
          `${BOT_PRIMARY_COMMANDS.PROVIDER}, ${BOT_PRIMARY_COMMANDS.SMSSENDER}, and ${BOT_PRIMARY_COMMANDS.MAILER} stay on the admin console routes.`,
        ],
      });
    }
    return sections;
  }

  if (pageId === 'SMS') {
    if (accessLevel === 'guest') {
      return [
        {
          header: 'SMS center access',
          items: [
            'This page mirrors /sms and keeps send/status actions locked until access is approved.',
            'You can review workflow ownership, fallback behavior, and command guidance before requesting access.',
          ],
        },
        {
          header: 'Guest next steps',
          items: [
            `Use ${BOT_PRIMARY_COMMANDS.HELP} for command guidance and access expectations.`,
            `Use ${BOT_PRIMARY_COMMANDS.GUIDE} for number formatting rules and safe delivery practices.`,
          ],
        },
      ];
    }

    const sections: CommandContentSection[] = [
      {
        header: 'SMS center workflow',
        items: [
          'This page mirrors /sms by keeping SMS send, schedule, status, and diagnostics ownership in one command-native surface.',
          'This command page executes send, schedule, status, conversation, recent, and stats actions directly through shared Mini App action contracts.',
        ],
      },
      {
        header: 'Current parity posture',
        items: [
          'Single-recipient command workflows execute here with the same backend action contracts used by the bot and dashboard.',
          'Callback actions such as SMS_SEND, SMS_STATUS, SMS_CONVO, SMS_RECENT_PAGE:* and SMS_STATS are mapped to shared Mini App action contracts with safe fallback for unknown callbacks.',
          `High-volume bulk execution remains in the canonical ${BOT_PRIMARY_COMMANDS.SMSSENDER} workflow with precheck and batching safeguards.`,
        ],
      },
      {
        header: 'Operational safety',
        items: [
          'Validate E.164 recipients and test with small batches before wider sends.',
          'If a route is unsupported in the current build, the action remains visible as a partial or missing gap instead of silently failing.',
        ],
      },
    ];

    if (accessLevel === 'admin') {
      sections.push({
        header: 'Admin sender controls',
        items: [
          `${BOT_PRIMARY_COMMANDS.SMSSENDER} remains the bulk SMS execution control plane.`,
          'Use schedule and delivery checks before high-volume sends.',
        ],
      });
    }

    return sections;
  }

  if (pageId === 'EMAIL') {
    if (accessLevel === 'guest') {
      return [
        {
          header: 'Email center access',
          items: [
            'This page mirrors /email and keeps send/status actions locked until access is approved.',
            'You can still review workflow ownership, guidance, and fallback paths before requesting access.',
          ],
        },
        {
          header: 'Guest next steps',
          items: [
            `Use ${BOT_PRIMARY_COMMANDS.HELP} for command guidance and access details.`,
            `Use ${BOT_PRIMARY_COMMANDS.GUIDE} for safe usage practices and operational checks.`,
          ],
        },
      ];
    }

    const sections: CommandContentSection[] = [
      {
        header: 'Email center workflow',
        items: [
          'This page mirrors /email by presenting email send/status/template/history ownership in one command-native surface.',
          'Execution stays bound to existing backend action contracts; this page orchestrates rather than reimplements those flows.',
        ],
      },
      {
        header: 'Current parity posture',
        items: [
          'Single-recipient send/schedule, template preview, status/timeline, template list, and bulk history execute directly through shared Mini App action contracts.',
          'Callback actions such as EMAIL_SEND, EMAIL_STATUS:* and EMAIL_HISTORY map through shared contracts so this page executes the same callback-owned workflow surface as the bot.',
          'The canonical /mailer workflow remains the high-volume control plane with broader campaign and deliverability tooling.',
        ],
      },
      {
        header: 'Operational safety',
        items: [
          'Use provider diagnostics before large campaigns or incident recovery actions.',
          'If a route is unsupported in the current build, the action remains visible as a partial or missing gap instead of silently failing.',
        ],
      },
    ];

    if (accessLevel === 'admin') {
      sections.push({
        header: 'Admin mailer controls',
        items: [
          `${BOT_PRIMARY_COMMANDS.MAILER} remains the bulk-email execution control plane.`,
          'Use preflight, job status, and history checks before high-volume sends.',
        ],
      });
    }

    return sections;
  }

  if (pageId === 'SCRIPTS') {
    return [
      {
        header: 'Scripts command ownership',
        items: [
          'This page restores /scripts as a command-native Mini App entry point instead of treating script workspaces as standalone product routes.',
          'The command remains admin-scoped and keeps live bot ownership over reusable prompts, call scripts, SMS script parity, and email template parity workflows.',
        ],
      },
      {
        header: 'Workspace split',
        items: [
          `Script Studio (${DASHBOARD_MODULE_ROUTE_CONTRACTS.content}) owns call-script drafting, review, simulation, and promote-live workflows.`,
          `Scripts Parity Expansion (${DASHBOARD_MODULE_ROUTE_CONTRACTS.scriptsparity}) owns SMS script and email-template parity workflows tied back to ${BOT_PRIMARY_COMMANDS.SCRIPTS}.`,
        ],
      },
      {
        header: 'Operational rule',
        items: [
          'This route should hand operators into the correct workspace, not duplicate script business logic locally.',
          'If script-adjacent capabilities drift, update the shared /scripts contracts first so both downstream workspaces stay bounded to the same command semantics.',
        ],
      },
    ];
  }

  if (pageId === 'GUIDE') {
    const sections: CommandContentSection[] = [
      {
        header: 'Making calls',
        items: [
          'Start a call via /call or the Call quick action.',
          'The Mini App now executes both custom and script-backed /call launches against the live backend contract.',
          'Script catalog browsing remains constrained by the current Mini App capability contract, and the full guided bot wizard is still not mounted here.',
          'Provide the destination number in E.164 format such as +18005551234.',
          'Describe persona, objective, and first spoken message clearly.',
        ],
      },
      {
        header: 'Phone number rules',
        items: [
          'Include the + symbol and country code first.',
          'Avoid spaces, punctuation, or local-only number formatting.',
          'Validate the number before scaling to larger campaigns.',
        ],
      },
      {
        header: 'Best practices',
        items: [
          'Keep prompts precise so the model remains on task.',
          'Test with a short call or a small batch before wider execution.',
          'Use health and status views before blaming downstream providers.',
        ],
      },
    ];
    if (accessLevel === 'guest') {
      sections.unshift({
        header: 'Limited access',
        items: [
          'You can review the guide now, but execution workflows require approval.',
          'Use Help or Menu to review currently reachable Mini App surfaces.',
        ],
      });
    } else if (accessLevel === 'admin') {
      sections.push({
        header: 'Admin controls',
        items: [
          'Provider changes, user access, and bulk message launchers remain admin-scoped.',
          'Use the Admin Console quick action when you need the full dashboard shell.',
        ],
      });
    }
    return sections;
  }

  if (pageId === 'HEALTH') {
    return [
      {
        header: 'Health workflow',
        items: [
          'This page mirrors /health by showing quick runtime posture from the server-authoritative Mini App bootstrap.',
          'Use refresh when you need the latest state without leaving the command workflow.',
          'Escalate to /status for deeper runtime controls and admin diagnostics.',
        ],
      },
      {
        header: 'Recovery behavior',
        items: [
          'If bootstrap refresh fails, the page keeps last-known visibility and shows the blocking error code.',
          'Unknown or stale navigation still recovers to dashboard root instead of hard-failing.',
        ],
      },
    ];
  }

  if (pageId === 'STATUS') {
    return [
      {
        header: 'Status workflow',
        items: [
          'This page mirrors /status by surfacing deep admin runtime posture from the same bootstrap source used by ops.',
          'Use Provider or Admin Console quick actions when incident handling requires command-adjacent workflows.',
          'Role symmetry is enforced: this route remains admin-scoped and never bypasses server authorization.',
        ],
      },
      {
        header: 'Operational checks',
        items: [
          'Check runtime mode/canary/circuit before applying maintenance changes in admin workflows.',
          'Review bridge status history and queue backlog before escalating to provider-level remediation.',
        ],
      },
    ];
  }

  return [
    {
      header: 'Quick actions',
      items: [
        'This page mirrors the bot /menu command by showing only the quick actions relevant to your current access tier.',
        'Each item below routes only to an existing Mini App workflow or explicitly reports the missing parity gap.',
      ],
    },
    {
      header: 'Workflow rule',
      items: [
        'Menu should launch real command-owned workflows, not standalone Mini App logic.',
        'If an action is still missing in the Mini App, it remains visible as a documented gap instead of silently disappearing.',
      ],
    },
  ];
}

function CommandPage({ pageId }: { pageId: CommandPageId }) {
  const location = useLocation();
  const contract = MINIAPP_COMMAND_PAGE_CONTRACTS[pageId];
  const {
    loading,
    error,
    errorCode,
    bootstrapPayload,
    accessLevel,
    reload,
  } = useMiniAppCommandSession();
  const pageActionContract = MINIAPP_COMMAND_ACTION_CONTRACTS[pageId as MiniAppCommandActionId];

  const visibleActions = useMemo(() => contract.actionIds.filter((actionId) => {
    const action = MINIAPP_COMMAND_ACTION_CONTRACTS[actionId];
    return hasAccess(action.minAccess, accessLevel) || accessLevel === 'guest';
  }), [accessLevel, contract.actionIds]);

  const contentSections = useMemo(
    () => getCommandContent(pageId, accessLevel),
    [accessLevel, pageId],
  );
  const pageAccessAllowed = hasAccess(pageActionContract.minAccess, accessLevel);
  const runtimeSnapshot = useMemo(
    () => createCommandRuntimeSnapshot(bootstrapPayload),
    [bootstrapPayload],
  );
  const runtimeRows = useMemo(
    () => getCommandRuntimeRows(pageId, runtimeSnapshot),
    [pageId, runtimeSnapshot],
  );
  const showBackButton = pageId !== 'MENU' && pageId !== 'START';

  if (loading) {
    return (
      <Page back={showBackButton}>
        <Placeholder
          header={contract.canonicalCommand}
          description="Loading Mini App session and command workflow contract..."
        />
      </Page>
    );
  }

  if (!pageAccessAllowed) {
    return (
      <Page back={showBackButton}>
        <List>
          <Section
            header={contract.canonicalCommand}
            footer={`${contract.notes} Access is denied for your current session role.`}
          >
            <Cell subtitle={contract.summary}>
              {describeAccessLevel(accessLevel)}
            </Cell>
            <Cell subtitle={`${pageActionContract.minAccess} access required`}>
              Route restricted
            </Cell>
          </Section>
          <Section header="Fallback">
            <Link to={MINIAPP_COMMAND_ROUTE_CONTRACTS.HELP}>
              <Cell subtitle="Open /help for role-aware command guidance.">
                Help
              </Cell>
            </Link>
            <Link to={MINIAPP_COMMAND_ROUTE_CONTRACTS.MENU}>
              <Cell subtitle="Open /menu for currently accessible quick actions.">
                Menu
              </Cell>
            </Link>
            <Link to={DASHBOARD_STATIC_ROUTE_CONTRACTS.ROOT}>
              <Cell subtitle="Return to dashboard root.">
                Dashboard root
              </Cell>
            </Link>
          </Section>
        </List>
      </Page>
    );
  }

  return (
    <Page back={showBackButton}>
      <List>
        <Section
          header={contract.canonicalCommand}
          footer={contract.notes}
        >
          <Cell subtitle={contract.summary}>
            {describeAccessLevel(accessLevel)}
          </Cell>
          <Cell
            subtitle={error ? `Bootstrap fallback active. ${error}` : 'Server-authoritative bootstrap loaded.'}
            after={<Navigation>{error ? 'Retry' : 'Ready'}</Navigation>}
            onClick={() => {
              void reload();
            }}
          >
            Session status
          </Cell>
          {errorCode && (
            <Cell subtitle="Latest bootstrap blocking or recovery code">
              {errorCode}
            </Cell>
          )}
        </Section>

        {contentSections.map((section) => (
          <Section key={section.header} header={section.header}>
            {section.items.map((item) => (
              <Cell key={item}>
                <Text>{item}</Text>
              </Cell>
            ))}
          </Section>
        ))}
        {(pageId === 'HEALTH' || pageId === 'STATUS') && (
          <Section
            header="Live command snapshot"
            footer="Sourced from /miniapp/bootstrap so this page stays aligned with the same runtime posture used by bot-backed ops workflows."
          >
            {runtimeRows.map((row) => (
              <Cell key={row.label} subtitle={row.value}>
                {row.label}
              </Cell>
            ))}
          </Section>
        )}

        <Section
          header="Quick actions"
          footer="These shortcuts mirror the live bot keyboard but route only to Mini App workflows that currently exist."
        >
          {visibleActions.map((actionId) => {
            const action = MINIAPP_COMMAND_ACTION_CONTRACTS[actionId];
            const subtitle = `${action.description} ${describeActionAvailability(actionId, accessLevel)}.`;
            const currentRoute = action.routePath === location.pathname;
            if (action.routePath && hasAccess(action.minAccess, accessLevel) && !currentRoute) {
              return (
                <Link key={actionId} to={action.routePath}>
                  <Cell
                    subtitle={subtitle}
                    after={<Navigation>{action.availability === 'partial' ? 'Open partial parity' : 'Open'}</Navigation>}
                  >
                    {action.label}
                  </Cell>
                </Link>
              );
            }
            return (
              <Cell
                key={actionId}
                subtitle={`${subtitle} ${action.notes}`}
                after={<Navigation>{currentRoute ? 'Current' : action.routePath ? 'Restricted' : 'Missing'}</Navigation>}
              >
                {action.label}
              </Cell>
            );
          })}
        </Section>

        <Section
          header="Fallback"
          footer="Unknown, stale, or unsupported actions fall back to the dashboard root instead of hard-failing."
        >
          <Link to={DASHBOARD_STATIC_ROUTE_CONTRACTS.ROOT}>
            <Cell subtitle="Open the admin dashboard shell and role-aware workspace launcher.">
              Dashboard root
            </Cell>
          </Link>
        </Section>
      </List>
    </Page>
  );
}

function ScriptsCommandPageContent() {
  const location = useLocation();
  const contract = MINIAPP_COMMAND_PAGE_CONTRACTS.SCRIPTS;
  const {
    loading,
    error,
    errorCode,
    bootstrapPayload,
    accessLevel,
    reload,
  } = useMiniAppCommandSession();
  const pageActionContract = MINIAPP_COMMAND_ACTION_CONTRACTS.SCRIPTS;
  const visibleActions = useMemo(() => contract.actionIds.filter((actionId) => {
    const action = MINIAPP_COMMAND_ACTION_CONTRACTS[actionId];
    return hasAccess(action.minAccess, accessLevel) || accessLevel === 'guest';
  }), [accessLevel, contract.actionIds]);
  const contentSections = useMemo(
    () => getCommandContent('SCRIPTS', accessLevel),
    [accessLevel],
  );
  const pageAccessAllowed = hasAccess(pageActionContract.minAccess, accessLevel);
  const runtimeSnapshot = useMemo(
    () => createCommandRuntimeSnapshot(bootstrapPayload),
    [bootstrapPayload],
  );
  const runtimeRows = useMemo(
    () => getCommandRuntimeRows('SCRIPTS', runtimeSnapshot),
    [runtimeSnapshot],
  );

  if (loading) {
    return (
      <Page back>
        <Placeholder
          header={contract.canonicalCommand}
          description="Loading Mini App session and command workflow contract..."
        />
      </Page>
    );
  }

  if (!pageAccessAllowed) {
    return (
      <Page back>
        <List>
          <Section
            header={contract.canonicalCommand}
            footer={`${contract.notes} Access is denied for your current session role.`}
          >
            <Cell subtitle={contract.summary}>
              {describeAccessLevel(accessLevel)}
            </Cell>
            <Cell subtitle={`${pageActionContract.minAccess} access required`}>
              Route restricted
            </Cell>
          </Section>
          <Section header="Fallback">
            <Link to={MINIAPP_COMMAND_ROUTE_CONTRACTS.HELP}>
              <Cell subtitle="Open /help for role-aware command guidance.">
                Help
              </Cell>
            </Link>
            <Link to={MINIAPP_COMMAND_ROUTE_CONTRACTS.MENU}>
              <Cell subtitle="Open /menu for currently accessible quick actions.">
                Menu
              </Cell>
            </Link>
            <Link to={DASHBOARD_STATIC_ROUTE_CONTRACTS.ROOT}>
              <Cell subtitle="Return to dashboard root.">
                Dashboard root
              </Cell>
            </Link>
          </Section>
        </List>
      </Page>
    );
  }

  return (
    <Page back>
      <List>
        <Section
          header={contract.canonicalCommand}
          footer={contract.notes}
        >
          <Cell subtitle={contract.summary}>
            {describeAccessLevel(accessLevel)}
          </Cell>
          <Cell
            subtitle={error ? `Bootstrap fallback active. ${error}` : 'Server-authoritative bootstrap loaded.'}
            after={<Navigation>{error ? 'Retry' : 'Ready'}</Navigation>}
            onClick={() => {
              void reload();
            }}
          >
            Session status
          </Cell>
          {errorCode && (
            <Cell subtitle="Latest bootstrap blocking or recovery code">
              {errorCode}
            </Cell>
          )}
        </Section>

        {contentSections.map((section) => (
          <Section key={section.header} header={section.header}>
            {section.items.map((item) => (
              <Cell key={item}>
                <Text>{item}</Text>
              </Cell>
            ))}
          </Section>
        ))}

        <Section
          header="Workspace handoff"
          footer="These routes stay inside the existing admin workspace shell, but they are now explicitly downstream of the canonical /scripts command page."
        >
          <Link to={DASHBOARD_MODULE_ROUTE_CONTRACTS.content}>
            <Cell
              subtitle="Open Script Studio for call-script draft, simulation, review, and promote-live workflows."
              after={<Navigation>Open</Navigation>}
            >
              Script Studio
            </Cell>
          </Link>
          <Link to={DASHBOARD_MODULE_ROUTE_CONTRACTS.scriptsparity}>
            <Cell
              subtitle="Open Scripts Parity Expansion for SMS script and email template parity workflows."
              after={<Navigation>Open</Navigation>}
            >
              Scripts Parity Expansion
            </Cell>
          </Link>
        </Section>

        <Section
          header="Runtime posture"
          footer="Sourced from /miniapp/bootstrap so the /scripts handoff stays bounded by the same server-authoritative runtime and access posture as the rest of the Mini App."
        >
          {runtimeRows.map((row) => (
            <Cell key={row.label} subtitle={row.value}>
              {row.label}
            </Cell>
          ))}
        </Section>

        <Section
          header="Quick actions"
          footer="These shortcuts mirror live command ownership and avoid bypassing the /scripts handoff page."
        >
          {visibleActions.map((actionId) => {
            const action = MINIAPP_COMMAND_ACTION_CONTRACTS[actionId];
            const subtitle = `${action.description} ${describeActionAvailability(actionId, accessLevel)}.`;
            const currentRoute = action.routePath === location.pathname;
            if (action.routePath && hasAccess(action.minAccess, accessLevel) && !currentRoute) {
              return (
                <Link key={actionId} to={action.routePath}>
                  <Cell
                    subtitle={subtitle}
                    after={<Navigation>{action.availability === 'partial' ? 'Open partial parity' : 'Open'}</Navigation>}
                  >
                    {action.label}
                  </Cell>
                </Link>
              );
            }
            return (
              <Cell
                key={actionId}
                subtitle={`${subtitle} ${action.notes}`}
                after={<Navigation>{currentRoute ? 'Current' : action.routePath ? 'Restricted' : 'Missing'}</Navigation>}
              >
                {action.label}
              </Cell>
            );
          })}
        </Section>

        <Section
          header="Fallback"
          footer="Unknown, stale, or unsupported actions fall back to the dashboard root instead of hard-failing."
        >
          <Link to={DASHBOARD_STATIC_ROUTE_CONTRACTS.ROOT}>
            <Cell subtitle="Open the admin dashboard shell and role-aware workspace launcher.">
              Dashboard root
            </Cell>
          </Link>
        </Section>
      </List>
    </Page>
  );
}

function CallCommandPageContent() {
  const contract = MINIAPP_COMMAND_PAGE_CONTRACTS.CALL;
  const {
    loading,
    error,
    errorCode,
    accessLevel,
    activeCallProvider,
    hasCapability,
    invokeAction,
    request,
    reload,
    sessionTelegramId,
  } = useMiniAppCommandSession();
  const [workflowMode, setWorkflowMode] = useState<CallWorkflowMode>('custom');
  const [numberInput, setNumberInput] = useState<string>('');
  const [customerNameInput, setCustomerNameInput] = useState<string>('');
  const [purposeInput, setPurposeInput] = useState<string>('general');
  const [promptInput, setPromptInput] = useState<string>('');
  const [firstMessageInput, setFirstMessageInput] = useState<string>('');
  const [voiceModelInput, setVoiceModelInput] = useState<string>('');
  const [emotionInput, setEmotionInput] = useState<string>('auto');
  const [urgencyInput, setUrgencyInput] = useState<string>('auto');
  const [technicalLevelInput, setTechnicalLevelInput] = useState<string>('auto');
  const [scriptCatalogLoading, setScriptCatalogLoading] = useState<boolean>(false);
  const [scriptCatalogError, setScriptCatalogError] = useState<string>('');
  const [scriptFlowFilterInput, setScriptFlowFilterInput] = useState<string>('');
  const [callScripts, setCallScripts] = useState<CallScriptRecord[]>([]);
  const [selectedCallScriptId, setSelectedCallScriptId] = useState<string>('');
  const [manualScriptIdInput, setManualScriptIdInput] = useState<string>('');
  const [scriptPlaceholderValues, setScriptPlaceholderValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [submitCode, setSubmitCode] = useState<string>('');
  const [submitResult, setSubmitResult] = useState<CallCommandResponse | null>(null);
  const [persistedActiveCallSid, setPersistedActiveCallSid] = useState<string>('');
  const [activeCallStorageReady, setActiveCallStorageReady] = useState<boolean>(false);
  const [callConsoleBusy, setCallConsoleBusy] = useState<boolean>(false);
  const [callConsoleRefreshing, setCallConsoleRefreshing] = useState<boolean>(false);
  const [callConsoleError, setCallConsoleError] = useState<string>('');
  const [callConsoleLoadedSid, setCallConsoleLoadedSid] = useState<string>('');
  const [callConsoleDetails, setCallConsoleDetails] = useState<Record<string, unknown> | null>(null);
  const [callConsoleLiveSnapshot, setCallConsoleLiveSnapshot] = useState<Record<string, unknown> | null>(null);
  const [callConsoleRecentStates, setCallConsoleRecentStates] = useState<Array<Record<string, unknown>>>([]);
  const [callConsoleNotifications, setCallConsoleNotifications] = useState<Array<Record<string, unknown>>>([]);
  const callConsoleRequestRef = useRef<string>('');
  const activeCallSidRef = useRef<string>('');
  const activeCallResumeAttemptRef = useRef<string>('');

  const canOperate = accessLevel === 'authorized' || accessLevel === 'admin';
  const canBrowseScripts = hasCapability('caller_flags_manage');
  const normalizedNumber = normalizePhone(numberInput.trim());
  const numberValid = isValidE164(normalizedNumber);
  const promptValue = promptInput.trim();
  const firstMessageValue = firstMessageInput.trim();
  const customerNameValue = customerNameInput.trim();
  const purposeValue = purposeInput.trim() || 'general';
  const voiceModelValue = voiceModelInput.trim();
  const emotionValue = emotionInput.trim() || 'auto';
  const urgencyValue = urgencyInput.trim() || 'auto';
  const technicalLevelValue = technicalLevelInput.trim() || 'auto';
  const selectedScriptId = toPositiveInt(selectedCallScriptId);
  const manualScriptId = toPositiveInt(manualScriptIdInput);
  const effectiveScriptId = workflowMode === 'script'
    ? (canBrowseScripts ? selectedScriptId : manualScriptId)
    : 0;
  const selectedScript = useMemo(() => (
    callScripts.find((entry) => toPositiveInt(entry.id) === selectedScriptId) || null
  ), [callScripts, selectedScriptId]);
  const selectedScriptName = toTextValue(selectedScript?.name, selectedScriptId > 0 ? `Script #${selectedScriptId}` : '');
  const selectedScriptVersion = toPositiveInt(selectedScript?.version) || undefined;
  const selectedScriptBusinessId = toTextValue(selectedScript?.business_id);
  const selectedScriptVoiceModel = toTextValue(selectedScript?.voice_model);
  const selectedScriptObjectiveTags = toTextList(selectedScript?.objective_tags);
  const selectedScriptPersonaConfig = toPersonaConfig(selectedScript?.persona_config);
  const selectedScriptPurpose = toTextValue(selectedScriptPersonaConfig?.purpose);
  const selectedScriptEmotion = toTextValue(selectedScriptPersonaConfig?.emotion);
  const selectedScriptUrgency = toTextValue(selectedScriptPersonaConfig?.urgency);
  const selectedScriptTechnicalLevel = toTextValue(selectedScriptPersonaConfig?.technical_level);
  const selectedScriptFlowTypes = useMemo(() => toFlowTypes(selectedScript), [selectedScript]);
  const scriptPromptValue = toTextValue(selectedScript?.prompt);
  const scriptFirstMessageValue = toTextValue(selectedScript?.first_message);
  const scriptPlaceholderTokens = useMemo(() => {
    const placeholderSet = new Set<string>();
    extractScriptVariables(scriptPromptValue).forEach((token) => placeholderSet.add(token));
    extractScriptVariables(scriptFirstMessageValue).forEach((token) => placeholderSet.add(token));
    return [...placeholderSet];
  }, [scriptFirstMessageValue, scriptPromptValue]);
  const resolvedScriptPlaceholderValues = useMemo(() => (
    scriptPlaceholderTokens.reduce<Record<string, string>>((accumulator, token) => {
      const value = scriptPlaceholderValues[token];
      if (typeof value === 'string' && value.trim()) {
        accumulator[token] = value.trim();
      }
      return accumulator;
    }, {})
  ), [scriptPlaceholderTokens, scriptPlaceholderValues]);
  const resolvedScriptPromptValue = scriptPromptValue
    ? replacePlaceholders(scriptPromptValue, resolvedScriptPlaceholderValues)
    : '';
  const resolvedScriptFirstMessageValue = scriptFirstMessageValue
    ? replacePlaceholders(scriptFirstMessageValue, resolvedScriptPlaceholderValues)
    : '';
  const requiresPaymentProviderGuard = workflowMode === 'script'
    && selectedScriptFlowTypes.includes('payment_collection');
  const paymentProviderGuardBlocked = requiresPaymentProviderGuard
    && Boolean(activeCallProvider)
    && activeCallProvider !== 'twilio';
  const [paymentProviderGuardAcknowledged, setPaymentProviderGuardAcknowledged] = useState<boolean>(false);
  const missingRequirements: string[] = [];

  if (!numberValid) {
    missingRequirements.push('Valid E.164 number required');
  }
  if (workflowMode === 'script') {
    if (effectiveScriptId <= 0) {
      missingRequirements.push(canBrowseScripts ? 'Select a call script' : 'Valid script ID required');
    }
    if (canBrowseScripts && selectedScript && !resolvedScriptFirstMessageValue) {
      missingRequirements.push('Selected script must resolve a first message');
    }
    if (paymentProviderGuardBlocked && !paymentProviderGuardAcknowledged) {
      missingRequirements.push('Payment flow provider guard must be acknowledged');
    }
  } else {
    if (!promptValue) {
      missingRequirements.push('Prompt required');
    }
    if (!firstMessageValue) {
      missingRequirements.push('First message required');
    }
  }

  const canSubmit = canOperate && missingRequirements.length === 0 && !submitting;
  const warningList = toWarningList(submitResult?.warnings);
  const scriptSummaryLines = selectedScript ? [
    `Script: ${selectedScriptName}`,
    `Script ID: ${selectedScriptId}`,
    `Flow: ${toFlowTypeLabel(selectedScript)}`,
    `Version: v${selectedScriptVersion || 1}`,
    `Lifecycle: ${toTextValue(selectedScript.lifecycle_state, 'draft')}`,
    ...(selectedScriptBusinessId ? [`Business: ${selectedScriptBusinessId}`] : []),
    ...(selectedScriptVoiceModel ? [`Voice model: ${selectedScriptVoiceModel}`] : []),
    ...(selectedScriptPurpose ? [`Purpose: ${selectedScriptPurpose}`] : []),
    ...(selectedScriptEmotion ? [`Tone: ${selectedScriptEmotion}`] : []),
    ...(selectedScriptUrgency ? [`Urgency: ${selectedScriptUrgency}`] : []),
    ...(selectedScriptTechnicalLevel ? [`Technical level: ${selectedScriptTechnicalLevel}`] : []),
    ...(selectedScriptObjectiveTags.length > 0 ? [`Objective tags: ${selectedScriptObjectiveTags.join(', ')}`] : []),
    ...(Object.keys(resolvedScriptPlaceholderValues).length > 0
      ? [`Variables: ${Object.entries(resolvedScriptPlaceholderValues).map(([key, value]) => `${key}=${value}`).join(', ')}`]
      : []),
  ] : [];

  const callBriefLines = [
    `Number: ${numberValid ? normalizedNumber : 'Missing valid E.164 number'}`,
    customerNameValue ? `Customer: ${customerNameValue}` : 'Customer: optional',
    `Mode: ${workflowMode === 'script' ? 'Script-backed call' : 'Custom prompt workflow'}`,
    ...(workflowMode === 'script'
      ? [
        `Script ID: ${effectiveScriptId > 0 ? effectiveScriptId : 'Missing script selection'}`,
        ...(scriptSummaryLines.length > 0 ? scriptSummaryLines : []),
      ]
      : [
        `Purpose: ${purposeValue}`,
        `Tone: ${emotionValue}`,
        `Urgency: ${urgencyValue}`,
        `Technical level: ${technicalLevelValue}`,
        `Voice model: ${voiceModelValue || 'Auto / provider default'}`,
      ]),
  ];
  const callPurposeLabel = getOptionLabel(CALL_PURPOSE_OPTIONS, purposeValue, purposeValue || 'general');
  const callMoodLabel = getOptionLabel(CALL_MOOD_OPTIONS, emotionValue, emotionValue || 'auto');
  const callUrgencyLabel = getOptionLabel(CALL_URGENCY_OPTIONS, urgencyValue, urgencyValue || 'auto');
  const callTechLevelLabel = getOptionLabel(
    CALL_TECH_LEVEL_OPTIONS,
    technicalLevelValue,
    technicalLevelValue || 'auto',
  );
  const activeCallSid = toTextValue(submitResult?.call_sid, persistedActiveCallSid);
  const liveConsoleLastEvents = useMemo(
    () => toEventRows(callConsoleLiveSnapshot?.last_events),
    [callConsoleLiveSnapshot],
  );
  const liveConsolePreview = useMemo(
    () => toOptionalRecord(callConsoleLiveSnapshot?.preview),
    [callConsoleLiveSnapshot],
  );
  const liveConsoleStatus = resolveCallConsoleStatus(
    callConsoleLiveSnapshot,
    callConsoleDetails,
    callConsoleRecentStates,
  );
  const liveConsolePhase = resolveCallConsolePhase(
    callConsoleLiveSnapshot,
    callConsoleDetails,
    callConsoleRecentStates,
  );
  const callConsoleTerminal = isTerminalCallStatus(liveConsoleStatus);

  const clearCallConsoleState = useCallback((options: { clearPersistedSid?: boolean } = {}) => {
    setCallConsoleBusy(false);
    setCallConsoleRefreshing(false);
    setCallConsoleError('');
    setCallConsoleLoadedSid('');
    setCallConsoleDetails(null);
    setCallConsoleLiveSnapshot(null);
    setCallConsoleRecentStates([]);
    setCallConsoleNotifications([]);
    if (options.clearPersistedSid) {
      setPersistedActiveCallSid('');
      writeActiveCallConsoleSid(sessionTelegramId, '');
    }
  }, [sessionTelegramId]);

  useEffect(() => {
    if (!sessionTelegramId) {
      setPersistedActiveCallSid('');
      setActiveCallStorageReady(false);
      return;
    }
    const restoredSid = readActiveCallConsoleSid(sessionTelegramId);
    setPersistedActiveCallSid(restoredSid);
    setActiveCallStorageReady(true);
  }, [sessionTelegramId]);

  useEffect(() => {
    const launchedCallSid = toTextValue(submitResult?.call_sid);
    if (!launchedCallSid) return;
    setPersistedActiveCallSid(launchedCallSid);
    writeActiveCallConsoleSid(sessionTelegramId, launchedCallSid);
  }, [sessionTelegramId, submitResult]);

  useEffect(() => {
    activeCallSidRef.current = activeCallSid.trim();
  }, [activeCallSid]);

  useEffect(() => {
    if (loading || !activeCallStorageReady || !sessionTelegramId || !canOperate) {
      return;
    }
    if (activeCallSid.trim()) {
      return;
    }
    if (activeCallResumeAttemptRef.current === sessionTelegramId) {
      return;
    }

    let cancelled = false;
    activeCallResumeAttemptRef.current = sessionTelegramId;

    const restoreActiveCallSid = async (): Promise<void> => {
      try {
        const response = await request<CallActiveResumeResponse>('/miniapp/calls/active', {
          method: 'GET',
        });
        if (cancelled) return;
        const resumedSid = toTextValue(asRecord(response?.call).call_sid);
        if (!resumedSid) return;
        setPersistedActiveCallSid(resumedSid);
        writeActiveCallConsoleSid(sessionTelegramId, resumedSid);
      } catch {
        // Keep the page usable even if active-call resume is unavailable.
      }
    };

    void restoreActiveCallSid();

    return () => {
      cancelled = true;
    };
  }, [activeCallSid, activeCallStorageReady, canOperate, loading, request, sessionTelegramId]);
  const callWizardSteps = [
    {
      title: '1. Capture recipient',
      complete: numberValid,
      description: numberValid
        ? `Number ready: ${normalizedNumber}${customerNameValue ? ` | customer ${customerNameValue}` : ''}`
        : 'Enter the destination number in E.164 format. Customer name stays optional, matching the bot prompt.',
    },
    {
      title: '2. Choose setup path',
      complete: true,
      description: workflowMode === 'script'
        ? 'Current path: use call script. This mirrors the bot branch that selects a saved script first.'
        : 'Current path: build custom persona. This mirrors the bot branch that gathers prompt and first message directly.',
    },
    {
      title: workflowMode === 'script' ? '3. Select script and fill variables' : '3. Draft prompt and opening line',
      complete: workflowMode === 'script'
        ? (effectiveScriptId > 0 && (!canBrowseScripts || !selectedScript || Boolean(resolvedScriptFirstMessageValue)))
        : Boolean(promptValue && firstMessageValue),
      description: workflowMode === 'script'
        ? (effectiveScriptId > 0
          ? (selectedScript
            ? `Script ready: ${selectedScriptName || `#${effectiveScriptId}`}${scriptPlaceholderTokens.length > 0 ? ` | variables ${Object.keys(resolvedScriptPlaceholderValues).length}/${scriptPlaceholderTokens.length} filled` : ''}`
            : `Known script ID ready: ${effectiveScriptId}`)
          : (canBrowseScripts
            ? 'Choose a script from the live catalog, then fill any placeholder values you want to replace.'
            : 'Enter a known script ID or continue in the bot when guided script selection is required.'))
        : (promptValue && firstMessageValue
          ? `Prompt and first message captured | purpose ${callPurposeLabel}`
          : 'Enter the agent prompt and the first spoken message before launch.'),
    },
    {
      title: '4. Review flow posture',
      complete: workflowMode === 'script'
        ? (!requiresPaymentProviderGuard || !paymentProviderGuardBlocked || paymentProviderGuardAcknowledged)
        : true,
      description: workflowMode === 'script'
        ? (requiresPaymentProviderGuard
          ? (paymentProviderGuardBlocked
            ? `Payment flow selected on ${activeCallProvider || 'unknown'}; acknowledge the provider guard or choose another script.`
            : `Payment flow posture reviewed${activeCallProvider ? ` on ${activeCallProvider}` : ''}.`)
          : `Flow ${selectedScript ? toFlowTypeLabel(selectedScript) : 'not selected'}${selectedScriptVoiceModel ? ` | voice ${selectedScriptVoiceModel}` : ''}`)
        : `Purpose ${callPurposeLabel} | tone ${callMoodLabel} | urgency ${callUrgencyLabel} | technical level ${callTechLevelLabel}`,
    },
    {
      title: '5. Launch /outbound-call',
      complete: Boolean(submitResult?.call_sid),
      description: submitResult?.call_sid
        ? `Launch completed with call SID ${submitResult.call_sid}. Live call console polling is active while webhook updates continue.`
        : (canSubmit
          ? 'All required fields are present. Start Call will execute the same /outbound-call backend path used by the bot.'
          : `Waiting on ${missingRequirements[0] || 'the remaining required fields'} before launch.`),
    },
  ];
  const activeWizardStepIndex = callWizardSteps.findIndex((step) => !step.complete);
  const activeWizardStepTitle = callWizardSteps[activeWizardStepIndex]?.title || 'All phases complete';

  const refreshScriptCatalog = async (): Promise<void> => {
    if (!canBrowseScripts) return;
    setScriptCatalogLoading(true);
    setScriptCatalogError('');
    try {
      const response = await invokeAction<CallScriptListResponse>(
        DASHBOARD_ACTION_CONTRACTS.CALLSCRIPT_LIST,
        {
          limit: 120,
          flow_type: scriptFlowFilterInput.trim() || undefined,
        },
      );
      const nextRows = toCallScriptRows(response?.scripts);
      setCallScripts(nextRows);
      setSelectedCallScriptId((current) => {
        if (nextRows.length === 0) return '';
        const currentExists = nextRows.some((entry) => toPositiveInt(entry.id) === toPositiveInt(current));
        return currentExists ? current : String(toPositiveInt(nextRows[0]?.id));
      });
    } catch (nextError) {
      setScriptCatalogError(toErrorMessage(nextError));
      setCallScripts([]);
      setSelectedCallScriptId('');
    } finally {
      setScriptCatalogLoading(false);
    }
  };

  useEffect(() => {
    if (workflowMode !== 'script' || !canBrowseScripts) return;
    if (callScripts.length > 0 || scriptCatalogLoading) return;
    void refreshScriptCatalog();
  }, [callScripts.length, canBrowseScripts, scriptCatalogLoading, workflowMode]);

  useEffect(() => {
    setScriptPlaceholderValues((current) => scriptPlaceholderTokens.reduce<Record<string, string>>((accumulator, token) => {
      accumulator[token] = current[token] || '';
      return accumulator;
    }, {}));
  }, [scriptPlaceholderTokens]);

  useEffect(() => {
    setPaymentProviderGuardAcknowledged(false);
  }, [workflowMode, selectedScriptId, activeCallProvider]);

  const loadCallConsole = useCallback(async (
    targetSid: string,
    options: { background?: boolean } = {},
  ): Promise<boolean> => {
    const normalizedSid = targetSid.trim();
    if (!normalizedSid || callConsoleRequestRef.current === normalizedSid) {
      return false;
    }

    callConsoleRequestRef.current = normalizedSid;
    if (options.background) {
      setCallConsoleRefreshing(true);
    } else {
      setCallConsoleBusy(true);
    }
    setCallConsoleError('');

    try {
      const [detailsPayload, statusPayload] = await Promise.all([
        invokeAction<Record<string, unknown>>(
          DASHBOARD_ACTION_CONTRACTS.CALLS_GET,
          { call_sid: normalizedSid },
        ),
        invokeAction<CallCommandStatusResponse>(
          DASHBOARD_ACTION_CONTRACTS.CALLS_EVENTS,
          { call_sid: normalizedSid },
        ),
      ]);

      const detailsRecord = toOptionalRecord(detailsPayload?.call) || toOptionalRecord(detailsPayload);
      const statusRecord = toOptionalRecord(statusPayload);
      const recentStates = toEventRows(statusRecord?.recent_states);
      const notificationRows = toEventRows(statusRecord?.notification_status);
      const liveSnapshot = toOptionalRecord(statusRecord?.live_console);

      if (activeCallSidRef.current !== normalizedSid) {
        return false;
      }

      setCallConsoleDetails(detailsRecord);
      setCallConsoleRecentStates(recentStates);
      setCallConsoleNotifications(notificationRows);
      setCallConsoleLiveSnapshot(liveSnapshot);
      setCallConsoleLoadedSid(normalizedSid);

      const reachedTerminal = isTerminalCallStatus(
        resolveCallConsoleStatus(liveSnapshot, detailsRecord, recentStates),
      );
      if (reachedTerminal && activeCallSidRef.current === normalizedSid) {
        writeActiveCallConsoleSid(sessionTelegramId, '');
      } else {
        setPersistedActiveCallSid(normalizedSid);
        writeActiveCallConsoleSid(sessionTelegramId, normalizedSid);
      }

      return reachedTerminal;
    } catch (nextError) {
      setCallConsoleError(toErrorMessage(nextError));
      return false;
    } finally {
      callConsoleRequestRef.current = '';
      setCallConsoleBusy(false);
      setCallConsoleRefreshing(false);
    }
  }, [invokeAction, sessionTelegramId]);

  useEffect(() => {
    const targetSid = activeCallSid.trim();
    if (!targetSid) return undefined;

    let disposed = false;
    let pollTimer: ReturnType<typeof window.setTimeout> | null = null;

    const scheduleNext = () => {
      if (disposed || callConsoleTerminal) return;
      pollTimer = window.setTimeout(() => {
        void poll(true);
      }, 4000);
    };

    const poll = async (background: boolean) => {
      const reachedTerminal = await loadCallConsole(targetSid, { background });
      if (disposed || reachedTerminal) return;
      scheduleNext();
    };

    if (callConsoleLoadedSid !== targetSid) {
      void poll(false);
    } else if (!callConsoleTerminal) {
      scheduleNext();
    }

    return () => {
      disposed = true;
      if (pollTimer) {
        window.clearTimeout(pollTimer);
      }
    };
  }, [activeCallSid, callConsoleLoadedSid, callConsoleTerminal, loadCallConsole]);

  const submitCall = async (): Promise<void> => {
    if (!canSubmit) return;
    const idempotencyKey = createCallIdempotencyKey();
    setSubmitting(true);
    setSubmitError('');
    setSubmitCode('');
    setSubmitResult(null);
    clearCallConsoleState({ clearPersistedSid: true });

    try {
      const response = await request<CallCommandResponse>('/outbound-call', {
        method: 'POST',
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          number: normalizedNumber,
          idempotency_key: idempotencyKey,
          user_chat_id: sessionTelegramId || undefined,
          customer_name: customerNameValue || undefined,
          ...(workflowMode === 'script'
            ? {
              script_id: effectiveScriptId,
              script_version: selectedScriptVersion,
              script: selectedScriptName || undefined,
              business_id: selectedScriptBusinessId || undefined,
              prompt: resolvedScriptPromptValue || undefined,
              first_message: resolvedScriptFirstMessageValue || undefined,
              voice_model: selectedScriptVoiceModel || undefined,
              purpose: selectedScriptPurpose || undefined,
              emotion: selectedScriptEmotion || undefined,
              urgency: selectedScriptUrgency || undefined,
              technical_level: selectedScriptTechnicalLevel || undefined,
            }
            : {
              prompt: promptValue,
              first_message: firstMessageValue,
              purpose: purposeValue,
              conversation_profile: purposeValue !== 'general' ? purposeValue : undefined,
              conversation_profile_lock: purposeValue !== 'general' ? true : undefined,
              voice_model: voiceModelValue || undefined,
              emotion: emotionValue !== 'auto' ? emotionValue : undefined,
              urgency: urgencyValue !== 'auto' ? urgencyValue : undefined,
              technical_level: technicalLevelValue !== 'auto' ? technicalLevelValue : undefined,
            }),
        }),
      });
      setSubmitResult(response || null);
    } catch (nextError) {
      setSubmitError(toErrorMessage(nextError));
      setSubmitCode(toErrorCode(nextError));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Page back>
        <Placeholder
          header={contract.canonicalCommand}
          description="Loading Mini App session and call workflow contract..."
        />
      </Page>
    );
  }

  return (
    <Page back>
      <List>
        <Section header={contract.canonicalCommand} footer={contract.notes}>
          <Cell subtitle={contract.summary}>
            {describeAccessLevel(accessLevel)}
          </Cell>
          <Cell
            subtitle={error ? `Bootstrap fallback active. ${error}` : 'Mini App session is ready for command-owned call execution.'}
            after={<Navigation>{error ? 'Retry' : 'Ready'}</Navigation>}
            onClick={() => {
              void reload();
            }}
          >
            Session status
          </Cell>
          {errorCode ? (
            <Cell subtitle="Latest bootstrap blocking or recovery code">
              {errorCode}
            </Cell>
          ) : null}
        </Section>

        {!canOperate ? (
          <Section
            header="Access required"
            footer="The live /call bot command is restricted to authorized users. The Mini App keeps the same rule."
          >
            <UiStatePanel
              title="Authorized access required"
              description="Open the main bot to request access or use /help and /guide for non-execution guidance."
              tone="warning"
            />
          </Section>
        ) : (
          <>
            <Section
              header="Live /call wizard parity"
              footer="The bot gathers these inputs one step at a time. The Mini App keeps the same phases explicit, but shows them on one page so operators can move faster without changing the backend workflow."
            >
              <div className="va-grid">
                <UiCard>
                  <p className="va-card-eyebrow">Bot setup phases</p>
                  <div className="va-inline-tools">
                    <UiButton
                      variant={workflowMode === 'script' ? 'primary' : 'secondary'}
                      onClick={() => setWorkflowMode('script')}
                    >
                      Use Call Script
                    </UiButton>
                    <UiButton
                      variant={workflowMode === 'custom' ? 'primary' : 'secondary'}
                      onClick={() => setWorkflowMode('custom')}
                    >
                      Build Custom Persona
                    </UiButton>
                  </div>
                  <ul className="va-list va-list-dense">
                    {callWizardSteps.map((step) => (
                      <li key={step.title}>
                        {step.complete ? '[done]' : '[next]'} {step.title}: {step.description}
                      </li>
                    ))}
                  </ul>
                </UiCard>
                <UiCard>
                  <p className="va-card-eyebrow">Current parity posture</p>
                  <div className="va-inline-metrics">
                    <UiBadge>Mode {workflowMode}</UiBadge>
                    <UiBadge>Next {activeWizardStepTitle}</UiBadge>
                    <UiBadge>{workflowMode === 'script' ? `Script ${effectiveScriptId > 0 ? 'ready' : 'missing'}` : `Prompt ${promptValue && firstMessageValue ? 'ready' : 'missing'}`}</UiBadge>
                  </div>
                  <UiStatePanel
                    compact
                    title={workflowMode === 'script' ? 'Script-backed bot branch' : 'Custom-persona bot branch'}
                    description={workflowMode === 'script'
                      ? (canBrowseScripts
                        ? 'This page now follows the bot branch order: recipient, script selection, placeholder fill, provider guard review, then launch. Script catalog access still depends on the current Mini App capability contract.'
                        : 'This page follows the bot script branch, but restricted Mini App sessions still need a known script ID because catalog browsing is capability-gated.')
                      : 'This page now follows the bot custom branch order: recipient, prompt, first message, purpose/tone review, then launch. The bot conversation prompts are flattened into visible fields here.'}
                    tone="info"
                  />
                  <UiStatePanel
                    compact
                    title="What still differs from the bot"
                    description="Voice picker pagination, button-by-button script browsing for restricted sessions, and the bot's conversational waits are still compressed into this single command page. Execution and validation remain on the same backend contract."
                    tone="warning"
                  />
                </UiCard>
              </div>
            </Section>

            <Section
              header="Workflow mode"
              footer="The live bot supports both script-backed and custom call setup. This Mini App slice now preserves both execution paths and exposes the same setup phases directly on-page, while keeping catalog-access and conversational UX gaps explicit."
            >
              <div className="va-grid">
                <UiCard>
                  <p className="va-card-eyebrow">Mode selector</p>
                  <UiSelect
                    aria-label="Call workflow mode"
                    value={workflowMode}
                    onChange={(event) => setWorkflowMode(event.target.value as CallWorkflowMode)}
                  >
                    {CALL_WORKFLOW_MODE_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </UiSelect>
                  {workflowMode === 'script' ? (
                    <UiStatePanel
                      compact
                      title={canBrowseScripts ? 'Script-backed execution ready' : 'Script-backed execution available'}
                      description={canBrowseScripts
                        ? 'This page can load the live call-script catalog through the Mini App action contract, then launch /outbound-call with the selected script.'
                        : 'This page can launch /outbound-call with a known script ID. Catalog browsing remains restricted to higher-access Mini App sessions under the current server contract.'}
                      tone={canBrowseScripts ? 'success' : 'warning'}
                    />
                  ) : (
                    <UiStatePanel
                      compact
                      title="Custom call execution ready"
                      description="This page posts directly to the live /outbound-call backend path using the current Mini App session."
                      tone="success"
                    />
                  )}
                </UiCard>
                <UiCard>
                  <p className="va-card-eyebrow">Workflow posture</p>
                  <div className="va-inline-metrics">
                    <UiBadge>Access {accessLevel}</UiBadge>
                    <UiBadge>Mode {workflowMode}</UiBadge>
                    <UiBadge>{workflowMode === 'script' ? `Script ${effectiveScriptId > 0 ? 'set' : 'missing'}` : `Prompt ${promptValue ? 'set' : 'missing'}`}</UiBadge>
                    <UiBadge>{workflowMode === 'script' ? `Catalog ${canBrowseScripts ? 'available' : 'restricted'}` : `First message ${firstMessageValue ? 'set' : 'missing'}`}</UiBadge>
                  </div>
                  <p className="va-muted">
                    Command ownership stays with {BOT_PRIMARY_COMMANDS.CALL}. The Mini App adds form productivity,
                    but execution still uses the same backend contract and validation rules as the bot.
                  </p>
                </UiCard>
              </div>
            </Section>

            <Section
              header="Compose call"
              footer={workflowMode === 'script'
                ? 'The required minimum is a valid E.164 number plus a valid script selection. Selected script placeholders are resolved in-page, then the filled prompt and first message are forwarded to the live backend contract.'
                : 'The required minimum is a valid E.164 number plus a prompt and first message. Additional tuning fields stay optional.'}
            >
              <div className="va-grid">
                <UiCard>
                  <p className="va-card-eyebrow">Recipient</p>
                  <div className="va-inline-tools">
                    <UiInput
                      aria-label="Destination number"
                      placeholder="+18005551234"
                      value={numberInput}
                      onChange={(event) => setNumberInput(event.target.value)}
                    />
                    <UiInput
                      aria-label="Customer name"
                      placeholder="Customer name (optional)"
                      value={customerNameInput}
                      onChange={(event) => setCustomerNameInput(event.target.value)}
                    />
                  </div>
                  {!numberValid ? (
                    <UiStatePanel
                      compact
                      title="Phone number format required"
                      description="Use E.164 format with the + prefix and country code, for example +18005551234."
                      tone="warning"
                    />
                  ) : null}

                  <p className="va-card-eyebrow">Workflow</p>
                  <div className="va-inline-tools">
                    {workflowMode === 'script' ? (
                      <>
                        {canBrowseScripts ? (
                          <>
                            <UiInput
                              aria-label="Script flow filter"
                              placeholder="Flow filter (optional)"
                              value={scriptFlowFilterInput}
                              onChange={(event) => setScriptFlowFilterInput(event.target.value)}
                            />
                            <UiButton
                              variant="secondary"
                              disabled={scriptCatalogLoading}
                              onClick={() => {
                                void refreshScriptCatalog();
                              }}
                            >
                              {scriptCatalogLoading ? 'Refreshing...' : 'Refresh Scripts'}
                            </UiButton>
                          </>
                        ) : (
                          <UiInput
                            aria-label="Script ID"
                            placeholder="Script ID"
                            value={manualScriptIdInput}
                            onChange={(event) => setManualScriptIdInput(event.target.value)}
                          />
                        )}
                      </>
                    ) : (
                      <>
                        <UiSelect
                          aria-label="Call purpose"
                          value={purposeInput}
                          onChange={(event) => setPurposeInput(event.target.value)}
                        >
                          {CALL_PURPOSE_OPTIONS.map((option) => (
                            <option key={option.id} value={option.id}>{option.label}</option>
                          ))}
                        </UiSelect>
                        <UiInput
                          aria-label="Voice model"
                          placeholder="Voice model (optional)"
                          value={voiceModelInput}
                          onChange={(event) => setVoiceModelInput(event.target.value)}
                        />
                      </>
                    )}
                  </div>

                  {workflowMode === 'script' ? (
                    <>
                      {canBrowseScripts ? (
                        <>
                          <p className="va-card-eyebrow">Script catalog</p>
                          <UiSelect
                            aria-label="Call script"
                            value={selectedCallScriptId}
                            onChange={(event) => setSelectedCallScriptId(event.target.value)}
                          >
                            <option value="">Select a call script</option>
                            {callScripts.map((script) => {
                              const scriptId = toPositiveInt(script.id);
                              const scriptName = toTextValue(script.name, `Script #${scriptId || 'unknown'}`);
                              return (
                                <option key={scriptId || scriptName} value={scriptId > 0 ? String(scriptId) : ''}>
                                  {scriptId > 0 ? `#${scriptId} ` : ''}{scriptName} [{toFlowTypeLabel(script)}]
                                </option>
                              );
                            })}
                          </UiSelect>
                          {scriptCatalogError ? (
                            <UiStatePanel
                              compact
                              title="Script catalog unavailable"
                              description={scriptCatalogError}
                              tone="error"
                            />
                          ) : null}
                          {!scriptCatalogLoading && callScripts.length === 0 && !scriptCatalogError ? (
                            <UiStatePanel
                              compact
                              title="No scripts loaded"
                              description="No call scripts are currently available for this Mini App session and filter."
                              tone="warning"
                            />
                          ) : null}
                        </>
                      ) : (
                          <UiStatePanel
                            compact
                            title="Catalog browsing restricted"
                            description="This access tier cannot list call scripts in the Mini App today. Enter a known script ID to preserve backend execution parity, or use the bot /call wizard when interactive script browsing is required."
                            tone="warning"
                          />
                      )}
                      {selectedScript ? (
                        <>
                          <p className="va-card-eyebrow">Selected script</p>
                          <ul className="va-list va-list-dense">
                            {scriptSummaryLines.map((line) => (
                              <li key={line}>{line}</li>
                            ))}
                          </ul>
                          {toTextValue(selectedScript.description) ? (
                            <p className="va-muted">{toTextValue(selectedScript.description)}</p>
                          ) : null}
                          {scriptPlaceholderTokens.length > 0 ? (
                            <>
                              <p className="va-card-eyebrow">Variables</p>
                              <div className="va-inline-tools">
                                {scriptPlaceholderTokens.map((token) => (
                                  <UiInput
                                    key={token}
                                    aria-label={`Variable ${token}`}
                                    placeholder={`${token} (optional)`}
                                    value={scriptPlaceholderValues[token] || ''}
                                    onChange={(event) => setScriptPlaceholderValues((current) => ({
                                      ...current,
                                      [token]: event.target.value,
                                    }))}
                                  />
                                ))}
                              </div>
                              <UiStatePanel
                                compact
                                title="Placeholder resolution"
                                description="Leave any variable blank to keep its original {token} placeholder, matching the bot's skip behavior during script setup."
                                tone="info"
                              />
                            </>
                          ) : null}
                          {requiresPaymentProviderGuard ? (
                            paymentProviderGuardBlocked ? (
                              <>
                                <UiStatePanel
                                  compact
                                  title="Payment flow provider guard"
                                  description={`Active call provider is ${activeCallProvider}. Payment capture is most reliable on twilio. Continue only if you intend to run this flow on the current provider.`}
                                  tone="warning"
                                />
                                <div className="va-inline-tools">
                                  <UiButton
                                    variant="primary"
                                    disabled={paymentProviderGuardAcknowledged}
                                    onClick={() => setPaymentProviderGuardAcknowledged(true)}
                                  >
                                    {paymentProviderGuardAcknowledged ? 'Continuing on current provider' : 'Continue Anyway'}
                                  </UiButton>
                                  <UiButton
                                    variant="secondary"
                                    onClick={() => {
                                      setSelectedCallScriptId('');
                                      setPaymentProviderGuardAcknowledged(false);
                                    }}
                                  >
                                    Choose Another Script
                                  </UiButton>
                                  <UiButton
                                    variant="plain"
                                    onClick={() => {
                                      setSelectedCallScriptId('');
                                      setSubmitResult(null);
                                      setSubmitError('');
                                      setSubmitCode('');
                                      setPaymentProviderGuardAcknowledged(false);
                                    }}
                                  >
                                    Cancel Launch
                                  </UiButton>
                                </div>
                              </>
                            ) : (
                              <UiStatePanel
                                compact
                                title="Payment flow provider posture"
                                description={activeCallProvider
                                  ? `Active call provider is ${activeCallProvider}. This payment flow matches the preferred twilio route.`
                                  : 'Provider posture is unavailable in the current bootstrap payload. Verify /provider if this payment flow is sensitive to routing.'}
                                tone={activeCallProvider ? 'success' : 'info'}
                              />
                            )
                          ) : null}
                          {(scriptPromptValue || scriptFirstMessageValue) ? (
                            <UiStatePanel
                              compact
                              title="Resolved script content"
                              description={[
                                resolvedScriptPromptValue ? `Prompt: ${resolvedScriptPromptValue}` : '',
                                resolvedScriptFirstMessageValue ? `First message: ${resolvedScriptFirstMessageValue}` : '',
                              ].filter(Boolean).join(' | ')}
                              tone="info"
                            />
                          ) : null}
                        </>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <p className="va-card-eyebrow">Prompt</p>
                      <UiTextarea
                        aria-label="Call prompt"
                        placeholder="Describe the persona, constraints, and goal for the outbound call."
                        rows={6}
                        value={promptInput}
                        onChange={(event) => setPromptInput(event.target.value)}
                      />

                      <p className="va-card-eyebrow">First message</p>
                      <UiTextarea
                        aria-label="First message"
                        placeholder="Write the first spoken line the call should use."
                        rows={4}
                        value={firstMessageInput}
                        onChange={(event) => setFirstMessageInput(event.target.value)}
                      />

                      <p className="va-card-eyebrow">Tuning</p>
                      <div className="va-inline-tools">
                        <UiSelect
                          aria-label="Emotion"
                          value={emotionInput}
                          onChange={(event) => setEmotionInput(event.target.value)}
                        >
                          {CALL_MOOD_OPTIONS.map((option) => (
                            <option key={option.id} value={option.id}>{option.label}</option>
                          ))}
                        </UiSelect>
                        <UiSelect
                          aria-label="Urgency"
                          value={urgencyInput}
                          onChange={(event) => setUrgencyInput(event.target.value)}
                        >
                          {CALL_URGENCY_OPTIONS.map((option) => (
                            <option key={option.id} value={option.id}>{option.label}</option>
                          ))}
                        </UiSelect>
                        <UiSelect
                          aria-label="Technical level"
                          value={technicalLevelInput}
                          onChange={(event) => setTechnicalLevelInput(event.target.value)}
                        >
                          {CALL_TECH_LEVEL_OPTIONS.map((option) => (
                            <option key={option.id} value={option.id}>{option.label}</option>
                          ))}
                        </UiSelect>
                      </div>
                    </>
                  )}

                  <div className="va-inline-tools">
                    <UiButton
                      variant="primary"
                      disabled={!canSubmit}
                      onClick={() => {
                        void submitCall();
                      }}
                    >
                      {submitting ? 'Starting call...' : 'Start Call'}
                    </UiButton>
                    <UiButton
                      variant="secondary"
                      disabled={submitting && !submitResult}
                      onClick={() => {
                        setSubmitResult(null);
                        setSubmitError('');
                        setSubmitCode('');
                        clearCallConsoleState({ clearPersistedSid: true });
                      }}
                    >
                      Clear Result
                    </UiButton>
                  </div>

                  {missingRequirements.length > 0 ? (
                    <UiStatePanel
                      compact
                      title="Call launch requirements not met"
                      description={missingRequirements.join(' | ')}
                      tone="warning"
                    />
                  ) : null}
                </UiCard>

                <UiCard>
                  <p className="va-card-eyebrow">Call brief</p>
                  <ul className="va-list va-list-dense">
                    {callBriefLines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                  {requiresPaymentProviderGuard ? (
                    <UiStatePanel
                      compact
                      title="Provider guard state"
                      description={paymentProviderGuardBlocked
                        ? (paymentProviderGuardAcknowledged
                          ? `Non-preferred provider override acknowledged for ${activeCallProvider}.`
                          : `Waiting for provider-guard confirmation because active call provider is ${activeCallProvider}.`)
                        : (activeCallProvider
                          ? `Payment flow aligned to ${activeCallProvider}.`
                          : 'Provider posture unavailable; verify routing if this call depends on secure payment capture.')}
                      tone={paymentProviderGuardBlocked && !paymentProviderGuardAcknowledged ? 'warning' : 'info'}
                    />
                  ) : null}

                  {submitError ? (
                    <UiStatePanel
                      title="Call launch failed"
                      description={submitCode ? `${submitError} [${submitCode}]` : submitError}
                      tone="error"
                    />
                  ) : null}

                  {submitResult?.call_sid ? (
                    <UiStatePanel
                      title={submitResult.deduped ? 'Existing call request reused' : 'Call launched'}
                      description={`${submitResult.provider || 'Provider'} accepted the request for ${submitResult.to || normalizedNumber}. Status: ${submitResult.status || 'queued'}. Call SID: ${submitResult.call_sid}.`}
                      tone="success"
                    />
                  ) : null}

                  {!submitError && !submitResult?.call_sid ? (
                    <UiStatePanel
                      compact
                      title="No active submission yet"
                      description="Review the brief, then launch the outbound call when the required fields are complete."
                      tone="info"
                    />
                  ) : null}

                  {warningList.length > 0 ? (
                    <>
                      <p className="va-card-eyebrow">Warnings</p>
                      <ul className="va-list va-list-dense">
                        {warningList.map((warning) => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                </UiCard>
              </div>
            </Section>

            <Section
              header="Live call console"
              footer="This console stays attached to the active call SID after launch, restores that SID after Mini App refresh for the same Telegram session, can reattach to the latest still-active call owned by that Telegram session, and keeps polling the same call detail and call-status contracts that the bot-backed investigation surfaces use, including the webhook-backed live console snapshot."
            >
              <div className="va-grid">
                <UiCard>
                  <p className="va-card-eyebrow">Ongoing call status updates</p>
                  <div className="va-inline-tools">
                    <UiButton
                      variant="secondary"
                      disabled={!activeCallSid || callConsoleBusy || callConsoleRefreshing}
                      onClick={() => {
                        void loadCallConsole(activeCallSid, { background: false });
                      }}
                    >
                      {callConsoleBusy || callConsoleRefreshing ? 'Refreshing...' : 'Refresh Live Console'}
                    </UiButton>
                  </div>
                  <div className="va-inline-metrics">
                    <UiBadge>SID {activeCallSid || 'none'}</UiBadge>
                    <UiBadge>Status {liveConsoleStatus || 'idle'}</UiBadge>
                    <UiBadge>Phase {liveConsolePhase || 'waiting'}</UiBadge>
                    <UiBadge>{callConsoleTerminal ? 'Terminal' : activeCallSid ? 'Polling live' : 'Awaiting launch'}</UiBadge>
                  </div>

                  {callConsoleError ? (
                    <UiStatePanel
                      title="Live console refresh failed"
                      description={callConsoleError}
                      tone="error"
                    />
                  ) : null}

                  {activeCallSid ? (
                    <UiStatePanel
                      compact
                      title="Webhook-backed live call console"
                      description={callConsoleBusy
                        ? 'Loading the live call console from call details, recent provider states, and webhook-backed runtime snapshots.'
                        : (callConsoleRefreshing
                          ? 'Refreshing live console while the call remains active.'
                          : `Tracking ${activeCallSid} until the backend reports a terminal call status.`)}
                      tone={callConsoleError ? 'error' : (callConsoleTerminal ? 'success' : 'info')}
                    />
                  ) : (
                    <UiStatePanel
                      compact
                      title="No active call SID yet"
                      description="Launch a call from this page and the live console will stay visible here with ongoing status, phase, preview, and recent event updates. If the Mini App reloads before the call finishes, this page restores the same active call SID for the current Telegram session and can reattach to the latest still-active call for that session from the backend."
                      tone="info"
                    />
                  )}

                  {callConsoleDetails || callConsoleLiveSnapshot ? (
                    <ul className="va-list va-list-dense">
                      <li>Provider: {toTextValue(callConsoleDetails?.provider, toTextValue(callConsoleLiveSnapshot?.provider, submitResult?.provider || 'unknown'))}</li>
                      <li>Updated: {toTextValue(callConsoleLiveSnapshot?.updated_at, toTextValue(callConsoleDetails?.updated_at, 'n/a'))}</li>
                      <li>Route: {toTextValue(callConsoleLiveSnapshot?.route_label, toTextValue(callConsoleDetails?.route_label, 'n/a'))}</li>
                      <li>From: {toTextValue(callConsoleLiveSnapshot?.from, toTextValue(callConsoleDetails?.from_number, 'n/a'))}</li>
                      <li>To: {toTextValue(callConsoleLiveSnapshot?.to, toTextValue(callConsoleDetails?.to_number, submitResult?.to || normalizedNumber || 'n/a'))}</li>
                      <li>Script: {toTextValue(callConsoleLiveSnapshot?.script, selectedScriptName || 'custom')}</li>
                    </ul>
                  ) : null}

                  {liveConsolePreview ? (
                    <>
                      <p className="va-card-eyebrow">Conversation preview</p>
                      <ul className="va-list va-list-dense">
                        <li>User: {toTextValue(liveConsolePreview.user, 'No user preview yet')}</li>
                        <li>Agent: {toTextValue(liveConsolePreview.agent, 'No agent preview yet')}</li>
                      </ul>
                    </>
                  ) : null}
                </UiCard>

                <UiCard>
                  <p className="va-card-eyebrow">Recent webhook and provider activity</p>
                  {liveConsoleLastEvents.length > 0 ? (
                    <>
                      <p className="va-card-eyebrow">Live console events</p>
                      <ul className="va-list va-list-dense">
                        {liveConsoleLastEvents.map((event, index) => (
                          <li key={`live-console-event-${index}`}>{summarizeCallStateRow(event)}</li>
                        ))}
                      </ul>
                    </>
                  ) : null}

                  {callConsoleRecentStates.length > 0 ? (
                    <>
                      <p className="va-card-eyebrow">Recent states</p>
                      <ul className="va-list va-list-dense">
                        {callConsoleRecentStates.slice(0, 8).map((state, index) => (
                          <li key={`call-state-${index}`}>{summarizeCallStateRow(state)}</li>
                        ))}
                      </ul>
                    </>
                  ) : null}

                  {callConsoleNotifications.length > 0 ? (
                    <>
                      <p className="va-card-eyebrow">Notification delivery</p>
                      <ul className="va-list va-list-dense">
                        {callConsoleNotifications.slice(0, 6).map((row, index) => (
                          <li key={`call-notification-${index}`}>{summarizeCallNotificationRow(row)}</li>
                        ))}
                      </ul>
                    </>
                  ) : null}

                  {!callConsoleBusy
                  && !callConsoleRefreshing
                  && liveConsoleLastEvents.length === 0
                  && callConsoleRecentStates.length === 0
                  && callConsoleNotifications.length === 0 ? (
                    <UiStatePanel
                      compact
                      title="No runtime updates loaded yet"
                      description={activeCallSid
                        ? 'The call is being tracked, but the backend has not returned live events yet. Refresh again if the provider has only just started sending status webhooks.'
                        : 'Runtime updates will populate here once a call has been launched from this page.'}
                      tone="info"
                    />
                  ) : null}
                </UiCard>
              </div>
            </Section>
          </>
        )}

        <Section
          header="Quick actions"
          footer="These shortcuts stay aligned to existing Mini App parity routes so the call page remains part of the bot-owned workflow graph."
        >
          {(['CALLLOG', 'HELP', 'GUIDE', 'MENU'] as const).map((actionId) => {
            const action = MINIAPP_COMMAND_ACTION_CONTRACTS[actionId];
            return action.routePath ? (
              <Link key={actionId} to={action.routePath}>
                <Cell
                  subtitle={`${action.description} ${describeActionAvailability(actionId, accessLevel)}.`}
                  after={<Navigation>Open</Navigation>}
                >
                  {action.label}
                </Cell>
              </Link>
            ) : (
              <Cell
                key={actionId}
                subtitle={`${action.description} ${action.notes}`}
                after={<Navigation>Missing</Navigation>}
              >
                {action.label}
              </Cell>
            );
          })}
        </Section>

        <Section
          header="Fallback"
          footer="Unknown or stale actions still recover to the dashboard shell instead of hard-failing."
        >
          <Link to={DASHBOARD_STATIC_ROUTE_CONTRACTS.ROOT}>
            <Cell subtitle="Open the admin dashboard shell and route launcher.">
              Dashboard root
            </Cell>
          </Link>
        </Section>
      </List>
    </Page>
  );
}

function SmsCommandPageContent() {
  const contract = MINIAPP_COMMAND_PAGE_CONTRACTS.SMS;
  const navigate = useNavigate();
  const {
    loading,
    error,
    errorCode,
    accessLevel,
    hasCapability,
    invokeAction,
    reload,
  } = useMiniAppCommandSession();
  const [statusSidInput, setStatusSidInput] = useState<string>('');
  const [conversationPhoneInput, setConversationPhoneInput] = useState<string>('');
  const [sendRecipientInput, setSendRecipientInput] = useState<string>('');
  const [sendMessageInput, setSendMessageInput] = useState<string>('');
  const [sendProviderInput, setSendProviderInput] = useState<string>('');
  const [sendScheduleAtInput, setSendScheduleAtInput] = useState<string>('');
  const [sendBusy, setSendBusy] = useState<boolean>(false);
  const [sendResult, setSendResult] = useState<string>('');
  const [statusBusy, setStatusBusy] = useState<boolean>(false);
  const [conversationBusy, setConversationBusy] = useState<boolean>(false);
  const [recentBusy, setRecentBusy] = useState<boolean>(false);
  const [statsBusy, setStatsBusy] = useState<boolean>(false);
  const [bulkBusy, setBulkBusy] = useState<boolean>(false);
  const [precheckBusy, setPrecheckBusy] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string>('');
  const [callbackActionInput, setCallbackActionInput] = useState<string>('SMS_SEND');
  const [callbackResult, setCallbackResult] = useState<string>('');
  const [statusSnapshot, setStatusSnapshot] = useState<Record<string, unknown> | null>(null);
  const [recentMessages, setRecentMessages] = useState<Array<Record<string, unknown>>>([]);
  const [conversationMessages, setConversationMessages] = useState<Array<Record<string, unknown>>>([]);
  const [statsSnapshot, setStatsSnapshot] = useState<Record<string, unknown> | null>(null);
  const [bulkOperations, setBulkOperations] = useState<SmsCommandBulkStatusOperation[]>([]);
  const [bulkSummary, setBulkSummary] = useState<Record<string, unknown> | null>(null);
  const [providerSnapshot, setProviderSnapshot] = useState<Record<string, unknown> | null>(null);
  const [bulkJobIdInput, setBulkJobIdInput] = useState<string>('');

  const canOperate = accessLevel === 'authorized' || accessLevel === 'admin';
  const canManageSms = hasCapability('sms_bulk_manage');
  const canManageProvider = hasCapability('provider_manage');
  const statusSid = statusSidInput.trim();
  const sendRecipient = normalizePhone(sendRecipientInput.trim());
  const sendRecipientValid = isValidE164(sendRecipient);
  const sendMessage = sendMessageInput.trim();
  const sendProvider = sendProviderInput.trim();
  const normalizedConversationPhone = normalizePhone(conversationPhoneInput.trim());
  const conversationPhoneValid = isValidE164(normalizedConversationPhone);
  const bulkJobId = bulkJobIdInput.trim();
  const isAdminAccess = accessLevel === 'admin';
  const bulkSmsRoute = MINIAPP_COMMAND_ACTION_CONTRACTS.BULK_SMS.routePath
    ?? DASHBOARD_STATIC_ROUTE_CONTRACTS.ROOT;
  const activeBusy = sendBusy
    || statusBusy
    || conversationBusy
    || recentBusy
    || statsBusy
    || bulkBusy
    || precheckBusy;
  const actionReadyCount = Number(Boolean(statusSnapshot))
    + Number(Boolean(callbackResult))
    + Number(Boolean(statsSnapshot))
    + Number(Boolean(bulkSummary))
    + Number(Boolean(providerSnapshot))
    + Number(recentMessages.length > 0)
    + Number(conversationMessages.length > 0)
    + Number(bulkOperations.length > 0);

  const runSendNow = async (): Promise<void> => {
    if (!sendRecipientValid || !sendMessage || !canManageSms) return;
    setSendBusy(true);
    setActionError('');
    setSendResult('');
    try {
      await invokeAction(
        DASHBOARD_ACTION_CONTRACTS.SMS_BULK_SEND,
        {
          recipients: [sendRecipient],
          message: sendMessage,
          provider: sendProvider || undefined,
          options: {
            durable: true,
          },
        },
      );
      setSendResult(`Queued SMS send for ${sendRecipient}.`);
    } catch (nextError) {
      setActionError(toErrorMessage(nextError));
    } finally {
      setSendBusy(false);
    }
  };

  const runSchedule = async (): Promise<void> => {
    if (!sendRecipientValid || !sendMessage || !sendScheduleAtInput || !canManageSms) return;
    const scheduledAtMs = Date.parse(sendScheduleAtInput);
    if (Number.isNaN(scheduledAtMs)) {
      setActionError('Scheduled time is invalid.');
      return;
    }
    const scheduledIso = new Date(scheduledAtMs).toISOString();
    setSendBusy(true);
    setActionError('');
    setSendResult('');
    try {
      await invokeAction(
        DASHBOARD_ACTION_CONTRACTS.SMS_SCHEDULE_SEND,
        {
          to: sendRecipient,
          message: sendMessage,
          scheduled_time: scheduledIso,
          provider: sendProvider || undefined,
          options: {
            durable: true,
          },
        },
      );
      setSendResult(`Scheduled SMS for ${sendRecipient} at ${scheduledIso}.`);
    } catch (nextError) {
      setActionError(toErrorMessage(nextError));
    } finally {
      setSendBusy(false);
    }
  };

  const runStatusLookup = async (): Promise<void> => {
    if (!statusSid || !canManageSms) return;
    setStatusBusy(true);
    setActionError('');
    try {
      const payload = await invokeAction<SmsCommandMessageStatusResponse>(
        DASHBOARD_ACTION_CONTRACTS.SMS_MESSAGE_STATUS,
        { message_sid: statusSid },
      );
      const messageRecord = asRecord(payload?.message);
      setStatusSnapshot(Object.keys(messageRecord).length > 0 ? messageRecord : asRecord(payload));
    } catch (nextError) {
      setActionError(toErrorMessage(nextError));
    } finally {
      setStatusBusy(false);
    }
  };

  const runConversationLookup = async (): Promise<void> => {
    if (!conversationPhoneValid || !canManageSms) return;
    setConversationBusy(true);
    setActionError('');
    try {
      const payload = await invokeAction<SmsCommandMessagesResponse>(
        DASHBOARD_ACTION_CONTRACTS.SMS_MESSAGES_CONVERSATION,
        { phone: normalizedConversationPhone, limit: 20 },
      );
      setConversationMessages(toEventRows(payload?.messages));
    } catch (nextError) {
      setActionError(toErrorMessage(nextError));
    } finally {
      setConversationBusy(false);
    }
  };

  const runRecentLookup = async (): Promise<void> => {
    if (!canManageSms) return;
    setRecentBusy(true);
    setActionError('');
    try {
      const payload = await invokeAction<SmsCommandMessagesResponse>(
        DASHBOARD_ACTION_CONTRACTS.SMS_MESSAGES_RECENT,
        { limit: 12, offset: 0 },
      );
      setRecentMessages(toEventRows(payload?.messages));
    } catch (nextError) {
      setActionError(toErrorMessage(nextError));
    } finally {
      setRecentBusy(false);
    }
  };

  const runStatsLookup = async (): Promise<void> => {
    if (!canManageSms) return;
    setStatsBusy(true);
    setActionError('');
    try {
      const payload = await invokeAction<SmsCommandStatsResponse>(
        DASHBOARD_ACTION_CONTRACTS.SMS_STATS,
        { hours: 24 },
      );
      setStatsSnapshot(asRecord(payload));
    } catch (nextError) {
      setActionError(toErrorMessage(nextError));
    } finally {
      setStatsBusy(false);
    }
  };

  const runBulkStatusLookup = async (options: { limit?: number; hours?: number } = {}): Promise<void> => {
    if (!canManageSms) return;
    setBulkBusy(true);
    setActionError('');
    try {
      const payload = await invokeAction<SmsCommandBulkStatusResponse>(
        DASHBOARD_ACTION_CONTRACTS.SMS_BULK_STATUS,
        {
          limit: options.limit ?? 12,
          hours: options.hours ?? 24,
        },
      );
      setBulkOperations(toBulkSmsOperations(payload?.operations));
      setBulkSummary(asRecord(payload?.summary));
    } catch (nextError) {
      setActionError(toErrorMessage(nextError));
    } finally {
      setBulkBusy(false);
    }
  };

  const runBulkPrecheck = async (): Promise<void> => {
    if (!canManageProvider) return;
    setPrecheckBusy(true);
    setActionError('');
    try {
      const payload = await invokeAction<SmsCommandProviderStatusResponse>(
        DASHBOARD_ACTION_CONTRACTS.PROVIDER_GET,
        { channel: 'sms' },
      );
      setProviderSnapshot(createSmsProviderSnapshot(payload));
    } catch (nextError) {
      setActionError(toErrorMessage(nextError));
    } finally {
      setPrecheckBusy(false);
    }
  };

  const executeCallbackAction = async (rawCallbackActionInput: string): Promise<void> => {
    if ((!canManageSms && !canManageProvider) || activeBusy) return;
    const rawCallbackAction = rawCallbackActionInput.trim();
    const { baseAction, suffix } = parseCallbackToken(rawCallbackAction);
    if (!baseAction) {
      setActionError('Callback action is required.');
      setCallbackResult('');
      return;
    }
    const actionResolution = resolveDashboardAction(rawCallbackAction);
    if (!actionResolution.actionId || !actionResolution.supported) {
      setActionError(`Unsupported callback action "${rawCallbackAction}" recovered safely. Use Dashboard root or refresh the command session.`);
      setCallbackResult('');
      return;
    }

    let callbackStatusBusy = false;
    let callbackConversationBusy = false;
    let callbackRecentBusy = false;
    let callbackStatsBusy = false;
    let callbackBulkBusy = false;
    let callbackPrecheckBusy = false;
    try {
      setActionError('');
      setCallbackResult('');
      let callbackSummary = `Executed callback ${rawCallbackAction} -> ${actionResolution.actionId}.`;
      if (baseAction === 'SMS_SEND') {
        if (!canManageSms) {
          setActionError('SMS_SEND requires SMS bulk management capability.');
          return;
        }
        if (!sendRecipientValid || !sendMessage) {
          setActionError('SMS_SEND callback requires a valid recipient and message body. Fill the single-recipient form first.');
          return;
        }
        await invokeAction(rawCallbackAction, {
          recipients: [sendRecipient],
          message: sendMessage,
          provider: sendProvider || undefined,
          options: { durable: true },
        });
        callbackSummary = `Executed callback ${rawCallbackAction} -> ${actionResolution.actionId}. Queued current SMS payload.`;
      } else if (baseAction === 'SMS_SCHEDULE') {
        if (!canManageSms) {
          setActionError('SMS_SCHEDULE requires SMS bulk management capability.');
          return;
        }
        if (!sendRecipientValid || !sendMessage || !sendScheduleAtInput) {
          setActionError('SMS_SCHEDULE callback requires recipient, message, and schedule timestamp. Fill the scheduling fields first.');
          return;
        }
        const scheduledAtMs = Date.parse(sendScheduleAtInput);
        if (Number.isNaN(scheduledAtMs)) {
          setActionError('Scheduled time is invalid.');
          return;
        }
        await invokeAction(rawCallbackAction, {
          to: sendRecipient,
          message: sendMessage,
          scheduled_time: new Date(scheduledAtMs).toISOString(),
          provider: sendProvider || undefined,
          options: { durable: true },
        });
        callbackSummary = `Executed callback ${rawCallbackAction} -> ${actionResolution.actionId}. Scheduled current SMS payload.`;
      } else if (baseAction === 'SMS_STATUS') {
        if (!canManageSms) {
          setActionError('SMS_STATUS requires SMS bulk management capability.');
          return;
        }
        if (!statusSid) {
          setActionError('SMS_STATUS callback requires message SID. Fill the status lookup field first.');
          return;
        }
        callbackStatusBusy = true;
        setStatusBusy(true);
        const payload = await invokeAction<SmsCommandMessageStatusResponse>(
          rawCallbackAction,
          { message_sid: statusSid },
        );
        const messageRecord = asRecord(payload?.message);
        setStatusSnapshot(Object.keys(messageRecord).length > 0 ? messageRecord : asRecord(payload));
        callbackSummary = `Executed callback ${rawCallbackAction} -> ${actionResolution.actionId}. Loaded SMS status for ${statusSid}.`;
      } else if (baseAction === 'SMS_CONVO') {
        if (!canManageSms) {
          setActionError('SMS_CONVO requires SMS bulk management capability.');
          return;
        }
        if (!conversationPhoneValid) {
          setActionError('SMS_CONVO callback requires valid conversation phone. Fill the conversation phone field first.');
          return;
        }
        callbackConversationBusy = true;
        setConversationBusy(true);
        const payload = await invokeAction<SmsCommandMessagesResponse>(
          rawCallbackAction,
          { phone: normalizedConversationPhone, limit: 20 },
        );
        const messages = toEventRows(payload?.messages);
        setConversationMessages(messages);
        callbackSummary = `Executed callback ${rawCallbackAction} -> ${actionResolution.actionId}. Loaded ${messages.length} conversation message(s).`;
      } else if (baseAction === 'SMS_RECENT_PAGE') {
        if (!canManageSms) {
          setActionError('SMS_RECENT_PAGE requires SMS bulk management capability.');
          return;
        }
        callbackRecentBusy = true;
        setRecentBusy(true);
        const page = Math.max(1, toInt(suffix, 1));
        const limit = 12;
        const payload = await invokeAction<SmsCommandMessagesResponse>(
          rawCallbackAction,
          { limit, offset: (page - 1) * limit },
        );
        const messages = toEventRows(payload?.messages);
        setRecentMessages(messages);
        callbackSummary = `Executed callback ${rawCallbackAction} -> ${actionResolution.actionId}. Loaded ${messages.length} recent message(s) from page ${page}.`;
      } else if (baseAction === 'SMS_RECENT') {
        if (!canManageSms) {
          setActionError('SMS_RECENT requires SMS bulk management capability.');
          return;
        }
        callbackRecentBusy = true;
        setRecentBusy(true);
        const payload = await invokeAction<SmsCommandMessagesResponse>(
          rawCallbackAction,
          { limit: 12, offset: 0 },
        );
        const messages = toEventRows(payload?.messages);
        setRecentMessages(messages);
        callbackSummary = `Executed callback ${rawCallbackAction} -> ${actionResolution.actionId}. Loaded ${messages.length} recent message(s).`;
      } else if (baseAction === 'SMS_STATS') {
        if (!canManageSms) {
          setActionError('SMS_STATS requires SMS bulk management capability.');
          return;
        }
        callbackStatsBusy = true;
        setStatsBusy(true);
        const payload = await invokeAction<SmsCommandStatsResponse>(rawCallbackAction, { hours: 24 });
        setStatsSnapshot(asRecord(payload));
        callbackSummary = `Executed callback ${rawCallbackAction} -> ${actionResolution.actionId}. Loaded SMS stats snapshot.`;
      } else if (baseAction === 'BULK_SMS_PRECHECK') {
        if (!canManageProvider) {
          setActionError('BULK_SMS_PRECHECK requires provider management capability.');
          return;
        }
        callbackPrecheckBusy = true;
        setPrecheckBusy(true);
        const payload = await invokeAction<SmsCommandProviderStatusResponse>(
          rawCallbackAction,
          { channel: 'sms' },
        );
        const nextSnapshot = createSmsProviderSnapshot(payload);
        setProviderSnapshot(nextSnapshot);
        callbackSummary = `Executed callback ${rawCallbackAction} -> ${actionResolution.actionId}. Loaded SMS provider readiness for ${toText(nextSnapshot?.provider, 'unknown')}.`;
      } else if (baseAction === 'BULK_SMS_LIST' || baseAction === 'BULK_SMS_STATS' || baseAction === 'BULK_SMS_STATUS') {
        if (!canManageSms) {
          setActionError(`${baseAction} requires SMS bulk management capability.`);
          return;
        }
        const resolvedJobId = baseAction === 'BULK_SMS_STATUS' ? suffix || bulkJobId : '';
        if (baseAction === 'BULK_SMS_STATUS' && !resolvedJobId) {
          setActionError('BULK_SMS_STATUS callback requires a job ID input or BULK_SMS_STATUS:<job_id>.');
          return;
        }
        callbackBulkBusy = true;
        setBulkBusy(true);
        const payload = await invokeAction<SmsCommandBulkStatusResponse>(
          rawCallbackAction,
          {
            limit: baseAction === 'BULK_SMS_STATUS' ? 50 : 12,
            hours: baseAction === 'BULK_SMS_STATUS' ? 72 : 24,
          },
        );
        const operations = toBulkSmsOperations(payload?.operations);
        const summary = asRecord(payload?.summary);
        setBulkOperations(operations);
        setBulkSummary(summary);
        if (baseAction === 'BULK_SMS_STATUS') {
          const matchedOperation = operations.find((operation) => toText(operation.id, '') === resolvedJobId);
          if (!matchedOperation) {
            setActionError(`Bulk SMS job "${resolvedJobId}" was not found in recent history.`);
            setCallbackResult('');
            return;
          }
          callbackSummary = `Executed callback ${rawCallbackAction} -> ${actionResolution.actionId}. ${summarizeBulkSmsOperation(matchedOperation)}.`;
        } else if (baseAction === 'BULK_SMS_STATS') {
          callbackSummary = `Executed callback ${rawCallbackAction} -> ${actionResolution.actionId}. ${summarizeBulkSmsStats(summary)}.`;
        } else {
          callbackSummary = `Executed callback ${rawCallbackAction} -> ${actionResolution.actionId}. Loaded ${operations.length} bulk SMS job(s).`;
        }
      } else {
        await invokeAction(rawCallbackAction, {});
      }
      setCallbackResult(callbackSummary);
    } catch (nextError) {
      setActionError(toErrorMessage(nextError));
      setCallbackResult('');
    } finally {
      if (callbackStatusBusy) setStatusBusy(false);
      if (callbackConversationBusy) setConversationBusy(false);
      if (callbackRecentBusy) setRecentBusy(false);
      if (callbackStatsBusy) setStatsBusy(false);
      if (callbackBulkBusy) setBulkBusy(false);
      if (callbackPrecheckBusy) setPrecheckBusy(false);
    }
  };

  const runCallbackAction = async (): Promise<void> => {
    await executeCallbackAction(callbackActionInput);
  };

  const runGuidedSmsMenuAction = async (rawCallbackAction: string): Promise<void> => {
    setCallbackActionInput(rawCallbackAction);
    await executeCallbackAction(rawCallbackAction);
  };

  const openGuidedSmsRoute = (path: string): void => {
    setActionError('');
    setCallbackResult('');
    navigate(path);
  };

  if (loading) {
    return (
      <Page back>
        <Placeholder
          header={contract.canonicalCommand}
          description="Loading Mini App session and SMS workflow contract..."
        />
      </Page>
    );
  }

  return (
    <Page back>
      <List>
        <Section header={contract.canonicalCommand} footer={contract.notes}>
          <Cell subtitle={contract.summary}>
            {describeAccessLevel(accessLevel)}
          </Cell>
          <Cell
            subtitle={error ? `Bootstrap fallback active. ${error}` : 'Mini App session is ready for command-owned SMS workflows.'}
            after={<Navigation>{error ? 'Retry' : 'Ready'}</Navigation>}
            onClick={() => {
              void reload();
            }}
          >
            Session status
          </Cell>
          {errorCode ? (
            <Cell subtitle="Latest bootstrap blocking or recovery code">
              {errorCode}
            </Cell>
          ) : null}
        </Section>

        {!canOperate ? (
          <Section
            header="Access required"
            footer="The live /sms bot command is restricted to authorized users. The Mini App enforces the same rule."
          >
            <UiStatePanel
              title="Authorized access required"
              description="Open the main bot to request access or use /help and /guide for non-execution guidance."
              tone="warning"
            />
          </Section>
        ) : (
          <Section
            header="SMS command workflows"
            footer="This command page executes SMS diagnostics through shared action contracts while preserving /smssender ownership for bulk sends."
          >
            <div className="va-grid">
              <UiCard>
                <p className="va-card-eyebrow">Live /sms launcher parity</p>
                <Text>
                  Choose an SMS action below. The Mini App keeps the same bot button order and reuses
                  the same callback-owned workflow families, while replacing the bot conversation with
                  the inputs and diagnostics on this page.
                </Text>
                <div className="va-inline-tools">
                  <UiButton
                    variant="primary"
                    disabled={!canOperate || activeBusy}
                    onClick={() => {
                      void runGuidedSmsMenuAction('SMS_SEND');
                    }}
                  >
                    Send SMS
                  </UiButton>
                  <UiButton
                    variant="secondary"
                    disabled={!canOperate || activeBusy}
                    onClick={() => {
                      void runGuidedSmsMenuAction('SMS_SCHEDULE');
                    }}
                  >
                    Schedule SMS
                  </UiButton>
                  <UiButton
                    variant="secondary"
                    disabled={!canOperate || activeBusy}
                    onClick={() => {
                      void runGuidedSmsMenuAction('SMS_STATUS');
                    }}
                  >
                    Delivery Status
                  </UiButton>
                </div>
                {isAdminAccess ? (
                  <div className="va-inline-tools">
                    <UiButton
                      variant="secondary"
                      disabled={!canOperate || activeBusy}
                      onClick={() => {
                        void runGuidedSmsMenuAction('SMS_CONVO');
                      }}
                    >
                      Conversation
                    </UiButton>
                    <UiButton
                      variant="secondary"
                      disabled={!canOperate || activeBusy}
                      onClick={() => {
                        void runGuidedSmsMenuAction('SMS_RECENT');
                      }}
                    >
                      Recent SMS
                    </UiButton>
                    <UiButton
                      variant="secondary"
                      disabled={!canOperate || activeBusy}
                      onClick={() => {
                        void runGuidedSmsMenuAction('SMS_STATS');
                      }}
                    >
                      SMS Stats
                    </UiButton>
                  </div>
                ) : null}
                <div className="va-inline-tools">
                  {isAdminAccess ? (
                    <UiButton
                      variant="secondary"
                      disabled={activeBusy}
                      onClick={() => {
                        openGuidedSmsRoute(bulkSmsRoute);
                      }}
                    >
                      Open SMS Sender
                    </UiButton>
                  ) : null}
                  <UiButton
                    variant="plain"
                    disabled={activeBusy}
                    onClick={() => {
                      openGuidedSmsRoute(MINIAPP_COMMAND_ROUTE_CONTRACTS.MENU);
                    }}
                  >
                    Main Menu
                  </UiButton>
                </div>
                <UiStatePanel
                  compact
                  title={isAdminAccess ? 'Admin tools are included' : 'Admin-only tools are hidden'}
                  description={isAdminAccess
                    ? 'Conversation, Recent SMS, SMS Stats, and bulk sender handoff remain visible because this session has admin access, matching the live bot menu.'
                    : 'The live bot hides Conversation, Recent SMS, SMS Stats, and bulk sender handoff until admin access is present. The Mini App follows the same rule.'}
                  tone="info"
                />
                <UiStatePanel
                  compact
                  title="Form-backed workflow execution"
                  description="The bot opens a conversation after each button press. This Mini App page runs the same backend action family by using the input fields below as the conversation payload."
                  tone="info"
                />
              </UiCard>

              <UiCard>
                <p className="va-card-eyebrow">Single-recipient send & schedule</p>
                <UiInput
                  aria-label="SMS recipient"
                  placeholder="+15551230001"
                  value={sendRecipientInput}
                  onChange={(event) => setSendRecipientInput(event.target.value)}
                />
                <UiTextarea
                  aria-label="SMS message body"
                  placeholder="Message body"
                  rows={4}
                  value={sendMessageInput}
                  onChange={(event) => setSendMessageInput(event.target.value)}
                />
                <div className="va-inline-tools">
                  <UiInput
                    aria-label="SMS provider override"
                    placeholder="Provider (optional)"
                    value={sendProviderInput}
                    onChange={(event) => setSendProviderInput(event.target.value)}
                  />
                  <UiInput
                    aria-label="Schedule at"
                    type="datetime-local"
                    value={sendScheduleAtInput}
                    onChange={(event) => setSendScheduleAtInput(event.target.value)}
                  />
                </div>
                <div className="va-inline-tools">
                  <UiButton
                    variant="primary"
                    disabled={!sendRecipientValid || !sendMessage || !canManageSms || activeBusy}
                    onClick={() => {
                      void runSendNow();
                    }}
                  >
                    {sendBusy ? 'Submitting...' : 'Send Now'}
                  </UiButton>
                  <UiButton
                    variant="secondary"
                    disabled={!sendRecipientValid || !sendMessage || !sendScheduleAtInput || !canManageSms || activeBusy}
                    onClick={() => {
                      void runSchedule();
                    }}
                  >
                    {sendBusy ? 'Submitting...' : 'Schedule'}
                  </UiButton>
                </div>
                {!sendRecipientValid && sendRecipientInput.trim() ? (
                  <UiStatePanel
                    compact
                    title="Recipient phone format required"
                    description="Use E.164 format with the + prefix and country code, for example +18005551234."
                    tone="warning"
                  />
                ) : null}
                {sendResult ? (
                  <UiStatePanel
                    compact
                    title="Send workflow accepted"
                    description={sendResult}
                    tone="success"
                  />
                ) : null}

                <p className="va-card-eyebrow">Bot callback parity execution</p>
                <UiInput
                  aria-label="SMS callback action"
                  placeholder="SMS_SEND or SMS_RECENT_PAGE:2"
                  value={callbackActionInput}
                  onChange={(event) => setCallbackActionInput(event.target.value)}
                />
                <div className="va-inline-tools">
                  <UiButton
                    variant="secondary"
                    disabled={(!canManageSms && !canManageProvider) || activeBusy}
                    onClick={() => {
                      void runCallbackAction();
                    }}
                  >
                    Run Callback Action
                  </UiButton>
                </div>
                <ul className="va-list va-list-dense">
                  {SMS_CALLBACK_PARITY_ROWS.map((row) => (
                    <li key={row.callbackAction}>
                      {row.callbackAction}{' -> '}{row.dashboardAction} ({row.summary})
                    </li>
                  ))}
                </ul>
                {callbackResult ? (
                  <UiStatePanel
                    compact
                    title="Callback execution completed"
                    description={callbackResult}
                    tone="success"
                  />
                ) : null}

                <p className="va-card-eyebrow">Message status & conversation</p>
                <div className="va-inline-tools">
                  <UiInput
                    aria-label="SMS message SID"
                    placeholder="Message SID"
                    value={statusSidInput}
                    onChange={(event) => setStatusSidInput(event.target.value)}
                  />
                  <UiButton
                    variant="secondary"
                    disabled={!statusSid || !canManageSms || activeBusy}
                    onClick={() => {
                      void runStatusLookup();
                    }}
                  >
                    {statusBusy ? 'Loading...' : 'Check Status'}
                  </UiButton>
                </div>
                <div className="va-inline-tools">
                  <UiInput
                    aria-label="Conversation phone"
                    placeholder="+15551230001"
                    value={conversationPhoneInput}
                    onChange={(event) => setConversationPhoneInput(event.target.value)}
                  />
                  <UiButton
                    variant="secondary"
                    disabled={!conversationPhoneValid || !canManageSms || activeBusy}
                    onClick={() => {
                      void runConversationLookup();
                    }}
                  >
                    {conversationBusy ? 'Loading...' : 'Load Conversation'}
                  </UiButton>
                </div>
                {!conversationPhoneValid && conversationPhoneInput.trim() ? (
                  <UiStatePanel
                    compact
                    title="Conversation phone format required"
                    description="Use E.164 format with the + prefix and country code, for example +18005551234."
                    tone="warning"
                  />
                ) : null}
                {!canManageSms ? (
                  <UiStatePanel
                    compact
                    title="SMS actions unavailable"
                    description="Your account needs SMS bulk management capability to run /sms execution actions in the Mini App."
                    tone="warning"
                  />
                ) : null}

                {statusSnapshot ? (
                  <ul className="va-list va-list-dense">
                    <li>SID: {toText(statusSnapshot.message_sid, toText(statusSnapshot.sid, statusSid || 'n/a'))}</li>
                    <li>Status: {toText(statusSnapshot.status, 'unknown')}</li>
                    <li>To: {toText(statusSnapshot.to_number, toText(statusSnapshot.to, 'n/a'))}</li>
                    <li>From: {toText(statusSnapshot.from_number, toText(statusSnapshot.from, 'n/a'))}</li>
                    <li>Provider: {toText(statusSnapshot.provider, 'unknown')}</li>
                  </ul>
                ) : (
                  <UiStatePanel
                    compact
                    title="No status snapshot"
                    description="Run a SID lookup to inspect single-message delivery state."
                    tone="info"
                  />
                )}
              </UiCard>

              <UiCard>
                <p className="va-card-eyebrow">Recent messages, bulk jobs & delivery stats</p>
                <div className="va-inline-tools">
                  <UiButton
                    variant="secondary"
                    disabled={!canManageSms || activeBusy}
                    onClick={() => {
                      void runRecentLookup();
                    }}
                  >
                    {recentBusy ? 'Loading...' : 'Load Recent'}
                  </UiButton>
                  <UiButton
                    variant="secondary"
                    disabled={!canManageSms || activeBusy}
                    onClick={() => {
                      void runStatsLookup();
                    }}
                  >
                    {statsBusy ? 'Loading...' : 'Load Stats'}
                  </UiButton>
                  <UiButton
                    variant="secondary"
                    disabled={!canManageSms || activeBusy}
                    onClick={() => {
                      void runBulkStatusLookup();
                    }}
                  >
                    {bulkBusy ? 'Loading...' : 'Load Bulk Jobs'}
                  </UiButton>
                </div>
                <div className="va-inline-tools">
                  <UiInput
                    aria-label="Bulk SMS job ID"
                    placeholder="Bulk SMS job ID (optional)"
                    value={bulkJobIdInput}
                    onChange={(event) => setBulkJobIdInput(event.target.value)}
                  />
                  <UiButton
                    variant="secondary"
                    disabled={!canManageProvider || activeBusy}
                    onClick={() => {
                      void runBulkPrecheck();
                    }}
                  >
                    {precheckBusy ? 'Loading...' : 'Run Bulk Precheck'}
                  </UiButton>
                  <UiButton
                    variant="plain"
                    disabled={activeBusy}
                    onClick={() => {
                      setSendResult('');
                      setCallbackResult('');
                      setStatusSnapshot(null);
                      setRecentMessages([]);
                      setConversationMessages([]);
                      setStatsSnapshot(null);
                      setBulkOperations([]);
                      setBulkSummary(null);
                      setProviderSnapshot(null);
                      setActionError('');
                    }}
                  >
                    Clear Diagnostics
                  </UiButton>
                </div>

                {providerSnapshot ? (
                  <>
                    <p className="va-card-eyebrow">Provider readiness</p>
                    <ul className="va-list va-list-dense">
                      <li>Channel: {toText(providerSnapshot.channel, 'sms')}</li>
                      <li>Provider: {toText(providerSnapshot.provider, 'unknown')}</li>
                      <li>Readiness: {providerSnapshot.ready === true ? 'Ready' : 'Check configuration'}</li>
                      <li>Supported providers: {toTextList(providerSnapshot.supported_providers).join(', ') || 'n/a'}</li>
                    </ul>
                    {Object.keys(asRecord(providerSnapshot.readiness)).length > 0 ? (
                      <UiStatePanel
                        compact
                        title="SMS provider readiness map"
                        description={toJsonText(providerSnapshot.readiness)}
                        tone={providerSnapshot.ready === true ? 'success' : 'warning'}
                      />
                    ) : null}
                  </>
                ) : null}

                {recentMessages.length > 0 ? (
                  <>
                    <p className="va-card-eyebrow">Recent messages</p>
                    <ul className="va-list va-list-dense">
                      {recentMessages.slice(0, 6).map((message, index) => (
                        <li key={`${toText(message.message_sid, toText(message.sid, 'sms'))}-${index}`}>
                          {summarizeSmsMessage(message)}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}

                {conversationMessages.length > 0 ? (
                  <>
                    <p className="va-card-eyebrow">Conversation snapshot</p>
                    <ul className="va-list va-list-dense">
                      {conversationMessages.slice(0, 6).map((message, index) => (
                        <li key={`${toText(message.message_sid, toText(message.sid, 'convo'))}-${index}`}>
                          {summarizeSmsMessage(message)}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}

                {statsSnapshot ? (
                  <>
                    <p className="va-card-eyebrow">Message stats</p>
                    <ul className="va-list va-list-dense">
                      <li>Total: {toInt(statsSnapshot.total_messages ?? statsSnapshot.total, 0)}</li>
                      <li>Sent: {toInt(statsSnapshot.sent_messages, 0)}</li>
                      <li>Received: {toInt(statsSnapshot.received_messages, 0)}</li>
                      <li>Delivered: {toInt(statsSnapshot.delivered_count, 0)}</li>
                      <li>Failed: {toInt(statsSnapshot.failed_count, 0)}</li>
                      <li>Success rate: {toText(statsSnapshot.success_rate, '0')}%</li>
                    </ul>
                  </>
                ) : null}

                {bulkSummary ? (
                  <>
                    <p className="va-card-eyebrow">Bulk job summary</p>
                    <UiStatePanel
                      compact
                      title="Bulk SMS summary"
                      description={summarizeBulkSmsStats(bulkSummary)}
                      tone="info"
                    />
                  </>
                ) : null}

                {bulkOperations.length > 0 ? (
                  <>
                    <p className="va-card-eyebrow">Bulk SMS jobs</p>
                    <ul className="va-list va-list-dense">
                      {bulkOperations.slice(0, 6).map((operation, index) => (
                        <li key={`${toText(operation.id, 'bulk-sms')}-${index}`}>
                          {summarizeBulkSmsOperation(operation)}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}

                {recentMessages.length === 0
                  && conversationMessages.length === 0
                  && !statsSnapshot
                  && !bulkSummary
                  && bulkOperations.length === 0
                  && !providerSnapshot ? (
                  <UiStatePanel
                    compact
                    title="No SMS diagnostics loaded"
                    description="Run recent, stats, provider precheck, or bulk status actions to populate diagnostics."
                    tone="info"
                  />
                ) : null}
              </UiCard>
            </div>
          </Section>
        )}

        {actionError ? (
          <Section header="Action error">
            <UiStatePanel
              title="SMS action failed"
              description={actionError}
              tone="error"
            />
          </Section>
        ) : null}

        {canOperate ? (
          <Section header="Workflow snapshot">
            <Cell subtitle="How many command-owned action slices currently hold data in this session.">
              Loaded slices: {actionReadyCount}
            </Cell>
          </Section>
        ) : null}

        <Section
          header="Quick actions"
          footer="These shortcuts stay aligned to existing Mini App parity routes so the /sms page remains part of the bot-owned workflow graph."
        >
          {(['BULK_SMS', 'CALLLOG', 'HELP', 'GUIDE', 'MENU', 'PROVIDER_STATUS'] as const).map((actionId) => {
            const action = MINIAPP_COMMAND_ACTION_CONTRACTS[actionId];
            return action.routePath ? (
              <Link key={actionId} to={action.routePath}>
                <Cell
                  subtitle={`${action.description} ${describeActionAvailability(actionId, accessLevel)}.`}
                  after={<Navigation>Open</Navigation>}
                >
                  {action.label}
                </Cell>
              </Link>
            ) : (
              <Cell
                key={actionId}
                subtitle={`${action.description} ${action.notes}`}
                after={<Navigation>Missing</Navigation>}
              >
                {action.label}
              </Cell>
            );
          })}
        </Section>

        <Section
          header="Fallback"
          footer="Unknown or stale actions still recover to the dashboard shell instead of hard-failing."
        >
          <Link to={DASHBOARD_STATIC_ROUTE_CONTRACTS.ROOT}>
            <Cell subtitle="Open the admin dashboard shell and route launcher.">
              Dashboard root
            </Cell>
          </Link>
        </Section>
      </List>
    </Page>
  );
}

function EmailCommandPageContent() {
  const contract = MINIAPP_COMMAND_PAGE_CONTRACTS.EMAIL;
  const navigate = useNavigate();
  const {
    loading,
    error,
    errorCode,
    accessLevel,
    hasCapability,
    invokeAction,
    reload,
  } = useMiniAppCommandSession();
  const [templateIdInput, setTemplateIdInput] = useState<string>('');
  const [previewVariablesInput, setPreviewVariablesInput] = useState<string>('{}');
  const [messageIdInput, setMessageIdInput] = useState<string>('');
  const [jobIdInput, setJobIdInput] = useState<string>('');
  const [sendRecipientInput, setSendRecipientInput] = useState<string>('');
  const [sendProviderInput, setSendProviderInput] = useState<string>('');
  const [sendSubjectInput, setSendSubjectInput] = useState<string>('');
  const [sendHtmlInput, setSendHtmlInput] = useState<string>('');
  const [sendTextInput, setSendTextInput] = useState<string>('');
  const [sendScheduleAtInput, setSendScheduleAtInput] = useState<string>('');
  const [sendBusy, setSendBusy] = useState<boolean>(false);
  const [sendResult, setSendResult] = useState<string>('');
  const [previewBusy, setPreviewBusy] = useState<boolean>(false);
  const [statusBusy, setStatusBusy] = useState<boolean>(false);
  const [historyBusy, setHistoryBusy] = useState<boolean>(false);
  const [templatesBusy, setTemplatesBusy] = useState<boolean>(false);
  const [jobBusy, setJobBusy] = useState<boolean>(false);
  const [statsBusy, setStatsBusy] = useState<boolean>(false);
  const [precheckBusy, setPrecheckBusy] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string>('');
  const [callbackActionInput, setCallbackActionInput] = useState<string>('EMAIL_SEND');
  const [callbackResult, setCallbackResult] = useState<string>('');
  const [previewSnapshot, setPreviewSnapshot] = useState<EmailCommandPreviewResponse | null>(null);
  const [messageSnapshot, setMessageSnapshot] = useState<Record<string, unknown> | null>(null);
  const [messageEvents, setMessageEvents] = useState<Array<Record<string, unknown>>>([]);
  const [historyRows, setHistoryRows] = useState<EmailCommandBulkHistoryJob[]>([]);
  const [templateRows, setTemplateRows] = useState<EmailCommandTemplateSummary[]>([]);
  const [bulkJobSnapshot, setBulkJobSnapshot] = useState<Record<string, unknown> | null>(null);
  const [statsSnapshot, setStatsSnapshot] = useState<Record<string, unknown> | null>(null);
  const [providerSnapshot, setProviderSnapshot] = useState<Record<string, unknown> | null>(null);

  const canOperate = accessLevel === 'authorized' || accessLevel === 'admin';
  const canManageEmail = hasCapability('email_bulk_manage');
  const canManageProvider = hasCapability('provider_manage');
  const templateId = templateIdInput.trim();
  const messageId = messageIdInput.trim();
  const jobId = jobIdInput.trim();
  const sendRecipient = sendRecipientInput.trim().toLowerCase();
  const sendRecipientValid = isLikelyEmail(sendRecipient);
  const sendProvider = sendProviderInput.trim();
  const sendSubject = sendSubjectInput.trim();
  const sendHtml = sendHtmlInput.trim();
  const sendText = sendTextInput.trim();
  const sendHasContent = Boolean(templateId || sendSubject || sendHtml || sendText);
  const bulkEmailRoute = MINIAPP_COMMAND_ACTION_CONTRACTS.BULK_EMAIL.routePath
    ?? DASHBOARD_STATIC_ROUTE_CONTRACTS.ROOT;
  const activeBusy = sendBusy || previewBusy || statusBusy || historyBusy || templatesBusy || jobBusy || statsBusy || precheckBusy;
  const previewMissing = toTextList(previewSnapshot?.missing);
  const previewSubject = toTextValue(previewSnapshot?.subject);
  const previewHtml = toTextValue(previewSnapshot?.html);
  const previewText = toTextValue(previewSnapshot?.text);
  const messageStatus = toTextValue(messageSnapshot?.status);
  const messageProvider = toTextValue(messageSnapshot?.provider);
  const messageTo = toTextValue(messageSnapshot?.to);
  const messageScriptId = toTextValue(messageSnapshot?.script_id);
  const messageCreatedAt = toTextValue(messageSnapshot?.created_at);
  const actionReadyCount = Number(Boolean(sendResult))
    + Number(Boolean(callbackResult))
    + Number(Boolean(previewSnapshot))
    + Number(Boolean(messageSnapshot))
    + Number(Boolean(bulkJobSnapshot))
    + Number(Boolean(providerSnapshot))
    + Number(Boolean(statsSnapshot))
    + Number(historyRows.length > 0)
    + Number(templateRows.length > 0);

  const parseVariablesPayload = (): Record<string, unknown> => {
    if (!previewVariablesInput.trim()) {
      return {};
    }
    const parsedVariables: unknown = JSON.parse(previewVariablesInput);
    if (!parsedVariables || typeof parsedVariables !== 'object' || Array.isArray(parsedVariables)) {
      throw new Error('Preview variables must be a JSON object.');
    }
    return parsedVariables as Record<string, unknown>;
  };

  const runSendNow = async (): Promise<void> => {
    if (!sendRecipientValid || !sendHasContent || !canManageEmail) return;
    setSendBusy(true);
    setActionError('');
    setSendResult('');
    try {
      const variablesPayload = parseVariablesPayload();
      const payload = await invokeAction<EmailCommandBulkSendResponse>(
        DASHBOARD_ACTION_CONTRACTS.EMAIL_BULK_SEND,
        {
          recipients: [{ email: sendRecipient }],
          provider: sendProvider || undefined,
          script_id: templateId || undefined,
          subject: sendSubject || undefined,
          html: sendHtml || undefined,
          text: sendText || undefined,
          variables: variablesPayload,
        },
      );
      const bulkJobId = toTextValue(payload?.bulk_job_id ?? payload?.job_id);
      setSendResult(
        bulkJobId
          ? `Queued email send for ${sendRecipient}. Job ID: ${bulkJobId}.`
          : `Queued email send for ${sendRecipient}.`,
      );
    } catch (nextError) {
      setActionError(toErrorMessage(nextError));
    } finally {
      setSendBusy(false);
    }
  };

  const runSendScheduled = async (): Promise<void> => {
    if (!sendRecipientValid || !sendHasContent || !sendScheduleAtInput || !canManageEmail) return;
    const sendAtMs = Date.parse(sendScheduleAtInput);
    if (Number.isNaN(sendAtMs)) {
      setActionError('Scheduled time is invalid.');
      return;
    }
    const sendAtIso = new Date(sendAtMs).toISOString();
    setSendBusy(true);
    setActionError('');
    setSendResult('');
    try {
      const variablesPayload = parseVariablesPayload();
      const payload = await invokeAction<EmailCommandBulkSendResponse>(
        DASHBOARD_ACTION_CONTRACTS.EMAIL_BULK_SEND,
        {
          recipients: [{ email: sendRecipient }],
          provider: sendProvider || undefined,
          script_id: templateId || undefined,
          subject: sendSubject || undefined,
          html: sendHtml || undefined,
          text: sendText || undefined,
          variables: variablesPayload,
          send_at: sendAtIso,
        },
      );
      const bulkJobId = toTextValue(payload?.bulk_job_id ?? payload?.job_id);
      setSendResult(
        bulkJobId
          ? `Scheduled email for ${sendRecipient} at ${sendAtIso}. Job ID: ${bulkJobId}.`
          : `Scheduled email for ${sendRecipient} at ${sendAtIso}.`,
      );
    } catch (nextError) {
      setActionError(toErrorMessage(nextError));
    } finally {
      setSendBusy(false);
    }
  };

  const runPreview = async (): Promise<void> => {
    if (!templateId || !canManageEmail) return;
    setPreviewBusy(true);
    setActionError('');
    try {
      const variablesPayload = parseVariablesPayload();
      const payload = await invokeAction<EmailCommandPreviewResponse>(
        DASHBOARD_ACTION_CONTRACTS.EMAIL_PREVIEW,
        {
          script_id: templateId,
          template_id: templateId,
          variables: variablesPayload,
        },
      );
      setPreviewSnapshot(payload || null);
    } catch (nextError) {
      setActionError(toErrorMessage(nextError));
    } finally {
      setPreviewBusy(false);
    }
  };

  const runMessageStatus = async (): Promise<void> => {
    if (!messageId || !canManageEmail) return;
    setStatusBusy(true);
    setActionError('');
    try {
      const payload = await invokeAction<EmailCommandMessageStatusResponse>(
        DASHBOARD_ACTION_CONTRACTS.EMAIL_MESSAGE_STATUS,
        { message_id: messageId },
      );
      const messageRecord = asRecord(payload?.message);
      setMessageSnapshot(Object.keys(messageRecord).length > 0 ? messageRecord : asRecord(payload));
      setMessageEvents(toEventRows(payload?.events));
    } catch (nextError) {
      setActionError(toErrorMessage(nextError));
    } finally {
      setStatusBusy(false);
    }
  };

  const runBulkHistory = async (offset = 0): Promise<void> => {
    if (!canManageEmail) return;
    setHistoryBusy(true);
    setActionError('');
    try {
      const payload = await invokeAction<EmailCommandBulkHistoryResponse>(
        DASHBOARD_ACTION_CONTRACTS.EMAIL_BULK_HISTORY,
        { limit: 12, offset },
      );
      setHistoryRows(toEmailHistoryRows(payload?.jobs));
    } catch (nextError) {
      setActionError(toErrorMessage(nextError));
    } finally {
      setHistoryBusy(false);
    }
  };

  const runBulkJobStatus = async (): Promise<void> => {
    if (!jobId || !canManageEmail) return;
    setJobBusy(true);
    setActionError('');
    try {
      const payload = await invokeAction<EmailCommandBulkJobResponse>(
        DASHBOARD_ACTION_CONTRACTS.EMAIL_BULK_JOB,
        { job_id: jobId },
      );
      const jobRecord = asRecord(payload?.job);
      setBulkJobSnapshot(Object.keys(jobRecord).length > 0 ? jobRecord : asRecord(payload));
    } catch (nextError) {
      setActionError(toErrorMessage(nextError));
    } finally {
      setJobBusy(false);
    }
  };

  const runBulkStats = async (): Promise<void> => {
    if (!canManageEmail) return;
    setStatsBusy(true);
    setActionError('');
    try {
      const payload = await invokeAction<Record<string, unknown>>(
        DASHBOARD_ACTION_CONTRACTS.EMAIL_BULK_STATS,
        { hours: 24 },
      );
      setStatsSnapshot(asRecord(payload));
    } catch (nextError) {
      setActionError(toErrorMessage(nextError));
    } finally {
      setStatsBusy(false);
    }
  };

  const runBulkPrecheck = async (): Promise<void> => {
    if (!canManageProvider) return;
    setPrecheckBusy(true);
    setActionError('');
    try {
      const payload = await invokeAction<EmailCommandProviderStatusResponse>(
        DASHBOARD_ACTION_CONTRACTS.PROVIDER_GET,
        { channel: 'email' },
      );
      setProviderSnapshot(createEmailProviderSnapshot(payload));
    } catch (nextError) {
      setActionError(toErrorMessage(nextError));
    } finally {
      setPrecheckBusy(false);
    }
  };

  const executeCallbackAction = async (rawCallbackActionInput: string): Promise<void> => {
    if ((!canManageEmail && !canManageProvider) || activeBusy) return;
    const rawCallbackAction = rawCallbackActionInput.trim();
    const { baseAction, suffix } = parseCallbackToken(rawCallbackAction);
    if (!baseAction) {
      setActionError('Callback action is required.');
      setCallbackResult('');
      return;
    }
    const actionResolution = resolveDashboardAction(rawCallbackAction);
    if (!actionResolution.actionId || !actionResolution.supported) {
      setActionError(`Unsupported callback action "${rawCallbackAction}" recovered safely. Use Dashboard root or refresh the command session.`);
      setCallbackResult('');
      return;
    }

    let callbackStatusBusy = false;
    let callbackHistoryBusy = false;
    let callbackTemplatesBusy = false;
    let callbackJobBusy = false;
    let callbackStatsBusy = false;
    let callbackPrecheckBusy = false;
    try {
      setActionError('');
      setCallbackResult('');
      let callbackSummary = `Executed callback ${rawCallbackAction} -> ${actionResolution.actionId}.`;
      if (baseAction === 'BULK_EMAIL_PRECHECK') {
        if (!canManageProvider) {
          setActionError('BULK_EMAIL_PRECHECK requires provider management capability.');
          return;
        }
        callbackPrecheckBusy = true;
        setPrecheckBusy(true);
        const payload = await invokeAction<EmailCommandProviderStatusResponse>(
          rawCallbackAction,
          { channel: 'email' },
        );
        const nextSnapshot = createEmailProviderSnapshot(payload);
        setProviderSnapshot(nextSnapshot);
        callbackSummary = `Executed callback ${rawCallbackAction} -> ${actionResolution.actionId}. Loaded email provider readiness for ${toText(nextSnapshot?.provider, 'unknown')}.`;
      } else if (baseAction === 'EMAIL_SEND' || baseAction === 'BULK_EMAIL_SEND') {
        if (!canManageEmail) {
          setActionError(`${baseAction} requires email bulk management capability.`);
          return;
        }
        if (!sendRecipientValid || !sendHasContent) {
          setActionError(`${baseAction} callback requires valid recipient and template/content fields. Fill the email composer first.`);
          return;
        }
        const variablesPayload = parseVariablesPayload();
        await invokeAction(rawCallbackAction, {
          recipients: [{ email: sendRecipient }],
          provider: sendProvider || undefined,
          script_id: templateId || undefined,
          subject: sendSubject || undefined,
          html: sendHtml || undefined,
          text: sendText || undefined,
          variables: variablesPayload,
        });
        callbackSummary = `Executed callback ${rawCallbackAction} -> ${actionResolution.actionId}. Queued current email payload.`;
      } else if (baseAction === 'EMAIL_STATUS' || baseAction === 'EMAIL_TIMELINE') {
        if (!canManageEmail) {
          setActionError(`${baseAction} requires email bulk management capability.`);
          return;
        }
        const resolvedMessageId = suffix || messageId;
        if (!resolvedMessageId) {
          setActionError(`${baseAction} callback requires message ID input or ${baseAction}:<message_id>. Fill the status field first.`);
          return;
        }
        callbackStatusBusy = true;
        setStatusBusy(true);
        const payload = await invokeAction<EmailCommandMessageStatusResponse>(
          rawCallbackAction,
          { message_id: resolvedMessageId },
        );
        const messageRecord = asRecord(payload?.message);
        setMessageSnapshot(Object.keys(messageRecord).length > 0 ? messageRecord : asRecord(payload));
        const events = toEventRows(payload?.events);
        setMessageEvents(events);
        callbackSummary = baseAction === 'EMAIL_TIMELINE'
          ? `Executed callback ${rawCallbackAction} -> ${actionResolution.actionId}. Loaded ${events.length} timeline event(s).`
          : callbackSummary;
      } else if (baseAction === 'EMAIL_HISTORY') {
        if (!canManageEmail) {
          setActionError(`${baseAction} requires email bulk management capability.`);
          return;
        }
        callbackHistoryBusy = true;
        setHistoryBusy(true);
        const payload = await invokeAction<EmailCommandBulkHistoryResponse>(
          rawCallbackAction,
          { limit: 12, offset: 0 },
        );
        const jobs = toEmailHistoryRows(payload?.jobs);
        setHistoryRows(jobs);
        callbackSummary = `Executed callback ${rawCallbackAction} -> ${actionResolution.actionId}. Loaded ${jobs.length} job(s).`;
      } else if (baseAction === 'BULK_EMAIL_LIST' || baseAction === 'BULK_EMAIL_PAGE') {
        if (!canManageEmail) {
          setActionError(`${baseAction} requires email bulk management capability.`);
          return;
        }
        callbackHistoryBusy = true;
        setHistoryBusy(true);
        const page = baseAction === 'BULK_EMAIL_PAGE' ? Math.max(1, toInt(suffix, 1)) : 1;
        const limit = 12;
        const offset = (page - 1) * limit;
        const payload = await invokeAction<EmailCommandBulkHistoryResponse>(
          rawCallbackAction,
          { limit, offset },
        );
        const jobs = toEmailHistoryRows(payload?.jobs);
        setHistoryRows(jobs);
        callbackSummary = `Executed callback ${rawCallbackAction} -> ${actionResolution.actionId}. Loaded ${jobs.length} job(s) from page ${page}.`;
      } else if (baseAction === 'EMAIL_TEMPLATES') {
        if (!canManageEmail) {
          setActionError('EMAIL_TEMPLATES requires email bulk management capability.');
          return;
        }
        callbackTemplatesBusy = true;
        setTemplatesBusy(true);
        const payload = await invokeAction<EmailCommandTemplateListResponse>(
          rawCallbackAction,
          { limit: 12, offset: 0 },
        );
        const templates = toEmailTemplateRows(payload?.templates);
        setTemplateRows(templates);
        callbackSummary = `Executed callback ${rawCallbackAction} -> ${actionResolution.actionId}. Loaded ${templates.length} template(s).`;
      } else if (baseAction === 'EMAIL_BULK' || baseAction === 'BULK_EMAIL_STATUS') {
        if (!canManageEmail) {
          setActionError(`${baseAction} requires email bulk management capability.`);
          return;
        }
        const resolvedJobId = suffix || jobId;
        if (!resolvedJobId) {
          setActionError(`${baseAction} callback requires a job ID input or ${baseAction}:<job_id>. Fill the bulk job field first.`);
          return;
        }
        callbackJobBusy = true;
        setJobBusy(true);
        const payload = await invokeAction<EmailCommandBulkJobResponse>(rawCallbackAction, { job_id: resolvedJobId });
        const jobRecord = asRecord(payload?.job);
        const resolvedJob = Object.keys(jobRecord).length > 0 ? jobRecord : asRecord(payload);
        setBulkJobSnapshot(resolvedJob);
        callbackSummary = `Executed callback ${rawCallbackAction} -> ${actionResolution.actionId}. Loaded bulk job ${toText(resolvedJob.job_id, resolvedJobId)}.`;
      } else if (baseAction === 'BULK_EMAIL_STATS') {
        if (!canManageEmail) {
          setActionError('BULK_EMAIL_STATS requires email bulk management capability.');
          return;
        }
        callbackStatsBusy = true;
        setStatsBusy(true);
        const payload = await invokeAction<Record<string, unknown>>(rawCallbackAction, { hours: 24 });
        setStatsSnapshot(asRecord(payload));
        callbackSummary = `Executed callback ${rawCallbackAction} -> ${actionResolution.actionId}. Loaded bulk email stats snapshot.`;
      } else {
        await invokeAction(rawCallbackAction, {});
      }
      setCallbackResult(callbackSummary);
    } catch (nextError) {
      setActionError(toErrorMessage(nextError));
      setCallbackResult('');
    } finally {
      if (callbackStatusBusy) setStatusBusy(false);
      if (callbackHistoryBusy) setHistoryBusy(false);
      if (callbackTemplatesBusy) setTemplatesBusy(false);
      if (callbackJobBusy) setJobBusy(false);
      if (callbackStatsBusy) setStatsBusy(false);
      if (callbackPrecheckBusy) setPrecheckBusy(false);
    }
  };

  const runCallbackAction = async (): Promise<void> => {
    await executeCallbackAction(callbackActionInput);
  };

  const runGuidedEmailMenuAction = async (rawCallbackAction: string): Promise<void> => {
    setCallbackActionInput(rawCallbackAction);
    await executeCallbackAction(rawCallbackAction);
  };

  const openGuidedEmailRoute = (path: string): void => {
    setActionError('');
    setCallbackResult('');
    navigate(path);
  };

  if (loading) {
    return (
      <Page back>
        <Placeholder
          header={contract.canonicalCommand}
          description="Loading Mini App session and email workflow contract..."
        />
      </Page>
    );
  }

  return (
    <Page back>
      <List>
        <Section header={contract.canonicalCommand} footer={contract.notes}>
          <Cell subtitle={contract.summary}>
            {describeAccessLevel(accessLevel)}
          </Cell>
          <Cell
            subtitle={error ? `Bootstrap fallback active. ${error}` : 'Mini App session is ready for command-owned email workflows.'}
            after={<Navigation>{error ? 'Retry' : 'Ready'}</Navigation>}
            onClick={() => {
              void reload();
            }}
          >
            Session status
          </Cell>
          {errorCode ? (
            <Cell subtitle="Latest bootstrap blocking or recovery code">
              {errorCode}
            </Cell>
          ) : null}
        </Section>

        {!canOperate ? (
          <Section
            header="Access required"
            footer="The live /email bot command is restricted to authorized users. The Mini App enforces the same rule."
          >
            <UiStatePanel
              title="Authorized access required"
              description="Open the main bot to request access or use /help and /guide for non-execution guidance."
              tone="warning"
            />
          </Section>
        ) : (
          <Section
            header="Email command workflows"
            footer="This command page executes the same backend-owned actions as the bot: send/schedule, template preview, status/timeline, templates, bulk history, bulk-job status, and bulk stats."
          >
            <div className="va-grid">
              <UiCard>
                <p className="va-card-eyebrow">Live /email launcher parity</p>
                <Text>
                  Choose an email action below. The Mini App keeps the same bot button order and
                  routes each selection into the same callback-owned workflow family, while using
                  the form and diagnostics on this page in place of the bot conversation prompts.
                </Text>
                <div className="va-inline-tools">
                  <UiButton
                    variant="primary"
                    disabled={!canOperate || activeBusy}
                    onClick={() => {
                      void runGuidedEmailMenuAction('EMAIL_SEND');
                    }}
                  >
                    Send Email
                  </UiButton>
                  <UiButton
                    variant="secondary"
                    disabled={!canOperate || activeBusy}
                    onClick={() => {
                      void runGuidedEmailMenuAction('EMAIL_STATUS');
                    }}
                  >
                    Delivery Status
                  </UiButton>
                </div>
                <div className="va-inline-tools">
                  <UiButton
                    variant="secondary"
                    disabled={!canOperate || activeBusy}
                    onClick={() => {
                      void runGuidedEmailMenuAction('EMAIL_TEMPLATES');
                    }}
                  >
                    Templates
                  </UiButton>
                  <UiButton
                    variant="secondary"
                    disabled={!canOperate || activeBusy}
                    onClick={() => {
                      void runGuidedEmailMenuAction('EMAIL_HISTORY');
                    }}
                  >
                    History
                  </UiButton>
                </div>
                <div className="va-inline-tools">
                  <UiButton
                    variant="secondary"
                    disabled={activeBusy}
                    onClick={() => {
                      openGuidedEmailRoute(bulkEmailRoute);
                    }}
                  >
                    Open Mailer
                  </UiButton>
                  <UiButton
                    variant="plain"
                    disabled={activeBusy}
                    onClick={() => {
                      openGuidedEmailRoute(MINIAPP_COMMAND_ROUTE_CONTRACTS.MENU);
                    }}
                  >
                    Main Menu
                  </UiButton>
                </div>
                <UiStatePanel
                  compact
                  title="Authorized access controls execution"
                  description="The live bot only enables /email actions for authorized users. This Mini App page follows the same access gate before running any workflow."
                  tone="info"
                />
                <UiStatePanel
                  compact
                  title="Bulk handoff stays explicit"
                  description="Bulk email remains owned by /mailer. This page keeps the main /email menu parity and hands large-volume workflows to the canonical mailer route."
                  tone="info"
                />
              </UiCard>

              <UiCard>
                <p className="va-card-eyebrow">Single-recipient send & schedule</p>
                <UiInput
                  aria-label="Recipient email"
                  placeholder="recipient@example.com"
                  value={sendRecipientInput}
                  onChange={(event) => setSendRecipientInput(event.target.value)}
                />
                <UiInput
                  aria-label="Email provider override"
                  placeholder="Provider (optional)"
                  value={sendProviderInput}
                  onChange={(event) => setSendProviderInput(event.target.value)}
                />
                <UiInput
                  aria-label="Email subject"
                  placeholder="Subject (optional when template ID is set)"
                  value={sendSubjectInput}
                  onChange={(event) => setSendSubjectInput(event.target.value)}
                />
                <UiTextarea
                  aria-label="Email HTML body"
                  placeholder="HTML body (optional)"
                  rows={4}
                  value={sendHtmlInput}
                  onChange={(event) => setSendHtmlInput(event.target.value)}
                />
                <UiTextarea
                  aria-label="Email text body"
                  placeholder="Text body (optional)"
                  rows={3}
                  value={sendTextInput}
                  onChange={(event) => setSendTextInput(event.target.value)}
                />
                <UiInput
                  aria-label="Schedule email at"
                  type="datetime-local"
                  value={sendScheduleAtInput}
                  onChange={(event) => setSendScheduleAtInput(event.target.value)}
                />
                <div className="va-inline-tools">
                  <UiButton
                    variant="primary"
                    disabled={!sendRecipientValid || !sendHasContent || !canManageEmail || activeBusy}
                    onClick={() => {
                      void runSendNow();
                    }}
                  >
                    {sendBusy ? 'Submitting...' : 'Send Now'}
                  </UiButton>
                  <UiButton
                    variant="secondary"
                    disabled={!sendRecipientValid || !sendHasContent || !sendScheduleAtInput || !canManageEmail || activeBusy}
                    onClick={() => {
                      void runSendScheduled();
                    }}
                  >
                    {sendBusy ? 'Submitting...' : 'Schedule'}
                  </UiButton>
                </div>
                {!sendRecipientValid && sendRecipientInput.trim() ? (
                  <UiStatePanel
                    compact
                    title="Recipient email format required"
                    description="Use a valid recipient email address before sending."
                    tone="warning"
                  />
                ) : null}
                {!sendHasContent ? (
                  <UiStatePanel
                    compact
                    title="Content required"
                    description="Provide a template ID or subject/body content before sending."
                    tone="warning"
                  />
                ) : null}
                {sendResult ? (
                  <UiStatePanel
                    compact
                    title="Send workflow accepted"
                    description={sendResult}
                    tone="success"
                  />
                ) : null}

                <p className="va-card-eyebrow">Bot callback parity execution</p>
                <UiInput
                  aria-label="Email callback action"
                  placeholder="EMAIL_SEND, EMAIL_TIMELINE:message-id, BULK_EMAIL_PAGE:2"
                  value={callbackActionInput}
                  onChange={(event) => setCallbackActionInput(event.target.value)}
                />
                <div className="va-inline-tools">
                  <UiButton
                    variant="secondary"
                    disabled={(!canManageEmail && !canManageProvider) || activeBusy}
                    onClick={() => {
                      void runCallbackAction();
                    }}
                  >
                    Run Callback Action
                  </UiButton>
                </div>
                <ul className="va-list va-list-dense">
                  {EMAIL_CALLBACK_PARITY_ROWS.map((row) => (
                    <li key={row.callbackAction}>
                      {row.callbackAction}{' -> '}{row.dashboardAction} ({row.summary})
                    </li>
                  ))}
                </ul>
                {callbackResult ? (
                  <UiStatePanel
                    compact
                    title="Callback execution completed"
                    description={callbackResult}
                    tone="success"
                  />
                ) : null}

                <p className="va-card-eyebrow">Template preview</p>
                <UiInput
                  aria-label="Template ID"
                  placeholder="Template / Script ID"
                  value={templateIdInput}
                  onChange={(event) => setTemplateIdInput(event.target.value)}
                />
                <UiTextarea
                  aria-label="Template variables JSON"
                  placeholder='{"first_name":"Alex"}'
                  rows={5}
                  value={previewVariablesInput}
                  onChange={(event) => setPreviewVariablesInput(event.target.value)}
                />
                <div className="va-inline-tools">
                  <UiButton
                    variant="primary"
                    disabled={!templateId || !canManageEmail || activeBusy}
                    onClick={() => {
                      void runPreview();
                    }}
                  >
                    {previewBusy ? 'Previewing...' : 'Preview Template'}
                  </UiButton>
                  <UiButton
                    variant="secondary"
                    disabled={activeBusy}
                    onClick={() => {
                      setSendResult('');
                      setCallbackResult('');
                      setPreviewSnapshot(null);
                      setTemplateRows([]);
                    }}
                  >
                    Clear Preview
                  </UiButton>
                </div>
                {!canManageEmail ? (
                  <UiStatePanel
                    compact
                    title="Email actions unavailable"
                    description="Your account needs email bulk management capability to run /email execution actions in the Mini App."
                    tone="warning"
                  />
                ) : null}
                {previewSnapshot?.success === false && previewMissing.length > 0 ? (
                  <UiStatePanel
                    compact
                    title="Missing template variables"
                    description={previewMissing.join(', ')}
                    tone="warning"
                  />
                ) : null}
                {previewSnapshot?.success ? (
                  <>
                    <ul className="va-list va-list-dense">
                      <li>Subject: {previewSubject || '(empty subject)'}</li>
                      <li>HTML length: {previewHtml.length}</li>
                      <li>Text length: {previewText.length}</li>
                    </ul>
                    {previewText ? (
                      <UiStatePanel
                        compact
                        title="Rendered text preview"
                        description={previewText}
                        tone="success"
                      />
                    ) : null}
                  </>
                ) : null}
              </UiCard>

              <UiCard>
                <p className="va-card-eyebrow">Message status, bulk diagnostics, templates & history</p>
                <div className="va-inline-tools">
                  <UiInput
                    aria-label="Email message ID"
                    placeholder="Message ID"
                    value={messageIdInput}
                    onChange={(event) => setMessageIdInput(event.target.value)}
                  />
                  <UiButton
                    variant="secondary"
                    disabled={!messageId || !canManageEmail || activeBusy}
                    onClick={() => {
                      void runMessageStatus();
                    }}
                  >
                    {statusBusy ? 'Loading...' : 'Check Status'}
                  </UiButton>
                  <UiButton
                    variant="secondary"
                    disabled={!canManageEmail || activeBusy}
                    onClick={() => {
                      void runBulkHistory();
                    }}
                  >
                    {historyBusy ? 'Loading...' : 'Load History'}
                  </UiButton>
                </div>
                <div className="va-inline-tools">
                  <UiInput
                    aria-label="Email bulk job ID"
                    placeholder="Bulk job ID"
                    value={jobIdInput}
                    onChange={(event) => setJobIdInput(event.target.value)}
                  />
                  <UiButton
                    variant="secondary"
                    disabled={!jobId || !canManageEmail || activeBusy}
                    onClick={() => {
                      void runBulkJobStatus();
                    }}
                  >
                    {jobBusy ? 'Loading...' : 'Load Job'}
                  </UiButton>
                  <UiButton
                    variant="secondary"
                    disabled={!canManageProvider || activeBusy}
                    onClick={() => {
                      void runBulkPrecheck();
                    }}
                  >
                    {precheckBusy ? 'Loading...' : 'Run Precheck'}
                  </UiButton>
                  <UiButton
                    variant="secondary"
                    disabled={!canManageEmail || activeBusy}
                    onClick={() => {
                      void runBulkStats();
                    }}
                  >
                    {statsBusy ? 'Loading...' : 'Load Stats'}
                  </UiButton>
                  <UiButton
                    variant="plain"
                    disabled={activeBusy}
                    onClick={() => {
                      setMessageSnapshot(null);
                      setMessageEvents([]);
                      setHistoryRows([]);
                      setTemplateRows([]);
                      setBulkJobSnapshot(null);
                      setProviderSnapshot(null);
                      setStatsSnapshot(null);
                      setActionError('');
                    }}
                  >
                    Clear Diagnostics
                  </UiButton>
                </div>

                {messageSnapshot ? (
                  <ul className="va-list va-list-dense">
                    <li>Status: {messageStatus || 'unknown'}</li>
                    <li>Provider: {messageProvider || 'unknown'}</li>
                    <li>To: {messageTo || 'n/a'}</li>
                    <li>Script: {messageScriptId || 'n/a'}</li>
                    <li>Created: {messageCreatedAt || 'n/a'}</li>
                    <li>Events: {messageEvents.length}</li>
                  </ul>
                ) : null}

                {messageEvents.length > 0 ? (
                  <UiStatePanel
                    compact
                    title="Recent message event"
                    description={toJsonText(messageEvents[0])}
                    tone="info"
                  />
                ) : null}

                {bulkJobSnapshot ? (
                  <>
                    <p className="va-card-eyebrow">Bulk job snapshot</p>
                    <ul className="va-list va-list-dense">
                      <li>Job ID: {toText(bulkJobSnapshot.job_id, toText(bulkJobSnapshot.id, 'n/a'))}</li>
                      <li>Status: {toText(bulkJobSnapshot.status, 'unknown')}</li>
                      <li>Provider: {toText(bulkJobSnapshot.provider, 'unknown')}</li>
                      <li>Recipients: {toInt(bulkJobSnapshot.recipient_count, 0)}</li>
                      <li>Sent: {toInt(bulkJobSnapshot.sent_count, 0)}</li>
                      <li>Failed: {toInt(bulkJobSnapshot.failed_count, 0)}</li>
                    </ul>
                  </>
                ) : null}

                {providerSnapshot ? (
                  <>
                    <p className="va-card-eyebrow">Bulk precheck provider readiness</p>
                    <ul className="va-list va-list-dense">
                      <li>Channel: {toText(providerSnapshot.channel, 'email')}</li>
                      <li>Provider: {toText(providerSnapshot.provider, 'unknown')}</li>
                      <li>Readiness: {providerSnapshot.ready === true ? 'Ready' : 'Check configuration'}</li>
                      <li>Supported providers: {toTextList(providerSnapshot.supported_providers).join(', ') || 'n/a'}</li>
                    </ul>
                    {Object.keys(asRecord(providerSnapshot.readiness)).length > 0 ? (
                      <UiStatePanel
                        compact
                        title="Readiness map"
                        description={toJsonText(providerSnapshot.readiness)}
                        tone={providerSnapshot.ready === true ? 'success' : 'warning'}
                      />
                    ) : null}
                  </>
                ) : null}

                {historyRows.length > 0 ? (
                  <>
                    <p className="va-card-eyebrow">Recent bulk jobs</p>
                    <ul className="va-list va-list-dense">
                      {historyRows.slice(0, 6).map((job) => (
                        <li key={toTextValue(job.job_id, summarizeEmailJob(job))}>
                          {summarizeEmailJob(job)}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}

                {statsSnapshot ? (
                  <>
                    <p className="va-card-eyebrow">Bulk stats snapshot</p>
                    <ul className="va-list va-list-dense">
                      <li>{summarizeEmailBulkStats(statsSnapshot)}</li>
                    </ul>
                  </>
                ) : null}

                {templateRows.length > 0 ? (
                  <>
                    <p className="va-card-eyebrow">Template catalog sample</p>
                    <ul className="va-list va-list-dense">
                      {templateRows.slice(0, 6).map((template) => (
                        <li key={toTextValue(template.template_id, toTextValue(template.id, summarizeEmailTemplate(template)))}>
                          {summarizeEmailTemplate(template)}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}

                {!messageSnapshot && !bulkJobSnapshot && historyRows.length === 0 && templateRows.length === 0 && !statsSnapshot ? (
                  <UiStatePanel
                    compact
                    title="No email diagnostics loaded"
                    description="Run status/timeline, bulk job, templates, history, or stats actions to populate diagnostics."
                    tone="info"
                  />
                ) : null}
              </UiCard>
            </div>
          </Section>
        )}

        {actionError ? (
          <Section header="Action error">
            <UiStatePanel
              title="Email action failed"
              description={actionError}
              tone="error"
            />
          </Section>
        ) : null}

        {canOperate ? (
          <Section header="Workflow snapshot">
            <Cell subtitle="How many command-owned action slices currently hold data in this session.">
              Loaded slices: {actionReadyCount}
            </Cell>
          </Section>
        ) : null}

        <Section
          header="Quick actions"
          footer="These shortcuts stay aligned to existing Mini App parity routes so the /email page remains part of the bot-owned workflow graph."
        >
          {(['BULK_EMAIL', 'HELP', 'GUIDE', 'MENU', 'PROVIDER_STATUS'] as const).map((actionId) => {
            const action = MINIAPP_COMMAND_ACTION_CONTRACTS[actionId];
            return action.routePath ? (
              <Link key={actionId} to={action.routePath}>
                <Cell
                  subtitle={`${action.description} ${describeActionAvailability(actionId, accessLevel)}.`}
                  after={<Navigation>Open</Navigation>}
                >
                  {action.label}
                </Cell>
              </Link>
            ) : (
              <Cell
                key={actionId}
                subtitle={`${action.description} ${action.notes}`}
                after={<Navigation>Missing</Navigation>}
              >
                {action.label}
              </Cell>
            );
          })}
        </Section>

        <Section
          header="Fallback"
          footer="Unknown or stale actions still recover to the dashboard shell instead of hard-failing."
        >
          <Link to={DASHBOARD_STATIC_ROUTE_CONTRACTS.ROOT}>
            <Cell subtitle="Open the admin dashboard shell and route launcher.">
              Dashboard root
            </Cell>
          </Link>
        </Section>
      </List>
    </Page>
  );
}

export const CallCommandPage: FC = () => <CallCommandPageContent />;
export const StartCommandPage: FC = () => <CommandPage pageId="START" />;
export const HelpCommandPage: FC = () => <CommandPage pageId="HELP" />;
export const SmsCommandPage: FC = () => <SmsCommandPageContent />;
export const EmailCommandPage: FC = () => <EmailCommandPageContent />;
export const ScriptsCommandPage: FC = () => <ScriptsCommandPageContent />;
export const MenuCommandPage: FC = () => <CommandPage pageId="MENU" />;
export const GuideCommandPage: FC = () => <CommandPage pageId="GUIDE" />;
export const HealthCommandPage: FC = () => <CommandPage pageId="HEALTH" />;
export const StatusCommandPage: FC = () => <CommandPage pageId="STATUS" />;
