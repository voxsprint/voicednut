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
  UiActionBar,
  UiBadge,
  UiButton,
  UiCard,
  UiDisclosure,
  UiInput,
  UiMetricTile,
  UiSelect,
  UiStatePanel,
  UiTextarea,
} from '@/components/ui/AdminPrimitives';
import {
  asRecord,
  estimateSmsSegments,
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

type CallPersonaPurposeOption = {
  id: string;
  label: string;
  emoji?: string;
  defaultEmotion?: string;
  defaultUrgency?: string;
  defaultTechnicalLevel?: string;
};

type CallPersonaProfile = {
  id: string;
  label: string;
  description: string;
  emoji?: string;
  purposes: CallPersonaPurposeOption[];
  defaultPurpose: string;
  defaultEmotion?: string;
  defaultUrgency?: string;
  defaultTechnicalLevel?: string;
  custom: boolean;
  dynamic: boolean;
};

type CallPersonaCatalogResponse = {
  success?: boolean;
  builtin?: unknown;
  custom?: unknown;
};

type CallVoiceModelOption = {
  id: string;
  label: string;
  gender: string;
  style: string;
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

const CALL_CUSTOM_PERSONA_ID = 'custom';
const CALL_VOICE_AUTO_ID = 'auto';
const CALL_VOICE_CUSTOM_ID = 'custom';

const CALL_PURPOSE_OPTIONS: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'general', label: 'General' },
  { id: 'general_outreach', label: 'General outreach' },
  { id: 'identity_verification', label: 'Identity verification' },
  { id: 'appointment_confirmation', label: 'Appointment confirmation' },
  { id: 'service_recovery', label: 'Service recovery' },
  { id: 'payment_collection', label: 'Payment collection' },
];
const RELATIONSHIP_CALL_FLOW_TYPE_SET = new Set<string>([
  'dating',
  'celebrity',
  'fan',
  'creator',
  'friendship',
  'networking',
  'community',
  'marketplace_seller',
  'real_estate_agent',
]);
const CALL_CUSTOM_FLOW_OPTIONS: ReadonlyArray<CallPersonaPurposeOption> = [
  { id: 'general', label: 'General', emoji: '🧩' },
  { id: 'dating', label: 'Dating', emoji: '💕' },
  { id: 'celebrity', label: 'Celebrity fan engagement', emoji: '⭐' },
  { id: 'fan', label: 'Fan engagement', emoji: '🎤' },
  { id: 'creator', label: 'Creator collaboration', emoji: '🎬' },
  { id: 'friendship', label: 'Friendship', emoji: '🤝' },
  { id: 'networking', label: 'Networking', emoji: '🌐' },
  { id: 'community', label: 'Community engagement', emoji: '🫶' },
  { id: 'marketplace_seller', label: 'Marketplace seller', emoji: '🛍️' },
  { id: 'real_estate_agent', label: 'Real estate outreach', emoji: '🏡' },
];
const SMS_MESSAGE_MAX_CHARS = 1600;
const CALL_CUSTOM_FLOW_TEXT_SIGNALS: Readonly<Record<string, ReadonlyArray<string>>> = Object.freeze({
  dating: ['dating', 'girlfriend', 'boyfriend', 'romance', 'situationship'],
  celebrity: ['celebrity', 'fan club', 'artist', 'official assistant'],
  fan: ['fandom', 'fan', 'community update', 'exclusive drop'],
  creator: ['creator', 'collab', 'partnership', 'ugc'],
  friendship: ['friend', 'check in', 'reconnect', 'catch up'],
  networking: ['network', 'follow-up', 'intro', 'referral'],
  community: ['community', 'member', 'moderation', 'onboarding'],
  marketplace_seller: ['listing', 'buyer', 'marketplace', 'item details'],
  real_estate_agent: ['property', 'open house', 'tour', 'real estate', 'agent'],
});

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

const CALL_FALLBACK_PERSONAS: ReadonlyArray<CallPersonaProfile> = [
  {
    id: CALL_CUSTOM_PERSONA_ID,
    label: 'Custom Persona',
    description: 'Manually configure prompt, first message, and tone for ad-hoc outbound calls.',
    defaultPurpose: 'general',
    defaultEmotion: 'neutral',
    defaultUrgency: 'normal',
    defaultTechnicalLevel: 'general',
    purposes: [{ id: 'general', label: 'General' }],
    custom: true,
    dynamic: false,
  },
  {
    id: 'technical_support',
    label: 'Technical Support',
    emoji: '🛠️',
    description: 'Guides callers through troubleshooting steps and software onboarding.',
    defaultPurpose: 'general',
    defaultEmotion: 'frustrated',
    defaultUrgency: 'normal',
    defaultTechnicalLevel: 'novice',
    purposes: [
      {
        id: 'general',
        label: 'General Troubleshooting',
        emoji: '🛠️',
        defaultEmotion: 'frustrated',
        defaultUrgency: 'normal',
        defaultTechnicalLevel: 'novice',
      },
      {
        id: 'installation',
        label: 'Installation Help',
        emoji: '💿',
        defaultEmotion: 'confused',
        defaultUrgency: 'normal',
        defaultTechnicalLevel: 'general',
      },
      {
        id: 'outage',
        label: 'Service Outage',
        emoji: '🚨',
        defaultEmotion: 'urgent',
        defaultUrgency: 'high',
        defaultTechnicalLevel: 'advanced',
      },
    ],
    custom: false,
    dynamic: false,
  },
  {
    id: 'healthcare',
    label: 'Healthcare Services',
    emoji: '🩺',
    description: 'Coordinates patient reminders, follow-ups, and care outreach.',
    defaultPurpose: 'appointment',
    defaultEmotion: 'positive',
    defaultUrgency: 'normal',
    defaultTechnicalLevel: 'general',
    purposes: [
      {
        id: 'appointment',
        label: 'Appointment Reminder',
        emoji: '📅',
        defaultEmotion: 'positive',
        defaultUrgency: 'normal',
        defaultTechnicalLevel: 'general',
      },
      {
        id: 'follow_up',
        label: 'Post-Visit Follow-up',
        emoji: '📋',
        defaultEmotion: 'empathetic',
        defaultUrgency: 'normal',
        defaultTechnicalLevel: 'general',
      },
      {
        id: 'wellness_check',
        label: 'Wellness Check',
        emoji: '💙',
        defaultEmotion: 'empathetic',
        defaultUrgency: 'low',
        defaultTechnicalLevel: 'general',
      },
    ],
    custom: false,
    dynamic: false,
  },
  {
    id: 'finance',
    label: 'Financial Services',
    emoji: '💳',
    description: 'Delivers account alerts, security notices, and payment reminders.',
    defaultPurpose: 'security',
    defaultEmotion: 'urgent',
    defaultUrgency: 'high',
    defaultTechnicalLevel: 'advanced',
    purposes: [
      {
        id: 'security',
        label: 'Security Alert',
        emoji: '🔐',
        defaultEmotion: 'urgent',
        defaultUrgency: 'high',
        defaultTechnicalLevel: 'general',
      },
      {
        id: 'payment',
        label: 'Payment Reminder',
        emoji: '🧾',
        defaultEmotion: 'neutral',
        defaultUrgency: 'normal',
        defaultTechnicalLevel: 'general',
      },
      {
        id: 'fraud',
        label: 'Fraud Investigation',
        emoji: '🚔',
        defaultEmotion: 'urgent',
        defaultUrgency: 'critical',
        defaultTechnicalLevel: 'advanced',
      },
    ],
    custom: false,
    dynamic: false,
  },
  {
    id: 'hospitality',
    label: 'Hospitality & Guest Services',
    emoji: '🏨',
    description: 'Handles reservations, service recovery, and VIP outreach.',
    defaultPurpose: 'recovery',
    defaultEmotion: 'empathetic',
    defaultUrgency: 'normal',
    defaultTechnicalLevel: 'general',
    purposes: [
      {
        id: 'reservation',
        label: 'Reservation Follow-up',
        emoji: '📞',
        defaultEmotion: 'positive',
        defaultUrgency: 'normal',
        defaultTechnicalLevel: 'general',
      },
      {
        id: 'recovery',
        label: 'Service Recovery',
        emoji: '💡',
        defaultEmotion: 'empathetic',
        defaultUrgency: 'high',
        defaultTechnicalLevel: 'general',
      },
      {
        id: 'vip_outreach',
        label: 'VIP Outreach',
        emoji: '⭐',
        defaultEmotion: 'positive',
        defaultUrgency: 'low',
        defaultTechnicalLevel: 'general',
      },
    ],
    custom: false,
    dynamic: false,
  },
  {
    id: 'emergency_response',
    label: 'Emergency Response',
    emoji: '🚑',
    description: 'Coordinates critical incident response and escalation workflows.',
    defaultPurpose: 'incident',
    defaultEmotion: 'urgent',
    defaultUrgency: 'critical',
    defaultTechnicalLevel: 'advanced',
    purposes: [
      {
        id: 'incident',
        label: 'Incident Response',
        emoji: '⚠️',
        defaultEmotion: 'urgent',
        defaultUrgency: 'critical',
        defaultTechnicalLevel: 'advanced',
      },
      {
        id: 'safety_check',
        label: 'Safety Check',
        emoji: '🆘',
        defaultEmotion: 'urgent',
        defaultUrgency: 'high',
        defaultTechnicalLevel: 'general',
      },
      {
        id: 'drill',
        label: 'Emergency Drill',
        emoji: '🛡️',
        defaultEmotion: 'neutral',
        defaultUrgency: 'normal',
        defaultTechnicalLevel: 'general',
      },
    ],
    custom: false,
    dynamic: false,
  },
];

