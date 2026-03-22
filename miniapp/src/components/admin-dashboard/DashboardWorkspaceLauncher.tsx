import { UiButton } from '@/components/ui/AdminPrimitives';
import {
  MODULE_CONTEXT,
  moduleGlyph,
  type DashboardModule,
} from '@/pages/AdminDashboard/dashboardShellConfig';

export type DashboardWorkspaceLauncherModule = {
  id: DashboardModule;
  label: string;
};

export type DashboardWorkspaceLauncherGroup = {
  id: string;
  label: string;
  subtitle: string;
  modules: DashboardWorkspaceLauncherModule[];
};

type DashboardWorkspaceLauncherProps = {
  groupedVisibleModules: DashboardWorkspaceLauncherGroup[];
  moduleShortcutIndexById: Record<string, number>;
  activeModule: DashboardModule;
  onSelectModule: (moduleId: DashboardModule) => void;
};

export function DashboardWorkspaceLauncher({
  groupedVisibleModules,
  moduleShortcutIndexById,
  activeModule,
  onSelectModule,
}: DashboardWorkspaceLauncherProps): JSX.Element {
  return (
    <section className="va-overview-launcher" aria-labelledby="va-overview-launcher-title">
      <div className="va-overview-head">
        <h2 id="va-overview-launcher-title" className="va-section-title">Workspace Launcher</h2>
        <p className="va-muted">
          Open a dedicated workspace. Each module runs in focused mode for less visual noise.
        </p>
      </div>
      <div className="va-launcher-groups">
        {groupedVisibleModules.map((group) => (
          <section key={`launcher-group-${group.id}`} className="va-launcher-group">
            <div className="va-launcher-group-head">
              <h3 className="va-launcher-group-title">{group.label}</h3>
              <span className="va-meta-chip">{group.modules.length} modules</span>
            </div>
            <p className="va-muted va-launcher-group-subtitle">{group.subtitle}</p>
            <div className="va-launcher-grid">
              {group.modules.map((module) => {
                const shortcutIndex = moduleShortcutIndexById[module.id] || 0;
                return (
                  <UiButton
                    key={`launcher-${module.id}`}
                    id={`va-launcher-module-${module.id}`}
                    variant="plain"
                    className={`va-launcher-card ${activeModule === module.id ? 'is-active' : ''}`}
                    aria-label={`Open ${module.label} workspace`}
                    aria-pressed={activeModule === module.id}
                    aria-keyshortcuts={shortcutIndex > 0 ? `Alt+${shortcutIndex}` : undefined}
                    onClick={() => onSelectModule(module.id)}
                  >
                    <span className="va-launcher-glyph" aria-hidden>{moduleGlyph(module.id)}</span>
                    <span className="va-launcher-copy">
                      <strong>{module.label}</strong>
                      <span>{MODULE_CONTEXT[module.id].subtitle}</span>
                      {shortcutIndex > 0 ? (
                        <span className="va-launcher-shortcut">Alt + {shortcutIndex}</span>
                      ) : null}
                    </span>
                  </UiButton>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
