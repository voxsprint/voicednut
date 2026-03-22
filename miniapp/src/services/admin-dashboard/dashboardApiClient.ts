import {
  parseApiError,
  parseApiErrorCode,
  parseJsonResponse,
  toText,
} from '@/services/admin-dashboard/dashboardPrimitives';
import {
  buildApiUrl,
  isSessionCacheEntryExpired,
  isSessionBootstrapBlockingCode,
  readSessionCache,
  type SessionCacheEntry,
  writeSessionCache,
} from '@/services/admin-dashboard/dashboardTransport';

export type DashboardActivityStatus = 'info' | 'success' | 'error';

export type DashboardApiClientConfig = {
  apiBaseUrl: string;
  apiBaseIsNgrok: boolean;
  ngrokBypassHeader: string;
  sessionStorageKey: string;
  sessionRefreshRetryCount: number;
};

export type DashboardApiClientCallbacks = {
  getToken: () => string | null;
  setToken: (token: string | null) => void;
  getInitDataRaw: () => string;
  setErrorCode: (code: string) => void;
  setSessionBlocked: (value: boolean) => void;
  pushActivity: (status: DashboardActivityStatus, title: string, detail: string) => void;
};

type SessionResponse = {
  success?: boolean;
  token?: string;
  expires_at?: number;
  init_data_refresh_recommended?: boolean;
  session?: {
    init_data_refresh_recommended?: boolean;
  };
  code?: string;
  error?: string;
};

type DashboardApiClient = {
  createSession: () => Promise<string>;
  refreshSession: (token: string) => Promise<string>;
  request: <T>(path: string, options?: RequestInit) => Promise<T>;
  clearSession: () => void;
};

export type DashboardApiError = Error & {
  code?: string;
  httpStatus?: number;
};

function createDashboardApiError(
  message: string,
  options: {
    code?: string;
    httpStatus?: number;
  } = {},
): DashboardApiError {
  const error = new Error(message) as DashboardApiError;
  if (options.code) {
    error.code = options.code;
  }
  if (Number.isFinite(options.httpStatus)) {
    error.httpStatus = options.httpStatus;
  }
  return error;
}

function buildSessionHeaders(initDataRaw: string, config: DashboardApiClientConfig): Headers {
  const sessionHeaders = new Headers({
    Authorization: `tma ${initDataRaw}`,
    'x-telegram-init-data': initDataRaw,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  });
  if (config.apiBaseIsNgrok) {
    sessionHeaders.set(config.ngrokBypassHeader, '1');
  }
  return sessionHeaders;
}

function buildRequestHeaders(
  token: string,
  options: RequestInit,
  config: DashboardApiClientConfig,
): Headers {
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('Accept', 'application/json');
  if (config.apiBaseIsNgrok) {
    headers.set(config.ngrokBypassHeader, '1');
  }
  if (!headers.has('Content-Type') && options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }
  return headers;
}