const CALL_FALLBACK_VOICE_MODELS: ReadonlyArray<CallVoiceModelOption> = [
  { id: 'aura-2-andromeda-en', label: 'aura-2-andromeda-en', gender: 'female', style: 'balanced' },
  { id: 'aura-2-helena-en', label: 'aura-2-helena-en', gender: 'female', style: 'warm' },
  { id: 'aura-2-thalia-en', label: 'aura-2-thalia-en', gender: 'female', style: 'clear' },
  { id: 'aura-2-arcas-en', label: 'aura-2-arcas-en', gender: 'male', style: 'grounded' },
  { id: 'aura-2-aries-en', label: 'aura-2-aries-en', gender: 'male', style: 'confident' },
  { id: 'aura-asteria-en', label: 'aura-asteria-en', gender: 'female', style: 'bright' },
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
        : 'No bridge response status history in the current session snapshot',
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
    return 'Partially available workflow';
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

function normalizeCallPersonaPurpose(value: unknown): CallPersonaPurposeOption | null {
  const record = asRecord(value);
  const id = toText(record.id ?? record.slug ?? record.name, '').trim();
  if (!id) return null;
  return {
    id,
    label: toText(record.label ?? record.name, id).trim() || id,
    emoji: toText(record.emoji, '').trim() || undefined,
    defaultEmotion: toText(record.defaultEmotion ?? record.default_emotion, '').trim() || undefined,
    defaultUrgency: toText(record.defaultUrgency ?? record.default_urgency, '').trim() || undefined,
    defaultTechnicalLevel: toText(
      record.defaultTechnicalLevel ?? record.default_technical_level,
      '',
    ).trim() || undefined,
  };
}

function normalizeCallPersonaProfile(value: unknown): CallPersonaProfile | null {
  const record = asRecord(value);
  const id = toText(record.slug ?? record.id, '').trim();
  if (!id) return null;
  const purposes = Array.isArray(record.purposes)
    ? record.purposes.map(normalizeCallPersonaPurpose).filter(Boolean) as CallPersonaPurposeOption[]
    : [];
  const defaultPurpose = toText(
    record.defaultPurpose ?? record.default_purpose,
    purposes[0]?.id || 'general',
  ).trim() || 'general';
  return {
    id,
    label: toText(record.label ?? record.name, id).trim() || id,
    description: toText(record.description, '').trim(),
    emoji: toText(record.emoji, '').trim() || undefined,
    purposes,
    defaultPurpose,
    defaultEmotion: toText(record.defaultEmotion ?? record.default_emotion, '').trim() || undefined,
    defaultUrgency: toText(record.defaultUrgency ?? record.default_urgency, '').trim() || undefined,
    defaultTechnicalLevel: toText(
      record.defaultTechnicalLevel ?? record.default_technical_level,
      '',
    ).trim() || undefined,
    custom: Boolean(record.custom || id === CALL_CUSTOM_PERSONA_ID),
    dynamic: Boolean(record.slug && id !== CALL_CUSTOM_PERSONA_ID),
  };
}

function mergeCallPersonaProfiles(
  primary: CallPersonaProfile[],
  fallback: ReadonlyArray<CallPersonaProfile>,
): CallPersonaProfile[] {
  const merged = new Map<string, CallPersonaProfile>();
  primary.forEach((profile) => {
    merged.set(profile.id, profile);
  });
  fallback.forEach((profile) => {
    if (profile.custom || !merged.has(profile.id)) {
      merged.set(profile.id, merged.get(profile.id) || profile);
    }
  });
  return [...merged.values()];
}

function buildCallPersonaOptionLabel(profile: CallPersonaProfile): string {
  if (profile.custom) return 'Custom Persona';
  return profile.emoji ? `${profile.emoji} ${profile.label}` : profile.label;
}

function buildCallVoiceOptionLabel(option: CallVoiceModelOption): string {
  if (option.gender === 'male') return `${option.label} (male, ${option.style})`;
  if (option.gender === 'female') return `${option.label} (female, ${option.style})`;
  return `${option.label} (${option.style})`;
}

function buildPersonalizedCallFirstMessage(
  baseMessage: string,
  victimName: string,
  personaLabel: string,
): string {
  if (!victimName) {
    return baseMessage;
  }
  const greeting = `Hello ${victimName}!`;
  const trimmedBase = baseMessage.trim();
  if (!trimmedBase) {
    const brandLabel = personaLabel || 'our team';
    return `${greeting} Welcome to ${brandLabel}!`;
  }
  const withoutExistingGreeting = trimmedBase.replace(/^hello[^.!?]*[.!?]?\s*/i, '').trim();
  const remainder = withoutExistingGreeting || trimmedBase;
  return `${greeting} ${remainder}`;
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
  const flowTypes = toTextList(script.flow_types)
    .map((entry) => entry.toLowerCase())
    .filter(Boolean);
  if (flowTypes.length > 0) return flowTypes;
  const flowType = toTextValue(script.flow_type).toLowerCase();
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

function inferCustomCallFlow(prompt: string, firstMessage: string): string {
  const combinedText = `${prompt} ${firstMessage}`.trim().toLowerCase();
  if (!combinedText) return 'general';

  let bestFlow = 'general';
  let bestScore = 0;

  Object.entries(CALL_CUSTOM_FLOW_TEXT_SIGNALS).forEach(([flowId, signals]) => {
    let score = 0;
    signals.forEach((signal) => {
      const normalizedSignal = signal.toLowerCase().trim();
      if (!normalizedSignal) return;
      if (combinedText.includes(normalizedSignal)) {
        score += normalizedSignal.includes(' ') ? 2 : 1;
      }
    });
    if (score > bestScore) {
      bestScore = score;
      bestFlow = flowId;
    }
  });

  return bestFlow;
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
            'Review available workflows and current access before you start work in the admin console.',
            'Use Help to review available workflows and access expectations.',
          ],
        },
        {
          header: 'Guest next steps',
          items: [
            'Open Guide for workflow rules and safe usage practices.',
            'Open Menu for the quick actions currently available in the Mini App.',
            'Request access from an admin to unlock call, SMS, and email execution.',
          ],
        },
      ];
    }

    const sections: CommandContentSection[] = [
      {
        header: 'Welcome posture',
        items: [
          'Start from the workflows available to your current access level.',
          'Each action below opens the same backend-backed flow used across the admin console.',
        ],
      },
      {
        header: 'Primary workflows',
        items: [
          'Call opens outbound call workflows.',
          'SMS and Email open messaging and delivery workflows.',
          'Call Log opens recent calls, search, details, and events.',
        ],
      },
      {
        header: 'Utilities',
        items: [
          'Guide, Help, and Menu remain available for navigation and operator guidance.',
          'Health exposes runtime posture and Status provides deeper admin diagnostics.',
        ],
      },
    ];

    if (accessLevel === 'admin') {
      sections.push({
        header: 'Admin extensions',
        items: [
          'SMS Sender and Mailer stay available through admin workspace routes.',
          'Users, Caller Flags, Scripts, and Provider remain available as admin workflows.',
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
            'Authorization is managed separately from this Mini App session.',
          ],
        },
        {
          header: 'What this app can do',
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
          'Call opens the Mini App call composer for custom outbound calls.',
          'Call Log opens recent calls, search, details, and events.',
        ],
      },
      {
        header: 'Messaging tools',
        items: [
          'SMS opens the SMS center and diagnostics.',
          'Email opens sending, status, and history workflows.',
        ],
      },
      {
        header: 'Navigation',
        items: [
          'Menu reopens quick actions.',
          'Guide shows operating guidance and number rules.',
          'Health and Status surface runtime posture through the ops workspace.',
        ],
      },
      {
        header: 'Quick usage',
        items: [
          'Use the quick-action list below to open the workspace you need.',
          'If a workflow is not available in this build, the page tells you directly instead of sending you into a dead end.',
        ],
      },
    ];
    if (accessLevel === 'admin') {
      sections.push({
        header: 'Admin toolkit',
        items: [
          'Users manages access and roles.',
          'Caller Flags moderates inbound caller flags.',
          'Provider, SMS Sender, and Mailer stay on the admin console routes.',
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
            'SMS tools stay locked until your account has the required access.',
            'You can still review the workflow layout and operating guidance before requesting approval.',
          ],
        },
        {
          header: 'Guest next steps',
          items: [
            'Use Help for access expectations and workflow guidance.',
            'Use Guide for number formatting rules and safe delivery practices.',
          ],
        },
      ];
    }

    const sections: CommandContentSection[] = [
      {
        header: 'SMS center workflow',
        items: [
          'Keep send, schedule, delivery checks, and diagnostics in one SMS workspace.',
          'Actions on this page run through the same Mini App action contracts used elsewhere in the console.',
        ],
      },
      {
        header: 'Current workflow coverage',
        items: [
          'Single-recipient workflows execute here through the same backend action contracts used across the admin console.',
          'Callback actions such as SMS_SEND, SMS_STATUS, SMS_CONVO, SMS_RECENT_PAGE:* and SMS_STATS are mapped to shared Mini App action contracts with safe fallback for unknown callbacks.',
          'High-volume bulk execution remains in SMS Sender with precheck and batching safeguards.',
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
          'SMS Sender remains the bulk SMS execution control plane.',
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
            'Email tools stay locked until your account has the required access.',
            'You can still review the workflow layout, guidance, and handoff points before requesting approval.',
          ],
        },
        {
          header: 'Guest next steps',
          items: [
            'Use Help for access details and workflow guidance.',
            'Use Guide for safe usage practices and operational checks.',
          ],
        },
      ];
    }

    const sections: CommandContentSection[] = [
      {
        header: 'Email center workflow',
        items: [
          'Manage send, status, templates, and history in one email workspace.',
          'Execution stays bound to the existing backend action contracts; this page coordinates those flows instead of reimplementing them.',
        ],
      },
      {
        header: 'Current workflow coverage',
        items: [
          'Single-recipient send/schedule, template preview, status/timeline, template list, and bulk history execute directly through shared Mini App action contracts.',
          'Callback actions such as EMAIL_SEND, EMAIL_STATUS:* and EMAIL_HISTORY map through shared contracts so this page executes the same workflow surface used elsewhere in the console.',
          'Mailer remains the high-volume control plane with broader campaign and deliverability tooling.',
        ],
      },
      {
        header: 'Operational safety',
        items: [
          'Use provider diagnostics before large campaigns or incident response actions.',
          'If a route is unsupported in the current build, the action remains visible as a partial or missing gap instead of silently failing.',
        ],
      },
    ];

    if (accessLevel === 'admin') {
      sections.push({
        header: 'Admin mailer controls',
        items: [
          'Mailer remains the bulk-email execution control plane.',
          'Use preflight, job status, and history checks before high-volume sends.',
        ],
      });
    }

    return sections;
  }

  if (pageId === 'SCRIPTS') {
    return [
      {
        header: 'Scripts workspace',
        items: [
          'Use this page to enter the script workspace without losing the current admin session context.',
          'Reusable prompts, call scripts, SMS scripts, and email templates stay routed through the existing admin workflows.',
        ],
      },
      {
        header: 'Workspace split',
        items: [
          'Script Studio owns call-script drafting, review, simulation, and promote-live workflows.',
          'Scripts Expansion owns SMS script and email-template workflows.',
        ],
      },
      {
        header: 'Operational rule',
        items: [
          'This route should hand operators into the correct workspace, not duplicate script business logic locally.',
          'If script capabilities drift, update the shared script contracts first so both downstream workspaces stay aligned.',
        ],
      },
    ];
  }

  if (pageId === 'GUIDE') {
    const sections: CommandContentSection[] = [
      {
        header: 'Making calls',
        items: [
          'Start a call from the Call quick action.',
          'The Mini App executes both custom and script-backed call launches against the live backend contract.',
          'Script catalog browsing remains constrained by the current Mini App capability contract, and the full guided setup flow is still not mounted here.',
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
          'Review quick runtime posture from the same session snapshot used across the admin console.',
          'Use refresh when you need the latest state without leaving the command workflow.',
          'Escalate to /status for deeper runtime controls and admin diagnostics.',
        ],
      },
      {
        header: 'Session behavior',
        items: [
          'If session refresh fails, the page keeps last-known visibility and shows the blocking error code.',
          'Unknown or stale navigation still returns to the admin console instead of hard-failing.',
        ],
      },
    ];
  }

  if (pageId === 'STATUS') {
    return [
      {
        header: 'Status workflow',
        items: [
          'Review detailed runtime posture from the same session snapshot used by operations.',
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
        'Use this page to open only the quick actions relevant to your current access tier.',
        'Each item below routes only to an available Mini App workflow or clearly reports when something is unavailable.',
      ],
    },
    {
      header: 'Workflow rule',
      items: [
        'Menu should launch real supported workflows, not standalone Mini App logic.',
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
              <Cell subtitle="Open the admin console home.">
                Admin console
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
            subtitle={error ? `Session needs attention. ${error}` : 'Connected to the latest available session data.'}
            after={<Navigation>{error ? 'Retry' : 'Ready'}</Navigation>}
            onClick={() => {
              void reload();
            }}
          >
            Session status
          </Cell>
          {errorCode && (
            <Cell subtitle="Latest session issue code">
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
            footer="Sourced from the latest runtime snapshot so this page stays aligned with the same operational posture used across the admin console."
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
          footer="These shortcuts open the workflows currently available in the Mini App for your access level."
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
                    after={<Navigation>{action.availability === 'partial' ? 'Open available steps' : 'Open'}</Navigation>}
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
          footer="If a workflow is unavailable, continue from the admin console instead of forcing a broken route."
        >
          <Link to={DASHBOARD_STATIC_ROUTE_CONTRACTS.ROOT}>
            <Cell subtitle="Open the admin console home and choose another workspace.">
              Admin console
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
              <Cell subtitle="Open the admin console home.">
                Admin console
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
            subtitle={error ? `Session needs attention. ${error}` : 'Connected to the latest available session data.'}
            after={<Navigation>{error ? 'Retry' : 'Ready'}</Navigation>}
            onClick={() => {
              void reload();
            }}
          >
            Session status
          </Cell>
          {errorCode && (
            <Cell subtitle="Latest session issue code">
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
          footer="These routes stay inside the existing admin workspace shell and keep script work separated by job type."
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
              subtitle="Open the scripts expansion workspace for SMS scripts and email templates."
              after={<Navigation>Open</Navigation>}
            >
              Scripts Expansion
            </Cell>
          </Link>
        </Section>

        <Section
          header="Runtime posture"
          footer="Sourced from the latest runtime snapshot so this handoff stays aligned with the same runtime and access posture as the rest of the Mini App."
        >
          {runtimeRows.map((row) => (
            <Cell key={row.label} subtitle={row.value}>
              {row.label}
            </Cell>
          ))}
        </Section>

        <Section
          header="Quick actions"
          footer="These shortcuts keep operators in the supported script workspaces without bypassing the intended handoff."
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
                    after={<Navigation>{action.availability === 'partial' ? 'Open available steps' : 'Open'}</Navigation>}
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
          footer="Unknown, stale, or unsupported actions fall back to the admin console instead of hard-failing."
        >
          <Link to={DASHBOARD_STATIC_ROUTE_CONTRACTS.ROOT}>
            <Cell subtitle="Open the admin dashboard shell and role-aware workspace launcher.">
              Admin console
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
  const [personaCatalogLoading, setPersonaCatalogLoading] = useState<boolean>(false);
  const [personaCatalogLoaded, setPersonaCatalogLoaded] = useState<boolean>(false);
  const [personaCatalogError, setPersonaCatalogError] = useState<string>('');
  const [personaProfiles, setPersonaProfiles] = useState<CallPersonaProfile[]>([...CALL_FALLBACK_PERSONAS]);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>(CALL_CUSTOM_PERSONA_ID);
  const [purposeInput, setPurposeInput] = useState<string>('general');
  const [customFlowPurposePinned, setCustomFlowPurposePinned] = useState<boolean>(false);
  const [promptInput, setPromptInput] = useState<string>('');
  const [firstMessageInput, setFirstMessageInput] = useState<string>('');
  const [voiceSelectionInput, setVoiceSelectionInput] = useState<string>(CALL_VOICE_AUTO_ID);
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
  const selectedPersona = useMemo(() => (
    personaProfiles.find((entry) => entry.id === selectedPersonaId)
    || personaProfiles.find((entry) => entry.custom)
    || personaProfiles[0]
    || null
  ), [personaProfiles, selectedPersonaId]);
  const personaPurposeOptions = useMemo(() => {
    if (selectedPersona?.custom) {
      return CALL_CUSTOM_FLOW_OPTIONS;
    }
    if (selectedPersona?.purposes?.length) {
      return selectedPersona.purposes;
    }
    return CALL_PURPOSE_OPTIONS.map((option) => ({
      id: option.id,
      label: option.label,
    })) as CallPersonaPurposeOption[];
  }, [selectedPersona]);
  const selectedPurposeOption = useMemo(() => (
    personaPurposeOptions.find((entry) => entry.id === purposeInput) || null
  ), [personaPurposeOptions, purposeInput]);
  const recommendedEmotionId = toTextValue(
    selectedPurposeOption?.defaultEmotion,
    toTextValue(selectedPersona?.defaultEmotion, 'neutral'),
  ) || 'neutral';
  const recommendedUrgencyId = toTextValue(
    selectedPurposeOption?.defaultUrgency,
    toTextValue(selectedPersona?.defaultUrgency, 'normal'),
  ) || 'normal';
  const recommendedTechnicalLevelId = toTextValue(
    selectedPurposeOption?.defaultTechnicalLevel,
    toTextValue(selectedPersona?.defaultTechnicalLevel, 'general'),
  ) || 'general';
  const purposeValue = purposeInput.trim() || 'general';
  const normalizedPurposeValue = purposeValue.toLowerCase();
  const purposeIsRelationshipFlow = RELATIONSHIP_CALL_FLOW_TYPE_SET.has(normalizedPurposeValue);
  const inferredCustomFlow = useMemo(
    () => inferCustomCallFlow(promptValue, firstMessageValue),
    [firstMessageValue, promptValue],
  );
  const inferredCustomFlowLabel = getOptionLabel(personaPurposeOptions, inferredCustomFlow, inferredCustomFlow);
  const isCustomPersonaSelected = Boolean(selectedPersona?.custom);
  const customFlowMatchesRecommendation = normalizedPurposeValue === inferredCustomFlow;
  const voiceModelValue = voiceModelInput.trim();
  const resolvedVoiceModelValue = voiceSelectionInput === CALL_VOICE_CUSTOM_ID
    ? voiceModelValue
    : (voiceSelectionInput === CALL_VOICE_AUTO_ID ? '' : voiceSelectionInput);
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
  const selectedScriptRelationshipFlow = useMemo(() => (
    selectedScriptFlowTypes.find((entry) => RELATIONSHIP_CALL_FLOW_TYPE_SET.has(entry)) || ''
  ), [selectedScriptFlowTypes]);
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
  const unresolvedScriptPlaceholderTokens = useMemo(() => (
    scriptPlaceholderTokens.filter((token) => !resolvedScriptPlaceholderValues[token])
  ), [resolvedScriptPlaceholderValues, scriptPlaceholderTokens]);
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
    if (voiceSelectionInput === CALL_VOICE_CUSTOM_ID && !voiceModelValue) {
      missingRequirements.push('Custom voice ID required or switch back to auto');
    }
  }

  const canSubmit = canOperate && missingRequirements.length === 0 && !submitting;
  const warningList = toWarningList(submitResult?.warnings);
  const selectedScriptLifecycleLabel = toTextValue(selectedScript?.lifecycle_state, 'draft');
  const scriptSelectionSourceLabel = canBrowseScripts ? 'Live script catalog' : 'Known script ID';
  const selectedScriptFlowLabel = selectedScript ? toFlowTypeLabel(selectedScript) : '';
  const scriptVoiceRoutingLabel = selectedScriptVoiceModel || 'Auto / provider default';
  const scriptPlaceholderSummary = scriptPlaceholderTokens.length > 0
    ? `${Object.keys(resolvedScriptPlaceholderValues).length}/${scriptPlaceholderTokens.length} placeholder values provided`
    : 'No script placeholders detected';
  const scriptSummaryLines = selectedScript ? [
    `Script: ${selectedScriptName}`,
    `Script ID: ${selectedScriptId}`,
    `Flow: ${selectedScriptFlowLabel}`,
    `Version: v${selectedScriptVersion || 1}`,
    `Lifecycle: ${selectedScriptLifecycleLabel}`,
    ...(selectedScriptBusinessId ? [`Business: ${selectedScriptBusinessId}`] : []),
    ...(selectedScriptVoiceModel ? [`Voice model: ${selectedScriptVoiceModel}`] : []),
    ...(selectedScriptPurpose ? [`Purpose: ${selectedScriptPurpose}`] : []),
    ...(selectedScriptEmotion ? [`Tone: ${selectedScriptEmotion}`] : []),
    ...(selectedScriptUrgency ? [`Urgency: ${selectedScriptUrgency}`] : []),
    ...(selectedScriptTechnicalLevel ? [`Technical level: ${selectedScriptTechnicalLevel}`] : []),
    ...(selectedScriptObjectiveTags.length > 0 ? [`Objective tags: ${selectedScriptObjectiveTags.join(', ')}`] : []),
    ...(scriptPlaceholderTokens.length > 0 ? [`Placeholder coverage: ${scriptPlaceholderSummary}`] : []),
    ...(unresolvedScriptPlaceholderTokens.length > 0
      ? [`Unresolved placeholders remain: ${unresolvedScriptPlaceholderTokens.join(', ')}`]
      : []),
    ...(Object.keys(resolvedScriptPlaceholderValues).length > 0
      ? [`Variables: ${Object.entries(resolvedScriptPlaceholderValues).map(([key, value]) => `${key}=${value}`).join(', ')}`]
      : []),
  ] : [];

  const callPurposeLabel = getOptionLabel(personaPurposeOptions, purposeValue, purposeValue || 'general');
  const callMoodLabel = getOptionLabel(CALL_MOOD_OPTIONS, emotionValue, emotionValue || 'auto');
  const callUrgencyLabel = getOptionLabel(CALL_URGENCY_OPTIONS, urgencyValue, urgencyValue || 'auto');
  const callTechLevelLabel = getOptionLabel(
    CALL_TECH_LEVEL_OPTIONS,
    technicalLevelValue,
    technicalLevelValue || 'auto',
  );
  const recommendedMoodLabel = getOptionLabel(CALL_MOOD_OPTIONS, recommendedEmotionId, recommendedEmotionId);
  const recommendedUrgencyLabel = getOptionLabel(CALL_URGENCY_OPTIONS, recommendedUrgencyId, recommendedUrgencyId);
  const recommendedTechLevelLabel = getOptionLabel(
    CALL_TECH_LEVEL_OPTIONS,
    recommendedTechnicalLevelId,
    recommendedTechnicalLevelId,
  );
  const callToneSummary = emotionValue === 'auto'
    ? `${callMoodLabel} (${recommendedMoodLabel})`
    : callMoodLabel;
  const callUrgencySummary = urgencyValue === 'auto'
    ? `${callUrgencyLabel} (${recommendedUrgencyLabel})`
    : callUrgencyLabel;
  const callTechSummary = technicalLevelValue === 'auto'
    ? `${callTechLevelLabel} (${recommendedTechLevelLabel})`
    : callTechLevelLabel;
  const selectedVoiceOption = CALL_FALLBACK_VOICE_MODELS.find((entry) => entry.id === resolvedVoiceModelValue) || null;
  const selectedVoiceLabel = voiceSelectionInput === CALL_VOICE_CUSTOM_ID
    ? (voiceModelValue || 'Custom voice ID pending')
    : (selectedVoiceOption ? buildCallVoiceOptionLabel(selectedVoiceOption) : 'Auto / provider default');
  const callBriefLines = [
    `Number: ${numberValid ? normalizedNumber : 'Missing valid E.164 number'}`,
    customerNameValue ? `Customer: ${customerNameValue}` : 'Customer: optional',
    `Mode: ${workflowMode === 'script' ? 'Script-backed call' : 'Custom prompt workflow'}`,
    ...(workflowMode === 'script'
      ? [
        `Script source: ${scriptSelectionSourceLabel}`,
        `Script ID: ${effectiveScriptId > 0 ? effectiveScriptId : 'Missing script selection'}`,
        ...(scriptSummaryLines.length > 0 ? scriptSummaryLines : []),
        ...(!canBrowseScripts && effectiveScriptId > 0
          ? ['Metadata: Script details will resolve during launch because this session cannot browse the catalog.']
          : []),
      ]
      : [
        `Persona: ${selectedPersona?.label || 'Custom Persona'}`,
        `Purpose: ${callPurposeLabel}`,
        `Tone: ${callToneSummary}`,
        `Urgency: ${callUrgencySummary}`,
        `Technical level: ${callTechSummary}`,
        `Voice model: ${selectedVoiceLabel}`,
      ]),
  ];
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
        : 'Enter the destination number in E.164 format. Customer name stays optional.',
    },
    {
      title: '2. Choose setup path',
      complete: true,
      description: workflowMode === 'script'
        ? 'Current path: use a saved call script first.'
        : 'Current path: build a custom persona with the opening message on this page.',
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
            : 'Enter a known script ID when guided script selection is not available in this session.'))
        : (promptValue && firstMessageValue
          ? `Prompt and first message captured | persona ${selectedPersona?.label || 'Custom Persona'} | purpose ${callPurposeLabel}`
          : 'Choose the service persona, then enter the agent prompt and first spoken message before launch.'),
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
        : `Persona ${selectedPersona?.label || 'Custom Persona'} | purpose ${callPurposeLabel} | tone ${callToneSummary} | urgency ${callUrgencySummary} | technical level ${callTechSummary}`,
    },
    {
      title: '5. Launch /outbound-call',
      complete: Boolean(submitResult?.call_sid),
      description: submitResult?.call_sid
        ? `Launch completed with call SID ${submitResult.call_sid}. Live call console polling is active while webhook updates continue.`
        : (canSubmit
          ? 'All required fields are present. Start Call will execute the live outbound call backend path.'
          : `Waiting on ${missingRequirements[0] || 'the remaining required fields'} before launch.`),
    },
  ];
  const activeWizardStepIndex = callWizardSteps.findIndex((step) => !step.complete);
  const activeWizardStepTitle = callWizardSteps[activeWizardStepIndex]?.title || 'All phases complete';
  const activeWizardStepLabel = activeWizardStepTitle.replace(/^\d+\.\s*/, '');
  const completedWizardSteps = callWizardSteps.filter((step) => step.complete).length;
  const launchStateLabel = submitResult?.call_sid
    ? (submitResult.deduped ? 'Reused' : 'Live')
    : (canSubmit ? 'Ready' : 'Needs input');
  const consoleStateLabel = activeCallSid
    ? (callConsoleTerminal
      ? 'Complete'
      : ((callConsoleBusy || callConsoleRefreshing) ? 'Refreshing' : 'Tracking'))
    : 'Idle';
  const remainingRequirementCount = Math.max(0, missingRequirements.length - 1);
  const actionBarTitle = submitResult?.call_sid
    ? 'Call tracking is active'
    : (canSubmit ? 'Ready to start call' : 'Complete launch requirements');
  const actionBarDescription = submitResult?.call_sid
    ? `Tracking ${submitResult.call_sid} in the live console below.`
    : (canSubmit
      ? `This will start an outbound call to ${normalizedNumber}${workflowMode === 'script' ? ` using ${selectedScriptName || `script #${effectiveScriptId}`}` : ''}.`
      : `${missingRequirements[0] || 'Fill the remaining fields'}${remainingRequirementCount > 0 ? ` and ${remainingRequirementCount} more ${remainingRequirementCount === 1 ? 'item' : 'items'}` : ''}.`);

  const refreshPersonaCatalog = useCallback(async (): Promise<void> => {
    setPersonaCatalogLoading(true);
    setPersonaCatalogError('');
    try {
      const response = await request<CallPersonaCatalogResponse>('/api/personas', {
        method: 'GET',
      });
      const builtinProfiles = Array.isArray(response?.builtin)
        ? response.builtin.map(normalizeCallPersonaProfile).filter(Boolean) as CallPersonaProfile[]
        : [];
      const customProfiles = Array.isArray(response?.custom)
        ? response.custom.map(normalizeCallPersonaProfile).filter(Boolean) as CallPersonaProfile[]
        : [];
      const nextProfiles = [...builtinProfiles, ...customProfiles];
      setPersonaProfiles(
        nextProfiles.length > 0
          ? mergeCallPersonaProfiles(nextProfiles, CALL_FALLBACK_PERSONAS)
          : [...CALL_FALLBACK_PERSONAS],
      );
    } catch (nextError) {
      setPersonaCatalogError(toErrorMessage(nextError));
      setPersonaProfiles([...CALL_FALLBACK_PERSONAS]);
    } finally {
      setPersonaCatalogLoaded(true);
      setPersonaCatalogLoading(false);
    }
  }, [request]);

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
    if (!canOperate || personaCatalogLoaded || personaCatalogLoading) return;
    void refreshPersonaCatalog();
  }, [canOperate, personaCatalogLoaded, personaCatalogLoading, refreshPersonaCatalog]);

  useEffect(() => {
    if (personaProfiles.some((entry) => entry.id === selectedPersonaId)) return;
    const fallbackPersonaId = personaProfiles.find((entry) => entry.custom)?.id
      || personaProfiles[0]?.id
      || CALL_CUSTOM_PERSONA_ID;
    setSelectedPersonaId(fallbackPersonaId);
  }, [personaProfiles, selectedPersonaId]);

  useEffect(() => {
    if (workflowMode !== 'custom') return;
    const defaultPurpose = selectedPersona?.defaultPurpose
      || personaPurposeOptions[0]?.id
      || 'general';
    const purposeStillValid = personaPurposeOptions.some((entry) => entry.id === purposeInput);
    if (!purposeStillValid) {
      setPurposeInput(defaultPurpose);
    }
  }, [personaPurposeOptions, purposeInput, selectedPersona, workflowMode]);

  useEffect(() => {
    if (workflowMode !== 'custom' || !isCustomPersonaSelected) {
      if (customFlowPurposePinned) {
        setCustomFlowPurposePinned(false);
      }
      return;
    }
    if (customFlowPurposePinned) return;
    if (normalizedPurposeValue === inferredCustomFlow) return;
    setPurposeInput(inferredCustomFlow);
  }, [
    customFlowPurposePinned,
    inferredCustomFlow,
    isCustomPersonaSelected,
    normalizedPurposeValue,
    workflowMode,
  ]);

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
              first_message: resolvedScriptFirstMessageValue
                ? buildPersonalizedCallFirstMessage(
                  resolvedScriptFirstMessageValue,
                  customerNameValue,
                  selectedScriptBusinessId || selectedScriptName || 'Custom',
                )
                : undefined,
              voice_model: selectedScriptVoiceModel || undefined,
              purpose: selectedScriptPurpose || selectedScriptRelationshipFlow || undefined,
              call_profile: selectedScriptRelationshipFlow || undefined,
              conversation_profile: selectedScriptRelationshipFlow || undefined,
              conversation_profile_lock: selectedScriptRelationshipFlow ? true : undefined,
              emotion: selectedScriptEmotion || undefined,
              urgency: selectedScriptUrgency || undefined,
              technical_level: selectedScriptTechnicalLevel || undefined,
            }
            : {
              business_id: selectedPersona && !selectedPersona.custom ? selectedPersona.id : undefined,
              prompt: promptValue,
              first_message: buildPersonalizedCallFirstMessage(
                firstMessageValue,
                customerNameValue,
                selectedPersona?.label || 'Custom Persona',
              ),
              purpose: purposeValue,
              script: selectedPersona?.custom ? 'custom' : selectedPersona?.id || 'custom',
              call_profile: purposeIsRelationshipFlow ? normalizedPurposeValue : undefined,
              conversation_profile: purposeIsRelationshipFlow ? normalizedPurposeValue : undefined,
              conversation_profile_lock: purposeIsRelationshipFlow ? true : undefined,
              voice_model: resolvedVoiceModelValue || undefined,
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
            subtitle={error ? `Session needs attention. ${error}` : 'Call workspace is ready.'}
            after={<Navigation>{error ? 'Retry' : 'Ready'}</Navigation>}
            onClick={() => {
              void reload();
            }}
          >
            Session status
          </Cell>
          {errorCode ? (
            <Cell subtitle="Latest session issue code">
              {errorCode}
            </Cell>
          ) : null}
        </Section>

        {!canOperate ? (
          <Section
            header="Access required"
            footer="Call execution is restricted to authorized users. The Mini App keeps the same rule."
          >
            <UiStatePanel
              title="Authorized access required"
              description="Request access from an admin or use Help and Guide for non-execution guidance."
              tone="warning"
            />
          </Section>
        ) : (
          <>
            <Section
              header="Call setup workspace"
              footer="Set the route, confirm readiness, and keep launch context on one focused screen."
            >
              <div className="va-grid">
                <UiCard>
                  <p className="va-card-eyebrow">Launch snapshot</p>
                  <div className={`va-overview-metrics ${canSubmit ? 'is-healthy' : 'is-degraded'}`}>
                    <UiMetricTile
                      label="Mode"
                      value={workflowMode === 'script' ? 'Script' : 'Custom'}
                    />
                    <UiMetricTile
                      label="Next"
                      value={activeWizardStepLabel}
                    />
                    <UiMetricTile
                      label="Launch"
                      value={launchStateLabel}
                    />
                    <UiMetricTile
                      label="Console"
                      value={consoleStateLabel}
                    />
                  </div>
                  <p className="va-muted">
                    Choose the workflow and complete only the fields needed for this call.
                  </p>
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
                  <UiSelect
                    aria-label="Call workflow mode"
                    value={workflowMode}
                    onChange={(event) => setWorkflowMode(event.target.value as CallWorkflowMode)}
                  >
                    {CALL_WORKFLOW_MODE_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </UiSelect>
                  <UiStatePanel
                    compact
                    title={workflowMode === 'script' ? 'Script-backed workflow' : 'Custom call workflow'}
                    description={workflowMode === 'script'
                      ? (canBrowseScripts
                        ? 'Browse the live script catalog, fill placeholders, review provider posture, and launch from this page.'
                        : 'Launch with a known script ID when catalog browsing is not available for this access tier.')
                      : 'Capture the recipient, prompt, opening line, and conversation posture without leaving this workspace.'}
                    tone={workflowMode === 'script' && !canBrowseScripts ? 'warning' : 'info'}
                  />
                  <UiDisclosure
                    title="Setup checklist"
                    subtitle={`${completedWizardSteps}/${callWizardSteps.length} phases complete`}
                    open
                  >
                    <ul className="va-list va-list-dense">
                      {callWizardSteps.map((step) => (
                        <li key={step.title}>
                          {step.complete ? '[done]' : '[next]'} {step.title}: {step.description}
                        </li>
                      ))}
                    </ul>
                  </UiDisclosure>
                </UiCard>
                <UiCard>
                  <p className="va-card-eyebrow">Session coverage</p>
                  <div className="va-inline-metrics">
                    <UiBadge>Access {accessLevel}</UiBadge>
                    <UiBadge>Mode {workflowMode}</UiBadge>
                    <UiBadge>{workflowMode === 'script' ? `Script ${effectiveScriptId > 0 ? 'ready' : 'missing'}` : `Prompt ${promptValue && firstMessageValue ? 'ready' : 'missing'}`}</UiBadge>
                    <UiBadge>{activeCallSid ? `Console ${consoleStateLabel.toLowerCase()}` : 'Console idle'}</UiBadge>
                  </div>
                  <UiStatePanel
                    compact
                    title={workflowMode === 'script'
                      ? (canBrowseScripts ? 'Script catalog available' : 'Manual script entry required')
                      : 'Custom call execution ready'}
                    description={workflowMode === 'script'
                      ? (canBrowseScripts
                        ? 'This session can load the live call-script catalog and use it directly for launch.'
                        : 'This session can still launch a script-backed call, but it needs a known script ID.')
                      : 'This page posts directly to the live outbound call path using the current Mini App session.'}
                    tone={workflowMode === 'script' && !canBrowseScripts ? 'warning' : 'success'}
                  />
                  {activeCallSid ? (
                    <UiStatePanel
                      compact
                      title={callConsoleTerminal ? 'Recent call finished' : 'Live console attached'}
                      description={callConsoleTerminal
                        ? `Recent call ${activeCallSid} reached a terminal state and remains available for review below.`
                        : `Tracking ${activeCallSid} from this workspace while provider and webhook updates continue.`}
                      tone={callConsoleTerminal ? 'success' : 'info'}
                    />
                  ) : null}
                  <UiDisclosure
                    title="Operational notes"
                    subtitle="Access, catalog coverage, and provider safeguards"
                  >
                    <p className="va-muted">
                      Validation and launch still use the same backend contract. This page only compresses setup,
                      review, and live tracking into one workspace.
                    </p>
                    <ul className="va-list va-list-dense">
                      <li>
                        {workflowMode === 'script'
                          ? (canBrowseScripts
                            ? 'The live script catalog is available in this session.'
                            : 'Script launch is available, but catalog browsing is restricted for this session.')
                          : 'Custom prompt calls can be prepared and launched directly here.'}
                      </li>
                      <li>
                        {requiresPaymentProviderGuard
                          ? 'Payment-related scripts still require provider posture confirmation before launch.'
                          : 'Provider posture stays visible during review and launch.'}
                      </li>
                      <li>
                        Runtime tracking restores the active call SID for the same Telegram session when a call is still in progress.
                      </li>
                    </ul>
                  </UiDisclosure>
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
                          aria-label="Service persona"
                          value={selectedPersonaId}
                          onChange={(event) => setSelectedPersonaId(event.target.value)}
                        >
                          {personaProfiles.map((profile) => (
                            <option key={profile.id} value={profile.id}>
                              {buildCallPersonaOptionLabel(profile)}
                            </option>
                          ))}
                        </UiSelect>
                        <UiSelect
                          aria-label="Voice selection"
                          value={voiceSelectionInput}
                          onChange={(event) => setVoiceSelectionInput(event.target.value)}
                        >
                          <option value={CALL_VOICE_AUTO_ID}>Auto voice selection</option>
                          {CALL_FALLBACK_VOICE_MODELS.map((option) => (
                            <option key={option.id} value={option.id}>
                              {buildCallVoiceOptionLabel(option)}
                            </option>
                          ))}
                          <option value={CALL_VOICE_CUSTOM_ID}>Custom voice ID</option>
                        </UiSelect>
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
                          title={effectiveScriptId > 0 ? 'Known script ID staged' : 'Catalog browsing restricted'}
                          description={effectiveScriptId > 0
                            ? `Script #${effectiveScriptId} is ready for launch. The backend will resolve the script, placeholders, and first message at submit time because this session cannot browse the live catalog.`
                            : 'This access tier cannot list call scripts here yet. Enter a known script ID when guided script browsing is unavailable in this session.'}
                          tone={effectiveScriptId > 0 ? 'info' : 'warning'}
                        />
                      )}
                      {selectedScript ? (
                        <>
                          <UiStatePanel
                            compact
                            title="Selected script ready"
                            description={`${selectedScriptName || `Script #${selectedScriptId}`} | flow ${selectedScriptFlowLabel} | lifecycle ${selectedScriptLifecycleLabel} | voice ${scriptVoiceRoutingLabel}`}
                            tone="success"
                          />
                          {!resolvedScriptFirstMessageValue ? (
                            <UiStatePanel
                              compact
                              title="First message missing after resolution"
                              description="The bot flow requires a first message before launch. Edit the script or fill any missing placeholders before continuing."
                              tone="error"
                            />
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
                                description={unresolvedScriptPlaceholderTokens.length > 0
                                  ? `${scriptPlaceholderSummary}. Leaving a field blank keeps its original {token} placeholder in the launch payload.`
                                  : `${scriptPlaceholderSummary}. All detected placeholders are resolved in the in-page preview below.`}
                                tone={unresolvedScriptPlaceholderTokens.length > 0 ? 'warning' : 'success'}
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
                                  : 'Provider posture is unavailable in the current session snapshot. Verify Provider status if this payment flow is sensitive to routing.'}
                                tone={activeCallProvider ? 'success' : 'info'}
                              />
                            )
                          ) : null}
                          <UiDisclosure
                            title="Script preflight"
                            subtitle="Script metadata, variable coverage, and launch posture"
                          >
                            <ul className="va-list va-list-dense">
                              <li>Source: {scriptSelectionSourceLabel}</li>
                              <li>Script: {selectedScriptName || `Script #${selectedScriptId}`}</li>
                              <li>Flow: {selectedScriptFlowLabel}</li>
                              <li>Lifecycle: {selectedScriptLifecycleLabel}</li>
                              <li>Voice routing: {scriptVoiceRoutingLabel}</li>
                              {selectedScriptBusinessId ? <li>Persona / business: {selectedScriptBusinessId}</li> : null}
                              {selectedScriptObjectiveTags.length > 0 ? (
                                <li>Objective tags: {selectedScriptObjectiveTags.join(', ')}</li>
                              ) : null}
                              <li>{scriptPlaceholderSummary}</li>
                              {unresolvedScriptPlaceholderTokens.length > 0 ? (
                                <li>Unresolved placeholders: {unresolvedScriptPlaceholderTokens.join(', ')}</li>
                              ) : null}
                              {resolvedScriptFirstMessageValue ? (
                                <li>Resolved first message preview: {resolvedScriptFirstMessageValue}</li>
                              ) : null}
                            </ul>
                          </UiDisclosure>
                        </>
                      ) : null}
                    </>
                  ) : (
                    <>
                      {personaCatalogError ? (
                        <UiStatePanel
                          compact
                          title="Persona catalog fallback active"
                          description={`${personaCatalogError} The page is using the local persona fallback list from the bot flow.`}
                          tone="warning"
                        />
                      ) : null}
                      {personaCatalogLoading ? (
                        <UiStatePanel
                          compact
                          title="Refreshing persona guidance"
                          description="Loading the latest service personas from the bot-backed persona endpoint."
                          tone="info"
                        />
                      ) : null}
                      <UiStatePanel
                        compact
                        title={selectedPersona?.custom ? 'Custom persona path' : `${selectedPersona?.label || 'Persona'} selected`}
                        description={selectedPersona?.custom
                          ? 'Write the prompt and opening line manually, then use the recommended tone settings below as a guide.'
                          : `${selectedPersona?.description || 'Use this service persona as the starting point for tone and workflow posture.'} Recommended defaults stay available when the selectors remain on Auto.`}
                        tone={selectedPersona?.custom ? 'info' : 'success'}
                      />
                      <p className="va-card-eyebrow">Purpose and tone</p>
                      <div className="va-inline-tools">
                        <UiSelect
                          aria-label="Call purpose"
                          value={purposeInput}
                          onChange={(event) => {
                            setPurposeInput(event.target.value);
                            if (isCustomPersonaSelected) {
                              setCustomFlowPurposePinned(true);
                            }
                          }}
                        >
                          {personaPurposeOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.emoji ? `${option.emoji} ${option.label}` : option.label}
                            </option>
                          ))}
                        </UiSelect>
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
                      <UiStatePanel
                        compact
                        title="Recommended posture"
                        description={`Purpose ${callPurposeLabel} | tone ${recommendedMoodLabel} | urgency ${recommendedUrgencyLabel} | technical level ${recommendedTechLevelLabel}`}
                        tone="info"
                      />
                      {selectedPersona?.custom ? (
                        <UiStatePanel
                          compact
                          title="Custom flow binding"
                          description={purposeIsRelationshipFlow
                            ? `${callPurposeLabel} will be locked as the conversation profile for this launch, matching bot custom-flow behavior.`
                            : 'General flow selected. No relationship profile lock will be applied.'}
                          tone={purposeIsRelationshipFlow ? 'info' : 'success'}
                        />
                      ) : null}
                      {selectedPersona?.custom ? (
                        <>
                          <UiStatePanel
                            compact
                            title="Flow recommendation"
                            description={customFlowMatchesRecommendation
                              ? `Recommended from prompt text: ${inferredCustomFlowLabel}.`
                              : `Recommended from prompt text: ${inferredCustomFlowLabel}. Current selection stays on ${callPurposeLabel}.`}
                            tone={customFlowMatchesRecommendation ? 'success' : 'info'}
                          />
                          {!customFlowMatchesRecommendation ? (
                            <div className="va-inline-tools">
                              <UiButton
                                variant="secondary"
                                onClick={() => {
                                  setPurposeInput(inferredCustomFlow);
                                  setCustomFlowPurposePinned(false);
                                }}
                              >
                                Use Recommended Flow
                              </UiButton>
                            </div>
                          ) : null}
                        </>
                      ) : null}
                      {voiceSelectionInput === CALL_VOICE_CUSTOM_ID ? (
                        <UiInput
                          aria-label="Voice model"
                          placeholder="Voice model ID"
                          value={voiceModelInput}
                          onChange={(event) => setVoiceModelInput(event.target.value)}
                        />
                      ) : (
                        <UiStatePanel
                          compact
                          title="Voice routing"
                          description={selectedVoiceOption
                            ? `Using ${buildCallVoiceOptionLabel(selectedVoiceOption)} from the bot fallback voice catalog.`
                            : 'Leaving voice selection on Auto so the backend can choose the best voice for this flow.'}
                          tone="info"
                        />
                      )}
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
                      <UiStatePanel
                        compact
                        title="Greeting behavior"
                        description={customerNameValue
                          ? `The launch payload will prepend "Hello ${customerNameValue}!" to the first message, matching the bot flow.`
                          : 'If you add a customer name above, the first message will be personalized before launch.'}
                        tone="info"
                      />
                    </>
                  )}

                </UiCard>

                <UiCard>
                  <p className="va-card-eyebrow">Launch review</p>
                  <div className="va-inline-metrics">
                    <UiBadge>Recipient {numberValid ? normalizedNumber : 'missing'}</UiBadge>
                    <UiBadge>Mode {workflowMode}</UiBadge>
                    <UiBadge>Launch {launchStateLabel}</UiBadge>
                    <UiBadge>{requiresPaymentProviderGuard ? 'Provider guard active' : 'Standard flow'}</UiBadge>
                  </div>

                  {missingRequirements.length > 0 ? (
                    <UiStatePanel
                      compact
                      title="Call launch requirements not met"
                      description={missingRequirements.join(' | ')}
                      tone="warning"
                    />
                  ) : null}

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

                  <UiDisclosure
                    title="Call brief"
                    subtitle="Recipient, path, and launch inputs"
                    open
                  >
                      <ul className="va-list va-list-dense">
                      {callBriefLines.map((line, index) => (
                        <li key={`call-brief-${index}-${line}`}>{line}</li>
                      ))}
                    </ul>
                  </UiDisclosure>

                  {scriptSummaryLines.length > 0 ? (
                    <UiDisclosure
                      title="Selected script"
                      subtitle={`${selectedScriptName || `Script #${effectiveScriptId}`}`}
                    >
                      {selectedScript && toTextValue(selectedScript.description) ? (
                        <p className="va-muted">{toTextValue(selectedScript.description)}</p>
                      ) : null}
                      <ul className="va-list va-list-dense">
                        {scriptSummaryLines.map((line, index) => (
                          <li key={`script-summary-${index}-${line}`}>{line}</li>
                        ))}
                      </ul>
                    </UiDisclosure>
                  ) : null}

                  {(resolvedScriptPromptValue || resolvedScriptFirstMessageValue) ? (
                    <UiDisclosure
                      title="Resolved script content"
                      subtitle="Final prompt content after variable replacement"
                    >
                      <ul className="va-list va-list-dense">
                        {resolvedScriptPromptValue ? <li>Prompt: {resolvedScriptPromptValue}</li> : null}
                        {resolvedScriptFirstMessageValue ? <li>First message: {resolvedScriptFirstMessageValue}</li> : null}
                      </ul>
                    </UiDisclosure>
                  ) : null}

                  {warningList.length > 0 ? (
                    <UiDisclosure
                      title="Warnings"
                      subtitle={`${warningList.length} item${warningList.length === 1 ? '' : 's'} to review`}
                      tone="warning"
                    >
                      <ul className="va-list va-list-dense">
                        {warningList.map((warning, index) => (
                          <li key={`warning-${index}-${warning}`}>{warning}</li>
                        ))}
                      </ul>
                    </UiDisclosure>
                  ) : null}
                </UiCard>
              </div>

              <UiActionBar
                title={actionBarTitle}
                description={actionBarDescription}
                actions={(
                  <>
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
                  </>
                )}
              />
            </Section>

            <Section
              header="Live call console"
              footer="This console stays attached to the active call SID after launch, restores that SID after Mini App refresh for the same Telegram session, can reattach to the latest still-active call for that session, and keeps polling the same call detail and call-status contracts used by the live operations console."
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
          footer="These shortcuts keep the call page connected to the rest of the available Mini App workflows."
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
              Admin console
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
  const [guidedActionHint, setGuidedActionHint] = useState<string>('');
  const [statusSnapshot, setStatusSnapshot] = useState<Record<string, unknown> | null>(null);
  const [recentMessages, setRecentMessages] = useState<Array<Record<string, unknown>>>([]);
  const [recentPage, setRecentPage] = useState<number>(1);
  const [recentLimit, setRecentLimit] = useState<number>(10);
  const [conversationMessages, setConversationMessages] = useState<Array<Record<string, unknown>>>([]);
  const [statsSnapshot, setStatsSnapshot] = useState<Record<string, unknown> | null>(null);
  const [bulkOperations, setBulkOperations] = useState<SmsCommandBulkStatusOperation[]>([]);
  const [bulkSummary, setBulkSummary] = useState<Record<string, unknown> | null>(null);
  const [providerSnapshot, setProviderSnapshot] = useState<Record<string, unknown> | null>(null);
  const [bulkJobIdInput, setBulkJobIdInput] = useState<string>('');

  const canOperate = accessLevel === 'authorized' || accessLevel === 'admin';
  const isAdminAccess = accessLevel === 'admin';
  const canManageProvider = hasCapability('provider_manage');
  const canUseSmsCore = canOperate;
  const canUseSmsAdminTools = isAdminAccess;
  const statusSid = statusSidInput.trim();
  const sendRecipient = normalizePhone(sendRecipientInput.trim());
  const sendRecipientValid = isValidE164(sendRecipient);
  const sendMessage = sendMessageInput.trim();
  const sendMessageLength = sendMessage.length;
  const sendMessageTooLong = sendMessageLength > SMS_MESSAGE_MAX_CHARS;
  const sendMessageSegmentEstimate = estimateSmsSegments(sendMessage);
  const sendProvider = sendProviderInput.trim();
  const normalizedConversationPhone = normalizePhone(conversationPhoneInput.trim());
  const conversationPhoneValid = isValidE164(normalizedConversationPhone);
  const bulkJobId = bulkJobIdInput.trim();
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
  const smsComposerReady = sendRecipientValid && Boolean(sendMessage) && !sendMessageTooLong && canUseSmsCore;
  const recentCanGoPrev = recentPage > 1;
  const recentHasFullPage = recentMessages.length >= recentLimit;
  const recentCanGoNext = recentHasFullPage;
  const callbackPlaceholder = canUseSmsAdminTools ? 'SMS_SEND or SMS_RECENT_PAGE:2' : 'SMS_SEND or SMS_STATUS';
  const scheduleInputProvided = sendScheduleAtInput.trim().length > 0;
  const scheduleCandidateMs = scheduleInputProvided ? Date.parse(sendScheduleAtInput) : Number.NaN;
  const scheduleValidationError = scheduleInputProvided
    ? (Number.isNaN(scheduleCandidateMs)
      ? 'Scheduled time is invalid.'
      : (scheduleCandidateMs <= Date.now() ? 'Scheduled time must be in the future.' : ''))
    : '';
  const visibleSmsCallbackRows = SMS_CALLBACK_PARITY_ROWS.filter((row) => {
    const { baseAction } = parseCallbackToken(row.callbackAction);
    if (baseAction === 'SMS_SEND' || baseAction === 'SMS_SCHEDULE' || baseAction === 'SMS_STATUS') {
      return canUseSmsCore;
    }
    if (baseAction === 'BULK_SMS_PRECHECK') {
      return canManageProvider;
    }
    return canUseSmsAdminTools;
  });
  const smsActionBarTitle = sendResult
    ? 'SMS request accepted'
    : (smsComposerReady ? 'Ready to send' : 'Complete send details');
  const smsActionBarDescription = sendResult
    ? sendResult
    : (smsComposerReady
      ? `Send now to ${sendRecipient}. Scheduling is ${scheduleInputProvided
        ? (scheduleValidationError ? 'waiting for a valid future time' : 'available')
        : 'waiting for a send time'}.`
        : (!canUseSmsCore
        ? 'Authorized access is required for SMS actions.'
        : (!sendRecipientValid
          ? 'Add a valid E.164 recipient before sending.'
          : (sendMessageTooLong
            ? `Message exceeds ${SMS_MESSAGE_MAX_CHARS} characters. Shorten it before sending.`
            : 'Add a message body before sending.'))));

  const resolveScheduledIso = (): { iso: string | null; error: string | null } => {
    const scheduledAtMs = Date.parse(sendScheduleAtInput);
    if (Number.isNaN(scheduledAtMs)) {
      return { iso: null, error: 'Scheduled time is invalid.' };
    }
    if (scheduledAtMs <= Date.now()) {
      return { iso: null, error: 'Scheduled time must be in the future.' };
    }
    return { iso: new Date(scheduledAtMs).toISOString(), error: null };
  };

  const runSendNow = async (): Promise<void> => {
    if (!sendRecipientValid || !sendMessage || !canUseSmsCore) return;
    if (sendMessageTooLong) {
      setActionError(`SMS message exceeds ${SMS_MESSAGE_MAX_CHARS} characters. Shorten the message before sending.`);
      return;
    }
    setGuidedActionHint('');
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
    if (!sendRecipientValid || !sendMessage || !sendScheduleAtInput || !canUseSmsCore) return;
    if (sendMessageTooLong) {
      setActionError(`SMS message exceeds ${SMS_MESSAGE_MAX_CHARS} characters. Shorten the message before scheduling.`);
      return;
    }
    setGuidedActionHint('');
    const scheduleResolution = resolveScheduledIso();
    if (!scheduleResolution.iso || scheduleResolution.error) {
      setActionError(scheduleResolution.error ?? 'Scheduled time is invalid.');
      return;
    }
    const scheduledIso = scheduleResolution.iso;
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
    if (!statusSid || !canUseSmsCore) return;
    setGuidedActionHint('');
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
    if (!conversationPhoneValid || !canUseSmsAdminTools) return;
    setGuidedActionHint('');
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

  const runRecentLookup = async (options: { page?: number; limit?: number } = {}): Promise<void> => {
    if (!canUseSmsAdminTools) return;
    const page = Math.max(1, Math.trunc(options.page ?? recentPage) || 1);
    const limit = Math.max(1, Math.min(20, Math.trunc(options.limit ?? recentLimit) || 10));
    setGuidedActionHint('');
    setRecentBusy(true);
    setActionError('');
    try {
      const payload = await invokeAction<SmsCommandMessagesResponse>(
        DASHBOARD_ACTION_CONTRACTS.SMS_MESSAGES_RECENT,
        { limit, offset: (page - 1) * limit },
      );
      setRecentMessages(toEventRows(payload?.messages));
      setRecentPage(page);
      setRecentLimit(limit);
    } catch (nextError) {
      setActionError(toErrorMessage(nextError));
    } finally {
      setRecentBusy(false);
    }
  };

  const runStatsLookup = async (): Promise<void> => {
    if (!canUseSmsAdminTools) return;
    setGuidedActionHint('');
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
    if (!canUseSmsAdminTools) return;
    setGuidedActionHint('');
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
    setGuidedActionHint('');
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
    if ((!canUseSmsCore && !canManageProvider) || activeBusy) return;
    const rawCallbackAction = rawCallbackActionInput.trim();
    const { baseAction, suffix } = parseCallbackToken(rawCallbackAction);
    if (!baseAction) {
      setActionError('Callback action is required.');
      setCallbackResult('');
      return;
    }
    const actionResolution = resolveDashboardAction(rawCallbackAction);
    if (!actionResolution.actionId || !actionResolution.supported) {
      setActionError(`Unsupported callback action "${rawCallbackAction}" recovered safely. Use the admin console or refresh the command session.`);
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
      setGuidedActionHint('');
      setActionError('');
      setCallbackResult('');
      let callbackSummary = `Executed callback ${rawCallbackAction} -> ${actionResolution.actionId}.`;
      if (baseAction === 'SMS_SEND') {
        if (!canUseSmsCore) {
          setActionError('SMS_SEND requires authorized access.');
          return;
        }
        if (!sendRecipientValid || !sendMessage) {
          setActionError('SMS_SEND callback requires a valid recipient and message body. Fill the single-recipient form first.');
          return;
        }
        if (sendMessageTooLong) {
          setActionError(`SMS_SEND callback rejected: message exceeds ${SMS_MESSAGE_MAX_CHARS} characters.`);
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
        if (!canUseSmsCore) {
          setActionError('SMS_SCHEDULE requires authorized access.');
          return;
        }
        if (!sendRecipientValid || !sendMessage || !sendScheduleAtInput) {
          setActionError('SMS_SCHEDULE callback requires recipient, message, and schedule timestamp. Fill the scheduling fields first.');
          return;
        }
        if (sendMessageTooLong) {
          setActionError(`SMS_SCHEDULE callback rejected: message exceeds ${SMS_MESSAGE_MAX_CHARS} characters.`);
          return;
        }
        const scheduleResolution = resolveScheduledIso();
        if (!scheduleResolution.iso || scheduleResolution.error) {
          setActionError(scheduleResolution.error ?? 'Scheduled time is invalid.');
          return;
        }
        await invokeAction(rawCallbackAction, {
          to: sendRecipient,
          message: sendMessage,
          scheduled_time: scheduleResolution.iso,
          provider: sendProvider || undefined,
          options: { durable: true },
        });
        callbackSummary = `Executed callback ${rawCallbackAction} -> ${actionResolution.actionId}. Scheduled current SMS payload.`;
      } else if (baseAction === 'SMS_STATUS') {
        if (!canUseSmsCore) {
          setActionError('SMS_STATUS requires authorized access.');
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
        if (!canUseSmsAdminTools) {
          setActionError('SMS_CONVO requires admin access.');
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
        if (!canUseSmsAdminTools) {
          setActionError('SMS_RECENT_PAGE requires admin access.');
          return;
        }
        callbackRecentBusy = true;
        setRecentBusy(true);
        const page = Math.max(1, toInt(suffix, 1));
        const limit = Math.max(1, Math.min(20, Math.trunc(recentLimit) || 10));
        const payload = await invokeAction<SmsCommandMessagesResponse>(
          rawCallbackAction,
          { limit, offset: (page - 1) * limit },
        );
        const messages = toEventRows(payload?.messages);
        setRecentMessages(messages);
        setRecentPage(page);
        setRecentLimit(limit);
        callbackSummary = `Executed callback ${rawCallbackAction} -> ${actionResolution.actionId}. Loaded ${messages.length} recent message(s) from page ${page}.`;
      } else if (baseAction === 'SMS_RECENT') {
        if (!canUseSmsAdminTools) {
          setActionError('SMS_RECENT requires admin access.');
          return;
        }
        callbackRecentBusy = true;
        setRecentBusy(true);
        const page = 1;
        const limit = Math.max(1, Math.min(20, Math.trunc(recentLimit) || 10));
        const payload = await invokeAction<SmsCommandMessagesResponse>(
          rawCallbackAction,
          { limit, offset: (page - 1) * limit },
        );
        const messages = toEventRows(payload?.messages);
        setRecentMessages(messages);
        setRecentPage(page);
        setRecentLimit(limit);
        callbackSummary = `Executed callback ${rawCallbackAction} -> ${actionResolution.actionId}. Loaded ${messages.length} recent message(s).`;
      } else if (baseAction === 'SMS_STATS') {
        if (!canUseSmsAdminTools) {
          setActionError('SMS_STATS requires admin access.');
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
        if (!canUseSmsAdminTools) {
          setActionError(`${baseAction} requires admin access.`);
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
    const { baseAction } = parseCallbackToken(rawCallbackAction);
    if (baseAction === 'SMS_SEND') {
      setActionError('');
      setCallbackResult('');
      setGuidedActionHint('Send flow is staged. Fill recipient and message, then select Send Now.');
      return;
    }
    if (baseAction === 'SMS_SCHEDULE') {
      setActionError('');
      setCallbackResult('');
      setGuidedActionHint('Schedule flow is staged. Add recipient, message, and a future schedule time, then select Schedule.');
      return;
    }
    if (baseAction === 'SMS_STATUS' && !statusSid) {
      setActionError('');
      setCallbackResult('');
      setGuidedActionHint('Delivery status flow is staged. Enter a message SID first, then select Check Status.');
      return;
    }
    if (baseAction === 'SMS_CONVO' && !conversationPhoneValid) {
      setActionError('');
      setCallbackResult('');
      setGuidedActionHint('Conversation flow is staged. Enter a valid E.164 phone first, then select Load Conversation.');
      return;
    }
    setGuidedActionHint('');
    await executeCallbackAction(rawCallbackAction);
  };

  const openGuidedSmsRoute = (path: string): void => {
    setActionError('');
    setCallbackResult('');
    setGuidedActionHint('');
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
            subtitle={error ? `Session needs attention. ${error}` : 'SMS workspace is ready.'}
            after={<Navigation>{error ? 'Retry' : 'Ready'}</Navigation>}
            onClick={() => {
              void reload();
            }}
          >
            Session status
          </Cell>
          {errorCode ? (
            <Cell subtitle="Latest session issue code">
              {errorCode}
            </Cell>
          ) : null}
        </Section>

        {!canOperate ? (
          <Section
            header="Access required"
            footer="SMS execution is restricted to authorized users. The Mini App enforces the same rule."
          >
            <UiStatePanel
              title="Authorized access required"
              description="Request access from an admin or use Help and Guide for non-execution guidance."
              tone="warning"
            />
          </Section>
        ) : (
          <Section
            header="SMS command workflows"
            footer="This page executes SMS diagnostics through shared action contracts while keeping bulk sends in the dedicated sender workspace."
          >
            <div className="va-grid">
              <UiCard>
                <p className="va-card-eyebrow">Workspace overview</p>
                <div className={`va-overview-metrics ${actionReadyCount > 0 || sendResult ? 'is-healthy' : 'is-degraded'}`}>
                  <UiMetricTile label="Access" value={isAdminAccess ? 'Admin' : 'Authorized'} />
                  <UiMetricTile label="Composer" value={smsComposerReady ? 'Ready' : 'Needs input'} />
                  <UiMetricTile label="Diagnostics" value={actionReadyCount > 0 ? `${actionReadyCount} loaded` : 'Idle'} />
                  <UiMetricTile label="Activity" value={activeBusy ? 'Working' : (sendResult ? 'Queued' : 'Standing by')} />
                </div>
                <p className="va-muted">
                  Send one message, inspect delivery state, or move into script and bulk tools without leaving this page.
                </p>
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
                {guidedActionHint ? (
                  <UiStatePanel
                    compact
                    title="Guided action staged"
                    description={guidedActionHint}
                    tone="info"
                  />
                ) : null}
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
                    variant="secondary"
                    disabled={activeBusy}
                    onClick={() => {
                      openGuidedSmsRoute(MINIAPP_COMMAND_ROUTE_CONTRACTS.SCRIPTS);
                    }}
                  >
                    Script Workflows
                  </UiButton>
                  <UiButton
                    variant="plain"
                    disabled={activeBusy}
                    onClick={() => {
                      openGuidedSmsRoute(MINIAPP_COMMAND_ROUTE_CONTRACTS.MENU);
                    }}
                  >
                    All Workflows
                  </UiButton>
                </div>
                <UiStatePanel
                  compact
                  title={isAdminAccess ? 'Admin tools are included' : 'Admin-only tools are hidden'}
                  description={isAdminAccess
                    ? 'Conversation, Recent SMS, SMS Stats, and the bulk sender handoff remain visible because this session has admin access.'
                    : 'Conversation, Recent SMS, SMS Stats, and the bulk sender handoff stay hidden until admin access is present.'}
                  tone="info"
                />
                <UiStatePanel
                  compact
                  title="Form-backed workflow execution"
                  description="This page runs the same backend action family by using the input fields below as the structured workflow payload."
                  tone="info"
                />
                <UiDisclosure
                  title="Operational notes"
                  subtitle="Action routing, bulk handoff, and parity coverage"
                >
                  <ul className="va-list va-list-dense">
                    <li>Single-recipient send and schedule use the same backend SMS action family as the wider admin console.</li>
                    <li>
                      {isAdminAccess
                        ? 'Conversation, recent activity, stats, and the sender handoff stay available in this session.'
                        : 'Conversation, recent activity, stats, and the sender handoff remain hidden until admin access is present.'}
                    </li>
                    <li>Direct callback execution remains available below for structured parity checks when needed.</li>
                  </ul>
                </UiDisclosure>
              </UiCard>

              <UiCard>
                <p className="va-card-eyebrow">Single-recipient send</p>
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
                {sendMessage ? (
                  <UiStatePanel
                    compact
                    title={sendMessageTooLong ? 'Message length exceeds SMS limit' : 'SMS payload estimate'}
                    description={sendMessageTooLong
                      ? `Length ${sendMessageLength}/${SMS_MESSAGE_MAX_CHARS}. Reduce the message before sending or scheduling.`
                      : `Length ${sendMessageLength}/${SMS_MESSAGE_MAX_CHARS}. Estimated ${sendMessageSegmentEstimate.segments} segment(s) at ${sendMessageSegmentEstimate.perSegment} chars/segment.`}
                    tone={sendMessageTooLong ? 'warning' : 'info'}
                  />
                ) : null}
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
                {!sendRecipientValid && sendRecipientInput.trim() ? (
                  <UiStatePanel
                    compact
                    title="Recipient phone format required"
                    description="Use E.164 format with the + prefix and country code, for example +18005551234."
                    tone="warning"
                  />
                ) : null}
                {scheduleValidationError ? (
                  <UiStatePanel
                    compact
                    title="Schedule time needs correction"
                    description={scheduleValidationError}
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
                {!canUseSmsAdminTools ? (
                  <UiStatePanel
                    compact
                    title="Admin diagnostics hidden"
                    description="Conversation, recent messages, stats, and bulk job views are available only in admin sessions."
                    tone="warning"
                  />
                ) : null}

                <UiActionBar
                  title={smsActionBarTitle}
                  description={smsActionBarDescription}
                  actions={(
                    <>
                      <UiButton
                        variant="primary"
                        disabled={!sendRecipientValid || !sendMessage || sendMessageTooLong || !canUseSmsCore || activeBusy}
                        onClick={() => {
                          void runSendNow();
                        }}
                      >
                        {sendBusy ? 'Submitting...' : 'Send Now'}
                      </UiButton>
                      <UiButton
                        variant="secondary"
                        disabled={!sendRecipientValid || !sendMessage || sendMessageTooLong || !sendScheduleAtInput || Boolean(scheduleValidationError) || !canUseSmsCore || activeBusy}
                        onClick={() => {
                          void runSchedule();
                        }}
                      >
                        {sendBusy ? 'Submitting...' : 'Schedule'}
                      </UiButton>
                    </>
                  )}
                />

                <UiDisclosure
                  title="Direct action testing"
                  subtitle="Run structured callback actions against the current inputs"
                >
                  <UiInput
                    aria-label="SMS callback action"
                    placeholder={callbackPlaceholder}
                    value={callbackActionInput}
                    onChange={(event) => setCallbackActionInput(event.target.value)}
                  />
                  <div className="va-inline-tools">
                    <UiButton
                      variant="secondary"
                      disabled={(!canUseSmsCore && !canManageProvider) || activeBusy}
                      onClick={() => {
                        void runCallbackAction();
                      }}
                    >
                      Run Callback Action
                    </UiButton>
                  </div>
                  <ul className="va-list va-list-dense">
                    {visibleSmsCallbackRows.map((row) => (
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
                </UiDisclosure>

                <UiDisclosure
                  title="Status and conversation tools"
                  subtitle="Inspect one message or load a conversation thread"
                >
                  <div className="va-inline-tools">
                    <UiInput
                      aria-label="SMS message SID"
                      placeholder="Message SID"
                      value={statusSidInput}
                      onChange={(event) => setStatusSidInput(event.target.value)}
                    />
                    <UiButton
                      variant="secondary"
                      disabled={!statusSid || !canUseSmsCore || activeBusy}
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
                      disabled={!conversationPhoneValid || !canUseSmsAdminTools || activeBusy}
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
                  {!canUseSmsAdminTools ? (
                    <UiStatePanel
                      compact
                      title="Conversation lookup requires admin access"
                      description="Use SMS status with a message SID in authorized sessions, or switch to an admin session for full conversation history."
                      tone="info"
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
                </UiDisclosure>
              </UiCard>

              <UiCard>
                <p className="va-card-eyebrow">Diagnostics and history</p>
                <div className="va-inline-metrics">
                  <UiBadge>{providerSnapshot ? 'Provider loaded' : 'Provider idle'}</UiBadge>
                  <UiBadge>{recentMessages.length > 0 ? `Recent ${recentMessages.length}` : 'Recent idle'}</UiBadge>
                  <UiBadge>{statsSnapshot ? 'Stats loaded' : 'Stats idle'}</UiBadge>
                  <UiBadge>{bulkOperations.length > 0 ? `Bulk ${bulkOperations.length}` : 'Bulk idle'}</UiBadge>
                </div>
                <div className="va-inline-tools">
                  <UiSelect
                    aria-label="Recent SMS count"
                    value={String(recentLimit)}
                    onChange={(event) => {
                      const nextLimit = Math.max(1, Math.min(20, toInt(event.target.value, 10)));
                      setRecentLimit(nextLimit);
                      setRecentPage(1);
                      if (canUseSmsAdminTools && !activeBusy) {
                        void runRecentLookup({ page: 1, limit: nextLimit });
                      }
                    }}
                  >
                    <option value="5">5 / page</option>
                    <option value="10">10 / page</option>
                    <option value="20">20 / page</option>
                  </UiSelect>
                  <UiButton
                    variant="secondary"
                    disabled={!canUseSmsAdminTools || activeBusy}
                    onClick={() => {
                      void runRecentLookup();
                    }}
                  >
                    {recentBusy ? 'Loading...' : 'Load Recent'}
                  </UiButton>
                  <UiButton
                    variant="secondary"
                    disabled={!canUseSmsAdminTools || activeBusy}
                    onClick={() => {
                      void runStatsLookup();
                    }}
                  >
                    {statsBusy ? 'Loading...' : 'Load Stats'}
                  </UiButton>
                  <UiButton
                    variant="secondary"
                    disabled={!canUseSmsAdminTools || activeBusy}
                    onClick={() => {
                      void runBulkStatusLookup();
                    }}
                  >
                    {bulkBusy ? 'Loading...' : 'Load Bulk Jobs'}
                  </UiButton>
                </div>
                <div className="va-inline-tools">
                  <UiButton
                    variant="plain"
                    disabled={!canUseSmsAdminTools || activeBusy || !recentCanGoPrev}
                    onClick={() => {
                      void runRecentLookup({ page: Math.max(1, recentPage - 1) });
                    }}
                  >
                    Prev Page
                  </UiButton>
                  <UiButton
                    variant="plain"
                    disabled={!canUseSmsAdminTools || activeBusy}
                    onClick={() => {
                      void runRecentLookup();
                    }}
                  >
                    Refresh Page {recentPage}
                  </UiButton>
                  <UiButton
                    variant="plain"
                    disabled={!canUseSmsAdminTools || activeBusy || !recentCanGoNext}
                    onClick={() => {
                      void runRecentLookup({ page: recentPage + 1 });
                    }}
                  >
                    Next Page
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
                      setRecentPage(1);
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

                {providerSnapshot ? (
                  <UiDisclosure
                    title="Provider readiness"
                    subtitle={providerSnapshot.ready === true ? 'Ready for SMS delivery' : 'Configuration needs attention'}
                    open
                  >
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
                  </UiDisclosure>
                ) : null}

                {recentMessages.length > 0 ? (
                  <UiDisclosure
                    title="Recent messages"
                    subtitle={`${recentMessages.length} item${recentMessages.length === 1 ? '' : 's'} loaded | page ${recentPage} | limit ${recentLimit}`}
                  >
                    <ul className="va-list va-list-dense">
                      {recentMessages.slice(0, 6).map((message, index) => (
                        <li key={`${toText(message.message_sid, toText(message.sid, 'sms'))}-${index}`}>
                          {summarizeSmsMessage(message)}
                        </li>
                      ))}
                    </ul>
                  </UiDisclosure>
                ) : null}

                {conversationMessages.length > 0 ? (
                  <UiDisclosure
                    title="Conversation snapshot"
                    subtitle={`${conversationMessages.length} item${conversationMessages.length === 1 ? '' : 's'} loaded`}
                  >
                    <ul className="va-list va-list-dense">
                      {conversationMessages.slice(0, 6).map((message, index) => (
                        <li key={`${toText(message.message_sid, toText(message.sid, 'convo'))}-${index}`}>
                          {summarizeSmsMessage(message)}
                        </li>
                      ))}
                    </ul>
                  </UiDisclosure>
                ) : null}

                {statsSnapshot ? (
                  <UiDisclosure
                    title="Message stats"
                    subtitle="24-hour delivery snapshot"
                  >
                    <ul className="va-list va-list-dense">
                      <li>Total: {toInt(statsSnapshot.total_messages ?? statsSnapshot.total, 0)}</li>
                      <li>Sent: {toInt(statsSnapshot.sent_messages, 0)}</li>
                      <li>Received: {toInt(statsSnapshot.received_messages, 0)}</li>
                      <li>Delivered: {toInt(statsSnapshot.delivered_count, 0)}</li>
                      <li>Failed: {toInt(statsSnapshot.failed_count, 0)}</li>
                      <li>Success rate: {toText(statsSnapshot.success_rate, '0')}%</li>
                    </ul>
                  </UiDisclosure>
                ) : null}

                {bulkSummary ? (
                  <UiDisclosure
                    title="Bulk summary"
                    subtitle="Recent bulk SMS performance"
                    open
                  >
                    <UiStatePanel
                      compact
                      title="Bulk SMS summary"
                      description={summarizeBulkSmsStats(bulkSummary)}
                      tone="info"
                    />
                  </UiDisclosure>
                ) : null}

                {bulkOperations.length > 0 ? (
                  <UiDisclosure
                    title="Bulk jobs"
                    subtitle={`${bulkOperations.length} job${bulkOperations.length === 1 ? '' : 's'} loaded`}
                  >
                    <ul className="va-list va-list-dense">
                      {bulkOperations.slice(0, 6).map((operation, index) => (
                        <li key={`${toText(operation.id, 'bulk-sms')}-${index}`}>
                          {summarizeBulkSmsOperation(operation)}
                        </li>
                      ))}
                    </ul>
                  </UiDisclosure>
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
            <Cell subtitle="How many workflow panels currently hold data in this session.">
              Loaded slices: {actionReadyCount}
            </Cell>
          </Section>
        ) : null}

        <Section
          header="Quick actions"
          footer="These shortcuts keep the SMS page connected to the rest of the available Mini App workflows."
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
              Admin console
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
  const emailComposerReady = sendRecipientValid && sendHasContent && canManageEmail;
  const emailActionBarTitle = sendResult
    ? 'Email request accepted'
    : (emailComposerReady ? 'Ready to send' : 'Complete send details');
  const emailActionBarDescription = sendResult
    ? sendResult
    : (emailComposerReady
      ? `Send now to ${sendRecipient}. Scheduling is ${sendScheduleAtInput ? 'available' : 'waiting for a send time'}.`
      : (!canManageEmail
        ? 'Email bulk management capability is required for send and diagnostics actions.'
        : (!sendRecipientValid
          ? 'Add a valid recipient email before sending.'
          : 'Provide a template ID or message content before sending.')));

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
      setActionError(`Unsupported callback action "${rawCallbackAction}" recovered safely. Use the admin console or refresh the command session.`);
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
            subtitle={error ? `Session needs attention. ${error}` : 'Email workspace is ready.'}
            after={<Navigation>{error ? 'Retry' : 'Ready'}</Navigation>}
            onClick={() => {
              void reload();
            }}
          >
            Session status
          </Cell>
          {errorCode ? (
            <Cell subtitle="Latest session issue code">
              {errorCode}
            </Cell>
          ) : null}
        </Section>

        {!canOperate ? (
          <Section
            header="Access required"
            footer="Email execution is restricted to authorized users. The Mini App enforces the same rule."
          >
            <UiStatePanel
              title="Authorized access required"
              description="Request access from an admin or use Help and Guide for non-execution guidance."
              tone="warning"
            />
          </Section>
        ) : (
          <Section
            header="Email command workflows"
            footer="This page executes send, preview, status, template, and history actions through the existing backend contracts."
          >
            <div className="va-grid">
              <UiCard>
                <p className="va-card-eyebrow">Workspace overview</p>
                <div className={`va-overview-metrics ${actionReadyCount > 0 || sendResult ? 'is-healthy' : 'is-degraded'}`}>
                  <UiMetricTile label="Composer" value={emailComposerReady ? 'Ready' : 'Needs input'} />
                  <UiMetricTile label="Preview" value={previewSnapshot ? 'Loaded' : 'Idle'} />
                  <UiMetricTile label="Diagnostics" value={actionReadyCount > 0 ? `${actionReadyCount} loaded` : 'Idle'} />
                </div>
                <Text>
                  Work from one focused email workspace for sends, previews, status checks, and bulk delivery visibility.
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
                    All Workflows
                  </UiButton>
                </div>
                <UiStatePanel
                  compact
                  title="Authorized access controls execution"
                  description="Email actions only run for authorized users. This page keeps the same gate before any send, preview, or diagnostics workflow runs."
                  tone="info"
                />
                <UiStatePanel
                  compact
                  title={canManageProvider ? 'Provider checks are available' : 'Provider checks stay gated'}
                  description={canManageProvider
                    ? 'Provider readiness checks can run here without leaving the current workspace.'
                    : 'Provider readiness checks remain hidden until provider management capability is present.'}
                  tone="info"
                />
                <UiDisclosure
                  title="Operational notes"
                  subtitle="Execution scope, preview support, and bulk handoff"
                >
                  <ul className="va-list va-list-dense">
                    <li>Single-recipient send and schedule use the same backend email action family as the wider admin console.</li>
                    <li>Template preview uses the current template ID and merge-field JSON from the compose form below.</li>
                    <li>Bulk Mailer remains the handoff for dedicated bulk operations, while this page stays optimized for focused sends and inspection.</li>
                  </ul>
                </UiDisclosure>
              </UiCard>

              <UiCard>
                <p className="va-card-eyebrow">Single-recipient send</p>
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
                  aria-label="Template ID"
                  placeholder="Template / Script ID (optional)"
                  value={templateIdInput}
                  onChange={(event) => setTemplateIdInput(event.target.value)}
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
                <UiTextarea
                  aria-label="Template variables JSON"
                  placeholder='{"first_name":"Alex"}'
                  rows={4}
                  value={previewVariablesInput}
                  onChange={(event) => setPreviewVariablesInput(event.target.value)}
                />
                <UiInput
                  aria-label="Schedule email at"
                  type="datetime-local"
                  value={sendScheduleAtInput}
                  onChange={(event) => setSendScheduleAtInput(event.target.value)}
                />
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
                {!canManageEmail ? (
                  <UiStatePanel
                    compact
                    title="Email actions unavailable"
                    description="Your account needs email bulk management capability to run these execution actions in the Mini App."
                    tone="warning"
                  />
                ) : null}

                <UiActionBar
                  title={emailActionBarTitle}
                  description={emailActionBarDescription}
                  actions={(
                    <>
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
                    </>
                  )}
                />

                <UiDisclosure
                  title="Direct action testing"
                  subtitle="Run structured callback actions against the current compose inputs"
                >
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
                </UiDisclosure>

                <UiDisclosure
                  title="Template preview"
                  subtitle="Render the current template and merge fields before sending"
                >
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
                  ) : (
                    <UiStatePanel
                      compact
                      title="No preview loaded"
                      description="Set a template ID and merge fields, then preview the rendered email before sending."
                      tone="info"
                    />
                  )}
                </UiDisclosure>
              </UiCard>

              <UiCard>
                <p className="va-card-eyebrow">Diagnostics and history</p>
                <div className="va-inline-metrics">
                  <UiBadge>{messageSnapshot ? 'Status loaded' : 'Status idle'}</UiBadge>
                  <UiBadge>{providerSnapshot ? 'Provider loaded' : 'Provider idle'}</UiBadge>
                  <UiBadge>{historyRows.length > 0 ? `History ${historyRows.length}` : 'History idle'}</UiBadge>
                  <UiBadge>{templateRows.length > 0 ? `Templates ${templateRows.length}` : 'Templates idle'}</UiBadge>
                </div>
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
                  <UiButton
                    variant="secondary"
                    disabled={!canManageEmail || activeBusy}
                    onClick={() => {
                      void runGuidedEmailMenuAction('EMAIL_TEMPLATES');
                    }}
                  >
                    {templatesBusy ? 'Loading...' : 'Load Templates'}
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

                {!messageSnapshot && !bulkJobSnapshot && historyRows.length === 0 && templateRows.length === 0 && !statsSnapshot ? (
                  <UiStatePanel
                    compact
                    title="No email diagnostics loaded"
                    description="Run status/timeline, bulk job, templates, history, or stats actions to populate diagnostics."
                    tone="info"
                  />
                ) : null}

                {messageSnapshot ? (
                  <UiDisclosure
                    title="Message status"
                    subtitle={messageStatus || 'Delivery state snapshot'}
                    open
                  >
                    <ul className="va-list va-list-dense">
                      <li>Status: {messageStatus || 'unknown'}</li>
                      <li>Provider: {messageProvider || 'unknown'}</li>
                      <li>To: {messageTo || 'n/a'}</li>
                      <li>Script: {messageScriptId || 'n/a'}</li>
                      <li>Created: {messageCreatedAt || 'n/a'}</li>
                      <li>Events: {messageEvents.length}</li>
                    </ul>
                    {messageEvents.length > 0 ? (
                      <UiStatePanel
                        compact
                        title="Recent message event"
                        description={toJsonText(messageEvents[0])}
                        tone="info"
                      />
                    ) : null}
                  </UiDisclosure>
                ) : null}

                {bulkJobSnapshot ? (
                  <UiDisclosure
                    title="Bulk job snapshot"
                    subtitle={toText(bulkJobSnapshot.status, 'unknown')}
                    open
                  >
                    <ul className="va-list va-list-dense">
                      <li>Job ID: {toText(bulkJobSnapshot.job_id, toText(bulkJobSnapshot.id, 'n/a'))}</li>
                      <li>Status: {toText(bulkJobSnapshot.status, 'unknown')}</li>
                      <li>Provider: {toText(bulkJobSnapshot.provider, 'unknown')}</li>
                      <li>Recipients: {toInt(bulkJobSnapshot.recipient_count, 0)}</li>
                      <li>Sent: {toInt(bulkJobSnapshot.sent_count, 0)}</li>
                      <li>Failed: {toInt(bulkJobSnapshot.failed_count, 0)}</li>
                    </ul>
                  </UiDisclosure>
                ) : null}

                {providerSnapshot ? (
                  <UiDisclosure
                    title="Provider readiness"
                    subtitle={providerSnapshot.ready === true ? 'Ready for email delivery' : 'Configuration needs attention'}
                  >
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
                  </UiDisclosure>
                ) : null}

                {historyRows.length > 0 ? (
                  <UiDisclosure
                    title="Recent bulk jobs"
                    subtitle={`${historyRows.length} job${historyRows.length === 1 ? '' : 's'} loaded`}
                  >
                    <ul className="va-list va-list-dense">
                      {historyRows.slice(0, 6).map((job) => (
                        <li key={toTextValue(job.job_id, summarizeEmailJob(job))}>
                          {summarizeEmailJob(job)}
                        </li>
                      ))}
                    </ul>
                  </UiDisclosure>
                ) : null}

                {statsSnapshot ? (
                  <UiDisclosure
                    title="Bulk stats"
                    subtitle="24-hour delivery snapshot"
                  >
                    <ul className="va-list va-list-dense">
                      <li>{summarizeEmailBulkStats(statsSnapshot)}</li>
                    </ul>
                  </UiDisclosure>
                ) : null}

                {templateRows.length > 0 ? (
                  <UiDisclosure
                    title="Template catalog"
                    subtitle={`${templateRows.length} template${templateRows.length === 1 ? '' : 's'} loaded`}
                  >
                    <ul className="va-list va-list-dense">
                      {templateRows.slice(0, 6).map((template) => (
                        <li key={toTextValue(template.template_id, toTextValue(template.id, summarizeEmailTemplate(template)))}>
                          {summarizeEmailTemplate(template)}
                        </li>
                      ))}
                    </ul>
                  </UiDisclosure>
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
            <Cell subtitle="How many workflow panels currently hold data in this session.">
              Loaded slices: {actionReadyCount}
            </Cell>
          </Section>
        ) : null}

        <Section
          header="Quick actions"
          footer="These shortcuts keep the email page connected to the rest of the available Mini App workflows."
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
              Admin console
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
