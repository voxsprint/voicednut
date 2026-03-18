import type { DashboardVm, ProviderMatrixRow } from './types';
import { selectProviderPageVm } from './vmSelectors';
import { UiStatePanel } from '@/components/ui/AdminPrimitives';

type ProviderControlPageProps = {
  visible: boolean;
  vm: DashboardVm;
};

export function ProviderControlPage({ visible, vm }: ProviderControlPageProps) {
  if (!visible) return null;

  const {
    providerReadinessTotals,
    providerDegradedCount,
    providerReadinessPercent,
    textBar,
    busyAction,
    providerPreflightBusy,
    preflightActiveProviders,
    loading,
    handleRefresh,
    providerMatrixRows,
    providerCurrentByChannel,
    providerSupportedByChannel,
    providerSwitchPlanByChannel,
    setProviderSwitchTarget,
    simulateProviderSwitchPlan,
    confirmProviderSwitchPlan,
    applyProviderSwitchPlan,
    resetProviderSwitchPlan,
    renderProviderSection,
  } = selectProviderPageVm(vm);
  const matrixReady = providerMatrixRows.length > 0;
  const providerBusy = busyAction.length > 0 || providerPreflightBusy.length > 0;
  const supportedProviderTotal = (['call', 'sms', 'email'] as const)
    .reduce((total, channel) => total + (providerSupportedByChannel[channel]?.length || 0), 0);
  const plannerConfigured = supportedProviderTotal > 0;

  return (
    <>
      {loading && !matrixReady ? (
        <section className="va-grid">
          <div className="va-card">
            <UiStatePanel
              title="Loading provider diagnostics"
              description="Syncing compatibility matrix, readiness signals, and switch safety checks."
              tone="info"
            />
          </div>
        </section>
      ) : null}

      <section className="va-grid">
        <div className="va-card">
          <h3>Provider Preflight Matrix</h3>
          <p>
            Ready providers: <strong>{providerReadinessTotals.ready}/{providerReadinessTotals.total}</strong>
            {' '}| Degraded: <strong>{providerDegradedCount}</strong>
          </p>
          <pre>{textBar(providerReadinessPercent)}</pre>
          <div className="va-inline-tools">
            <button
              type="button"
              disabled={providerBusy || !plannerConfigured}
              onClick={() => { void preflightActiveProviders(); }}
            >
              Preflight Active Providers
            </button>
            <button
              type="button"
              disabled={loading || providerBusy}
              onClick={handleRefresh}
            >
              Refresh Matrix
            </button>
          </div>
          {!plannerConfigured ? (
            <UiStatePanel
              title="Provider plan is not configured"
              description="No channel provider metadata is available yet. Refresh bootstrap data to hydrate provider support."
              tone="warning"
              compact
            />
          ) : null}
          {!matrixReady ? (
            <UiStatePanel
              title={loading ? 'Compatibility matrix warming up' : 'No matrix data available'}
              description={loading
                ? 'Readiness compatibility rows will appear after the current sync cycle.'
                : 'Run preflight or refresh matrix to repopulate provider readiness rows.'}
              tone={loading ? 'info' : 'warning'}
              compact
            />
          ) : (
            <ul className="va-list va-matrix-list">
              {providerMatrixRows.map((row: ProviderMatrixRow) => (
                <li key={`matrix-${row.channel}-${row.provider}`}>
                  <strong>{row.channel.toUpperCase()} · {row.provider}</strong>
                  <span>
                    Ready: <strong>{row.ready ? 'yes' : 'no'}</strong>
                    {' '}| Degraded: <strong>{row.degraded ? 'yes' : 'no'}</strong>
                  </span>
                  <span>
                    Flows: <strong>{row.flowCount}</strong>
                    {' '}| Parity gaps: <strong>{row.parityGapCount}</strong>
                  </span>
                  {row.channel === 'call' ? (
                    <span>Payment mode: <strong>{row.paymentMode}</strong></span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      <section className="va-grid">
        <div className="va-card">
          <h3>Staged Switch Planner</h3>
          <p className="va-muted">
            Safe flow: simulate target readiness, confirm intent, apply switch, then review health check.
          </p>
          {!plannerConfigured ? (
            <UiStatePanel
              title="Planner unavailable"
              description="Provider targets are not ready yet. Refresh matrix after bootstrap completes."
              tone="warning"
              compact
            />
          ) : null}
          <ul className="va-list">
            {(['call', 'sms', 'email'] as const).map((channel) => {
              const current = providerCurrentByChannel[channel] || 'unknown';
              const supported = providerSupportedByChannel[channel] || [];
              const plan = providerSwitchPlanByChannel[channel];
              return (
                <li key={`provider-plan-${channel}`}>
                  <strong>{channel.toUpperCase()} plan</strong>
                  <span>Current: {current}</span>
                  <div className="va-inline-tools">
                    <select
                      className="va-input"
                      value={plan.target}
                      disabled={supported.length === 0 || providerBusy}
                      onChange={(event) => setProviderSwitchTarget(channel, event.target.value)}
                    >
                      <option value="">Select provider target</option>
                      {supported.map((provider) => (
                        <option key={`switch-${channel}-${provider}`} value={provider}>{provider}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={providerBusy || !plan.target || supported.length === 0}
                      onClick={() => { void simulateProviderSwitchPlan(channel); }}
                    >
                      Simulate
                    </button>
                    <button
                      type="button"
                      disabled={providerBusy || plan.stage !== 'simulated'}
                      onClick={() => confirmProviderSwitchPlan(channel)}
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      disabled={providerBusy || plan.stage !== 'confirmed'}
                      onClick={() => { void applyProviderSwitchPlan(channel); }}
                    >
                      Apply
                    </button>
                    <button
                      type="button"
                      disabled={providerBusy}
                      onClick={() => resetProviderSwitchPlan(channel)}
                    >
                      Reset
                    </button>
                  </div>
                  {supported.length === 0 ? (
                    <UiStatePanel
                      title={`${channel.toUpperCase()} provider data unavailable`}
                      description="No supported targets were reported for this channel. Retry bootstrap/preflight."
                      tone="warning"
                      compact
                    />
                  ) : null}
                  <span>Stage: <strong>{plan.stage}</strong> | Post-check: <strong>{plan.postCheck}</strong></span>
                  {plan.rollbackSuggestion ? (
                    <span>Rollback suggestion: <strong>{plan.rollbackSuggestion}</strong></span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
        {renderProviderSection('call')}
        {renderProviderSection('sms')}
        {renderProviderSection('email')}
      </section>
    </>
  );
}