export function createDashboardApiClient(
  config: DashboardApiClientConfig,
  callbacks: DashboardApiClientCallbacks,
): DashboardApiClient {
  let sessionRequest: Promise<string> | null = null;
  let sessionRefreshRequest: Promise<string> | null = null;
  let sessionExpiryEpochSeconds: number | null = null;

  const clearSession = (): void => {
    writeSessionCache(config.sessionStorageKey, null);
    sessionRequest = null;
    sessionExpiryEpochSeconds = null;
    callbacks.setToken(null);
  };

  const createSession = async (): Promise<string> => {
    const cached = readSessionCache(config.sessionStorageKey);
    if (cached?.token) {
      sessionExpiryEpochSeconds = cached.exp;
      callbacks.setToken(cached.token);
      callbacks.setSessionBlocked(false);
      return cached.token;
    }

    if (sessionRequest) {
      return sessionRequest;
    }

    const initDataRaw = callbacks.getInitDataRaw();
    if (!initDataRaw) {
      callbacks.setSessionBlocked(true);
      callbacks.setErrorCode('miniapp_missing_init_data');
      callbacks.pushActivity(
        'error',
        'Session blocked',
        'Mini App init data is unavailable. Open this page from Telegram.',
      );
      throw createDashboardApiError(
        'Mini App init data is unavailable. Open this page from Telegram.',
        { code: 'miniapp_missing_init_data' },
      );
    }

    sessionRequest = (async (): Promise<string> => {
      const response = await fetch(buildApiUrl('/miniapp/session', config.apiBaseUrl), {
        method: 'POST',
        headers: buildSessionHeaders(initDataRaw, config),
        body: JSON.stringify({ init_data_raw: initDataRaw }),
      });
      const payload = (await parseJsonResponse(response)) as SessionResponse | null;
      if (response.ok && !payload) {
        throw new Error(
          'Session endpoint returned an empty/non-JSON response. Verify VITE_API_BASE_URL points to the API origin.',
        );
      }

      const code = toText(payload?.code, '');
      if (!response.ok || !payload?.success || !payload?.token) {
        if (isSessionBootstrapBlockingCode(code)) {
          callbacks.setSessionBlocked(true);
        }
        if (code) {
          callbacks.setErrorCode(code);
        }
        throw createDashboardApiError(
          payload?.error || `Session request failed (${response.status})`,
          {
            code,
            httpStatus: response.status,
          },
        );
      }

      const nextToken = payload.token;
      const expiresAtSeconds = Number(payload.expires_at);
      const cacheEntry: SessionCacheEntry = {
        token: nextToken,
        exp: Number.isFinite(expiresAtSeconds) && expiresAtSeconds > 0 ? expiresAtSeconds : null,
      };
      sessionExpiryEpochSeconds = cacheEntry.exp;
      writeSessionCache(config.sessionStorageKey, cacheEntry);
      callbacks.setToken(nextToken);
      callbacks.setErrorCode('');
      callbacks.setSessionBlocked(false);
      const initDataRefreshRecommended = payload.init_data_refresh_recommended === true
        || payload.session?.init_data_refresh_recommended === true;
      if (initDataRefreshRecommended) {
        callbacks.pushActivity(
          'info',
          'Telegram refresh recommended',
          'Session recovered from init-data expiry grace. Reopen this Mini App from Telegram soon to refresh launch credentials.',
        );
      }
      callbacks.pushActivity('success', 'Session established', 'Mini App session token created successfully.');
      return nextToken;
    })();

    try {
      return await sessionRequest;
    } finally {
      sessionRequest = null;
    }
  };

  const refreshSession = async (token: string): Promise<string> => {
    const authToken = String(token || '').trim();
    if (!authToken) {
      throw new Error('Mini App session token is unavailable for refresh.');
    }

    if (sessionRefreshRequest) {
      return sessionRefreshRequest;
    }

    sessionRefreshRequest = (async (): Promise<string> => {
      const response = await fetch(buildApiUrl('/miniapp/session/refresh', config.apiBaseUrl), {
        method: 'POST',
        headers: buildRequestHeaders(authToken, {}, config),
      });
      const payload = (await parseJsonResponse(response)) as SessionResponse | null;
      if (response.ok && !payload) {
        throw new Error(
          'Session refresh endpoint returned an empty/non-JSON response. Verify VITE_API_BASE_URL points to the API origin.',
        );
      }

      const code = toText(payload?.code, '');
      if (!response.ok || !payload?.success || !payload?.token) {
        if (isSessionBootstrapBlockingCode(code)) {
          callbacks.setSessionBlocked(true);
        }
        if (code) {
          callbacks.setErrorCode(code);
        }
        throw createDashboardApiError(
          payload?.error || `Session refresh failed (${response.status})`,
          {
            code,
            httpStatus: response.status,
          },
        );
      }

      const nextToken = payload.token;
      const expiresAtSeconds = Number(payload.expires_at);
      const cacheEntry: SessionCacheEntry = {
        token: nextToken,
        exp: Number.isFinite(expiresAtSeconds) && expiresAtSeconds > 0 ? expiresAtSeconds : null,
      };
      sessionExpiryEpochSeconds = cacheEntry.exp;
      writeSessionCache(config.sessionStorageKey, cacheEntry);
      callbacks.setToken(nextToken);
      callbacks.setErrorCode('');
      callbacks.setSessionBlocked(false);
      callbacks.pushActivity('success', 'Session refreshed', 'Mini App session token was refreshed.');
      return nextToken;
    })();

    try {
      return await sessionRefreshRequest;
    } finally {
      sessionRefreshRequest = null;
    }
  };

  const request = async <T,>(path: string, options: RequestInit = {}, retryCount = 0): Promise<T> => {
    const tokenFromState = callbacks.getToken();
    const tokenFromStateExpired = isSessionCacheEntryExpired(
      tokenFromState
        ? {
          token: tokenFromState,
          exp: sessionExpiryEpochSeconds,
        }
        : null,
    );
    let activeToken: string;
    if (!tokenFromState) {
      activeToken = await createSession();
    } else if (tokenFromStateExpired) {
      callbacks.pushActivity('info', 'Session refresh', 'Session token expired, refreshing.');
      try {
        activeToken = await refreshSession(tokenFromState);
      } catch {
        clearSession();
        callbacks.pushActivity('info', 'Session refresh', 'Session refresh failed, requesting a new Telegram session.');
        activeToken = await createSession();
      }
    } else {
      activeToken = tokenFromState;
    }
    const response = await fetch(buildApiUrl(path, config.apiBaseUrl), {
      ...options,
      headers: buildRequestHeaders(activeToken, options, config),
    });

    const payload = await parseJsonResponse(response);
    if (response.ok && !payload) {
      throw new Error(
        `API returned an empty/non-JSON response for ${path}. Verify VITE_API_BASE_URL is configured to your backend.`,
      );
    }

    if (response.status === 401 && retryCount < config.sessionRefreshRetryCount) {
      callbacks.pushActivity('info', 'Session refresh', 'Received 401, attempting secure session refresh.');
      try {
        await refreshSession(activeToken);
      } catch {
        clearSession();
      }
      return request<T>(path, options, retryCount + 1);
    }

    if (!response.ok) {
      const code = parseApiErrorCode(payload);
      if (code) {
        callbacks.setErrorCode(code);
      }
      if (isSessionBootstrapBlockingCode(code)) {
        callbacks.setSessionBlocked(true);
      }
      throw createDashboardApiError(
        parseApiError(payload, response.status),
        {
          code,
          httpStatus: response.status,
        },
      );
    }

    callbacks.setErrorCode('');
    return (payload ?? {}) as T;
  };

  return {
    createSession,
    refreshSession,
    request,
    clearSession,
  };
}
