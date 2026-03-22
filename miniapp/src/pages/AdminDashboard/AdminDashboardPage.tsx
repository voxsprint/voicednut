import { backButton, hapticFeedback, initData, miniApp, settingsButton, useRawInitData, useSignal } from '@tma.js/sdk-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import '@/pages/AdminDashboard/AdminDashboardPage.css';
import {
  DashboardActionDialog,
  resolveDashboardDialogDismissValue,
} from '@/components/admin-dashboard/DashboardActionDialog';
import { ProviderChannelCard } from '@/components/admin-dashboard/ProviderChannelCard';
import { DashboardShellFrame } from '@/components/admin-dashboard/DashboardShellFrame';
import { DashboardSettingsStage } from '@/components/admin-dashboard/DashboardSettingsStage';
import { DashboardTopShell } from '@/components/admin-dashboard/DashboardTopShell';
import { DashboardViewStage } from '@/components/admin-dashboard/DashboardViewStage';
import {
  asRecord,
  formatTime,
  textBar,
  toInt,
  toText,
} from '@/services/admin-dashboard/dashboardPrimitives';
import {
  buildEventStreamUrl,
  isNgrokApiBase,
  isSessionBootstrapBlockingCode,
  resolveRealtimeTransportContract,
} from '@/services/admin-dashboard/dashboardTransport';
import {
  createDashboardApiClient,
} from '@/services/admin-dashboard/dashboardApiClient';
import {
  validateBootstrapPayload,
  validatePollPayload,
  validateStreamPayload,
} from '@/services/admin-dashboard/dashboardApiContracts';
import { buildDashboardVm } from '@/services/admin-dashboard/dashboardVm/buildDashboardVm';
import { buildGovernanceVmSection } from '@/services/admin-dashboard/dashboardVm/buildGovernanceVmSection';
import { buildMailerVmSection } from '@/services/admin-dashboard/dashboardVm/buildMailerVmSection';
import { buildOpsVmSection } from '@/services/admin-dashboard/dashboardVm/buildOpsVmSection';
import { buildProviderVmSection } from '@/services/admin-dashboard/dashboardVm/buildProviderVmSection';
import { buildSmsVmSection } from '@/services/admin-dashboard/dashboardVm/buildSmsVmSection';
import {
  useDashboardActions,
} from '@/hooks/admin-dashboard/useDashboardActions';
import type { ActionRequestMeta } from '@/hooks/admin-dashboard/useDashboardActions';
import { useDashboardEventStream } from '@/hooks/admin-dashboard/useDashboardEventStream';
import {
  useDashboardFeatureFlags,
} from '@/hooks/admin-dashboard/useDashboardFeatureFlags';
import {
  useDashboardModuleLayout,
} from '@/hooks/admin-dashboard/useDashboardModuleLayout';
import {
  useDashboardMessagingMetrics,
} from '@/hooks/admin-dashboard/useDashboardMessagingMetrics';
import {
  useDashboardMessagingActions,
} from '@/hooks/admin-dashboard/useDashboardMessagingActions';
import {
  useDashboardGovernanceData,
} from '@/hooks/admin-dashboard/useDashboardGovernanceData';
import {
  useDashboardGovernanceActions,
} from '@/hooks/admin-dashboard/useDashboardGovernanceActions';
import {
  useDashboardCallScriptActions,
} from '@/hooks/admin-dashboard/useDashboardCallScriptActions';
import {
  useDashboardRuntimeControls,
} from '@/hooks/admin-dashboard/useDashboardRuntimeControls';
import {
  useDashboardOpsMetrics,
} from '@/hooks/admin-dashboard/useDashboardOpsMetrics';
import {
  useDashboardProviderMetrics,
} from '@/hooks/admin-dashboard/useDashboardProviderMetrics';
import {
  useDashboardProviderActions,
} from '@/hooks/admin-dashboard/useDashboardProviderActions';
import { useDashboardPollingLoop } from '@/hooks/admin-dashboard/useDashboardPollingLoop';
import type { DashboardDialogState } from '@/hooks/admin-dashboard/useDashboardDialog';
import { useDashboardDialog } from '@/hooks/admin-dashboard/useDashboardDialog';
import {
  selectCallScriptByIdMemoized,
  selectSmsRouteSimulationRowsMemoized,
} from '@/pages/AdminDashboard/shellSelectors';
import {
  asAuditRows,
  asCallLogRows,
  asCallScripts,
  asDlqCallRows,
  asDlqEmailRows,
  asEmailJobs,
  asIncidentRows,
  asMiniAppUsers,
  asOpsQaSummary,
  asRunbooks,
  asStringList,
  createActionRequestMeta,
  getDashboardErrorCode,
  isAbortError,
} from '@/pages/AdminDashboard/dashboardPayloadHelpers';
import {
  FEATURE_FLAG_REGISTRY,
  MODULE_CONTEXT,
  MODULE_DEFAULT_ORDER,
  MODULE_DEFINITIONS,
  MODULE_GROUPS,
  MODULE_ID_SET,
  moduleRoutePath,
  parseWorkspaceRoute,
  type DashboardModule,
} from '@/pages/AdminDashboard/dashboardShellConfig';
import {
  resolveNoticeTone,
  resolveTelegramIdentity,
  type DashboardNoticeTone,
} from '@/pages/AdminDashboard/dashboardShellHelpers';
import { resolveDashboardFixtureRequest } from '@/pages/AdminDashboard/dashboardFixtureData';

const POLL_BASE_INTERVAL_MS = 10000;
const POLL_MAX_INTERVAL_MS = 60000;
const POLL_BACKOFF_MULTIPLIER = 1.7;
const POLL_JITTER_MS = 1200;
const POLL_DEGRADED_FAILURES = 2;
const SESSION_STORAGE_KEY = 'voxly-miniapp-session';
const MAX_ACTIVITY_ITEMS = 18;
const ACTION_LATENCY_SAMPLE_LIMIT = 40;
const STREAM_RECONNECT_BASE_MS = 2500;
const STREAM_RECONNECT_MAX_MS = 30000;
const STREAM_REFRESH_DEBOUNCE_MS = 350;
const STREAM_STALE_FALLBACK_MS = 45000;
const SMS_DEFAULT_COST_PER_SEGMENT = 0.0075;
const ACTIVITY_INFO_DEDUPE_MS = 8000;
const API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE || '',
).trim().replace(/\/+$/, '');
const API_BASE_IS_NGROK = isNgrokApiBase(API_BASE_URL);
const NGROK_BYPASS_HEADER = 'ngrok-skip-browser-warning';
const SESSION_REFRESH_RETRY_COUNT = 1;
const DASHBOARD_PREFS_STORAGE_KEY = 'voxly-miniapp-dashboard-prefs';
const DASHBOARD_DEV_FIXTURES_ENABLED = import.meta.env.DEV && ['1', 'true', 'yes']
  .includes(String(import.meta.env.VITE_ADMIN_DASHBOARD_DEV_FIXTURES || '').trim().toLowerCase());
type ProviderChannel = 'call' | 'sms' | 'email';

interface SessionStateUser {
  username?: unknown;
  firstName?: unknown;
  first_name?: unknown;
  lastName?: unknown;
  last_name?: unknown;
  photoUrl?: unknown;
  photo_url?: unknown;
  id?: unknown;
}

interface SessionState {
  user?: SessionStateUser;
}

interface ProviderChannelData {
  provider?: unknown;
  supported_providers?: unknown;
  readiness?: unknown;
}

interface ProviderPayload {
  providers?: Partial<Record<ProviderChannel, ProviderChannelData>>;
}

interface SmsSummary {
  totalRecipients?: unknown;
  totalSuccessful?: unknown;
  totalFailed?: unknown;
}

interface SmsPayload {
  summary?: SmsSummary;
}

interface EmailStats {
  total_recipients?: unknown;
  sent?: unknown;
  failed?: unknown;
  delivered?: unknown;
  bounced?: unknown;
  complained?: unknown;
  suppressed?: unknown;
}

interface EmailStatsPayload {
  stats?: EmailStats;
}

interface EmailHistoryPayload {
  jobs?: unknown;
}

interface DlqPayload {
  call_open?: unknown;
  email_open?: unknown;
  call_preview?: unknown;
  email_preview?: unknown;
}

interface CallStatsPayload {
  total_calls?: unknown;
  completed_calls?: unknown;
  failed_calls?: unknown;
  success_rate?: unknown;
  recent_calls?: unknown;
  unique_users?: unknown;
}

interface CallLogsPayload {
  rows?: unknown;
  total?: unknown;
  limit?: unknown;
  offset?: unknown;
}

interface VoiceRuntimePayload {
  runtime?: unknown;
  active_calls?: unknown;
  actions?: unknown;
  applied?: unknown;
}

interface CallScriptSimulationPayload {
  simulation?: unknown;
}

interface CallScriptsPayload {
  scripts?: unknown;
  total?: unknown;
  limit?: unknown;
  flow_types?: unknown;
}

interface OpsQueueBacklogPayload {
  total?: unknown;
  dlq_call_open?: unknown;
  dlq_email_open?: unknown;
  sms_failed?: unknown;
  email_failed?: unknown;
}

interface OpsPayload {
  queue_backlog?: OpsQueueBacklogPayload;
  status?: unknown;
  health?: unknown;
  qa?: unknown;
}

interface MiniAppUsersPayload {
  rows?: unknown;
  total?: unknown;
}

interface MiniAppAuditPayload {
  rows?: unknown;
  summary?: unknown;
  hours?: unknown;
}

interface MiniAppIncidentsPayload {
  alerts?: unknown;
  total_alerts?: unknown;
  runbooks?: unknown;
  summary?: unknown;
}

