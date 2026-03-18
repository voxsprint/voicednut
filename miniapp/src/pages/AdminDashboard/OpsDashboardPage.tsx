import type {
  ActivityEntry,
  CallLogRow,
  DashboardVm,
  DlqCallRow,
  DlqEmailRow,
  EmailJob,
} from './types';
import { selectOpsPageVm } from './vmSelectors';
import { UiStatePanel } from '@/components/ui/AdminPrimitives';

type OpsDashboardPageProps = {
  visible: boolean;
  vm: DashboardVm;
};

function buildAsciiSparkline(values: number[]): string {
  if (!Array.isArray(values) || values.length === 0) return '';
  const levels = '._-:=+*#%@';
  return values
    .map((value) => {
      const normalized = Math.max(0, Math.min(100, Number(value) || 0));
      const index = Math.round((normalized / 100) * (levels.length - 1));
      return levels[index] || levels[0];
    })
    .join('');
}

export function OpsDashboardPage({ visible, vm }: OpsDashboardPageProps) {
  if (!visible) return null;

  const {
    isFeatureEnabled,
    isDashboardDegraded,
    syncModeLabel,
    streamModeLabel,
    streamLastEventLabel,
    streamFailureCount,
    pollFailureCount,
    bridgeHardFailures,
    bridgeSoftFailures,
    sloErrorBudgetPercent,
    sloP95ActionLatencyMs,
    pollFreshnessLabel,
    degradedCauses,
    lastPollLabel,
    lastSuccessfulPollLabel,
    nextPollLabel,
    callCompleted,
    callTotal,
    callFailed,
    callFailureRate,
    callSuccessRate,
    queueBacklogTotal,
    opsQaSummary,
    providerReadinessTotals,
    providerReadinessPercent,
    textBar,
    runtimeEffectiveMode,
    runtimeModeOverride,
    runtimeCanaryEffective,
    runtimeCanaryOverrideLabel,
    runtimeIsCircuitOpen,
    runtimeForcedLegacyUntil,
    runtimeActiveTotal,
    runtimeActiveLegacy,
    runtimeActiveVoiceAgent,
    busyAction,
    enableRuntimeMaintenance,
    disableRuntimeMaintenance,
    refreshRuntimeStatus,
    runtimeCanaryInput,
    setRuntimeCanaryInput,
    applyRuntimeCanary,
    clearRuntimeCanary,
    activityLog,
    formatTime,
    renderProviderSection,
    smsTotalRecipients,
    smsSuccess,
    smsFailed,
    smsProcessedPercent,
    emailTotalRecipients,
    emailSent,
    emailFailed,
    emailDelivered,
    emailBounced,
    emailComplained,
    emailSuppressed,
    emailProcessedPercent,
    emailDeliveredPercent,
    callLogs,
    callLogsTotal,
    toText,
    toInt,
    emailJobs,
    dlqPayload,
    callDlq,
    emailDlq,
    runAction,
    hasMeaningfulData,
    loading,
  } = selectOpsPageVm(vm);
  const runtimeControlsEnabled = isFeatureEnabled('runtime_controls', true);
  const providerCardsEnabled = isFeatureEnabled('provider_cards', true);

  return (
    <>
      <section className="va-page-intro">
        <p className="va-kicker">Operations</p>
        <h2 className="va-page-title">Control Plane Dashboard</h2>
        <p className="va-muted">
          Reliability, runtime controls, and recovery signals for calls, SMS, and email.
        </p>
        <div className="va-inline-metrics">
          <span className="va-meta-chip">Sync {syncModeLabel}</span>
          <span className="va-meta-chip">Feed {streamModeLabel}</span>
          <span className="va-meta-chip">Poll failures {pollFailureCount}</span>
          <span className="va-meta-chip">Bridge 5xx {bridgeHardFailures}</span>
          <span className="va-meta-chip">Queue {queueBacklogTotal}</span>
          <span className="va-meta-chip">Error budget {sloErrorBudgetPercent}%</span>
        </div>
      </section>

      {loading && !hasMeaningfulData ? (
        <section className="va-grid">
          <div className="va-card">
            <UiStatePanel
              title="Refreshing operational telemetry"
              description="Collecting the latest poll/stream metrics, runtime state, and job summaries."
              tone="info"
            />
          </div>
        </section>
      ) : null}

      <section className="va-section-block">
        <header className="va-section-header">
          <h3 className="va-section-title">Reliability & Runtime</h3>
          <p className="va-muted">Live sync posture, SLO telemetry, and runtime control operations.</p>
        </header>
      <section className="va-grid">
        <div className={`va-card va-health ${isDashboardDegraded ? 'is-degraded' : 'is-healthy'}`}>
          <h3>Live Sync Health</h3>
          <p>
            Mode: <strong>{syncModeLabel}</strong>
          </p>
          <p>
            Poll failures: <strong>{pollFailureCount}</strong> | Bridge 5xx: <strong>{bridgeHardFailures}</strong>
            {' '}| Bridge 4xx/5xx: <strong>{bridgeSoftFailures}</strong>
          </p>
          <p>
            Data feed: <strong>{streamModeLabel}</strong> | Stream failures: <strong>{streamFailureCount}</strong>
          </p>
          <p>Last poll attempt: <strong>{lastPollLabel}</strong></p>
          <p>Last successful poll: <strong>{lastSuccessfulPollLabel}</strong></p>
          <p>Last stream event: <strong>{streamLastEventLabel}</strong></p>
          <p>Next poll scheduled: <strong>{nextPollLabel}</strong></p>
          <details className="va-drilldown">
            <summary>Degraded causes drill-down</summary>
            {degradedCauses.length === 0 ? (
              <p className="va-muted">No active degradation causes detected.</p>
            ) : (
              <ul className="va-list">
                {degradedCauses.map((cause) => (
                  <li key={`degraded-cause-${cause}`}>{cause}</li>
                ))}
              </ul>
            )}
          </details>
        </div>

        <div className="va-card">
          <h3>SLO Widgets</h3>
          <p>
            Error budget remaining: <strong>{sloErrorBudgetPercent}%</strong>
          </p>
          <pre>{textBar(sloErrorBudgetPercent)}</pre>
          <p>
            p95 action latency: <strong>{sloP95ActionLatencyMs}ms</strong>
          </p>
          <p>
            Poll freshness: <strong>{pollFreshnessLabel}</strong>
          </p>
        </div>

        <div className="va-card">
          <h3>Ops Snapshot</h3>
          <p>
            Calls: <strong>{callCompleted}</strong> completed / <strong>{callTotal}</strong> total
          </p>
          <p>
            Call failures: <strong>{callFailed}</strong> ({callFailureRate}%)
          </p>
          <p>
            Success rate: <strong>{Math.max(0, Math.min(100, Math.round(callSuccessRate)))}%</strong>
          </p>
          <p>
            Queue backlog: <strong>{queueBacklogTotal}</strong>
          </p>
          <p>
            Provider readiness: <strong>{providerReadinessTotals.ready}/{providerReadinessTotals.total}</strong>
          </p>
          <pre>{textBar(providerReadinessPercent)}</pre>
        </div>

        {opsQaSummary ? (
          <div className="va-card">
            <h3>Post-Call QA</h3>
            <p>
              Window: <strong>{opsQaSummary.windowHours}h</strong>
              {' '}| Evaluations: <strong>{opsQaSummary.total}</strong>
            </p>
            <p>
              Pass rate: <strong>{opsQaSummary.passRate}%</strong>
              {' '}({opsQaSummary.passed}/{opsQaSummary.total})
            </p>
            <p>
              Avg score: <strong>{opsQaSummary.avgScore ?? 'n/a'}</strong>
              {' '}| Scored: <strong>{opsQaSummary.scored}</strong>
            </p>
            <p>
              Insufficient transcript: <strong>{opsQaSummary.insufficientTranscript}</strong>
              {' '}| Skipped: <strong>{opsQaSummary.skipped}</strong>
            </p>
            <pre>{textBar(opsQaSummary.passRate)}</pre>
            {opsQaSummary.trendSeries.length > 0 ? (
              <>
                <p>
                  Trend bucket: <strong>{opsQaSummary.trendBucket}</strong>
                  {' '}| Points: <strong>{opsQaSummary.trendSeries.length}</strong>
                </p>
                <pre>{buildAsciiSparkline(opsQaSummary.trendSeries.map((point) => point.passRate))}</pre>
              </>
            ) : null}
            <details className="va-drilldown">
              <summary>QA trend ({opsQaSummary.trendSeries.length})</summary>
              {opsQaSummary.trendSeries.length === 0 ? (
                <p className="va-muted">No trend points available in this window.</p>
              ) : (
                <ul className="va-list">
                  {opsQaSummary.trendSeries.map((point) => (
                    <li key={`qa-trend-${point.bucket}`}>
                      <strong>{point.bucket}</strong>
                      <span>{point.passed}/{point.total} passed ({point.passRate}%)</span>
                      <span>Avg score: {point.avgScore ?? 'n/a'}</span>
                    </li>
                  ))}
                </ul>
              )}
            </details>
            <details className="va-drilldown">
              <summary>Top findings ({opsQaSummary.topFindings.length})</summary>
              {opsQaSummary.topFindings.length === 0 ? (
                <p className="va-muted">No recurring findings in this window.</p>
              ) : (
                <ul className="va-list">
                  {opsQaSummary.topFindings.map((finding) => (
                    <li key={`qa-finding-${finding.finding}`}>
                      <strong>{finding.finding}</strong>
                      <span>{finding.count} calls</span>
                    </li>
                  ))}
                </ul>
              )}
            </details>
            <details className="va-drilldown">
              <summary>Profile breakdown ({opsQaSummary.profileBreakdown.length})</summary>
              {opsQaSummary.profileBreakdown.length === 0 ? (
                <p className="va-muted">No profile-specific QA data yet.</p>
              ) : (
                <ul className="va-list">
                  {opsQaSummary.profileBreakdown.map((profile) => {
                    const threshold =
                      opsQaSummary.profileThresholds[profile.profile]
                      ?? opsQaSummary.profileThresholds.default
                      ?? 70;
                    const belowThreshold =
                      profile.avgScore !== null && profile.avgScore < threshold;
                    const thresholdStatus = profile.avgScore === null
                      ? 'info'
                      : belowThreshold
                        ? 'error'
                        : 'success';
                    const thresholdLabel = profile.avgScore === null
                      ? 'No score'
                      : belowThreshold
                        ? 'Below threshold'
                        : 'Within threshold';

                    return (
                      <li key={`qa-profile-${profile.profile}`}>
                        <strong>{profile.profile}</strong>
                        <span>{profile.passed}/{profile.total} passed ({profile.passRate}%)</span>
                        <span>Avg score: {profile.avgScore ?? 'n/a'}</span>
                        <span>Threshold: {threshold}</span>
                        <span className={`va-pill va-pill-${thresholdStatus}`}>{thresholdLabel}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </details>
          </div>
        ) : (
          <div className="va-card">
            <h3>Post-Call QA</h3>
            <UiStatePanel
              title="QA summary unavailable"
              description="Enable and collect post-call QA evaluations to unlock quality trends."
              tone="info"
              compact
            />
          </div>
        )}

        {runtimeControlsEnabled ? (
          <div className="va-card">
            <h3>Voice Runtime Control</h3>
            <p>
              Effective mode: <strong>{runtimeEffectiveMode}</strong>
              {' '}| Override: <strong>{runtimeModeOverride}</strong>
            </p>
            <p>
              Canary effective: <strong>{runtimeCanaryEffective}%</strong>
              {' '}| Override: <strong>{runtimeCanaryOverrideLabel}</strong>
            </p>
            <p>
              Circuit: <strong>{runtimeIsCircuitOpen ? 'Open' : 'Closed'}</strong>
              {' '}| Forced legacy until: <strong>{runtimeForcedLegacyUntil}</strong>
            </p>
            <p>
              Active calls: <strong>{runtimeActiveTotal}</strong>
              {' '}| Legacy: <strong>{runtimeActiveLegacy}</strong>
              {' '}| Voice Agent: <strong>{runtimeActiveVoiceAgent}</strong>
            </p>
            <div className="va-inline-tools">
              <button
                type="button"
                disabled={busyAction.length > 0}
                onClick={() => { void enableRuntimeMaintenance(); }}
              >
                Enable Maintenance
              </button>
              <button
                type="button"
                disabled={busyAction.length > 0}
                onClick={() => { void disableRuntimeMaintenance(); }}
              >
                Disable Maintenance
              </button>
              <button
                type="button"
                disabled={busyAction.length > 0}
                onClick={() => { void refreshRuntimeStatus(); }}
              >
                Refresh Runtime
              </button>
            </div>
            <div className="va-inline-tools">
              <input
                className="va-input"
                inputMode="numeric"
                min={0}
                max={100}
                placeholder="Canary % (0-100)"
                value={runtimeCanaryInput}
                onChange={(event) => setRuntimeCanaryInput(event.target.value)}
              />
              <button
                type="button"
                disabled={busyAction.length > 0}
                onClick={() => { void applyRuntimeCanary(); }}
              >
                Apply Canary
              </button>
              <button
                type="button"
                disabled={busyAction.length > 0}
                onClick={() => { void clearRuntimeCanary(); }}
              >
                Clear Canary
              </button>
            </div>
          </div>
        ) : (
          <div className="va-card">
            <h3>Voice Runtime Control</h3>
            <UiStatePanel
              title="Runtime controls disabled"
              description="Enable the runtime_controls feature flag to manage maintenance and canary rollout."
              tone="warning"
              compact
            />
          </div>
        )}

        <div className="va-card">
          <h3>Activity Timeline</h3>
          {activityLog.length === 0 ? (
            <UiStatePanel
              title="No activity yet"
              description="Recent action attempts and system transitions will appear here."
              tone="info"
              compact
            />
          ) : (
            <ul className="va-list va-list-activity">
              {activityLog.map((entry: ActivityEntry) => (
                <li key={entry.id}>
                  <span className={`va-pill va-pill-${entry.status}`}>{entry.status}</span>
                  <strong>{entry.title}</strong>
                  <span>{entry.detail}</span>
                  <span>{formatTime(entry.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      </section>

      {providerCardsEnabled ? (
        <section className="va-section-block">
          <header className="va-section-header">
            <h3 className="va-section-title">Provider Readiness</h3>
            <p className="va-muted">Channel-level provider status and preflight control actions.</p>
          </header>
          <section className="va-grid">
            {renderProviderSection('call')}
            {renderProviderSection('sms')}
            {renderProviderSection('email')}
          </section>
        </section>
      ) : null}

      <section className="va-section-block">
        <header className="va-section-header">
          <h3 className="va-section-title">Messaging Throughput</h3>
          <p className="va-muted">Bulk SMS and email execution trends across the latest 24-hour window.</p>
        </header>
        <section className="va-grid">
        <div className="va-card">
          <h3>SMS Bulk Status (24h)</h3>
          <p>Total recipients: <strong>{smsTotalRecipients}</strong></p>
          <p>Successful: <strong>{smsSuccess}</strong> | Failed: <strong>{smsFailed}</strong></p>
          <pre>{textBar(smsProcessedPercent)}</pre>
        </div>

        <div className="va-card">
          <h3>Email Bulk Status (24h)</h3>
          <p>Total recipients: <strong>{emailTotalRecipients}</strong></p>
          <p>Sent: <strong>{emailSent}</strong> | Failed: <strong>{emailFailed}</strong></p>
          <p>Delivered: <strong>{emailDelivered}</strong></p>
          <p>
            Bounced: <strong>{emailBounced}</strong> | Complaints: <strong>{emailComplained}</strong>
            {' '}| Suppressed: <strong>{emailSuppressed}</strong>
          </p>
          <pre>{textBar(emailProcessedPercent)}</pre>
          <pre>{textBar(emailDeliveredPercent)}</pre>
        </div>
      </section>
      </section>

      <section className="va-section-block">
        <header className="va-section-header">
          <h3 className="va-section-title">Logs & Recovery</h3>
          <p className="va-muted">Recent operational history and dead-letter replay workflows.</p>
        </header>
        <section className="va-grid">
        <div className="va-card">
          <h3>Recent Call Logs</h3>
          <p>
            Showing <strong>{callLogs.length}</strong> of <strong>{callLogsTotal}</strong> recent calls.
          </p>
          {callLogs.length === 0 ? <p className="va-muted">No recent calls available.</p> : null}
          <ul className="va-list">
            {callLogs.slice(0, 10).map((row: CallLogRow, index: number) => {
              const callSid = toText(row.call_sid, `call-${index + 1}`);
              return (
                <li key={`call-log-${callSid}-${index}`}>
                  <strong>{callSid}</strong>
                  <span>
                    {toText(row.direction, 'unknown')} | {toText(row.status_normalized, toText(row.status, 'unknown'))}
                  </span>
                  <span>
                    Runtime: {toText(row.voice_runtime, 'unknown')}
                    {' '}| Duration: {toInt(row.duration)}s
                    {' '}| Transcripts: {toInt(row.transcript_count)}
                  </span>
                  <span>
                    Number: {toText(row.phone_number, 'n/a')}
                    {' '}| Ended: {toText(row.ended_reason, 'n/a')}
                  </span>
                  <span>{formatTime(row.created_at)}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="va-card">
          <h3>Email Jobs</h3>
          {emailJobs.length === 0 ? <p className="va-muted">No recent jobs.</p> : null}
          <ul className="va-list">
            {emailJobs.slice(0, 8).map((job: EmailJob, index: number) => {
              const jobId = toText(job.job_id, `job-${index + 1}`);
              const jobStatus = toText(job.status);
              const jobKey = `email-job-${jobId}-${index}`;
              return (
                <li key={jobKey}>
                  <strong>{jobId}</strong>
                  <span>{jobStatus}</span>
                  <span>{toInt(job.sent)}/{toInt(job.total)} sent</span>
                  <span>
                    Failed: {toInt(job.failed)} | Delivered: {toInt(job.delivered)} | Bounced: {toInt(job.bounced)}
                  </span>
                  <span>{formatTime(job.updated_at || job.created_at)}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="va-card">
          <h3>DLQ: Call Jobs ({toInt(dlqPayload.call_open, callDlq.length)})</h3>
          {callDlq.length === 0 ? <p className="va-muted">No open call DLQ entries.</p> : null}
          <ul className="va-list">
            {callDlq.map((row: DlqCallRow) => {
              const rowId = toInt(row.id);
              const handleReplay = (): void => {
                void runAction(
                  'dlq.call.replay',
                  { id: rowId },
                  {
                    confirmText: `Replay call DLQ #${rowId}?`,
                    successMessage: `Replay requested for call DLQ #${rowId}.`,
                  },
                );
              };
              return (
                <li key={`call-dlq-${rowId}`}>
                  <span>#{rowId} {toText(row.job_type, 'job')}</span>
                  <span>Replays: {toInt(row.replay_count)}</span>
                  <button
                    type="button"
                    disabled={busyAction.length > 0 || rowId <= 0}
                    onClick={handleReplay}
                  >
                    Replay
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="va-card">
          <h3>DLQ: Email ({toInt(dlqPayload.email_open, emailDlq.length)})</h3>
          {emailDlq.length === 0 ? <p className="va-muted">No open email DLQ entries.</p> : null}
          <ul className="va-list">
            {emailDlq.map((row: DlqEmailRow) => {
              const rowId = toInt(row.id);
              const handleReplay = (): void => {
                void runAction(
                  'dlq.email.replay',
                  { id: rowId },
                  {
                    confirmText: `Replay email DLQ #${rowId}?`,
                    successMessage: `Replay requested for email DLQ #${rowId}.`,
                  },
                );
              };
              return (
                <li key={`email-dlq-${rowId}`}>
                  <span>#{rowId} msg:{toText(row.message_id)}</span>
                  <span>Reason: {toText(row.reason)}</span>
                  <button
                    type="button"
                    disabled={busyAction.length > 0 || rowId <= 0}
                    onClick={handleReplay}
                  >
                    Replay
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
      </section>

      {!hasMeaningfulData ? (
        <section className="va-grid">
          <div className="va-card va-empty-state">
            <h3>No Recent Operational Activity</h3>
            <UiStatePanel
              title="Feed is connected"
              description="Metrics and events will populate as live traffic and background jobs are processed."
              tone="info"
              compact
            />
          </div>
        </section>
      ) : null}
    </>
  );
}
