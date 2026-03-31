import { buildProviderRequestState } from './moduleRequestState';
import type { DashboardVm, ProviderMatrixRow } from './types';
import { selectProviderPageVm } from './vmSelectors';
import { LoadingTelemetryCard } from '@/components/admin-dashboard/DashboardStateCards';
import {
  UiActionBar,
  UiBadge,
  UiButton,
  UiCard,
  UiDisclosure,
  UiSelect,
  UiSurfaceState,
  UiWorkspacePulse,
} from '@/components/ui/AdminPrimitives';

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
  const providerRequestState = buildProviderRequestState({
    loading,
    busyAction,
    providerPreflightBusy,
  });
  const providerBusy = providerRequestState.isBusy;
  const supportedProviderTotal = (['call', 'sms', 'email'] as const)
    .reduce((total, channel) => total + (providerSupportedByChannel[channel]?.length || 0), 0);
  const plannerConfigured = supportedProviderTotal > 0;
  const providerSummaryTone = providerBusy
    ? 'info'
    : !plannerConfigured || providerDegradedCount > 0
      ? 'warning'
      : 'success';
  const providerSummaryStatus = providerBusy
    ? 'Syncing'
    : !plannerConfigured
      ? 'Needs setup'
      : providerDegradedCount > 0
        ? 'Watching'
        : 'Healthy';
  const providerSummaryDescription = providerBusy
    ? `Running ${providerRequestState.activeActionLabel || 'provider checks'}.`
    : !plannerConfigured
      ? 'Provider support metadata is still warming up. Refresh once bootstrap data is available.'
      : 'Use preflight and staged switching to validate changes before applying them.';
  const matrixStateTitle = loading ? 'Compatibility matrix warming up' : 'No matrix data available';
  const matrixStateDescription = loading
    ? 'Readiness compatibility rows will appear after the current sync cycle.'
    : 'Run preflight or refresh matrix to repopulate provider readiness rows.';

  const stageBadgeVariant = (stage: string): 'meta' | 'info' | 'success' | 'warning' => {
    switch (stage) {
      case 'confirmed':
        return 'success';
      case 'simulated':
        return 'info';
      case 'failed':
        return 'warning';
      default:
        return 'meta';
    }
  };

  return (
    <>
      <section className="va-page-intro">
        <p className="va-kicker">Messaging</p>
        <h2 className="va-page-title">Provider Control</h2>
        <p className="va-muted">Review channel readiness, run preflight checks, and stage safe provider switches.</p>
      </section>

      <UiWorkspacePulse
        title="Provider reliability"
        description={providerSummaryDescription}
        status={providerSummaryStatus}
        tone={providerSummaryTone}
        items={[
          { label: 'Ready providers', value: `${providerReadinessTotals.ready}/${providerReadinessTotals.total}` },
          { label: 'Degraded', value: providerDegradedCount },
          { label: 'Coverage', value: `${providerReadinessPercent}%` },
          { label: 'Targets', value: supportedProviderTotal || 'Pending' },
        ]}
      />

      <LoadingTelemetryCard
        visible={providerRequestState.isLoading && !matrixReady}
        title="Loading provider diagnostics"
        description="Syncing compatibility matrix, readiness signals, and switch safety checks."
      />

      <section className="va-grid">
        <UiCard>
          <h3>Provider Preflight Matrix</h3>
          <UiActionBar
            title="Run provider checks"
            description="Validate active channels before switching traffic, or refresh the matrix after configuration changes."
            actions={(
              <>
                <UiButton
                  variant="secondary"
                  disabled={providerBusy || !plannerConfigured}
                  onClick={() => { void preflightActiveProviders(); }}
                >
                  Preflight Active Providers
                </UiButton>
                <UiButton
                  variant="secondary"
                  disabled={loading || providerBusy}
                  onClick={handleRefresh}
                >
                  Refresh Matrix
                </UiButton>
              </>
            )}
          />
          {!plannerConfigured ? (
            <UiSurfaceState
              cardTone="subcard"
              eyebrow="Provider setup"
              status="Needs metadata"
              statusVariant="warning"
              title="Provider plan is not configured"
              description="No channel provider metadata is available yet. Refresh bootstrap data to hydrate provider support."
              tone="warning"
              compact
            />
          ) : null}
          {!matrixReady ? (
            <UiSurfaceState
              cardTone="subcard"
              eyebrow="Compatibility details"
              status={loading ? 'Syncing' : 'Needs refresh'}
              statusVariant={loading ? 'info' : 'warning'}
              title={matrixStateTitle}
              description={matrixStateDescription}
              tone={loading ? 'info' : 'warning'}
              compact
            />
          ) : (
            <UiDisclosure
              title="Compatibility details"
              subtitle="Review readiness, degraded signals, and parity gaps by provider."
            >
              <pre>{textBar(providerReadinessPercent)}</pre>
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
            </UiDisclosure>
          )}
        </UiCard>
      </section>
      <section className="va-grid">
        <UiCard>
          <h3>Staged Switch Planner</h3>
          <p className="va-muted">
            Safe flow: simulate target readiness, confirm intent, apply switch, then review health check.
          </p>
          {!plannerConfigured ? (
            <UiSurfaceState
              cardTone="subcard"
              eyebrow="Switch planner"
              status="Unavailable"
              statusVariant="warning"
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
                  <div className="va-entity-head">
                    <strong>{channel.toUpperCase()} plan</strong>
                    <UiBadge variant={stageBadgeVariant(plan.stage)}>
                      {plan.stage}
                    </UiBadge>
                  </div>
                  <span>Current: {current}</span>
                  <div className="va-inline-tools">
                    <UiSelect
                      value={plan.target}
                      disabled={supported.length === 0 || providerBusy}
                      onChange={(event) => setProviderSwitchTarget(channel, event.target.value)}
                    >
                      <option value="">Select provider target</option>
                      {supported.map((provider) => (
                        <option key={`switch-${channel}-${provider}`} value={provider}>{provider}</option>
                      ))}
                    </UiSelect>
                    <UiButton
                      variant="secondary"
                      disabled={providerBusy || !plan.target || supported.length === 0}
                      onClick={() => { void simulateProviderSwitchPlan(channel); }}
                    >
                      Simulate
                    </UiButton>
                    <UiButton
                      variant="secondary"
                      disabled={providerBusy || plan.stage !== 'simulated'}
                      onClick={() => confirmProviderSwitchPlan(channel)}
                    >
                      Confirm
                    </UiButton>
                    <UiButton
                      variant="secondary"
                      disabled={providerBusy || plan.stage !== 'confirmed'}
                      onClick={() => { void applyProviderSwitchPlan(channel); }}
                    >
                      Apply
                    </UiButton>
                    <UiButton
                      variant="secondary"
                      disabled={providerBusy}
                      onClick={() => resetProviderSwitchPlan(channel)}
                    >
                      Reset
                    </UiButton>
                  </div>
                  {supported.length === 0 ? (
                    <UiSurfaceState
                      cardTone="subcard"
                      eyebrow={`${channel.toUpperCase()} channel`}
                      status="No targets"
                      statusVariant="warning"
                      title={`${channel.toUpperCase()} provider data unavailable`}
                      description="No supported targets were reported for this channel. Retry bootstrap/preflight."
                      tone="warning"
                      compact
                    />
                  ) : null}
                  <span>Post-check: <strong>{plan.postCheck}</strong></span>
                  {plan.rollbackSuggestion ? (
                    <span>Rollback suggestion: <strong>{plan.rollbackSuggestion}</strong></span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </UiCard>
        {renderProviderSection('call')}
        {renderProviderSection('sms')}
        {renderProviderSection('email')}
      </section>
    </>
  );
}
