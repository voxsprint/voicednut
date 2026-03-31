import { UiBadge, UiButton } from '@/components/ui/AdminPrimitives';
import { DashboardAvatar } from '@/components/admin-dashboard/DashboardAvatar';

type ModuleItem = {
  id: string;
  label: string;
};

type DashboardMainHeaderProps = {
  userLabel: string;
  userAvatarUrl: string;
  userAvatarFallback: string;
  sessionRole: string;
  sessionRoleSource: string;
  settingsStatusLabel: string;
  featureFlagsCount: number | string;
  moduleDetail: string;
  activeModuleGlyph: string;
  loading: boolean;
  compact?: boolean;
  onOpenSettings: () => void;
};

type DashboardModuleNavProps = {
  modules: ModuleItem[];
  activeModuleId: string;
  onSelectModule: (moduleId: string) => void;
};

type DashboardFocusedHeaderProps = {
  title: string;
  subtitle: string;
  userAvatarUrl: string;
  userAvatarFallback: string;
  loading: boolean;
  onBackToDashboard: () => void;
  onOpenSettings: () => void;
};

type DashboardBottomNavProps = {
  modules: ModuleItem[];
  activeModuleId: string;
  moduleGlyph: (moduleId: string) => string;
  onSelectModule: (moduleId: string) => void;
};

type DashboardProfileAvatarButtonProps = {
  userLabel: string;
  userAvatarUrl: string;
  userAvatarFallback: string;
  compact?: boolean;
  loading: boolean;
  onOpenSettings: () => void;
};

function DashboardProfileAvatarButton({
  userLabel,
  userAvatarUrl,
  userAvatarFallback,
  compact = false,
  loading,
  onOpenSettings,
}: DashboardProfileAvatarButtonProps) {
  const triggerClass = compact
    ? 'va-profile-trigger va-profile-trigger-sm'
    : 'va-profile-trigger';
  const profileAlt = compact ? 'Profile' : `${userLabel} profile`;
  return (
    <UiButton
      variant="plain"
      className={triggerClass}
      aria-label="Open settings"
      title="Open settings"
      onClick={onOpenSettings}
      disabled={loading}
    >
      <DashboardAvatar
        src={userAvatarUrl}
        alt={profileAlt}
        fallback={userAvatarFallback}
      />
    </UiButton>
  );
}

export function DashboardMainHeader({
  userLabel,
  userAvatarUrl,
  userAvatarFallback,
  sessionRole,
  sessionRoleSource,
  settingsStatusLabel,
  featureFlagsCount,
  moduleDetail,
  activeModuleGlyph,
  loading,
  compact = false,
  onOpenSettings,
}: DashboardMainHeaderProps) {
  return (
    <header className="va-header">
      <div className="va-header-primary">
        <DashboardProfileAvatarButton
          userLabel={userLabel}
          userAvatarUrl={userAvatarUrl}
          userAvatarFallback={userAvatarFallback}
          compact={compact}
          loading={loading}
          onOpenSettings={onOpenSettings}
        />
        <div className="va-header-copy">
          <h1>Voicednut Console</h1>
          <p className="va-muted">Monitor reliability, triage incidents, and run provider and messaging operations.</p>
          <p className="va-module-context-line va-muted">
            <span className="va-module-context-icon" aria-hidden>{activeModuleGlyph}</span>
            <span>{moduleDetail}</span>
          </p>
        </div>
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
  userAvatarUrl,
  userAvatarFallback,
  loading,
  onBackToDashboard,
  onOpenSettings,
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
        <DashboardProfileAvatarButton
          userLabel={title}
          userAvatarUrl={userAvatarUrl}
          userAvatarFallback={userAvatarFallback}
          compact
          loading={loading}
          onOpenSettings={onOpenSettings}
        />
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
