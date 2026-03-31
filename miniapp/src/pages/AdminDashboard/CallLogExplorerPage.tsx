import { useMemo, useState } from 'react';

import { buildModuleRequestState } from './moduleRequestState';
import type { CallLogRow, DashboardVm } from './types';
import { useInvestigationAction } from './useInvestigationAction';
import { selectOpsPageVm } from './vmSelectors';
import { DASHBOARD_ACTION_CONTRACTS } from '@/contracts/miniappParityContracts';
import { UiBadge, UiButton, UiCard, UiInput, UiStatePanel } from '@/components/ui/AdminPrimitives';

type CallLogExplorerPageProps = {
  visible: boolean;
  vm: DashboardVm;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function CallLogExplorerPage({ visible, vm }: CallLogExplorerPageProps) {
  if (!visible) return null;

  const {
    busyAction,
    invokeAction,
    toText,
    toInt,
    formatTime,
    callLogs,
    callLogsTotal,
    loading,
  } = selectOpsPageVm(vm);

  const [query, setQuery] = useState<string>('');
  const [callSid, setCallSid] = useState<string>('');
  const [rows, setRows] = useState<CallLogRow[]>([]);
  const [details, setDetails] = useState<Record<string, unknown> | null>(null);
  const [detailsSid, setDetailsSid] = useState<string>('');
  const [events, setEvents] = useState<Array<Record<string, unknown>>>([]);
  const [eventsSid, setEventsSid] = useState<string>('');
  const [validationError, setValidationError] = useState<string>('');
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
  const activeActionLabel = requestState.activeActionLabel;
  const error = validationError || investigationError;

  const recentStates = useMemo(() => events.slice(0, 12), [events]);
  const activeSid = callSid.trim();
  const hasDetails = Boolean(details) && detailsSid === activeSid;
  const hasEvents = recentStates.length > 0 && eventsSid === activeSid;
  const loadedRowsCount = rows.length > 0 ? rows.length : callLogs.length;

  const loadRows = async (): Promise<void> => {
    setValidationError('');
    const trimmed = query.trim();
    const action = trimmed.length >= 2
      ? DASHBOARD_ACTION_CONTRACTS.CALLS_SEARCH
      : DASHBOARD_ACTION_CONTRACTS.CALLS_LIST;
    const payload = trimmed.length >= 2
      ? { query: trimmed, limit: 20 }
      : { limit: 20, offset: 0 };
    await runInvestigationAction(action, payload, (data) => {
      const nextRows = Array.isArray(data.results)
        ? data.results as CallLogRow[]
        : Array.isArray(data.rows)
          ? data.rows as CallLogRow[]
          : [];
      setRows(nextRows);
      if (nextRows.length > 0 && !activeSid) {
        const firstSid = toText(nextRows[0]?.call_sid, '');
        if (firstSid) setCallSid(firstSid);
      }
    });
  };

  const loadDetails = async (): Promise<void> => {
    const targetSid = callSid.trim();
    if (!targetSid) {
      setValidationError('Provide a call SID before loading details.');
      return;
    }
    setValidationError('');
    await runInvestigationAction(DASHBOARD_ACTION_CONTRACTS.CALLS_GET, { call_sid: targetSid }, (data) => {
      const nextDetails = data.call && typeof data.call === 'object' && !Array.isArray(data.call)
        ? data.call as Record<string, unknown>
        : data;
      setDetails(nextDetails);
      setDetailsSid(targetSid);
    });
  };

  const loadEvents = async (): Promise<void> => {
    const targetSid = callSid.trim();
    if (!targetSid) {
      setValidationError('Provide a call SID before loading events.');
      return;
    }
    setValidationError('');
    await runInvestigationAction(DASHBOARD_ACTION_CONTRACTS.CALLS_EVENTS, { call_sid: targetSid }, (data) => {
      setEvents(Array.isArray(data.recent_states) ? data.recent_states.map(asRecord) : []);
      setEventsSid(targetSid);
    });
  };

  return (
    <>
      <section className="va-page-intro">
        <p className="va-kicker">Operations</p>
        <h2 className="va-page-title">Call Log Explorer</h2>
        <p className="va-muted">Search and inspect call records, state transitions, and runtime details.</p>
        <div className="va-inline-metrics">
          <UiBadge>Rows {rows.length}</UiBadge>
          <UiBadge>Recent logs {callLogs.length}</UiBadge>
          <UiBadge>Selected SID {callSid.trim() ? 'set' : 'none'}</UiBadge>
          <UiBadge>Events {recentStates.length}</UiBadge>
        </div>
      </section>

      <section className={`va-overview-metrics va-investigation-metrics ${error ? 'is-degraded' : 'is-healthy'}`} aria-label="Explorer summary">
        <article className="va-overview-metric-card">
          <span>Loaded rows</span>
          <strong>{loadedRowsCount}</strong>
        </article>
        <article className="va-overview-metric-card">
          <span>Total call logs</span>
          <strong>{callLogsTotal}</strong>
        </article>
        <article className="va-overview-metric-card">
          <span>Details state</span>
          <strong>{hasDetails ? 'Loaded' : activeSid ? 'Pending' : 'Not selected'}</strong>
        </article>
        <article className="va-overview-metric-card">
          <span>Events state</span>
          <strong>{hasEvents ? 'Loaded' : activeSid ? 'Pending' : 'Not selected'}</strong>
        </article>
      </section>

      {loading && rows.length === 0 && callLogs.length === 0 ? (
        <section className="va-grid">
          <UiCard>
            <UiStatePanel
              title="Loading call telemetry"
              description="Syncing latest call records and explorer metadata."
              tone="info"
            />
          </UiCard>
        </section>
      ) : null}

      <section className="va-section-block">
        <header className="va-section-header">
          <h3 className="va-section-title">Search & Inspect</h3>
          <p className="va-muted">Find a call by SID/number, then inspect its snapshot and timeline.</p>
        </header>
        <section className="va-grid">
          <UiCard className="va-investigation-card">
          <h3>Call Search</h3>
          <div className="va-inline-tools">
            <UiInput
              value={query}
              placeholder="Search by call SID, phone, or status"
              onChange={(event) => setQuery(event.target.value)}
            />
            <UiButton
              variant="secondary"
              disabled={controlsBusy}
              onClick={() => { void loadRows(); }}
            >
              {query.trim().length >= 2 ? 'Search' : 'Load Recent'}
            </UiButton>
          </div>
          {controlsBusy ? (
            <UiStatePanel
              compact
              title="Request in progress"
              description={`Running ${activeActionLabel || 'request'}...`}
            />
          ) : null}
          {error ? (
            <UiStatePanel
              title="Call explorer request failed"
              description={error}
              tone="error"
              compact
            />
          ) : null}
          {rows.length === 0 ? (
            <UiStatePanel
              compact
              title="No call rows loaded"
              description={query.trim().length >= 2
                ? `No calls matched "${query.trim()}".`
                : 'Run a search or load recent calls to populate this list.'}
            />
          ) : (
            <ul className="va-native-list">
              {rows.slice(0, 16).map((row, index) => {
                const rowSid = toText(row.call_sid, `call-${index + 1}`);
                const selected = rowSid === callSid.trim();
                const status = toText(row.status_normalized, toText(row.status, 'unknown'));
                return (
                  <li key={`call-log-explorer-row-${rowSid}-${index}`} className="va-native-list-row">
                    <div className="va-native-list-head">
                      <UiButton
                        variant="chip"
                        className={selected ? 'is-active' : ''}
                        onClick={() => setCallSid(rowSid)}
                      >
                        {rowSid}
                      </UiButton>
                      <span className="va-native-list-value">{status}</span>
                    </div>
                    <div className="va-native-list-meta">
                      <span>Number {toText(row.phone_number, 'n/a')}</span>
                      <span>{formatTime(row.created_at)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          </UiCard>

          <UiCard className="va-investigation-card">
          <h3>Call Detail</h3>
          {!callSid.trim() ? (
            <UiStatePanel
              compact
              title="No call SID selected"
              description="Select a call row or enter a call SID to inspect details and events."
              tone="warning"
            />
          ) : null}
          <div className="va-inline-tools">
            <UiInput
              value={callSid}
              placeholder="Call SID"
              onChange={(event) => setCallSid(event.target.value)}
            />
            <UiButton
              variant="secondary"
              disabled={controlsBusy || !callSid.trim()}
              onClick={() => { void loadDetails(); }}
            >
              Details
            </UiButton>
            <UiButton
              variant="secondary"
              disabled={controlsBusy || !callSid.trim()}
              onClick={() => { void loadEvents(); }}
            >
              Events
            </UiButton>
          </div>
          {hasDetails ? (
            <ul className="va-native-list">
              <li className="va-native-list-row">
                <div className="va-native-list-head">
                  <strong>Call SID</strong>
                  <span className="va-native-list-value">{toText(details?.call_sid, activeSid || 'n/a')}</span>
                </div>
              </li>
              <li className="va-native-list-row">
                <div className="va-native-list-head">
                  <strong>Status</strong>
                  <span className="va-native-list-value">{toText(details?.status, 'unknown')}</span>
                </div>
              </li>
              <li className="va-native-list-row">
                <div className="va-native-list-head">
                  <strong>Phone</strong>
                  <span className="va-native-list-value">{toText(details?.phone_number, 'n/a')}</span>
                </div>
              </li>
              <li className="va-native-list-row">
                <div className="va-native-list-head">
                  <strong>Duration</strong>
                  <span className="va-native-list-value">{toInt(details?.duration)}s</span>
                </div>
              </li>
              <li className="va-native-list-row">
                <div className="va-native-list-head">
                  <strong>Started</strong>
                  <span className="va-native-list-value">{formatTime(details?.created_at)}</span>
                </div>
              </li>
              <li className="va-native-list-row">
                <div className="va-native-list-head">
                  <strong>Summary</strong>
                  <span className="va-native-list-value">{toText(details?.call_summary, 'n/a')}</span>
                </div>
              </li>
            </ul>
          ) : (
            <UiStatePanel
              compact
              title="No call details loaded"
              description="Enter or select a call SID, then request details."
            />
          )}
          <h4>Recent States</h4>
          <p className="va-muted">Loaded timeline events: <strong>{recentStates.length}</strong></p>
          {!hasEvents ? (
            <UiStatePanel
              compact
              title="No events loaded"
              description={activeSid
                ? 'Request call events to inspect the latest state timeline.'
                : 'Select or enter a call SID, then request events.'}
            />
          ) : (
            <ul className="va-native-list">
              {recentStates.map((state, index) => (
                <li key={`call-log-explorer-state-${index}`} className="va-native-list-row">
                  <div className="va-native-list-head">
                    <strong>{toText(state.state, 'event')}</strong>
                    <span className="va-native-list-value">{formatTime(state.timestamp)}</span>
                  </div>
                  <div className="va-native-list-meta">
                    <span>Source {toText(state.source, 'runtime')}</span>
                    <span>Reason {toText(state.reason, 'n/a')}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          </UiCard>
        </section>
      </section>

      <section className="va-section-block">
        <header className="va-section-header">
          <h3 className="va-section-title">Recent Call Logs</h3>
          <p className="va-muted">Operational feed of latest persisted call records.</p>
        </header>
        <section className="va-grid">
          <UiCard className="va-investigation-card">
          <h3>Recent Call Logs</h3>
          <p>Showing <strong>{callLogs.length}</strong> of <strong>{callLogsTotal}</strong> calls.</p>
          {callLogs.length === 0 ? (
            <UiStatePanel
              compact
              title="No recent calls available"
              description="Call logs will appear here once data is synced."
            />
          ) : (
            <ul className="va-native-list">
              {callLogs.slice(0, 12).map((row: CallLogRow, index: number) => {
                const rowSid = toText(row.call_sid, `call-${index + 1}`);
                const rowStatus = toText(row.status_normalized, toText(row.status, 'unknown'));
                return (
                  <li key={`recent-call-log-${rowSid}-${index}`} className="va-native-list-row">
                    <div className="va-native-list-head">
                      <strong>{rowSid}</strong>
                      <span className="va-native-list-value">{rowStatus}</span>
                    </div>
                    <div className="va-native-list-meta">
                      <span>Number {toText(row.phone_number, 'n/a')}</span>
                      <span>{formatTime(row.created_at)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          </UiCard>
        </section>
      </section>
    </>
  );
}
