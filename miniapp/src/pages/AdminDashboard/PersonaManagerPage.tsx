import { useEffect, useState } from 'react';

import { buildModuleRequestState } from './moduleRequestState';
import type { DashboardVm } from './types';
import { useInvestigationAction } from './useInvestigationAction';
import { selectScriptStudioPageVm } from './vmSelectors';
import { UiBadge, UiButton, UiCard, UiStatePanel } from '@/components/ui/AdminPrimitives';
import { DASHBOARD_ACTION_CONTRACTS } from '@/contracts/miniappParityContracts';

type PersonaManagerPageProps = {
  visible: boolean;
  vm: DashboardVm;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function toRows(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => asRecord(entry));
}

export function PersonaManagerPage({ visible, vm }: PersonaManagerPageProps) {
  if (!visible) return null;

  const { toText, invokeAction, busyAction } = selectScriptStudioPageVm(vm);

  const [builtin, setBuiltin] = useState<Array<Record<string, unknown>>>([]);
  const [custom, setCustom] = useState<Array<Record<string, unknown>>>([]);
  const {
    investigationBusy,
    investigationError,
    runInvestigationAction,
  } = useInvestigationAction(invokeAction);
  const requestState = buildModuleRequestState({
    busyAction,
    secondaryBusyAction: investigationBusy,
  });
  const controlsBusy = requestState.isBusy;

  const loadPersonas = async (): Promise<void> => {
    await runInvestigationAction(
      DASHBOARD_ACTION_CONTRACTS.PERSONA_LIST,
      {},
      (data) => {
        setBuiltin(toRows(data.builtin));
        setCustom(toRows(data.custom));
      },
    );
  };

  useEffect(() => {
    void loadPersonas();
  }, []);

  return (
    <>
      <section className="va-page-intro">
        <p className="va-kicker">Content</p>
        <h2 className="va-page-title">Persona Manager</h2>
        <p className="va-muted">Review built-in and custom persona catalogs used by call scripts and agents.</p>
        <div className="va-inline-metrics">
          <UiBadge>Built-in {builtin.length}</UiBadge>
          <UiBadge>Custom {custom.length}</UiBadge>
          <UiBadge variant={controlsBusy ? 'info' : 'success'}>{controlsBusy ? 'Refreshing' : 'Synced'}</UiBadge>
        </div>
      </section>

      <section className="va-grid">
        <UiCard>
          <h3>Persona Catalog</h3>
          <div className="va-inline-tools">
            <UiButton
              variant="secondary"
              disabled={controlsBusy}
              onClick={() => { void loadPersonas(); }}
            >
              Refresh Personas
            </UiButton>
          </div>
          {controlsBusy ? (
            <UiStatePanel
              compact
              title="Refreshing persona catalog"
              description="Loading builtin and custom persona definitions."
            />
          ) : null}
          <div className="va-subcard-grid va-subcard-grid-two">
            <UiCard tone="subcard">
              <h4>Built-in Personas ({builtin.length})</h4>
              {builtin.length === 0 ? (
                <UiStatePanel
                  compact
                  title="No built-in personas reported"
                  description="The provider did not return any built-in persona entries."
                />
              ) : (
                <ul className="va-list va-list-dense">
                  {builtin.slice(0, 30).map((persona, index) => (
                    <li key={`persona-builtin-${index}`}>
                      <strong>{toText(persona.label, toText(persona.name, `builtin-${index + 1}`))}</strong>
                      <span>
                        <UiBadge variant="info">{toText(persona.id, 'n/a')}</UiBadge>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </UiCard>
            <UiCard tone="subcard">
              <h4>Custom Personas ({custom.length})</h4>
              {custom.length === 0 ? (
                <UiStatePanel
                  title="No custom personas available"
                  description="This environment currently exposes built-ins only."
                  tone="info"
                  compact
                />
              ) : (
                <ul className="va-list va-list-dense">
                  {custom.slice(0, 30).map((persona, index) => (
                    <li key={`persona-custom-${index}`}>
                      <strong>{toText(persona.label, toText(persona.name, `custom-${index + 1}`))}</strong>
                      <span>
                        <UiBadge>{toText(persona.slug, toText(persona.id, 'n/a'))}</UiBadge>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </UiCard>
          </div>
        </UiCard>
      </section>

      {investigationError ? (
        <section className="va-grid">
          <UiCard>
            <UiStatePanel
              title="Persona action failed"
              description={investigationError}
              tone="error"
            />
          </UiCard>
        </section>
      ) : null}
    </>
  );
}
