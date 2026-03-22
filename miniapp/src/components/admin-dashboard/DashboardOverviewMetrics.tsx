type DashboardOverviewMetricsProps = {
  isDashboardDegraded: boolean;
  syncModeLabel: string;
  openIncidentCount: number;
  queueBacklogTotal: number;
  lastSuccessfulPollLabel: string;
};

export function DashboardOverviewMetrics({
  isDashboardDegraded,
  syncModeLabel,
  openIncidentCount,
  queueBacklogTotal,
  lastSuccessfulPollLabel,
}: DashboardOverviewMetricsProps): JSX.Element {
  return (
    <section
      className={`va-overview-metrics ${isDashboardDegraded ? 'is-degraded' : 'is-healthy'}`}
      aria-label="Overview status"
    >
      <article className="va-overview-metric-card">
        <span>Sync mode</span>
        <strong>{syncModeLabel}</strong>
      </article>
      <article className="va-overview-metric-card">
        <span>Incidents</span>
        <strong>{openIncidentCount}</strong>
      </article>
      <article className="va-overview-metric-card">
        <span>Queue backlog</span>
        <strong>{queueBacklogTotal}</strong>
      </article>
      <article className="va-overview-metric-card">
        <span>Last healthy sync</span>
        <strong>{lastSuccessfulPollLabel}</strong>
      </article>
    </section>
  );
}