interface DashboardStoredPrefs {
  active_module?: unknown;
  user_search?: unknown;
  user_sort_by?: unknown;
  user_sort_dir?: unknown;
}

interface DashboardPayload {
  session?: unknown;
  provider?: ProviderPayload;
  provider_compatibility?: unknown;
  module_layout?: unknown;
  modules?: unknown;
  feature_flags?: unknown;
  flags?: unknown;
  sms_bulk?: SmsPayload;
  sms_stats?: unknown;
  email_bulk_stats?: EmailStatsPayload;
  email_bulk_history?: EmailHistoryPayload;
  dlq?: DlqPayload;
  call_logs?: CallLogsPayload;
  call_scripts?: CallScriptsPayload;
  call_stats?: CallStatsPayload;
  voice_runtime?: VoiceRuntimePayload;
  users?: MiniAppUsersPayload;
  audit?: MiniAppAuditPayload;
  incidents?: MiniAppIncidentsPayload;
  ops?: OpsPayload;
  bridge?: unknown;
}

interface DashboardApiPayload extends DashboardPayload {
  success?: boolean;
  dashboard?: DashboardPayload;
  session?: unknown;
  bridge?: unknown;
  module_layout?: unknown;
  modules?: unknown;
  feature_flags?: unknown;
  flags?: unknown;
  poll_interval_seconds?: unknown;
  poll_at?: unknown;
  server_time?: unknown;
}

type ActivityStatus = 'info' | 'success' | 'error';
type ProviderSwitchStage = 'idle' | 'simulated' | 'confirmed' | 'applied' | 'failed';
type ProviderSwitchPostCheck = 'idle' | 'ok' | 'failed';
type ProviderSwitchPlanState = {
  target: string;
  stage: ProviderSwitchStage;
  postCheck: ProviderSwitchPostCheck;
  rollbackSuggestion: string;
};

interface ActivityEntry {
  id: string;
  title: string;
  detail: string;
  status: ActivityStatus;
  at: string;
}

interface MiniAppSessionSummary {
  telegram_id?: unknown;
  role?: unknown;
  role_source?: unknown;
  caps?: unknown;
  exp?: unknown;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tagName = target.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select';
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button',
  'input',
  'select',
  'textarea',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter((element) => {
      if (element.matches(':disabled')) return false;
      if (element.getAttribute('aria-hidden') === 'true') return false;
      if (element instanceof HTMLInputElement && element.type === 'hidden') return false;
      if (element.tabIndex < 0) return false;
      return element.getClientRects().length > 0;
    });
}

