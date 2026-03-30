import { UiMetricTile } from '@/components/ui/AdminPrimitives';

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
      <UiMetricTile label="Sync mode" value={syncModeLabel} />
      <UiMetricTile label="Incidents" value={openIncidentCount} />
      <UiMetricTile label="Queue backlog" value={queueBacklogTotal} />
      <UiMetricTile label="Last healthy sync" value={lastSuccessfulPollLabel} />
    </section>
  );
}
