type SettingsModule = {
  id: string;
  label: string;
};

type SettingsPageProps = {
  userLabel: string;
  sessionRole: string;
  pollingPaused: boolean;
  loading: boolean;
  busy: boolean;
  settingsStatusLabel: string;
  apiBaseLabel: string;
  featureFlagsCount: number | string;
  featureFlagsSourceLabel: string;
  featureFlagsUpdatedAtLabel: string;
  visibleModules: SettingsModule[];
  onTogglePolling: () => void;
  onSyncNow: () => void;
  onRetrySession: () => void;
  onOpenShortcuts: () => void;
  onJumpToModule: (moduleId: string) => void;
};

function moduleBadge(moduleId: string): { token: string; tone: string } {
  switch (moduleId) {
    case 'ops':
      return { token: '◉', tone: 'is-blue' };
    case 'sms':
      return { token: '✉', tone: 'is-green' };
    case 'mailer':
      return { token: '✦', tone: 'is-violet' };
    case 'provider':
      return { token: '⛭', tone: 'is-orange' };
    case 'content':
      return { token: '✎', tone: 'is-cyan' };
    case 'users':
      return { token: '◎', tone: 'is-yellow' };
    case 'audit':
      return { token: '⚑', tone: 'is-red' };
    default:
      return { token: '•', tone: 'is-blue' };
  }
}

export function SettingsPage({
  userLabel,
  sessionRole,
  pollingPaused,
  loading,
  busy,
  settingsStatusLabel,
  apiBaseLabel,
  featureFlagsCount,
  featureFlagsSourceLabel,
  featureFlagsUpdatedAtLabel,
  visibleModules,
  onTogglePolling,
  onSyncNow,
  onRetrySession,
  onOpenShortcuts,
  onJumpToModule,
}: SettingsPageProps) {
  const actionsDisabled = loading || busy;
  const liveUpdatesLabel = pollingPaused ? 'Paused' : 'Running';

  return (
    <section className="va-settings-page">
      <div className="va-settings-hero">
        <div className="va-settings-title-wrap">
          <h2 className="va-settings-title">Settings</h2>
          <p className="va-muted">Essential controls for account access, sync behavior, and workspace navigation.</p>
        </div>
        <div className="va-settings-summary">
          <span className={`va-settings-flag-state ${pollingPaused ? 'is-disabled' : 'is-enabled'}`}>
            Live Updates {liveUpdatesLabel}
          </span>
          <span className="va-settings-meta">Role {sessionRole}</span>
        </div>
      </div>

      <div className="va-settings-group">
        <h3>Account & Access</h3>
        <div className="va-settings-row">
          <span className="va-settings-icon is-cyan">◎</span>
          <div>
            <strong>{userLabel}</strong>
            <p className="va-muted">Signed in as {sessionRole}.</p>
          </div>
          <span className="va-settings-meta">Account</span>
        </div>
        <button
          type="button"
          className="va-settings-row va-settings-row-btn"
          onClick={onOpenShortcuts}
          disabled={loading}
        >
          <span className="va-settings-icon is-blue">⌨</span>
          <div>
            <strong>Keyboard Shortcuts</strong>
            <p className="va-muted">View navigation and command shortcuts.</p>
          </div>
          <span className="va-settings-trail">
            <span className="va-settings-meta">Open</span>
            <span className="va-settings-arrow" aria-hidden>›</span>
          </span>
        </button>
      </div>

      <div className="va-settings-group">
        <h3>Sync & Reliability</h3>
        <button type="button" className="va-settings-row va-settings-row-btn" onClick={onTogglePolling}>
          <span className={`va-settings-icon ${pollingPaused ? 'is-orange' : 'is-green'}`}>⟳</span>
          <div>
            <strong>Live Updates</strong>
            <p className="va-muted">Pause or resume background sync and refresh loops.</p>
          </div>
          <span className="va-settings-trail">
            <span className={`va-settings-flag-state ${pollingPaused ? 'is-disabled' : 'is-enabled'}`}>
              {liveUpdatesLabel}
            </span>
            <span className="va-settings-arrow" aria-hidden>›</span>
          </span>
        </button>
        <button
          type="button"
          className="va-settings-row va-settings-row-btn"
          onClick={onSyncNow}
          disabled={actionsDisabled}
        >
          <span className="va-settings-icon is-green">↻</span>
          <div>
            <strong>Sync Now</strong>
            <p className="va-muted">Fetch latest dashboard data and module snapshots.</p>
          </div>
          <span className="va-settings-trail">
            <span className="va-settings-meta">Run</span>
            <span className="va-settings-arrow" aria-hidden>›</span>
          </span>
        </button>
        <button
          type="button"
          className="va-settings-row va-settings-row-btn"
          onClick={onRetrySession}
          disabled={actionsDisabled}
        >
          <span className="va-settings-icon is-orange">⌁</span>
          <div>
            <strong>Retry Session</strong>
            <p className="va-muted">Re-establish session token if access appears stale.</p>
          </div>
          <span className="va-settings-trail">
            <span className="va-settings-meta">Reset</span>
            <span className="va-settings-arrow" aria-hidden>›</span>
          </span>
        </button>
      </div>

      <div className="va-settings-group">
        <h3>Workspace</h3>
        {visibleModules.length === 0 ? (
          <p className="va-muted va-settings-empty">No modules available for this role.</p>
        ) : (
          visibleModules.map((module) => {
            const badge = moduleBadge(module.id);
            return (
              <button
                key={module.id}
                type="button"
                className="va-settings-row va-settings-row-btn"
                onClick={() => onJumpToModule(module.id)}
              >
                <span className={`va-settings-icon ${badge.tone}`}>{badge.token}</span>
                <div>
                  <strong>{module.label}</strong>
                  <p className="va-muted">Jump directly to this workspace.</p>
                </div>
                <span className="va-settings-trail">
                  <span className="va-settings-meta">Open</span>
                  <span className="va-settings-arrow" aria-hidden>›</span>
                </span>
              </button>
            );
          })
        )}
      </div>

      <div className="va-settings-group">
        <details className="va-settings-advanced">
          <summary>Advanced Diagnostics</summary>
          <p className="va-muted">Troubleshooting metadata for support and environment verification.</p>
          <div className="va-settings-row">
            <span className="va-settings-icon is-violet">⚙</span>
            <div>
              <strong>Settings Integration</strong>
              <p className="va-muted">Telegram native settings button binding state.</p>
            </div>
            <span className="va-settings-meta">{settingsStatusLabel}</span>
          </div>
          <div className="va-settings-row">
            <span className="va-settings-icon is-yellow">⌘</span>
            <div>
              <strong>API Origin</strong>
              <p className="va-muted">{apiBaseLabel}</p>
            </div>
            <span className="va-settings-meta">Bound</span>
          </div>
          <div className="va-settings-row">
            <span className="va-settings-icon is-blue">⚑</span>
            <div>
              <strong>Feature Flag Snapshot</strong>
              <p className="va-muted">Source: {featureFlagsSourceLabel}</p>
            </div>
            <span className="va-settings-meta">{featureFlagsCount}</span>
          </div>
          <p className="va-muted va-settings-advanced-footnote">Updated {featureFlagsUpdatedAtLabel}</p>
        </details>
      </div>
    </section>
  );
}