export function AdminDashboardPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const workspaceRoute = useMemo(
    () => (
      parseWorkspaceRoute(location.pathname)
      || parseWorkspaceRoute(location.hash.replace(/^#/, ''))
    ),
    [location.hash, location.pathname],
  );
  const focusedWorkspaceMode = workspaceRoute !== null;

  const initDataRawFromHook = useRawInitData();
  const initDataRaw = initDataRawFromHook;
  const initDataState = useSignal(initData.state) as SessionState | undefined;
  const settingsButtonSupported = useSignal(settingsButton.isSupported);
  const settingsButtonMounted = useSignal(settingsButton.isMounted);
  const settingsButtonVisible = useSignal(settingsButton.isVisible);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [errorCode, setErrorCode] = useState<string>('');
  const [notice, setNotice] = useState<string>('');
  const [noticeTone, setNoticeTone] = useState<DashboardNoticeTone>('info');
  const [bootstrap, setBootstrap] = useState<DashboardApiPayload | null>(null);
  const [pollPayload, setPollPayload] = useState<DashboardApiPayload | null>(null);
  const [busyAction, setBusyAction] = useState<string>('');
  const [pollFailureCount, setPollFailureCount] = useState<number>(0);
  const [lastPollAt, setLastPollAt] = useState<number | null>(null);
  const [lastSuccessfulPollAt, setLastSuccessfulPollAt] = useState<number | null>(null);
  const [nextPollAt, setNextPollAt] = useState<number | null>(null);
  const [sessionBlocked, setSessionBlocked] = useState<boolean>(false);
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);
  const [actionLatencyMsSamples, setActionLatencyMsSamples] = useState<number[]>([]);
  const [activeModule, setActiveModule] = useState<DashboardModule>('ops');
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [pollingPaused, setPollingPaused] = useState<boolean>(false);
  const [smsRecipientsInput, setSmsRecipientsInput] = useState<string>('');
  const [smsMessageInput, setSmsMessageInput] = useState<string>('');
  const [smsScheduleAt, setSmsScheduleAt] = useState<string>('');
  const [smsProviderInput, setSmsProviderInput] = useState<string>('');
  const [smsCostPerSegment, setSmsCostPerSegment] = useState<string>(String(SMS_DEFAULT_COST_PER_SEGMENT));
  const [smsDryRunMode, setSmsDryRunMode] = useState<boolean>(false);
  const [mailerRecipientsInput, setMailerRecipientsInput] = useState<string>('');
  const [mailerSubjectInput, setMailerSubjectInput] = useState<string>('');
  const [mailerHtmlInput, setMailerHtmlInput] = useState<string>('');
  const [mailerTextInput, setMailerTextInput] = useState<string>('');
  const [mailerTemplateIdInput, setMailerTemplateIdInput] = useState<string>('');
  const [mailerVariablesInput, setMailerVariablesInput] = useState<string>('{}');
  const [mailerScheduleAt, setMailerScheduleAt] = useState<string>('');
  const [runtimeCanaryInput, setRuntimeCanaryInput] = useState<string>('');
  const [scriptFlowFilter, setScriptFlowFilter] = useState<string>('');
  const [callScriptsSnapshot, setCallScriptsSnapshot] = useState<CallScriptsPayload | null>(null);
  const [selectedCallScriptId, setSelectedCallScriptId] = useState<number>(0);
  const [scriptNameInput, setScriptNameInput] = useState<string>('');
  const [scriptDescriptionInput, setScriptDescriptionInput] = useState<string>('');
  const [scriptDefaultProfileInput, setScriptDefaultProfileInput] = useState<string>('');
  const [scriptPromptInput, setScriptPromptInput] = useState<string>('');
  const [scriptFirstMessageInput, setScriptFirstMessageInput] = useState<string>('');
  const [scriptObjectiveTagsInput, setScriptObjectiveTagsInput] = useState<string>('');
  const [scriptReviewNoteInput, setScriptReviewNoteInput] = useState<string>('');
  const [scriptSimulationVariablesInput, setScriptSimulationVariablesInput] = useState<string>('{}');
  const [scriptSimulationResult, setScriptSimulationResult] = useState<CallScriptSimulationPayload | null>(null);
  const [providerPreflightBusy, setProviderPreflightBusy] = useState<string>('');
  const [providerPreflightRows, setProviderPreflightRows] = useState<Record<string, string>>({});
  const [providerRollbackByChannel, setProviderRollbackByChannel] = useState<
    Partial<Record<ProviderChannel, string>>
  >({});
  const [providerSwitchPlanByChannel, setProviderSwitchPlanByChannel] = useState<
    Record<ProviderChannel, ProviderSwitchPlanState>
  >({
    call: { target: '', stage: 'idle', postCheck: 'idle', rollbackSuggestion: '' },
    sms: { target: '', stage: 'idle', postCheck: 'idle', rollbackSuggestion: '' },
    email: { target: '', stage: 'idle', postCheck: 'idle', rollbackSuggestion: '' },
  });
  const [userSearch, setUserSearch] = useState<string>('');
  const [userSortBy, setUserSortBy] = useState<string>('last_activity');
  const [userSortDir, setUserSortDir] = useState<string>('desc');
  const [usersSnapshot, setUsersSnapshot] = useState<MiniAppUsersPayload | null>(null);
  const [auditSnapshot, setAuditSnapshot] = useState<MiniAppAuditPayload | null>(null);
  const [incidentsSnapshot, setIncidentsSnapshot] = useState<MiniAppIncidentsPayload | null>(null);
  const {
    dialogState,
    dialogInputValue,
    dialogInputError,
    setDialogInputValue,
    setDialogInputError,
    closeDialog,
    openConfirmDialog,
    openPromptDialog,
    handleDialogConfirm,
  } = useDashboardDialog();
  const pollFailureNotedRef = useRef<boolean>(false);
  const bootstrapRequestSeqRef = useRef<number>(0);
  const pollRequestSeqRef = useRef<number>(0);
  const stateEpochRef = useRef<number>(0);
  const bootstrapAbortRef = useRef<AbortController | null>(null);
  const pollAbortRef = useRef<AbortController | null>(null);
  const initialServerModuleAppliedRef = useRef<boolean>(false);
  const fixtureModeNotedRef = useRef<boolean>(false);
  const lastActivityRef = useRef<{ signature: string; at: number; repeats: number }>({
    signature: '',
    at: 0,
    repeats: 0,
  });
  const dialogReturnFocusRef = useRef<HTMLElement | null>(null);
  const dialogCancelButtonRef = useRef<HTMLButtonElement>(null);
  const actionDialogRef = useRef<HTMLElement>(null);
  const restoreFocusSelectorRef = useRef<string>('#va-view-stage-root');
  const shouldRestoreFocusRef = useRef<boolean>(false);
  const shouldFocusStageRef = useRef<boolean>(false);
  const dismissDialog = useCallback((state: DashboardDialogState | null): void => {
    if (!state) return;
    closeDialog(resolveDashboardDialogDismissValue(state));
  }, [closeDialog]);

  useEffect(() => () => {
    bootstrapAbortRef.current?.abort();
    pollAbortRef.current?.abort();
  }, []);

  const triggerHaptic = useCallback((
    mode: 'selection' | 'impact' | 'success' | 'warning' | 'error',
    impactStyle: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'light',
  ): void => {
    const api = hapticFeedback as unknown as {
      isSupported?: (() => boolean) | boolean;
      selectionChanged?: (() => void) | { ifAvailable?: () => void };
      impactOccurred?: ((style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void) | {
        ifAvailable?: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
      };
      notificationOccurred?: ((state: 'success' | 'warning' | 'error') => void) | {
        ifAvailable?: (state: 'success' | 'warning' | 'error') => void;
      };
    };
    try {
      const supported = typeof api.isSupported === 'function'
        ? Boolean(api.isSupported())
        : api.isSupported !== false;
      if (!supported) return;
      if (mode === 'selection') {
        if (typeof api.selectionChanged === 'function') {
          api.selectionChanged();
          return;
        }
        api.selectionChanged?.ifAvailable?.();
        return;
      }
      if (mode === 'impact') {
        if (typeof api.impactOccurred === 'function') {
          api.impactOccurred(impactStyle);
          return;
        }
        api.impactOccurred?.ifAvailable?.(impactStyle);
        return;
      }
      if (typeof api.notificationOccurred === 'function') {
        api.notificationOccurred(mode);
        return;
      }
      api.notificationOccurred?.ifAvailable?.(mode);
    } catch {
      // Ignore haptic errors to avoid blocking control-path actions.
    }
  }, []);

  const toggleSettings = useCallback((next?: boolean, options?: { fallbackModule?: DashboardModule }): void => {
    const target = typeof next === 'boolean' ? next : !settingsOpen;
    setSettingsOpen((prev) => {
      if (!prev && target) {
        if (typeof document !== 'undefined') {
          const activeElement = document.activeElement as HTMLElement | null;
          if (activeElement?.id) {
            restoreFocusSelectorRef.current = `#${activeElement.id}`;
          } else {
            restoreFocusSelectorRef.current = `#va-launcher-module-${activeModule}, #va-view-stage-root`;
          }
        }
      }
      if (prev && !target) {
        shouldRestoreFocusRef.current = true;
      }
      return target;
    });
    if (target === settingsOpen) return;
    triggerHaptic('selection');
    if (target) {
      if (location.pathname !== '/settings') {
        navigate('/settings');
      }
      return;
    }
    const fallbackModule = options?.fallbackModule || activeModule;
    const fallbackPath = focusedWorkspaceMode ? moduleRoutePath(fallbackModule) : '/';
    if (location.pathname !== fallbackPath) {
      navigate(fallbackPath);
    }
  }, [
    activeModule,
    focusedWorkspaceMode,
    location.pathname,
    navigate,
    settingsOpen,
    triggerHaptic,
  ]);

  const selectModule = useCallback((moduleId: DashboardModule, options?: { fromKeyboard?: boolean }): void => {
    setActiveModule((prev) => {
      if (prev === moduleId) return prev;
      if (options?.fromKeyboard) {
        shouldFocusStageRef.current = true;
      }
      triggerHaptic('selection');
      return moduleId;
    });
    const targetPath = moduleRoutePath(moduleId);
    if (location.pathname !== targetPath) {
      navigate(targetPath);
    }
  }, [location.pathname, navigate, triggerHaptic]);

  const pushActivity = useCallback((
    status: ActivityStatus,
    title: string,
    detail: string,
  ): void => {
    const now = Date.now();
    const signature = `${status}:${title}:${detail}`;
    if (status === 'info'
      && lastActivityRef.current.signature === signature
      && (now - lastActivityRef.current.at) < ACTIVITY_INFO_DEDUPE_MS) {
      const nextRepeats = lastActivityRef.current.repeats + 1;
      lastActivityRef.current = {
        signature,
        at: now,
        repeats: nextRepeats,
      };
      setActivityLog((prev) => {
        if (prev.length === 0) return prev;
        const [first, ...rest] = prev;
        const baseDetail = first.detail.replace(/ \(x\d+\)$/, '');
        if (first.status !== status || first.title !== title || baseDetail !== detail) {
          return prev;
        }
        return [{
          ...first,
          detail: `${detail} (x${nextRepeats})`,
          at: new Date(now).toISOString(),
        }, ...rest];
      });
      return;
    }
    lastActivityRef.current = {
      signature: status === 'info' ? signature : '',
      at: now,
      repeats: 1,
    };
    const entry: ActivityEntry = {
      id: `${now}-${Math.random().toString(36).slice(2, 7)}`,
      title,
      detail,
      status,
      at: new Date(now).toISOString(),
    };
    setActivityLog((prev) => [entry, ...prev].slice(0, MAX_ACTIVITY_ITEMS));
  }, []);

  const setNoticeMessage = useCallback((value: string): void => {
    setNotice(value);
    setNoticeTone(resolveNoticeTone(value));
  }, []);

  const resolveEventStreamUrl = useCallback((path: string): string => (
    buildEventStreamUrl(path, API_BASE_URL)
  ), []);

  const { userLabel, userAvatarUrl, userAvatarFallback } = useMemo(() => {
    const pollSession = asRecord(pollPayload?.session);
    const bootstrapSession = asRecord(bootstrap?.session);
    const dashboardRoot = asRecord(bootstrap?.dashboard);
    const dashboardSession = asRecord(dashboardRoot.session);
    return resolveTelegramIdentity([
      asRecord(initDataState?.user),
      asRecord(pollSession.user),
      asRecord(bootstrapSession.user),
      asRecord(dashboardSession.user),
      asRecord(asRecord(pollPayload).user),
      asRecord(asRecord(bootstrap).user),
      asRecord(dashboardRoot.user),
    ]);
  }, [bootstrap, initDataState, pollPayload]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(DASHBOARD_PREFS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as DashboardStoredPrefs | null;
      if (!parsed || typeof parsed !== 'object') return;
      const storedModule = typeof parsed.active_module === 'string'
        ? parsed.active_module.trim().toLowerCase()
        : '';
      if (MODULE_ID_SET.has(storedModule as DashboardModule)) {
        setActiveModule(storedModule as DashboardModule);
        initialServerModuleAppliedRef.current = true;
      }
      setUserSearch(typeof parsed.user_search === 'string' ? parsed.user_search : '');
      const sortBy = typeof parsed.user_sort_by === 'string' ? parsed.user_sort_by : 'last_activity';
      if (sortBy === 'last_activity' || sortBy === 'total_calls' || sortBy === 'role') {
        setUserSortBy(sortBy);
      }
      const sortDir = typeof parsed.user_sort_dir === 'string' ? parsed.user_sort_dir : 'desc';
      if (sortDir === 'asc' || sortDir === 'desc') {
        setUserSortDir(sortDir);
      }
    } catch {
      // Ignore invalid persisted dashboard preferences.
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const payload = {
      active_module: activeModule,
      user_search: userSearch,
      user_sort_by: userSortBy,
      user_sort_dir: userSortDir,
    };
    try {
      window.localStorage.setItem(DASHBOARD_PREFS_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore local storage failures in constrained clients.
    }
  }, [activeModule, userSearch, userSortBy, userSortDir]);

  useEffect(() => {
    if (workspaceRoute === 'settings') {
      setSettingsOpen((prev) => (prev ? prev : true));
      return;
    }
    setSettingsOpen((prev) => (prev ? false : prev));
    if (!workspaceRoute || workspaceRoute === activeModule) return;
    initialServerModuleAppliedRef.current = true;
    setActiveModule(workspaceRoute);
  }, [activeModule, workspaceRoute]);

  const tokenRef = useRef<string | null>(token);
  const initDataRawRef = useRef<string>(initDataRaw || '');
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);
  useEffect(() => {
    initDataRawRef.current = initDataRaw || '';
  }, [initDataRaw]);
  const dashboardApiClient = useMemo(() => createDashboardApiClient(
    {
      apiBaseUrl: API_BASE_URL,
      apiBaseIsNgrok: API_BASE_IS_NGROK,
      ngrokBypassHeader: NGROK_BYPASS_HEADER,
      sessionStorageKey: SESSION_STORAGE_KEY,
      sessionRefreshRetryCount: SESSION_REFRESH_RETRY_COUNT,
    },
    {
      getToken: () => tokenRef.current,
      setToken,
      getInitDataRaw: () => initDataRawRef.current,
      setErrorCode,
      setSessionBlocked,
      pushActivity,
    },
  ), [pushActivity]);

  const request = useCallback(async <T,>(path: string, options: RequestInit = {}): Promise<T> => {
    if (DASHBOARD_DEV_FIXTURES_ENABLED) {
      return resolveDashboardFixtureRequest(path, options) as T;
    }
    return dashboardApiClient.request<T>(path, options);
  }, [dashboardApiClient]);

  const loadBootstrap = useCallback(async () => {
    const requestSeq = bootstrapRequestSeqRef.current + 1;
    bootstrapRequestSeqRef.current = requestSeq;
    const requestEpoch = stateEpochRef.current + 1;
    stateEpochRef.current = requestEpoch;
    if (bootstrapAbortRef.current) {
      bootstrapAbortRef.current.abort();
    }
    if (pollAbortRef.current) {
      pollAbortRef.current.abort();
    }
    const controller = new AbortController();
    bootstrapAbortRef.current = controller;
    setLoading(true);
    setError('');
    try {
      const rawPayload = asRecord(
        await request<DashboardApiPayload | null>('/miniapp/bootstrap', {
          signal: controller.signal,
        }),
      );
      const bootstrapValidation = validateBootstrapPayload(rawPayload);
      if (!bootstrapValidation.ok) {
        throw new Error(bootstrapValidation.error);
      }
      if (
        bootstrapRequestSeqRef.current !== requestSeq
        || stateEpochRef.current !== requestEpoch
      ) {
        return;
      }
      const payload = bootstrapValidation.payload as DashboardApiPayload;
      const now = Date.now();
      setBootstrap(payload);
      setPollPayload(payload);
      setLastPollAt(now);
      setLastSuccessfulPollAt(now);
      setPollFailureCount(0);
      setUsersSnapshot(payload.dashboard?.users || payload.users || null);
      setAuditSnapshot(payload.dashboard?.audit || payload.audit || null);
      setIncidentsSnapshot(payload.dashboard?.incidents || payload.incidents || null);
      setCallScriptsSnapshot(payload.dashboard?.call_scripts || payload.call_scripts || null);
      const runtimePayload = asRecord(payload.dashboard?.voice_runtime || payload.voice_runtime || {});
      const runtime = asRecord(runtimePayload.runtime);
      const overrideCanary = Number(runtime.canary_percent_override);
      if (Number.isFinite(overrideCanary)) {
        setRuntimeCanaryInput(String(Math.max(0, Math.min(100, Math.round(overrideCanary)))));
      }
      pushActivity('success', 'Dashboard synced', 'Bootstrap data loaded.');
    } catch (err) {
      if (isAbortError(err)) {
        return;
      }
      if (
        bootstrapRequestSeqRef.current !== requestSeq
        || stateEpochRef.current !== requestEpoch
      ) {
        return;
      }
      setPollFailureCount((prev) => prev + 1);
      const errorCodeFromError = getDashboardErrorCode(err);
      const blockedBySession = isSessionBootstrapBlockingCode(errorCodeFromError);
      const detail = err instanceof Error ? err.message : String(err);
      if (blockedBySession) {
        setError('');
        return;
      }
      setError(detail);
      pushActivity('error', 'Bootstrap failed', detail);
    } finally {
      if (bootstrapAbortRef.current === controller) {
        bootstrapAbortRef.current = null;
      }
      if (
        bootstrapRequestSeqRef.current === requestSeq
        && stateEpochRef.current === requestEpoch
      ) {
        setLoading(false);
      }
    }
  }, [pushActivity, request]);

  const loadPoll = useCallback(async (): Promise<boolean> => {
    const requestSeq = pollRequestSeqRef.current + 1;
    pollRequestSeqRef.current = requestSeq;
    const requestEpoch = stateEpochRef.current;
    if (pollAbortRef.current) {
      pollAbortRef.current.abort();
    }
    const controller = new AbortController();
    pollAbortRef.current = controller;
    const startedAt = Date.now();
    setLastPollAt(startedAt);
    try {
      const rawPayload = asRecord(
        await request<DashboardApiPayload | null>('/miniapp/jobs/poll', {
          signal: controller.signal,
        }),
      );
      const pollValidation = validatePollPayload(rawPayload);
      if (!pollValidation.ok) {
        throw new Error(pollValidation.error);
      }
      if (
        pollRequestSeqRef.current !== requestSeq
        || stateEpochRef.current !== requestEpoch
      ) {
        return false;
      }
      const payload = pollValidation.payload as DashboardApiPayload;
      setError('');
      setPollPayload(payload);
      setPollFailureCount(0);
      setLastSuccessfulPollAt(Date.now());
      if (payload.users) {
        setUsersSnapshot(payload.users);
      }
      if (payload.audit) {
        setAuditSnapshot(payload.audit);
      }
      if (payload.incidents) {
        setIncidentsSnapshot(payload.incidents);
      }
      if (pollFailureNotedRef.current) {
        pushActivity('success', 'Live sync recovered', 'Polling resumed successfully.');
      }
      pollFailureNotedRef.current = false;
      return true;
    } catch (err) {
      if (isAbortError(err)) {
        return false;
      }
      if (
        pollRequestSeqRef.current !== requestSeq
        || stateEpochRef.current !== requestEpoch
      ) {
        return false;
      }
      setPollFailureCount((prev) => prev + 1);
      const errorCodeFromError = getDashboardErrorCode(err);
      const blockedBySession = isSessionBootstrapBlockingCode(errorCodeFromError);
      const detail = err instanceof Error ? err.message : String(err);
      if (blockedBySession) {
        setError('');
        pollFailureNotedRef.current = false;
        return false;
      }
      setError(detail);
      if (!pollFailureNotedRef.current) {
        pushActivity('error', 'Live sync degraded', detail);
      }
      pollFailureNotedRef.current = true;
      return false;
    } finally {
      if (pollAbortRef.current === controller) {
        pollAbortRef.current = null;
      }
    }
  }, [pushActivity, request]);

  const applyStreamPayload = useCallback((raw: unknown): boolean => {
    const envelope = asRecord(raw);
    const candidate = asRecord(envelope.payload ?? envelope.data ?? raw);
    const streamValidation = validateStreamPayload(candidate);
    if (!streamValidation.ok) {
      return false;
    }
    const nextPayload = streamValidation.payload as DashboardApiPayload;
    setPollPayload((prev) => ({
      ...(asRecord(prev) as DashboardApiPayload),
      ...nextPayload,
    }));
    setLastSuccessfulPollAt(Date.now());
    setPollFailureCount(0);
    setError('');

    const dashboardFromPayload = nextPayload.dashboard;
    const usersFromPayload = nextPayload.users || dashboardFromPayload?.users;
    const auditFromPayload = nextPayload.audit || dashboardFromPayload?.audit;
    const incidentsFromPayload = nextPayload.incidents || dashboardFromPayload?.incidents;
    if (usersFromPayload) setUsersSnapshot(usersFromPayload);
    if (auditFromPayload) setAuditSnapshot(auditFromPayload);
    if (incidentsFromPayload) setIncidentsSnapshot(incidentsFromPayload);
    return true;
  }, []);

  const createActionMeta = useCallback((action: string): ActionRequestMeta => (
    createActionRequestMeta(action, activeModule)
  ), [activeModule]);
  const sessionCapsForActionGuards = useMemo(() => {
    const pollSession = asRecord(pollPayload?.session);
    const bootstrapSession = asRecord(bootstrap?.session);
    const dashboardSession = asRecord(asRecord(bootstrap?.dashboard).session);
    return asStringList(pollSession.caps || bootstrapSession.caps || dashboardSession.caps);
  }, [bootstrap?.dashboard, bootstrap?.session, pollPayload?.session]);
  const hasActionCapability = useCallback((capability: string): boolean => {
    const normalized = String(capability || '').trim().toLowerCase();
    if (!normalized) return true;
    if (sessionCapsForActionGuards.length === 0) return true;
    return sessionCapsForActionGuards.includes(normalized);
  }, [sessionCapsForActionGuards]);

  const { invokeAction, runAction, actionTelemetry } = useDashboardActions({
    createActionMeta,
    request,
    loadBootstrap,
    pushActivity,
    triggerHaptic,
    setBusyAction,
    setNotice: setNoticeMessage,
    setError,
    setActionLatencyMsSamples,
    actionLatencySampleLimit: ACTION_LATENCY_SAMPLE_LIMIT,
    confirmAction: openConfirmDialog,
    hasCapability: hasActionCapability,
  });
  const {
    featureFlags,
    featureFlagsSourceLabel,
    featureFlagsUpdatedAtLabel,
    isFeatureEnabled,
    realtimeStreamEnabled,
    moduleSkeletonsEnabled,
    moduleErrorBoundariesEnabled,
  } = useDashboardFeatureFlags({
    pollPayload,
    bootstrap,
    registry: FEATURE_FLAG_REGISTRY,
  });

  useEffect(() => {
    void loadBootstrap();
  }, [loadBootstrap]);

  useEffect(() => {
    if (!DASHBOARD_DEV_FIXTURES_ENABLED) return;
    if (fixtureModeNotedRef.current) return;
    fixtureModeNotedRef.current = true;
    setNoticeMessage('Dev fixture mode enabled: backend calls are bypassed for local QA.');
    pushActivity('info', 'Dev fixture mode', 'Using local dashboard fixture data.');
  }, [pushActivity, setNoticeMessage]);

  useEffect(() => {
    if (!settingsButtonSupported) return undefined;
    settingsButton.mount.ifAvailable();
    settingsButton.show.ifAvailable();
    return () => {
      settingsButton.hide.ifAvailable();
    };
  }, [settingsButtonSupported]);

  useEffect(() => {
    if (!settingsButton.onClick.isAvailable()) {
      return undefined;
    }
    return settingsButton.onClick(() => {
      toggleSettings();
    });
  }, [toggleSettings]);

  useEffect(() => {
    if (
      Boolean(dialogState)
      || settingsOpen
      || focusedWorkspaceMode
      || activeModule !== 'ops'
    ) {
      backButton.show.ifAvailable();
      return;
    }
    backButton.hide.ifAvailable();
  }, [activeModule, dialogState, focusedWorkspaceMode, settingsOpen]);

  useEffect(() => (
    () => {
      backButton.hide.ifAvailable();
    }
  ), []);

  useEffect(() => {
    if (!backButton.onClick.isAvailable()) {
      return undefined;
    }
    return backButton.onClick(() => {
      if (dialogState) {
        dismissDialog(dialogState);
        triggerHaptic('selection');
        return;
      }
      if (settingsOpen) {
        toggleSettings(false);
        return;
      }
      if (focusedWorkspaceMode) {
        triggerHaptic('selection');
        navigate('/');
        return;
      }
      if (activeModule !== 'ops') {
        selectModule('ops', { fromKeyboard: true });
        return;
      }
      if (typeof window !== 'undefined' && window.history.length > 1) {
        triggerHaptic('impact', 'light');
        window.history.back();
      }
    });
  }, [
    activeModule,
    dismissDialog,
    dialogState,
    focusedWorkspaceMode,
    navigate,
    selectModule,
    settingsOpen,
    toggleSettings,
    triggerHaptic,
  ]);

  useEffect(() => {
    if (settingsOpen) return;
    if (!shouldRestoreFocusRef.current) return;
    shouldRestoreFocusRef.current = false;
    if (typeof document === 'undefined') return;
    requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(restoreFocusSelectorRef.current)
        || document.querySelector<HTMLElement>('#va-view-stage-root');
      target?.focus({ preventScroll: true });
    });
  }, [activeModule, settingsOpen]);

  useEffect(() => {
    if (settingsOpen) return;
    if (!shouldFocusStageRef.current) return;
    shouldFocusStageRef.current = false;
    if (typeof document === 'undefined') return;
    requestAnimationFrame(() => {
      document.querySelector<HTMLElement>('#va-view-stage-root')?.focus({ preventScroll: true });
    });
  }, [activeModule, settingsOpen]);

  useEffect(() => {
    if (!dialogState) return;
    if (typeof document === 'undefined') return;
    const activeElement = document.activeElement;
    dialogReturnFocusRef.current = activeElement instanceof HTMLElement ? activeElement : null;
    if (dialogState.kind === 'prompt') return;
    requestAnimationFrame(() => {
      dialogCancelButtonRef.current?.focus({ preventScroll: true });
    });
  }, [dialogState]);

  useEffect(() => {
    if (dialogState) return;
    const previousFocus = dialogReturnFocusRef.current;
    if (!previousFocus) return;
    dialogReturnFocusRef.current = null;
    if (typeof document === 'undefined') return;
    requestAnimationFrame(() => {
      if (previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true });
        return;
      }
      document.querySelector<HTMLElement>('#va-view-stage-root')?.focus({ preventScroll: true });
    });
  }, [dialogState]);

  useEffect(() => {
    if (!dialogState) return undefined;
    if (typeof document === 'undefined') return undefined;

    const handleTabTrap = (event: KeyboardEvent): void => {
      if (event.key !== 'Tab') return;
      const surface = actionDialogRef.current;
      if (!surface) return;
      const focusable = getFocusableElements(surface);
      if (focusable.length === 0) {
        event.preventDefault();
        surface.focus({ preventScroll: true });
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement;
      if (!(activeElement instanceof HTMLElement) || !surface.contains(activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus({ preventScroll: true });
        return;
      }
      if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus({ preventScroll: true });
        return;
      }
      if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      }
    };

    document.addEventListener('keydown', handleTabTrap, true);
    return () => {
      document.removeEventListener('keydown', handleTabTrap, true);
    };
  }, [dialogState]);

  const serverPollIntervalMs = useMemo(() => {
    const intervalSeconds = Number(bootstrap?.poll_interval_seconds);
    if (!Number.isFinite(intervalSeconds) || intervalSeconds <= 0) {
      return POLL_BASE_INTERVAL_MS;
    }
    return Math.max(3000, Math.min(POLL_MAX_INTERVAL_MS, Math.floor(intervalSeconds * 1000)));
  }, [bootstrap?.poll_interval_seconds]);
  const realtimeTransport = useMemo(
    () => resolveRealtimeTransportContract(pollPayload, bootstrap),
    [bootstrap, pollPayload],
  );
  const streamStaleAfterMs = Math.max(STREAM_STALE_FALLBACK_MS, serverPollIntervalMs * 3);

  const {
    streamMode,
    streamConnected,
    streamFailureCount,
    streamLastEventAt,
  } = useDashboardEventStream({
    enabled: realtimeStreamEnabled
      && realtimeTransport.enabled
      && !sessionBlocked
      && !pollingPaused
      && !API_BASE_IS_NGROK,
    token,
    endpoints: realtimeTransport.endpoints,
    buildEventStreamUrl: resolveEventStreamUrl,
    applyStreamPayload,
    refreshPoll: loadPoll,
    reconnectBaseMs: STREAM_RECONNECT_BASE_MS,
    reconnectMaxMs: STREAM_RECONNECT_MAX_MS,
    refreshDebounceMs: STREAM_REFRESH_DEBOUNCE_MS,
    staleAfterMs: streamStaleAfterMs,
  });

  useDashboardPollingLoop({
    enabled: Boolean(token) && !sessionBlocked && !pollingPaused && !streamConnected,
    baseIntervalMs: serverPollIntervalMs,
    loadPoll,
    setNextPollAt,
    maxIntervalMs: POLL_MAX_INTERVAL_MS,
    backoffMultiplier: POLL_BACKOFF_MULTIPLIER,
    jitterMs: POLL_JITTER_MS,
  });

  const dashboard = bootstrap?.dashboard;
  const providerPayload = pollPayload?.provider || dashboard?.provider || {};
  const providersByChannel = providerPayload.providers || {};
  const providerCompatibilityPayload =
    pollPayload?.provider_compatibility || dashboard?.provider_compatibility || {};
  const providerCompatibilityRoot = asRecord(
    asRecord(providerCompatibilityPayload).compatibility || providerCompatibilityPayload,
  );
  const providerCompatibilityChannels = asRecord(providerCompatibilityRoot.channels);
  const smsPayload = pollPayload?.sms_bulk || dashboard?.sms_bulk || {};
  const smsSummary = smsPayload.summary || {};
  const emailStatsPayload = pollPayload?.email_bulk_stats || dashboard?.email_bulk_stats || {};
  const emailStats = emailStatsPayload.stats || {};
  const emailHistoryPayload = pollPayload?.email_bulk_history || dashboard?.email_bulk_history || {};
  const emailJobs = asEmailJobs(emailHistoryPayload.jobs);
  const dlqPayload = pollPayload?.dlq || dashboard?.dlq || {};
  const callLogsPayload = pollPayload?.call_logs || dashboard?.call_logs || {};
  const callScriptsPayload = callScriptsSnapshot || pollPayload?.call_scripts || dashboard?.call_scripts || {};
  const callStatsPayload = pollPayload?.call_stats || dashboard?.call_stats || {};
  const voiceRuntimePayload = pollPayload?.voice_runtime || dashboard?.voice_runtime || {};
  const opsPayload = pollPayload?.ops || dashboard?.ops || {};
  const opsQueueBacklog = opsPayload.queue_backlog || {};
  const opsQaSummary = asOpsQaSummary(opsPayload.qa);
  const usersPayload = usersSnapshot || dashboard?.users || {};
  const auditPayload = auditSnapshot || dashboard?.audit || {};
  const incidentsPayload = incidentsSnapshot || dashboard?.incidents || {};
  const sessionPayload = asRecord(
    pollPayload?.session || bootstrap?.session || dashboard?.session || {},
  ) as MiniAppSessionSummary;
  const callDlq = asDlqCallRows(dlqPayload.call_preview);
  const emailDlq = asDlqEmailRows(dlqPayload.email_preview);
  const callLogs = asCallLogRows(callLogsPayload.rows);
  const callScripts = asCallScripts(callScriptsPayload.scripts);
  const usersRows = asMiniAppUsers(usersPayload.rows);
  const auditRows = asAuditRows(auditPayload.rows);
  const incidentRows = asIncidentRows(incidentsPayload.alerts);
  const runbookRows = asRunbooks(incidentsPayload.runbooks);
  const sessionRole = toText(sessionPayload.role, 'viewer').toLowerCase();
  const sessionRoleSource = toText(sessionPayload.role_source, 'inferred');
  const sessionCaps = asStringList(sessionPayload.caps);
  const dashboardLayoutPayload = pollPayload?.module_layout
    || bootstrap?.module_layout
    || dashboard?.module_layout
    || pollPayload?.modules
    || bootstrap?.modules
    || dashboard?.modules
    || {};
  const {
    hasCapability,
    visibleModules,
    preferredServerModule,
  } = useDashboardModuleLayout<DashboardModule>({
    sessionCaps,
    dashboardLayoutPayload,
    moduleDefinitions: MODULE_DEFINITIONS,
    moduleDefaultOrder: MODULE_DEFAULT_ORDER,
    moduleIdSet: MODULE_ID_SET,
  });
  const settingsStatusLabel = !settingsButtonSupported
    ? 'Unsupported'
    : settingsButtonMounted
      ? settingsButtonVisible
        ? 'Visible'
        : 'Mounted'
      : 'Pending';

  useEffect(() => {
    if (visibleModules.length === 0) return;
    if (!visibleModules.some((module) => module.id === activeModule)) {
      setActiveModule(visibleModules[0].id);
    }
  }, [activeModule, visibleModules]);
  useEffect(() => {
    if (!workspaceRoute || workspaceRoute === 'settings') return;
    if (visibleModules.length === 0) {
      if (location.pathname !== '/') {
        navigate('/', { replace: true });
      }
      return;
    }
    if (visibleModules.some((module) => module.id === workspaceRoute)) return;
    const fallbackModule = visibleModules[0]?.id;
    if (!fallbackModule) return;
    const fallbackPath = moduleRoutePath(fallbackModule);
    if (location.pathname !== fallbackPath) {
      navigate(fallbackPath, { replace: true });
    }
  }, [location.pathname, navigate, visibleModules, workspaceRoute]);
  useEffect(() => {
    if (initialServerModuleAppliedRef.current) return;
    if (!preferredServerModule) return;
    if (!visibleModules.some((module) => module.id === preferredServerModule)) {
      initialServerModuleAppliedRef.current = true;
      return;
    }
    initialServerModuleAppliedRef.current = true;
    setActiveModule(preferredServerModule);
  }, [preferredServerModule, visibleModules]);
  const activeModuleMeta = MODULE_CONTEXT[activeModule] || MODULE_CONTEXT.ops;
  const activeModuleLabel = useMemo(() => (
    MODULE_DEFINITIONS.find((module) => module.id === activeModule)?.label || activeModule
  ), [activeModule]);
  const moduleShortcutIndexById = useMemo(() => (
    visibleModules.reduce<Record<string, number>>((acc, module, index) => {
      acc[module.id] = index + 1;
      return acc;
    }, {})
  ), [visibleModules]);
  const groupedVisibleModules = useMemo(() => (
    MODULE_GROUPS
      .map((group) => ({
        ...group,
        modules: visibleModules.filter((module) => group.moduleIds.includes(module.id)),
      }))
      .filter((group) => group.modules.length > 0)
  ), [visibleModules]);
  const openIncidentCount = toInt(asRecord(incidentsPayload.summary).open, incidentRows.length);
  const showOverviewMode = !focusedWorkspaceMode && !settingsOpen;
  const showFocusedModuleMode = focusedWorkspaceMode && !settingsOpen;

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (isTypingTarget(event.target)) return;
      const key = event.key.toLowerCase();
      if (dialogState && key === 'escape') {
        event.preventDefault();
        dismissDialog(dialogState);
        return;
      }
      if (dialogState) return;
      if ((event.ctrlKey || event.metaKey) && key === ',') {
        event.preventDefault();
        toggleSettings();
        return;
      }
      if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (key === 'r') {
        event.preventDefault();
        triggerHaptic('impact', 'light');
        pushActivity('info', 'Manual refresh', 'Operator triggered dashboard refresh.');
        void loadBootstrap();
        return;
      }
      if (key === 's') {
        event.preventDefault();
        toggleSettings();
        return;
      }
      const moduleIndex = Number.parseInt(key, 10);
      if (!Number.isFinite(moduleIndex) || moduleIndex < 1 || moduleIndex > visibleModules.length) return;
      const nextModule = visibleModules[moduleIndex - 1];
      if (!nextModule) return;
      event.preventDefault();
      restoreFocusSelectorRef.current = `#va-launcher-module-${nextModule.id}, #va-view-stage-root`;
      if (settingsOpen) {
        toggleSettings(false, { fallbackModule: nextModule.id });
        selectModule(nextModule.id);
        return;
      }
      selectModule(nextModule.id, { fromKeyboard: true });
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    dismissDialog,
    dialogState,
    loadBootstrap,
    pushActivity,
    selectModule,
    settingsOpen,
    toggleSettings,
    triggerHaptic,
    visibleModules,
  ]);

  useEffect(() => {
    if (callScripts.length === 0) {
      setSelectedCallScriptId(0);
      return;
    }
    if (!callScripts.some((script) => toInt(script.id) === selectedCallScriptId)) {
      setSelectedCallScriptId(toInt(callScripts[0]?.id));
    }
  }, [callScripts, selectedCallScriptId]);
  const selectedCallScript = selectCallScriptByIdMemoized({
    callScripts,
    selectedCallScriptId,
    toInt,
  });

  useEffect(() => {
    if (!selectedCallScript) return;
    setScriptNameInput(toText(selectedCallScript.name, ''));
    setScriptDescriptionInput(toText(selectedCallScript.description, ''));
    setScriptDefaultProfileInput(toText(selectedCallScript.default_profile, ''));
    setScriptPromptInput(toText(selectedCallScript.prompt, ''));
    setScriptFirstMessageInput(toText(selectedCallScript.first_message, ''));
    const tags = asStringList(selectedCallScript.objective_tags);
    setScriptObjectiveTagsInput(tags.join(', '));
  }, [selectedCallScript]);

  const {
    smsTotalRecipients,
    smsSuccess,
    smsFailed,
    smsProcessedPercent,
    emailTotalRecipients,
    emailSent,
    emailFailed,
    emailDelivered,
    emailBounced,
    emailComplained,
    emailSuppressed,
    emailProcessedPercent,
    emailDeliveredPercent,
    emailBouncePercent,
    emailComplaintPercent,
    smsRecipientsParsed,
    smsInvalidRecipients,
    smsDuplicateCount,
    smsSegmentEstimate,
    smsValidationCategories,
    smsEstimatedCost,
    mailerRecipientsParsed,
    mailerInvalidRecipients,
    mailerDuplicateCount,
    mailerVariableKeys,
    mailerTemplatePreviewSubject,
    mailerTemplatePreviewBody,
    mailerTemplatePreviewError,
    mailerDomainHealthStatus,
    mailerDomainHealthDetail,
    mailerTrendBars,
  } = useDashboardMessagingMetrics({
    smsSummary,
    emailStats,
    emailJobs,
    smsRecipientsInput,
    smsMessageInput,
    smsCostPerSegment,
    smsDefaultCostPerSegment: SMS_DEFAULT_COST_PER_SEGMENT,
    mailerRecipientsInput,
    mailerSubjectInput,
    mailerHtmlInput,
    mailerTextInput,
    mailerVariablesInput,
  });
  const hasBootstrapData = Boolean(
    bootstrap?.success
    || bootstrap?.dashboard
    || pollPayload?.dashboard
    || pollPayload?.provider
    || pollPayload?.sms_bulk
    || pollPayload?.email_bulk_stats
    || pollPayload?.dlq,
  );
  const hasProviderData = Object.keys(asRecord(providersByChannel)).length > 0;
  const hasBulkVolume = smsTotalRecipients > 0 || emailTotalRecipients > 0;
  const hasQueueData = emailJobs.length > 0 || callDlq.length > 0 || emailDlq.length > 0;
  const hasMeaningfulData = hasProviderData || hasBulkVolume || hasQueueData || callLogs.length > 0;
  const {
    syncHealthState,
    syncHealthMessage,
    bridgeHardFailures,
    bridgeSoftFailures,
    isDashboardDegraded,
    streamModeLabel,
    streamLastEventLabel,
    syncModeLabel,
    nextPollLabel,
    lastPollLabel,
    lastSuccessfulPollLabel,
    pollFreshnessLabel,
    callTotal,
    callCompleted,
    callFailed,
    callFailureRate,
    callSuccessRate,
    queueBacklogTotal,
    sloErrorBudgetPercent,
    sloP95ActionLatencyMs,
    degradedCauses,
  } = useDashboardOpsMetrics({
    bridgePayload: pollPayload?.bridge || dashboard?.bridge,
    sessionBlocked,
    pollFailureCount,
    pollDegradedFailures: POLL_DEGRADED_FAILURES,
    error,
    hasBootstrapData,
    streamMode,
    streamConnected,
    streamLastEventAt,
    pollingPaused,
    nextPollAt,
    lastPollAt,
    lastSuccessfulPollAt,
    callStatsPayload,
    opsQueueBacklog,
    actionLatencyMsSamples,
  });
  const callLogsTotal = toInt(callLogsPayload.total, callLogs.length);
  const voiceRuntime = asRecord(voiceRuntimePayload.runtime);
  const voiceRuntimeCircuit = asRecord(voiceRuntime.circuit);
  const voiceRuntimeActiveCalls = asRecord(voiceRuntimePayload.active_calls);
  const runtimeEffectiveMode = toText(
    voiceRuntime.effective_mode,
    toText(voiceRuntime.configured_mode, 'unknown'),
  );
  const runtimeModeOverride = toText(voiceRuntime.mode_override, 'none');
  const runtimeCanaryEffective = toInt(voiceRuntime.effective_canary_percent);
  const runtimeCanaryOverride = Number(voiceRuntime.canary_percent_override);
  const runtimeCanaryOverrideLabel = Number.isFinite(runtimeCanaryOverride)
    ? `${Math.max(0, Math.min(100, Math.round(runtimeCanaryOverride)))}%`
    : 'none';
  const runtimeIsCircuitOpen = voiceRuntimeCircuit.is_open === true;
  const runtimeForcedLegacyUntil = formatTime(voiceRuntimeCircuit.forced_legacy_until);
  const runtimeActiveTotal = toInt(voiceRuntimeActiveCalls.total);
  const runtimeActiveLegacy = toInt(voiceRuntimeActiveCalls.legacy);
  const runtimeActiveVoiceAgent = toInt(voiceRuntimeActiveCalls.voice_agent);
  const callScriptsTotal = toInt(callScriptsPayload.total, callScripts.length);
  const selectedCallScriptLifecycle = asRecord(selectedCallScript?.lifecycle);
  const selectedCallScriptLifecycleState = toText(
    selectedCallScript?.lifecycle_state || selectedCallScriptLifecycle.lifecycle_state,
    'draft',
  ).toLowerCase();
  const {
    providerMatrixRows,
    providerReadinessTotals,
    providerReadinessPercent,
    providerDegradedCount,
    providerCurrentByChannel,
    providerSupportedByChannel,
  } = useDashboardProviderMetrics({
    providerCompatibilityChannels,
    providersByChannel: asRecord(providersByChannel),
  });
  useEffect(() => {
    setProviderSwitchPlanByChannel((prev) => {
      let changed = false;
      const next = { ...prev };
      (['call', 'sms', 'email'] as ProviderChannel[]).forEach((channel) => {
        const current = providerCurrentByChannel[channel];
        const supported = providerSupportedByChannel[channel];
        const fallbackTarget = current || supported[0] || '';
        if (!fallbackTarget || prev[channel].target) return;
        changed = true;
        next[channel] = {
          ...prev[channel],
          target: fallbackTarget,
        };
      });
      return changed ? next : prev;
    });
  }, [providerCurrentByChannel, providerSupportedByChannel]);
  const smsRouteSimulationRows = selectSmsRouteSimulationRowsMemoized({
    providerMatrixRows,
  });

  const handleRefresh = (): void => {
    triggerHaptic('impact', 'light');
    pushActivity('info', 'Manual refresh', 'Operator triggered dashboard refresh.');
    void loadBootstrap();
  };

  const handleTogglePolling = useCallback((): void => {
    triggerHaptic('selection');
    setPollingPaused((prev) => {
      const next = !prev;
      setNoticeMessage(next ? 'Live updates paused.' : 'Live updates resumed.');
      return next;
    });
  }, [setNoticeMessage, triggerHaptic]);

  const handleCloseMiniApp = useCallback((): void => {
    triggerHaptic('impact', 'light');
    miniApp.close.ifAvailable();
  }, [triggerHaptic]);

  const resetSession = useCallback((): void => {
    stateEpochRef.current += 1;
    bootstrapRequestSeqRef.current += 1;
    pollRequestSeqRef.current += 1;
    if (bootstrapAbortRef.current) {
      bootstrapAbortRef.current.abort();
      bootstrapAbortRef.current = null;
    }
    if (pollAbortRef.current) {
      pollAbortRef.current.abort();
      pollAbortRef.current = null;
    }
    triggerHaptic('warning');
    dashboardApiClient.clearSession();
    setError('');
    setErrorCode('');
    setNoticeMessage('');
    setSessionBlocked(false);
    setBootstrap(null);
    setPollPayload(null);
    setLastPollAt(null);
    setLastSuccessfulPollAt(null);
    setNextPollAt(null);
    setPollFailureCount(0);
    setPollingPaused(false);
    setActionLatencyMsSamples([]);
    setRuntimeCanaryInput('');
    setSmsCostPerSegment(String(SMS_DEFAULT_COST_PER_SEGMENT));
    setSmsDryRunMode(false);
    setCallScriptsSnapshot(null);
    setSelectedCallScriptId(0);
    setScriptSimulationResult(null);
    setProviderSwitchPlanByChannel({
      call: { target: '', stage: 'idle', postCheck: 'idle', rollbackSuggestion: '' },
      sms: { target: '', stage: 'idle', postCheck: 'idle', rollbackSuggestion: '' },
      email: { target: '', stage: 'idle', postCheck: 'idle', rollbackSuggestion: '' },
    });
    setSettingsOpen(false);
    setActivityLog([]);
    pollFailureNotedRef.current = false;
    void loadBootstrap();
  }, [dashboardApiClient, loadBootstrap, setNoticeMessage, triggerHaptic]);

  const handleRecipientsFile = useCallback(async (
    file: File | null,
    kind: 'sms' | 'mailer',
  ): Promise<void> => {
    if (!file) return;
    const text = await file.text().catch(() => '');
    if (!text.trim()) return;
    const combined = text.replace(/[,\t;]/g, '\n');
    if (kind === 'sms') {
      setSmsRecipientsInput((prev) => `${prev}${prev ? '\n' : ''}${combined}`.trim());
      pushActivity('info', 'CSV imported', 'SMS recipient list imported from file.');
      return;
    }
    setMailerRecipientsInput((prev) => `${prev}${prev ? '\n' : ''}${combined}`.trim());
    pushActivity('info', 'CSV imported', 'Mailer recipient list imported from file.');
  }, [pushActivity]);

  const {
    refreshUsersModule,
    refreshAuditModule,
  } = useDashboardGovernanceData<
    MiniAppUsersPayload,
    MiniAppAuditPayload,
    MiniAppIncidentsPayload
  >({
    invokeAction,
    pushActivity,
    setError,
    setUsersSnapshot,
    setAuditSnapshot,
    setIncidentsSnapshot,
    userSearch,
    userSortBy,
    userSortDir,
  });

  const {
    roleReasonTemplates,
    handleApplyUserRole,
    runbookAction,
  } = useDashboardGovernanceActions({
    runAction,
    pushActivity,
    refreshUsersModule,
    refreshAuditModule,
    providersByChannel,
    requestTextInput: openPromptDialog,
  });

  const {
    refreshRuntimeStatus,
    enableRuntimeMaintenance,
    disableRuntimeMaintenance,
    applyRuntimeCanary,
    clearRuntimeCanary,
  } = useDashboardRuntimeControls({
    invokeAction,
    runAction,
    pushActivity,
    setError,
    setRuntimeCanaryInput,
    runtimeCanaryInput,
    onRuntimeStatusLoaded: (data) => {
      setPollPayload((prev) => ({
        ...(prev || {}),
        voice_runtime: data,
      }));
    },
  });

  const {
    refreshCallScriptsModule,
    saveCallScriptDraft,
    submitCallScriptForReview,
    reviewCallScript,
    promoteCallScriptLive,
    simulateCallScript,
  } = useDashboardCallScriptActions({
    invokeAction,
    runAction,
    pushActivity,
    setError,
    setCallScriptsSnapshot,
    setScriptSimulationResult,
    scriptFlowFilter,
    selectedCallScriptId,
    scriptNameInput,
    scriptDescriptionInput,
    scriptDefaultProfileInput,
    scriptPromptInput,
    scriptFirstMessageInput,
    scriptObjectiveTagsInput,
    scriptReviewNoteInput,
    scriptSimulationVariablesInput,
  });

  const {
    sendSmsFromConsole,
    sendMailerFromConsole,
  } = useDashboardMessagingActions({
    invokeAction,
    runAction,
    pushActivity,
    setError,
    setNotice: setNoticeMessage,
    setBusyAction,
    formatTime,
    smsRecipientsParsed,
    smsMessageInput,
    smsDryRunMode,
    smsSegmentEstimateSegments: smsSegmentEstimate.segments,
    smsEstimatedCost,
    smsScheduleAt,
    smsProviderInput,
    mailerRecipientsParsed,
    mailerTemplateIdInput,
    mailerSubjectInput,
    mailerHtmlInput,
    mailerTextInput,
    mailerVariablesInput,
    mailerScheduleAt,
  });

  const {
    preflightActiveProviders,
    safeSwitchProvider,
    setProviderSwitchTarget,
    simulateProviderSwitchPlan,
    confirmProviderSwitchPlan,
    applyProviderSwitchPlan,
    resetProviderSwitchPlan,
    runProviderPreflight,
  } = useDashboardProviderActions({
    invokeAction,
    runAction,
    pushActivity,
    triggerHaptic,
    loadBootstrap,
    setError,
    setNotice: setNoticeMessage,
    setProviderPreflightBusy,
    setProviderPreflightRows,
    setProviderRollbackByChannel,
    setProviderSwitchPlanByChannel,
    providersByChannel,
    providerCurrentByChannel,
    providerSwitchPlanByChannel,
    requestConfirmation: openConfirmDialog,
  });

  const renderProviderSection = (channel: ProviderChannel) => {
    const channelData = providersByChannel[channel] || {};
    const currentProvider = toText(channelData.provider, '').toLowerCase();
    const supported = asStringList(channelData.supported_providers);
    const readiness = asRecord(channelData.readiness);
    const rollbackTarget = toText(providerRollbackByChannel[channel], '').toLowerCase();

    return (
      <ProviderChannelCard
        key={channel}
        channel={channel}
        currentProvider={currentProvider}
        supportedProviders={supported}
        readinessByProvider={readiness}
        busyAction={busyAction}
        providerPreflightBusy={providerPreflightBusy}
        providerPreflightRows={providerPreflightRows}
        rollbackTarget={rollbackTarget}
        onSwitchProvider={safeSwitchProvider}
        onRunPreflight={runProviderPreflight}
        onRollback={async (rollbackChannel, provider) => {
          await runAction(
            'provider.rollback',
            { channel: rollbackChannel, provider },
            {
              confirmText: `Rollback ${rollbackChannel.toUpperCase()} provider to "${provider}"?`,
              successMessage: `${rollbackChannel.toUpperCase()} provider rolled back to ${provider}.`,
            },
          );
        }}
      />
    );
  };

  const opsVmSection = buildOpsVmSection({
    isFeatureEnabled,
    isDashboardDegraded,
    syncModeLabel,
    streamModeLabel,
    streamLastEventLabel,
    streamFailureCount,
    pollFailureCount,
    bridgeHardFailures,
    bridgeSoftFailures,
    sloErrorBudgetPercent,
    sloP95ActionLatencyMs,
    pollFreshnessLabel,
    degradedCauses,
    lastPollLabel,
    lastSuccessfulPollLabel,
    nextPollLabel,
    callCompleted,
    callTotal,
    callFailed,
    callFailureRate,
    callSuccessRate,
    queueBacklogTotal,
    opsQaSummary,
    providerReadinessTotals,
    providerReadinessPercent,
    textBar,
    runtimeEffectiveMode,
    runtimeModeOverride,
    runtimeCanaryEffective,
    runtimeCanaryOverrideLabel,
    runtimeIsCircuitOpen,
    runtimeForcedLegacyUntil,
    runtimeActiveTotal,
    runtimeActiveLegacy,
    runtimeActiveVoiceAgent,
    busyAction,
    enableRuntimeMaintenance,
    disableRuntimeMaintenance,
    refreshRuntimeStatus,
    runtimeCanaryInput,
    setRuntimeCanaryInput,
    applyRuntimeCanary,
    clearRuntimeCanary,
    activityLog,
    formatTime,
    renderProviderSection,
    smsTotalRecipients,
    smsSuccess,
    smsFailed,
    smsProcessedPercent,
    emailTotalRecipients,
    emailSent,
    emailFailed,
    emailDelivered,
    emailBounced,
    emailComplained,
    emailSuppressed,
    emailProcessedPercent,
    emailDeliveredPercent,
    callLogs,
    callLogsTotal,
    toText,
    toInt,
    emailJobs,
    dlqPayload,
    callDlq,
    emailDlq,
    runAction,
    invokeAction,
    hasMeaningfulData,
  });

  const smsVmSection = buildSmsVmSection({
    smsRecipientsInput,
    setSmsRecipientsInput,
    handleRecipientsFile,
    smsProviderInput,
    setSmsProviderInput,
    smsMessageInput,
    setSmsMessageInput,
    smsScheduleAt,
    setSmsScheduleAt,
    busyAction,
    sendSmsFromConsole,
    smsRecipientsParsed,
    smsInvalidRecipients,
    smsDuplicateCount,
    smsSegmentEstimate,
    smsCostPerSegment,
    setSmsCostPerSegment,
    smsEstimatedCost,
    smsDryRunMode,
    setSmsDryRunMode,
    smsValidationCategories,
    smsRouteSimulationRows,
    smsTotalRecipients,
    smsSuccess,
    smsFailed,
    smsProcessedPercent,
    textBar,
    invokeAction,
  });

  const mailerVmSection = buildMailerVmSection({
    mailerRecipientsInput,
    setMailerRecipientsInput,
    handleRecipientsFile,
    mailerTemplateIdInput,
    setMailerTemplateIdInput,
    mailerSubjectInput,
    setMailerSubjectInput,
    mailerHtmlInput,
    setMailerHtmlInput,
    mailerTextInput,
    setMailerTextInput,
    mailerVariablesInput,
    setMailerVariablesInput,
    mailerScheduleAt,
    setMailerScheduleAt,
    busyAction,
    sendMailerFromConsole,
    mailerRecipientsParsed,
    mailerInvalidRecipients,
    mailerDuplicateCount,
    mailerVariableKeys,
    mailerTemplatePreviewSubject,
    mailerTemplatePreviewBody,
    mailerTemplatePreviewError,
    mailerDomainHealthStatus,
    mailerDomainHealthDetail,
    mailerTrendBars,
    emailTotalRecipients,
    emailSent,
    emailFailed,
    emailDelivered,
    emailBounced,
    emailComplained,
    emailSuppressed,
    emailProcessedPercent,
    emailDeliveredPercent,
    emailBouncePercent,
    emailComplaintPercent,
    textBar,
    emailJobs,
    toText,
    toInt,
    invokeAction,
  });

  const providerVmSection = buildProviderVmSection({
    providerReadinessTotals,
    providerDegradedCount,
    providerReadinessPercent,
    textBar,
    busyAction,
    providerPreflightBusy,
    preflightActiveProviders,
    loading,
    handleRefresh,
    providerMatrixRows,
    providerCurrentByChannel,
    providerSupportedByChannel,
    providerSwitchPlanByChannel,
    setProviderSwitchTarget,
    simulateProviderSwitchPlan,
    confirmProviderSwitchPlan,
    applyProviderSwitchPlan,
    resetProviderSwitchPlan,
    renderProviderSection,
  });

  const governanceVmSection = buildGovernanceVmSection({
    hasCapability,
    isFeatureEnabled,
    asRecord,
    toInt,
    toText,
    formatTime,
    busyAction,
    scriptFlowFilter,
    setScriptFlowFilter,
    refreshCallScriptsModule,
    callScriptsTotal,
    callScripts,
    selectedCallScriptId,
    setSelectedCallScriptId,
    selectedCallScript,
    selectedCallScriptLifecycleState,
    selectedCallScriptLifecycle,
    scriptNameInput,
    setScriptNameInput,
    scriptDefaultProfileInput,
    setScriptDefaultProfileInput,
    scriptDescriptionInput,
    setScriptDescriptionInput,
    scriptPromptInput,
    setScriptPromptInput,
    scriptFirstMessageInput,
    setScriptFirstMessageInput,
    scriptObjectiveTagsInput,
    setScriptObjectiveTagsInput,
    saveCallScriptDraft,
    submitCallScriptForReview,
    scriptReviewNoteInput,
    setScriptReviewNoteInput,
    reviewCallScript,
    promoteCallScriptLive,
    scriptSimulationVariablesInput,
    setScriptSimulationVariablesInput,
    simulateCallScript,
    scriptSimulationResult,
    invokeAction,
    userSearch,
    setUserSearch,
    userSortBy,
    setUserSortBy,
    userSortDir,
    setUserSortDir,
    refreshUsersModule,
    usersPayload,
    usersRows,
    roleReasonTemplates,
    handleApplyUserRole,
    refreshAuditModule,
    runbookAction,
    incidentsPayload,
    incidentRows,
    runbookRows,
    auditRows,
  });

  const moduleVm = buildDashboardVm(
    opsVmSection,
    smsVmSection,
    mailerVmSection,
    providerVmSection,
    governanceVmSection,
  );
  const showModuleSkeleton = moduleSkeletonsEnabled && loading && !hasBootstrapData;
  const moduleBoundaryKeySuffix = `${activeModule}:${lastSuccessfulPollAt ?? 0}`;

  return (
    <>
      <DashboardShellFrame
        loading={loading}
        settingsOpen={settingsOpen}
        activeModuleLabel={activeModuleLabel}
      >
        <DashboardTopShell
          settingsOpen={settingsOpen}
          showOverviewMode={showOverviewMode}
          sessionBlocked={sessionBlocked}
          loading={loading}
          userLabel={userLabel}
          userAvatarUrl={userAvatarUrl}
          userAvatarFallback={userAvatarFallback}
          sessionRole={sessionRole}
          sessionRoleSource={sessionRoleSource}
          settingsStatusLabel={settingsStatusLabel}
          featureFlagsCount={Object.keys(featureFlags).length || 'default'}
          activeModuleLabel={activeModuleLabel}
          activeModuleSubtitle={activeModuleMeta.subtitle}
          onBackToDashboard={() => navigate('/')}
          onOpenSettings={() => toggleSettings(true)}
          error={error}
          notice={notice}
          noticeTone={noticeTone}
          busyAction={busyAction}
          isDashboardDegraded={isDashboardDegraded}
          syncHealthState={syncHealthState}
          syncModeLabel={syncModeLabel}
          syncHealthMessage={syncHealthMessage}
          pollFailureCount={pollFailureCount}
          streamFailureCount={streamFailureCount}
          bridgeHardFailures={bridgeHardFailures}
          bridgeSoftFailures={bridgeSoftFailures}
          actionTelemetry={actionTelemetry}
        />
      <DashboardSettingsStage
        isOpen={settingsOpen}
        userLabel={userLabel}
        sessionRole={sessionRole}
        pollingPaused={pollingPaused}
        loading={loading}
        busy={busyAction.length > 0}
        settingsStatusLabel={settingsStatusLabel}
        apiBaseLabel={API_BASE_URL || 'same-origin'}
        featureFlagsCount={Object.keys(featureFlags).length || 'default'}
        featureFlagsSourceLabel={featureFlagsSourceLabel}
        featureFlagsUpdatedAtLabel={featureFlagsUpdatedAtLabel}
        visibleModules={visibleModules}
        onTogglePolling={handleTogglePolling}
        onSyncNow={handleRefresh}
        onRetrySession={resetSession}
        onJumpToModule={(moduleId) => {
          if (!visibleModules.some((module) => module.id === moduleId)) return;
          restoreFocusSelectorRef.current = `#va-launcher-module-${moduleId}, #va-view-stage-root`;
          toggleSettings(false, { fallbackModule: moduleId as DashboardModule });
          selectModule(moduleId as DashboardModule);
        }}
      />
      <DashboardViewStage
        settingsOpen={settingsOpen}
        sessionBlocked={sessionBlocked}
        errorCode={errorCode}
        loading={loading}
        busy={busyAction.length > 0}
        onRetrySession={resetSession}
        onCloseMiniApp={miniApp.close.isAvailable() ? handleCloseMiniApp : undefined}
        closeDisabled={loading || busyAction.length > 0}
        showOverviewMode={showOverviewMode}
        showFocusedModuleMode={showFocusedModuleMode}
        isDashboardDegraded={isDashboardDegraded}
        syncModeLabel={syncModeLabel}
        openIncidentCount={openIncidentCount}
        queueBacklogTotal={queueBacklogTotal}
        lastSuccessfulPollLabel={lastSuccessfulPollLabel}
        visibleModulesCount={visibleModules.length}
        onRefreshAccess={handleRefresh}
        showModuleSkeleton={showModuleSkeleton}
        groupedVisibleModules={groupedVisibleModules}
        moduleShortcutIndexById={moduleShortcutIndexById}
        activeModule={activeModule}
        onSelectModule={selectModule}
        moduleVm={moduleVm}
        hasCapability={hasCapability}
          moduleErrorBoundariesEnabled={moduleErrorBoundariesEnabled}
          moduleBoundaryKeySuffix={moduleBoundaryKeySuffix}
          onReload={handleRefresh}
        />
      </DashboardShellFrame>
      <DashboardActionDialog
        dialogState={dialogState}
        dialogInputValue={dialogInputValue}
        dialogInputError={dialogInputError}
        setDialogInputValue={setDialogInputValue}
        setDialogInputError={setDialogInputError}
        onDismiss={() => dismissDialog(dialogState)}
        onConfirm={handleDialogConfirm}
        actionDialogRef={actionDialogRef}
        dialogCancelButtonRef={dialogCancelButtonRef}
      />
    </>
  );
}
