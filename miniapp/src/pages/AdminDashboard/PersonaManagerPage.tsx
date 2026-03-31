import { useEffect, useState } from 'react';

import { buildModuleRequestState } from './moduleRequestState';
import type { DashboardVm } from './types';
import { useInvestigationAction } from './useInvestigationAction';
import { selectScriptStudioPageVm } from './vmSelectors';
import {
  UiButton,
  UiCard,
  UiStatePanel,
  UiSurfaceState,
  UiWorkspacePulse,
} from '@/components/ui/AdminPrimitives';
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
  const pulseTone = controlsBusy ? 'info' : custom.length > 0 ? 'success' : 'neutral';
  const pulseStatus = controlsBusy ? 'Refreshing' : custom.length > 0 ? 'Active' : 'Built-ins only';
  const pulseDescription = controlsBusy
    ? `Running ${requestState.activeActionLabel || 'persona sync'}.`
    : 'Review built-in and custom personas before they are used in call and messaging workflows.';

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
      </section>

      <UiWorkspacePulse
        title="Persona catalog"
        description={pulseDescription}
        status={pulseStatus}
        tone={pulseTone}
        items={[
          { label: 'Built-in', value: builtin.length },
          { label: 'Custom', value: custom.length },
          { label: 'Sync state', value: controlsBusy ? 'Refreshing' : 'Ready' },
          { label: 'Visible catalogs', value: builtin.length + custom.length > 0 ? 'Available' : 'Pending' },
        ]}
      />

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
            {builtin.length === 0 ? (
              <UiSurfaceState
                cardTone="subcard"
                compact
                eyebrow="Built-in catalog"
                status="Empty"
                title="No built-in personas reported"
                description="The provider did not return any built-in persona entries."
              />
            ) : (
              <UiCard tone="subcard">
                <h4>Built-in Personas ({builtin.length})</h4>
                <ul className="va-list va-list-dense">
                  {builtin.slice(0, 30).map((persona, index) => (
                    <li key={`persona-builtin-${index}`}>
                      <strong>{toText(persona.label, toText(persona.name, `builtin-${index + 1}`))}</strong>
                      <span>
                        <span className="va-native-list-value">{toText(persona.id, 'n/a')}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </UiCard>
            )}
            {custom.length === 0 ? (
              <UiSurfaceState
                cardTone="subcard"
                eyebrow="Custom catalog"
                status="Built-ins only"
                statusVariant="info"
                title="No custom personas available"
                description="This environment currently exposes built-ins only."
                tone="info"
                compact
              />
            ) : (
              <UiCard tone="subcard">
                <h4>Custom Personas ({custom.length})</h4>
                <ul className="va-list va-list-dense">
                  {custom.slice(0, 30).map((persona, index) => (
                    <li key={`persona-custom-${index}`}>
                      <strong>{toText(persona.label, toText(persona.name, `custom-${index + 1}`))}</strong>
                      <span>
                        <span className="va-native-list-value">{toText(persona.slug, toText(persona.id, 'n/a'))}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </UiCard>
            )}
          </div>
        </UiCard>
      </section>

      {investigationError ? (
        <section className="va-grid">
          <UiSurfaceState
            eyebrow="Catalog sync"
            status="Action failed"
            statusVariant="error"
            title="Persona action failed"
            description={investigationError}
            tone="error"
          />
        </section>
      ) : null}
    </>
  );
}
