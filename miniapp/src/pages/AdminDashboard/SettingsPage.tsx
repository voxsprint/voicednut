import { UiButton, UiStatePanel } from '@/components/ui/AdminPrimitives';

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

type SettingsRowProps = {
  icon: string;
  iconTone: string;
  title: string;
  description?: string;
  value?: string;
  onClick?: () => void;
  disabled?: boolean;
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
    case 'calllog':
      return { token: '⌕', tone: 'is-blue' };
    case 'callerflags':
      return { token: '⚐', tone: 'is-orange' };
    case 'scriptsparity':
      return { token: '⌘', tone: 'is-violet' };
    case 'messaging':
      return { token: '✉', tone: 'is-green' };
    case 'persona':
      return { token: '☰', tone: 'is-cyan' };
    case 'users':
      return { token: '◎', tone: 'is-yellow' };
    case 'audit':
      return { token: '⚑', tone: 'is-red' };
    default:
      return { token: '•', tone: 'is-blue' };
  }
}

function SettingsRow({
  icon,
  iconTone,
  title,
  description,
  value,
  onClick,
  disabled = false,
}: SettingsRowProps) {
  const rowBody = (
    <>
      <span className={`va-settings-icon ${iconTone}`}>{icon}</span>
      <span className="va-settings-copy">
        <strong>{title}</strong>
        {description ? <span className="va-settings-desc">{description}</span> : null}
      </span>
      <span className="va-settings-trail">
        {value ? <span className="va-settings-value">{value}</span> : null}
        {onClick ? <span className="va-settings-arrow" aria-hidden>›</span> : null}
      </span>
    </>
  );

  if (onClick) {
    return (
      <UiButton
        variant="plain"
        className="va-settings-row va-settings-row-btn"
        onClick={onClick}
        disabled={disabled}
      >
        {rowBody}
      </UiButton>
    );
  }

  return (
    <div className="va-settings-row">
      {rowBody}
    </div>
  );
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
  const liveUpdatesLabel = pollingPaused ? 'Off' : 'On';
  const roleLabel = sessionRole.slice(0, 1).toUpperCase() + sessionRole.slice(1);
  const hasModuleAccess = (moduleId: string): boolean => (
    visibleModules.some((module) => module.id === moduleId)
  );

  return (
    <section className="va-settings-page">
      <div className="va-settings-hero">
        <div className="va-settings-title-wrap">
          <h2 className="va-settings-title">General settings</h2>
          <p className="va-muted">Manage account access, sync controls, and workspace shortcuts.</p>
        </div>
        <div className="va-settings-summary">
          <span className={`va-settings-flag-state ${pollingPaused ? 'is-disabled' : 'is-enabled'}`}>
            Live updates {liveUpdatesLabel}
          </span>
          <span className="va-settings-meta">Role {roleLabel}</span>
        </div>
      </div>

      <section className="va-settings-cluster">
        <p className="va-settings-section-label">General settings</p>
        <div className="va-settings-group">
          <SettingsRow
            icon="◎"
            iconTone="is-cyan"
            title={userLabel}
            description={`Signed in as ${sessionRole}.`}
            value={roleLabel}
          />
          <SettingsRow
            icon="⌨"
            iconTone="is-blue"
            title="Keyboard shortcuts"
            description="Navigation and command shortcuts."
            value="View"
            onClick={onOpenShortcuts}
            disabled={loading}
          />
          <SettingsRow
            icon="⟳"
            iconTone={pollingPaused ? 'is-orange' : 'is-green'}
            title="Live updates"
            description="Pause or resume background refresh loops."
            value={liveUpdatesLabel}
            onClick={onTogglePolling}
          />
          <SettingsRow
            icon="↻"
            iconTone="is-green"
            title="Sync now"
            description="Fetch latest dashboard and module snapshots."
            value={actionsDisabled ? 'Busy' : 'Now'}
            onClick={onSyncNow}
            disabled={actionsDisabled}
          />
          <SettingsRow
            icon="⌁"
            iconTone="is-orange"
            title="Retry session"
            description="Re-establish access token when state is stale."
            value={actionsDisabled ? 'Busy' : 'Recover'}
            onClick={onRetrySession}
            disabled={actionsDisabled}
          />
        </div>
      </section>

      <section className="va-settings-cluster">
        <p className="va-settings-section-label">Workspace</p>
        <div className="va-settings-group">
        {visibleModules.length === 0 ? (
          <div className="va-settings-empty">
            <UiStatePanel
              compact
              title="No modules available"
              description="This role currently has no enabled workspaces."
            />
          </div>
        ) : (
          visibleModules.map((module) => {
            const badge = moduleBadge(module.id);
            return (
              <SettingsRow
                key={module.id}
                icon={badge.token}
                iconTone={badge.tone}
                title={module.label}
                description="Jump directly to this workspace."
                value="Open"
                onClick={() => onJumpToModule(module.id)}
              />
            );
          })
        )}
        </div>
      </section>

      <section className="va-settings-cluster">
        <p className="va-settings-section-label">Diagnostics</p>
        <div className="va-settings-group">
          <SettingsRow
            icon="⚙"
            iconTone="is-violet"
            title="Settings integration"
            description="Telegram native settings button binding."
            value={settingsStatusLabel}
          />
          <SettingsRow
            icon="⌘"
            iconTone="is-yellow"
            title="Version & network"
            description={apiBaseLabel}
            value="Bound"
          />
          <SettingsRow
            icon="⚑"
            iconTone="is-blue"
            title="Feature flags"
            description={`Source: ${featureFlagsSourceLabel}`}
            value={String(featureFlagsCount)}
          />
          <div className="va-settings-footnote">Updated {featureFlagsUpdatedAtLabel}</div>
        </div>
      </section>

      <section className="va-settings-cluster">
        <p className="va-settings-section-label">Support tools</p>
        <div className="va-settings-group">
          <SettingsRow
            icon="⚑"
            iconTone="is-red"
            title="Incident runbooks"
            description="Open runbooks and incident timelines."
            value={hasModuleAccess('audit') ? 'Open' : 'Locked'}
            onClick={hasModuleAccess('audit') ? () => onJumpToModule('audit') : undefined}
          />
          <SettingsRow
            icon="⛭"
            iconTone="is-orange"
            title="Provider diagnostics"
            description="Check provider readiness and preflight controls."
            value={hasModuleAccess('provider') ? 'Open' : 'Locked'}
            onClick={hasModuleAccess('provider') ? () => onJumpToModule('provider') : undefined}
          />
          <SettingsRow
            icon="✉"
            iconTone="is-green"
            title="Messaging diagnostics"
            description="Review SMS/email investigation and delivery health."
            value={hasModuleAccess('messaging') ? 'Open' : 'Locked'}
            onClick={hasModuleAccess('messaging') ? () => onJumpToModule('messaging') : undefined}
          />
        </div>
      </section>
    </section>
  );
}
