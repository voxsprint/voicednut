export interface SessionCacheEntry {
  token: string;
  exp: number | null;
}

export type DashboardRealtimeTransportContract = {
  enabled: boolean;
  endpoints: string[];
  source: string;
};

function parseApiBaseHost(apiBaseUrl: string): string {
  if (!apiBaseUrl) return '';
  try {
    return new URL(apiBaseUrl).hostname.toLowerCase();
  } catch {
    return '';
  }
}

export function isNgrokApiBase(apiBaseUrl: string): boolean {
  const host = parseApiBaseHost(apiBaseUrl);
  if (!host) return false;
  return host.includes('ngrok')
    || host.endsWith('.ngrok-free.app')
    || host.endsWith('.ngrok-free.dev')
    || host.endsWith('.ngrok.io');
}

export function isSessionBootstrapBlockingCode(code: string): boolean {
  return [
    'miniapp_invalid_signature',
    'miniapp_missing_init_data',
    'miniapp_auth_date_future',
    'miniapp_replay_detected',
    'miniapp_admin_required',
  ].includes(String(code || '').trim());
}

export function readSessionCache(storageKey: string): SessionCacheEntry | null {
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SessionCacheEntry>;
    if (!parsed || !parsed.token) return null;
    const exp = Number(parsed.exp);
    return {
      token: String(parsed.token),
      exp: Number.isFinite(exp) ? exp : null,
    };
  } catch {
    return null;
  }
}

export function writeSessionCache(storageKey: string, entry: SessionCacheEntry | null): void {
  if (!entry) {
    sessionStorage.removeItem(storageKey);
    return;
  }
  sessionStorage.setItem(storageKey, JSON.stringify(entry));
}

export function buildApiUrl(path: string, apiBaseUrl: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return apiBaseUrl ? `${apiBaseUrl}${normalizedPath}` : normalizedPath;
}

export function buildEventStreamUrl(path: string, apiBaseUrl: string): string {
  const base = buildApiUrl(path, apiBaseUrl);
  const separator = base.includes('?') ? '&' : '?';
  const ngrokBypassQuery = isNgrokApiBase(apiBaseUrl)
    ? '&ngrok-skip-browser-warning=1'
    : '';
  return `${base}${separator}transport=sse${ngrokBypassQuery}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function toBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
    return null;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on', 'enabled'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off', 'disabled'].includes(normalized)) return false;
  }
  return null;
}

function normalizeStreamPath(value: unknown): string {
  let raw = '';
  if (typeof value === 'string') {
    raw = value.trim();
  } else if (typeof value === 'number' || typeof value === 'boolean') {
    raw = String(value).trim();
  }
  if (!raw) return '';
  if (raw.startsWith('/')) return raw;
  return `/${raw}`;
}

function parseRealtimeEndpoints(payload: Record<string, unknown>): string[] {
  const endpoints: string[] = [];
  const candidates = [
    payload.endpoints,
    payload.paths,
    payload.sse_endpoints,
  ];
  candidates.forEach((candidate) => {
    if (!Array.isArray(candidate)) return;
    candidate.forEach((entry) => {
      const next = normalizeStreamPath(entry);
      if (next) endpoints.push(next);
    });
  });
  [payload.path, payload.endpoint, payload.sse_path].forEach((candidate) => {
    const next = normalizeStreamPath(candidate);
    if (next) endpoints.push(next);
  });
  return Array.from(new Set(endpoints));
}

function resolveRealtimeCandidate(payload: unknown): {
  realtime: Record<string, unknown>;
  source: string;
} {
  const root = asRecord(payload);
  const dashboard = asRecord(root.dashboard);
  const candidates: Array<{ source: string; value: unknown }> = [
    { source: 'payload.transport.realtime', value: asRecord(root.transport).realtime },
    { source: 'payload.dashboard.transport.realtime', value: asRecord(dashboard.transport).realtime },
    { source: 'payload.realtime', value: root.realtime },
    { source: 'payload.dashboard.realtime', value: dashboard.realtime },
  ];
  for (const candidate of candidates) {
    const realtime = asRecord(candidate.value);
    if (Object.keys(realtime).length > 0) {
      return { realtime, source: candidate.source };
    }
  }
  return { realtime: {}, source: 'none' };
}

export function resolveRealtimeTransportContract(
  ...payloads: Array<unknown>
): DashboardRealtimeTransportContract {
  for (const payload of payloads) {
    const { realtime, source } = resolveRealtimeCandidate(payload);
    if (Object.keys(realtime).length === 0) {
      continue;
    }
    const endpoints = parseRealtimeEndpoints(realtime);
    const explicitEnabled = toBoolean(realtime.enabled);
    const enabled = explicitEnabled === null
      ? endpoints.length > 0
      : explicitEnabled && endpoints.length > 0;
    return {
      enabled,
      endpoints,
      source,
    };
  }
  return {
    enabled: false,
    endpoints: [],
    source: 'none',
  };
}
