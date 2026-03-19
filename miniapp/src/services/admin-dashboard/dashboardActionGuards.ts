import { toText } from '@/services/admin-dashboard/dashboardPrimitives';

function isNonEmptyString(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function validateProviderAction(payload: Record<string, unknown>): string | null {
  if (!isNonEmptyString(payload.channel)) return 'channel is required';
  if (!isNonEmptyString(payload.provider)) return 'provider is required';
  return null;
}

function validateSmsBulkSend(payload: Record<string, unknown>): string | null {
  const recipients = payload.recipients;
  if (!isStringArray(recipients) || recipients.length === 0) {
    return 'recipients must be a non-empty string array';
  }
  if (!isNonEmptyString(payload.message)) return 'message is required';
  return null;
}

function validateSmsScheduleSend(payload: Record<string, unknown>): string | null {
  if (!isNonEmptyString(payload.to)) return 'to is required';
  if (!isNonEmptyString(payload.message)) return 'message is required';
  if (!isNonEmptyString(payload.scheduled_time)) return 'scheduled_time is required';
  return null;
}

function validateEmailBulkSend(payload: Record<string, unknown>): string | null {
  if (!Array.isArray(payload.recipients) || payload.recipients.length === 0) {
    return 'recipients must be a non-empty array';
  }
  if (
    payload.script_id === undefined
    && payload.subject === undefined
    && payload.html === undefined
    && payload.text === undefined
  ) {
    return 'provide script_id or subject/html/text content';
  }
  return null;
}

function validateUserRoleSet(payload: Record<string, unknown>): string | null {
  if (!isNonEmptyString(payload.telegram_id)) return 'telegram_id is required';
  const role = toText(payload.role, '').toLowerCase();
  if (!['admin', 'operator', 'viewer'].includes(role)) {
    return 'role must be admin, operator, or viewer';
  }
  if (!isNonEmptyString(payload.reason)) return 'reason is required';
  return null;
}

function validateCallScriptIdPayload(payload: Record<string, unknown>): string | null {
  const id = Number(payload.id);
  if (!Number.isFinite(id) || id <= 0) return 'id must be a positive number';
  return null;
}

function validateCallerFlagsUpsert(payload: Record<string, unknown>): string | null {
  if (!isNonEmptyString(payload.phone_number) && !isNonEmptyString(payload.phoneNumber) && !isNonEmptyString(payload.phone)) {
    return 'phone_number is required';
  }
  const status = toText(payload.status, '').toLowerCase();
  if (!['allowed', 'blocked', 'spam'].includes(status)) {
    return 'status must be allowed, blocked, or spam';
  }
  return null;
}

function validateSmsScriptCreate(payload: Record<string, unknown>): string | null {
  if (!isNonEmptyString(payload.name)) return 'name is required';
  if (!isNonEmptyString(payload.content)) return 'content is required';
  return null;
}

function validateSmsScriptUpdate(payload: Record<string, unknown>): string | null {
  if (!isNonEmptyString(payload.script_name) && !isNonEmptyString(payload.scriptName) && !isNonEmptyString(payload.id)) {
    return 'script_name is required';
  }
  if (
    payload.description === undefined
    && payload.content === undefined
    && payload.metadata === undefined
  ) {
    return 'at least one update field is required';
  }
  return null;
}

function validateEmailTemplateCreate(payload: Record<string, unknown>): string | null {
  if (!isNonEmptyString(payload.template_id) && !isNonEmptyString(payload.templateId)) {
    return 'template_id is required';
  }
  if (!isNonEmptyString(payload.subject)) return 'subject is required';
  if (!isNonEmptyString(payload.html) && !isNonEmptyString(payload.text)) {
    return 'html or text is required';
  }
  return null;
}

function validateEmailTemplateUpdate(payload: Record<string, unknown>): string | null {
  if (!isNonEmptyString(payload.template_id) && !isNonEmptyString(payload.templateId) && !isNonEmptyString(payload.id)) {
    return 'template_id is required';
  }
  if (
    payload.subject === undefined
    && payload.html === undefined
    && payload.text === undefined
  ) {
    return 'at least one update field is required';
  }
  return null;
}

const ACTION_GUARDS: Record<string, (payload: Record<string, unknown>) => string | null> = {
  'provider.set': validateProviderAction,
  'provider.rollback': validateProviderAction,
  'provider.preflight': validateProviderAction,
  'sms.bulk.send': validateSmsBulkSend,
  'sms.schedule.send': validateSmsScheduleSend,
  'email.bulk.send': validateEmailBulkSend,
  'users.role.set': validateUserRoleSet,
  'callscript.update': validateCallScriptIdPayload,
  'callscript.submit_review': validateCallScriptIdPayload,
  'callscript.review': validateCallScriptIdPayload,
  'callscript.promote_live': validateCallScriptIdPayload,
  'callscript.simulate': validateCallScriptIdPayload,
  'callerflags.upsert': validateCallerFlagsUpsert,
  'smsscript.create': validateSmsScriptCreate,
  'smsscript.update': validateSmsScriptUpdate,
  'emailtemplate.create': validateEmailTemplateCreate,
  'emailtemplate.update': validateEmailTemplateUpdate,
};

export type DashboardActionRisk = 'safe' | 'caution' | 'danger';

export type DashboardActionPolicy = {
  capability?: string;
  risk: DashboardActionRisk;
  confirmTitle?: string;
  confirmTone?: 'default' | 'warning' | 'danger';
  confirmConsequence?: string;
  confirmIrreversible?: boolean;
  confirmLabel?: string;
};

const ACTION_POLICIES: Record<string, DashboardActionPolicy> = {
  'provider.set': {
    capability: 'provider_manage',
    risk: 'danger',
    confirmTitle: 'Confirm provider switch',
    confirmTone: 'danger',
    confirmConsequence: 'Active and new calls may route through a different provider immediately.',
    confirmIrreversible: false,
    confirmLabel: 'Switch Provider',
  },
  'provider.rollback': {
    capability: 'provider_manage',
    risk: 'danger',
    confirmTitle: 'Confirm provider rollback',
    confirmTone: 'danger',
    confirmConsequence: 'Provider routing will be reverted for this channel and traffic behavior will change.',
    confirmIrreversible: false,
    confirmLabel: 'Rollback Provider',
  },
  'provider.preflight': {
    capability: 'provider_manage',
    risk: 'safe',
  },
  'runtime.maintenance.enable': {
    capability: 'dashboard_view',
    risk: 'danger',
    confirmTitle: 'Confirm maintenance mode',
    confirmTone: 'danger',
    confirmConsequence: 'Runtime maintenance mode can interrupt outbound operations and automated flows.',
    confirmIrreversible: false,
    confirmLabel: 'Enable Maintenance',
  },
  'runtime.maintenance.disable': {
    capability: 'dashboard_view',
    risk: 'danger',
    confirmTitle: 'Confirm maintenance reset',
    confirmTone: 'danger',
    confirmConsequence: 'Disabling maintenance re-opens execution paths for live traffic.',
    confirmIrreversible: false,
    confirmLabel: 'Disable Maintenance',
  },
  'runtime.canary.set': {
    capability: 'dashboard_view',
    risk: 'caution',
    confirmTitle: 'Confirm canary override',
    confirmTone: 'warning',
  },
  'runtime.canary.clear': {
    capability: 'dashboard_view',
    risk: 'caution',
    confirmTitle: 'Confirm canary reset',
    confirmTone: 'warning',
  },
  'sms.bulk.send': {
    capability: 'sms_bulk_manage',
    risk: 'danger',
    confirmTitle: 'Confirm bulk SMS send',
    confirmTone: 'danger',
    confirmConsequence: 'Messages will be queued for recipients and may trigger billable provider usage.',
    confirmIrreversible: true,
    confirmLabel: 'Queue SMS Batch',
  },
  'sms.schedule.send': {
    capability: 'sms_bulk_manage',
    risk: 'danger',
    confirmTitle: 'Confirm scheduled SMS',
    confirmTone: 'danger',
    confirmConsequence: 'Scheduled messages will execute automatically at the configured time.',
    confirmIrreversible: true,
    confirmLabel: 'Schedule SMS',
  },
  'email.bulk.send': {
    capability: 'email_bulk_manage',
    risk: 'danger',
    confirmTitle: 'Confirm bulk email send',
    confirmTone: 'danger',
    confirmConsequence: 'Email jobs will queue and may contact all selected recipients.',
    confirmIrreversible: true,
    confirmLabel: 'Queue Email Batch',
  },
  'users.role.set': {
    capability: 'users_manage',
    risk: 'danger',
    confirmTitle: 'Confirm role update',
    confirmTone: 'danger',
    confirmConsequence: 'User permissions will change immediately after this action.',
    confirmIrreversible: false,
    confirmLabel: 'Apply Role Change',
  },
  'dlq.call.replay': {
    capability: 'dashboard_view',
    risk: 'caution',
    confirmTitle: 'Confirm call DLQ replay',
    confirmTone: 'warning',
  },
  'dlq.email.replay': {
    capability: 'dashboard_view',
    risk: 'caution',
    confirmTitle: 'Confirm email DLQ replay',
    confirmTone: 'warning',
  },
  'callscript.update': {
    capability: 'caller_flags_manage',
    risk: 'caution',
    confirmTitle: 'Confirm script update',
    confirmTone: 'warning',
  },
  'callscript.submit_review': {
    capability: 'caller_flags_manage',
    risk: 'caution',
    confirmTitle: 'Confirm review submission',
    confirmTone: 'warning',
  },
  'callscript.review': {
    capability: 'caller_flags_manage',
    risk: 'danger',
    confirmTitle: 'Confirm script review decision',
    confirmTone: 'danger',
    confirmConsequence: 'This review decision updates governance state for the selected script.',
    confirmIrreversible: false,
    confirmLabel: 'Apply Review Decision',
  },
  'callscript.promote_live': {
    capability: 'caller_flags_manage',
    risk: 'danger',
    confirmTitle: 'Confirm live promotion',
    confirmTone: 'danger',
    confirmConsequence: 'The selected script will become live for production call handling.',
    confirmIrreversible: false,
    confirmLabel: 'Promote Live',
  },
  'callscript.simulate': {
    capability: 'caller_flags_manage',
    risk: 'safe',
  },
  'smsscript.list': {
    capability: 'caller_flags_manage',
    risk: 'safe',
  },
  'smsscript.get': {
    capability: 'caller_flags_manage',
    risk: 'safe',
  },
  'smsscript.create': {
    capability: 'caller_flags_manage',
    risk: 'caution',
    confirmTitle: 'Confirm SMS script creation',
    confirmTone: 'warning',
  },
  'smsscript.update': {
    capability: 'caller_flags_manage',
    risk: 'caution',
    confirmTitle: 'Confirm SMS script update',
    confirmTone: 'warning',
  },
  'smsscript.delete': {
    capability: 'caller_flags_manage',
    risk: 'danger',
    confirmTitle: 'Confirm SMS script deletion',
    confirmTone: 'danger',
    confirmConsequence: 'The selected SMS script will be removed and no longer available in operator flows.',
    confirmIrreversible: true,
    confirmLabel: 'Delete SMS Script',
  },
  'emailtemplate.list': {
    capability: 'caller_flags_manage',
    risk: 'safe',
  },
  'emailtemplate.get': {
    capability: 'caller_flags_manage',
    risk: 'safe',
  },
  'emailtemplate.create': {
    capability: 'caller_flags_manage',
    risk: 'caution',
    confirmTitle: 'Confirm email template creation',
    confirmTone: 'warning',
  },
  'emailtemplate.update': {
    capability: 'caller_flags_manage',
    risk: 'caution',
    confirmTitle: 'Confirm email template update',
    confirmTone: 'warning',
  },
  'emailtemplate.delete': {
    capability: 'caller_flags_manage',
    risk: 'danger',
    confirmTitle: 'Confirm email template deletion',
    confirmTone: 'danger',
    confirmConsequence: 'The selected email template will be removed and cannot be reused.',
    confirmIrreversible: true,
    confirmLabel: 'Delete Email Template',
  },
  'callerflags.list': {
    capability: 'caller_flags_manage',
    risk: 'safe',
  },
  'callerflags.upsert': {
    capability: 'caller_flags_manage',
    risk: 'caution',
    confirmTitle: 'Confirm caller flag update',
    confirmTone: 'warning',
  },
  'persona.list': {
    capability: 'caller_flags_manage',
    risk: 'safe',
  },
  'calls.list': {
    capability: 'dashboard_view',
    risk: 'safe',
  },
  'calls.search': {
    capability: 'dashboard_view',
    risk: 'safe',
  },
  'calls.get': {
    capability: 'dashboard_view',
    risk: 'safe',
  },
  'calls.events': {
    capability: 'dashboard_view',
    risk: 'safe',
  },
  'sms.messages.recent': {
    capability: 'sms_bulk_manage',
    risk: 'safe',
  },
  'sms.messages.conversation': {
    capability: 'sms_bulk_manage',
    risk: 'safe',
  },
  'sms.message.status': {
    capability: 'sms_bulk_manage',
    risk: 'safe',
  },
  'sms.stats': {
    capability: 'sms_bulk_manage',
    risk: 'safe',
  },
  'email.message.status': {
    capability: 'email_bulk_manage',
    risk: 'safe',
  },
  'users.list': {
    capability: 'users_manage',
    risk: 'safe',
  },
  'audit.feed': {
    capability: 'dashboard_view',
    risk: 'safe',
  },
  'incidents.summary': {
    capability: 'dashboard_view',
    risk: 'safe',
  },
};

export function validateDashboardActionPayload(action: string, payload: unknown): string | null {
  if (!isRecord(payload)) {
    return 'payload must be an object';
  }
  const normalizedAction = String(action || '').trim().toLowerCase();
  const guard = ACTION_GUARDS[normalizedAction];
  if (!guard) return null;
  return guard(payload);
}

export function getDashboardActionPolicy(action: string): DashboardActionPolicy {
  const normalizedAction = String(action || '').trim().toLowerCase();
  return ACTION_POLICIES[normalizedAction] || { risk: 'safe' };
}
