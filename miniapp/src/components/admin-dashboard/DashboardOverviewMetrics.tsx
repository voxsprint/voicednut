import { UiWorkspacePulse } from '@/components/ui/AdminPrimitives';

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
    <section aria-label="Overview status">
      <UiWorkspacePulse
        title="Console status"
        description="Core delivery, incident, and queue posture for the admin console."
        status={isDashboardDegraded ? 'Attention needed' : 'Healthy'}
        tone={isDashboardDegraded ? 'warning' : 'success'}
        items={[
          { label: 'Sync mode', value: syncModeLabel },
          { label: 'Incidents', value: openIncidentCount },
          { label: 'Queue backlog', value: queueBacklogTotal },
          { label: 'Last healthy sync', value: lastSuccessfulPollLabel },
        ]}
      />
    </section>
  );
}
