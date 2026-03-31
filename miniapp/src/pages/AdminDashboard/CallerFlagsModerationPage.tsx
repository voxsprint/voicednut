import { useEffect, useState } from 'react';

import { buildModuleRequestState } from './moduleRequestState';
import type { DashboardVm } from './types';
import { useInvestigationAction } from './useInvestigationAction';
import { selectScriptStudioPageVm } from './vmSelectors';
import { UiBadge, UiButton, UiCard, UiInput, UiSelect, UiStatePanel } from '@/components/ui/AdminPrimitives';
import { DASHBOARD_ACTION_CONTRACTS } from '@/contracts/miniappParityContracts';

type CallerFlagsModerationPageProps = {
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

export function CallerFlagsModerationPage({ visible, vm }: CallerFlagsModerationPageProps) {
  if (!visible) return null;

  const { toText, invokeAction, runAction, busyAction } = selectScriptStudioPageVm(vm);

  const [flags, setFlags] = useState<Array<Record<string, unknown>>>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [phoneInput, setPhoneInput] = useState<string>('');
  const [statusInput, setStatusInput] = useState<string>('blocked');
  const [noteInput, setNoteInput] = useState<string>('');
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

  const loadFlags = async (): Promise<void> => {
    const status = statusFilter === 'all' ? undefined : statusFilter;
    await runInvestigationAction(
      DASHBOARD_ACTION_CONTRACTS.CALLERFLAGS_LIST,
      { status, limit: 120 },
      (data) => {
        setFlags(toRows(data.flags));
      },
    );
  };

  useEffect(() => {
    void loadFlags();
  }, []);

  return (
    <>
      <section className="va-page-intro">
        <p className="va-kicker">Governance</p>
        <h2 className="va-page-title">Caller Flags Moderation</h2>
        <p className="va-muted">Allow, block, and spam controls for inbound caller classification.</p>
        <div className="va-inline-metrics">
          <UiBadge>Flags {flags.length}</UiBadge>
          <UiBadge>Filter {statusFilter}</UiBadge>
          <UiBadge variant={controlsBusy ? 'info' : 'success'}>{controlsBusy ? 'Updating' : 'Idle'}</UiBadge>
        </div>
      </section>

      <section className="va-grid">
        <UiCard>
          <h3>Moderation Controls</h3>
          <div className="va-inline-tools">
            <UiSelect
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All</option>
              <option value="allowed">Allowed</option>
              <option value="blocked">Blocked</option>
              <option value="spam">Spam</option>
            </UiSelect>
            <UiButton variant="secondary" disabled={controlsBusy} onClick={() => { void loadFlags(); }}>
              Refresh Flags
            </UiButton>
          </div>
          <div className="va-inline-tools">
            <UiInput
              placeholder="Phone (+1555...)"
              value={phoneInput}
              onChange={(event) => setPhoneInput(event.target.value)}
            />
            <UiSelect
              value={statusInput}
              onChange={(event) => setStatusInput(event.target.value)}
            >
              <option value="blocked">Blocked</option>
              <option value="allowed">Allowed</option>
              <option value="spam">Spam</option>
            </UiSelect>
            <UiInput
              placeholder="Note (optional)"
              value={noteInput}
              onChange={(event) => setNoteInput(event.target.value)}
            />
            <UiButton
              variant="primary"
              disabled={controlsBusy || !phoneInput.trim()}
              onClick={() => {
                void runAction(
                  DASHBOARD_ACTION_CONTRACTS.CALLERFLAGS_UPSERT,
                  {
                    phone_number: phoneInput.trim(),
                    status: statusInput,
                    note: noteInput.trim() || undefined,
                  },
                  {
                    successMessage: `Updated caller flag for ${phoneInput.trim()}`,
                    onSuccess: () => {
                      setPhoneInput('');
                      setNoteInput('');
                      void loadFlags();
                    },
                  },
                );
              }}
            >
              Upsert Flag
            </UiButton>
          </div>
          {flags.length === 0 ? (
            <UiStatePanel
              compact
              title="No caller flags loaded"
              description="Refresh flags or upsert a caller record to populate moderation rows."
            />
          ) : (
            <ul className="va-list va-list-dense">
              {flags.slice(0, 60).map((flag, index) => (
                <li key={`caller-flag-row-${index}`}>
                  <strong>{toText(flag.phone_number, 'n/a')}</strong>
                  <span>{toText(flag.status, 'unknown')}</span>
                  <span>{toText(flag.note, 'no note')}</span>
                </li>
              ))}
            </ul>
          )}
        </UiCard>
      </section>

      {investigationError ? (
        <section className="va-grid">
          <UiCard>
            <UiStatePanel
              title="Caller flags action failed"
              description={investigationError}
              tone="error"
            />
          </UiCard>
        </section>
      ) : null}
    </>
  );
}
