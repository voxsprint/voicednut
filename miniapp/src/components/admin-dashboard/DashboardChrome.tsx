import { UiBadge, UiButton } from '@/components/ui/AdminPrimitives';

type ModuleItem = {
  id: string;
  label: string;
};

type DashboardSettingsHeaderProps = {
  loading: boolean;
  busy: boolean;
  onBack: () => void;
  onSync: () => void;
};

type DashboardMainHeaderProps = {
  userLabel: string;
  sessionRole: string;
  sessionRoleSource: string;
  settingsStatusLabel: string;
  featureFlagsCount: number | string;
  moduleDetail: string;
  activeModuleGlyph: string;
  loading: boolean;
  compact?: boolean;
  onOpenShortcuts: () => void;
};

type DashboardModuleNavProps = {
  modules: ModuleItem[];
  activeModuleId: string;
  onSelectModule: (moduleId: string) => void;
};

type DashboardFocusedHeaderProps = {
  title: string;
  subtitle: string;
  loading: boolean;
  onBackToDashboard: () => void;
  onOpenSettings: () => void;
  onOpenShortcuts: () => void;
};

type DashboardBottomNavProps = {
  modules: ModuleItem[];
  activeModuleId: string;
  moduleGlyph: (moduleId: string) => string;
  onSelectModule: (moduleId: string) => void;
};

export function DashboardSettingsHeader({
  loading,
  busy,
  onBack,
  onSync,
}: DashboardSettingsHeaderProps) {
  return (
    <header className="va-header is-settings">
      <div className="va-settings-header-grid">
        <UiButton
          variant="plain"
          className="va-settings-back"
          onClick={onBack}
          disabled={loading}
        >
          Back
        </UiButton>
        <div className="va-settings-header-center">
          <strong>VOICEDNUT</strong>
          <span>mini app</span>
        </div>
        <UiButton
          variant="secondary"
          className="va-settings-header-action"
          onClick={onSync}
          disabled={loading || busy}
        >
          Sync
        </UiButton>
      </div>
    </header>
  );
}

export function DashboardMainHeader({
  userLabel,
  sessionRole,
  sessionRoleSource,
  settingsStatusLabel,
  featureFlagsCount,
  moduleDetail,
  activeModuleGlyph,
  loading,
  compact = false,
  onOpenShortcuts,
}: DashboardMainHeaderProps) {
  return (
    <header className="va-header">
      <div className="va-header-copy">
        <h1>Voicednut Admin</h1>
        <p className="va-muted">Operational control center for providers, messaging, and incidents.</p>
        <p className="va-module-context-line va-muted">
          <span className="va-module-context-icon" aria-hidden>{activeModuleGlyph}</span>
          <span>{moduleDetail}</span>
        </p>
      </div>
      <div className="va-header-meta">
        <div className="va-meta-chips">
          <UiBadge>Admin {userLabel}</UiBadge>
          <UiBadge>Role {sessionRole}</UiBadge>
          {compact ? null : (
            <>
              <UiBadge>Source {sessionRoleSource}</UiBadge>
              <UiBadge>Settings {settingsStatusLabel}</UiBadge>
              <UiBadge>Flags {featureFlagsCount}</UiBadge>
            </>
          )}
        </div>
        <div className="va-header-actions">
          <UiButton
            id="va-main-shortcuts-btn"
            variant="secondary"
            aria-keyshortcuts="Alt+Slash Shift+Slash"
            onClick={onOpenShortcuts}
            disabled={loading}
          >
            Shortcuts
          </UiButton>
        </div>
      </div>
    </header>
  );
}

export function DashboardModuleNav({
  modules,
  activeModuleId,
  onSelectModule,
}: DashboardModuleNavProps) {
  return (
    <nav className="va-module-nav" aria-label="Module navigation">
      {modules.map((module, index) => (
        <UiButton
          key={module.id}
          id={`va-module-chip-${module.id}`}
          variant="chip"
          className={activeModuleId === module.id ? 'is-active' : ''}
          aria-pressed={activeModuleId === module.id}
          aria-current={activeModuleId === module.id ? 'page' : undefined}
          aria-label={`Open ${module.label} module`}
          aria-keyshortcuts={`Alt+${index + 1}`}
          aria-controls="va-view-stage-root"
          onClick={() => onSelectModule(module.id)}
        >
          {module.label}
        </UiButton>
      ))}
    </nav>
  );
}

export function DashboardFocusedHeader({
  title,
  subtitle,
  loading,
  onBackToDashboard,
  onOpenSettings,
  onOpenShortcuts,
}: DashboardFocusedHeaderProps) {
  return (
    <header className="va-focused-header">
      <div className="va-focused-main">
        <UiButton
          variant="plain"
          className="va-focused-back"
          onClick={onBackToDashboard}
          disabled={loading}
        >
          ← Dashboard
        </UiButton>
        <div className="va-focused-copy">
          <h2 className="va-page-title">{title}</h2>
          <p className="va-muted">{subtitle}</p>
        </div>
      </div>
      <div className="va-focused-actions">
        <UiButton
          variant="secondary"
          className="va-focused-icon-btn"
          aria-label="Open keyboard shortcuts"
          aria-keyshortcuts="Alt+Slash Shift+Slash"
          title="Shortcuts"
          onClick={onOpenShortcuts}
          disabled={loading}
        >
          ⌨
        </UiButton>
        <UiButton
          variant="secondary"
          className="va-focused-icon-btn"
          aria-label="Open settings"
          aria-keyshortcuts="Control+Comma Meta+Comma Alt+S"
          title="Settings"
          onClick={onOpenSettings}
          disabled={loading}
        >
          ⚙
        </UiButton>
      </div>
    </header>
  );
}

export function DashboardBottomNav({
  modules,
  activeModuleId,
  moduleGlyph,
  onSelectModule,
}: DashboardBottomNavProps) {
  return (
    <nav className="va-bottom-nav-wrap" aria-label="Quick module navigation">
      <div className="va-bottom-nav">
        {modules.map((module, index) => (
          <UiButton
            key={`bottom-${module.id}`}
            id={`va-module-bottom-${module.id}`}
            variant="plain"
            className={`va-bottom-nav-item ${activeModuleId === module.id ? 'is-active' : ''}`}
            aria-current={activeModuleId === module.id ? 'page' : undefined}
            aria-label={`Open ${module.label} module`}
            aria-keyshortcuts={`Alt+${index + 1}`}
            aria-controls="va-view-stage-root"
            onClick={() => onSelectModule(module.id)}
          >
            <span className="va-bottom-nav-glyph" aria-hidden>{moduleGlyph(module.id)}</span>
            <span>{module.label}</span>
          </UiButton>
        ))}
      </div>
    </nav>
  );
}
