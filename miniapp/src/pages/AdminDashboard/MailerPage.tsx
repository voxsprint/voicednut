import { useState } from 'react';

import { buildMailerRequestState } from './moduleRequestState';
import type { DashboardVm, EmailJob } from './types';
import { useInvestigationAction } from './useInvestigationAction';
import { selectMailerPageVm } from './vmSelectors';
import { LoadingTelemetryCard } from '@/components/admin-dashboard/DashboardStateCards';
import { UiBadge, UiButton, UiCard, UiInput, UiStatePanel, UiTextarea } from '@/components/ui/AdminPrimitives';
import { asRecord, pickDisplayText } from '@/services/admin-dashboard/dashboardPrimitives';

type MailerPageProps = {
  visible: boolean;
  vm: DashboardVm;
};

export function MailerPage({ visible, vm }: MailerPageProps) {
  if (!visible) return null;

  const {
    mailerRecipientsInput,
    setMailerRecipientsInput,
    handleRecipientsFile,
    mailerTemplateIdInput,
    setMailerTemplateIdInput,
    mailerSubjectInput,
    setMailerSubjectInput,
    mailerHtmlInput,
    setMailerHtmlInput,
    mailerTextInput,
    setMailerTextInput,
    mailerVariablesInput,
    setMailerVariablesInput,
    mailerScheduleAt,
    setMailerScheduleAt,
    busyAction,
    sendMailerFromConsole,
    mailerRecipientsParsed,
    mailerInvalidRecipients,
    mailerDuplicateCount,
    mailerVariableKeys,
    mailerTemplatePreviewSubject,
    mailerTemplatePreviewBody,
    mailerTemplatePreviewError,
    mailerDomainHealthStatus,
    mailerDomainHealthDetail,
    mailerTrendBars,
    emailTotalRecipients,
    emailSent,
    emailFailed,
    emailDelivered,
    emailBounced,
    emailComplained,
    emailSuppressed,
    emailProcessedPercent,
    emailDeliveredPercent,
    emailBouncePercent,
    emailComplaintPercent,
    textBar,
    emailJobs,
    toText,
    toInt,
    invokeAction,
    loading,
  } = selectMailerPageVm(vm);
  const mailerRequestState = buildMailerRequestState({ loading, busyAction });
  const mailerHasRecipients = mailerRecipientsParsed.length > 0;
  const mailerHasTemplate = mailerTemplateIdInput.trim().length > 0;
  const mailerHasSubject = mailerSubjectInput.trim().length > 0;
  const mailerHasBody = mailerHtmlInput.trim().length > 0 || mailerTextInput.trim().length > 0;
  const mailerSubjectRequired = !mailerHasTemplate;
  const mailerBodyRequired = !mailerHasTemplate;
  const mailerRecipientsInvalid = !mailerHasRecipients;
  const mailerSubjectInvalid = mailerSubjectRequired && !mailerHasSubject;
  const mailerBodyInvalid = mailerBodyRequired && !mailerHasBody;
  const mailerMissingRequirements: string[] = [];
  if (!mailerHasRecipients) {
    mailerMissingRequirements.push('add at least one valid recipient');
  }
  if (!mailerHasTemplate && !mailerHasSubject) {
    mailerMissingRequirements.push('provide a subject or template ID');
  }
  if (!mailerHasTemplate && !mailerHasBody) {
    mailerMissingRequirements.push('provide a body (text or HTML) or template ID');
  }
  const mailerCanSubmit = mailerMissingRequirements.length === 0;
  const [messageIdInput, setMessageIdInput] = useState<string>('');
  const [jobIdInput, setJobIdInput] = useState<string>('');
  const [messageSnapshot, setMessageSnapshot] = useState<Record<string, unknown> | null>(null);
  const [jobSnapshot, setJobSnapshot] = useState<Record<string, unknown> | null>(null);
  const [historySnapshot, setHistorySnapshot] = useState<Array<Record<string, unknown>>>([]);
  const {
    investigationBusy,
    investigationError,
    runInvestigationAction,
  } = useInvestigationAction(invokeAction);

  return (
    <>
      <section className="va-page-intro">
        <p className="va-kicker">Messaging</p>
        <h2 className="va-page-title">Email Operations Console</h2>
        <p className="va-muted">
          Build and schedule campaigns, validate template variables, and track deliverability performance.
        </p>
        <div className="va-inline-metrics">
          <UiBadge>Audience {mailerRecipientsParsed.length}</UiBadge>
          <UiBadge>Invalid {mailerInvalidRecipients.length}</UiBadge>
          <UiBadge>Duplicates {mailerDuplicateCount}</UiBadge>
          <UiBadge>Delivered {emailDelivered}</UiBadge>
          <UiBadge>Suppressed {emailSuppressed}</UiBadge>
        </div>
      </section>

      <LoadingTelemetryCard
        visible={mailerRequestState.isLoading && mailerRecipientsParsed.length === 0}
        title="Loading mailer telemetry"
        description="Syncing recipient analytics, domain health, and recent delivery outcomes."
      />
      <section className="va-section-block">
        <header className="va-section-header">
          <h3 className="va-section-title">Compose & Queue</h3>
          <p className="va-muted">Prepare recipients, draft content, and schedule the outbound batch.</p>
        </header>
        <section className="va-grid">
          <UiCard>
            <h3>Mailer Console</h3>
            {!mailerRecipientsInput.trim() && !mailerSubjectInput.trim() && !mailerTextInput.trim() ? (
              <UiStatePanel
                title="Start a new mailer batch"
                description="Add recipients and draft the campaign subject/body, or upload a CSV/TXT list."
                tone="info"
                compact
              />
            ) : null}
            <p className="va-card-eyebrow">Audience</p>
            <UiTextarea
              id="va-mailer-recipients"
              placeholder="Recipient emails separated by comma/newline"
              value={mailerRecipientsInput}
              onChange={(event) => setMailerRecipientsInput(event.target.value)}
              aria-required
              aria-invalid={mailerRecipientsInvalid}
              aria-describedby="va-mailer-recipients-hint"
              rows={5}
            />
            <p id="va-mailer-recipients-hint" className="va-field-hint">
              Enter at least one valid recipient email to queue this batch.
            </p>
            <div className="va-inline-tools">
              <input
                type="file"
                accept=".csv,.txt"
                aria-label="Upload mailer recipients file"
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  void handleRecipientsFile(file, 'mailer');
                  event.currentTarget.value = '';
                }}
              />
              <UiInput
                placeholder="Template ID (optional)"
                value={mailerTemplateIdInput}
                onChange={(event) => setMailerTemplateIdInput(event.target.value)}
              />
            </div>
            <p className="va-card-eyebrow">Content</p>
            <UiInput
              id="va-mailer-subject"
              placeholder="Subject (supports {{variables}})"
              value={mailerSubjectInput}
              onChange={(event) => setMailerSubjectInput(event.target.value)}
              aria-required={mailerSubjectRequired}
              aria-invalid={mailerSubjectInvalid}
              aria-describedby="va-mailer-subject-hint"
            />
            <p id="va-mailer-subject-hint" className="va-field-hint">
              Required when template ID is empty.
            </p>
            <UiTextarea
              id="va-mailer-html-body"
              placeholder="HTML body (optional)"
              value={mailerHtmlInput}
              onChange={(event) => setMailerHtmlInput(event.target.value)}
              aria-required={mailerBodyRequired}
              aria-invalid={mailerBodyInvalid}
              aria-describedby="va-mailer-body-hint"
              rows={4}
            />
            <UiTextarea
              id="va-mailer-text-body"
              placeholder="Text body (optional)"
              value={mailerTextInput}
              onChange={(event) => setMailerTextInput(event.target.value)}
              aria-required={mailerBodyRequired}
              aria-invalid={mailerBodyInvalid}
              aria-describedby="va-mailer-body-hint"
              rows={3}
            />
            <p id="va-mailer-body-hint" className="va-field-hint">
              When template ID is empty, provide HTML or text body content.
            </p>
            <p className="va-card-eyebrow">Template Variables</p>
            <UiTextarea
              placeholder={'Variables JSON, e.g. {"first_name":"Ada"}'}
              value={mailerVariablesInput}
              onChange={(event) => setMailerVariablesInput(event.target.value)}
              rows={3}
            />
            <p className="va-card-eyebrow">Scheduling</p>
            <div className="va-inline-tools">
              <label className="va-muted">
                Send at:
                <UiInput
                  type="datetime-local"
                  value={mailerScheduleAt}
                  onChange={(event) => setMailerScheduleAt(event.target.value)}
                />
              </label>
              <UiButton
                variant="primary"
                disabled={mailerRequestState.isBusy || !mailerCanSubmit}
                onClick={() => { void sendMailerFromConsole(); }}
              >
                Queue Mailer Job
              </UiButton>
            </div>
            {!mailerCanSubmit ? (
              <UiStatePanel
                title="Mailer requirements not met"
                description={`Before queueing, ${mailerMissingRequirements.join(', ')}.`}
                tone="warning"
                compact
              />
            ) : null}
            <p className="va-muted">
              Audience: <strong>{mailerRecipientsParsed.length}</strong>
              {' '}| Invalid: <strong>{mailerInvalidRecipients.length}</strong>
              {' '}| Duplicates removed: <strong>{mailerDuplicateCount}</strong>
            </p>
            <p className="va-muted">
              Template variables detected: {mailerVariableKeys.length ? mailerVariableKeys.join(', ') : 'none'}
            </p>
            {mailerInvalidRecipients.length > 0 ? (
              <UiStatePanel
                title="Recipient format warnings"
                description={`Suppression preview: ${mailerInvalidRecipients.slice(0, 10).join(', ')}`}
                tone="warning"
                compact
              />
            ) : null}
            <UiCard tone="subcard">
              <h4>Template Render Preview</h4>
              <p className="va-muted">Subject preview: <strong>{mailerTemplatePreviewSubject}</strong></p>
              <p className="va-muted">Body preview: {mailerTemplatePreviewBody}</p>
              {mailerTemplatePreviewError ? (
                <UiStatePanel
                  title="Template render issue"
                  description={mailerTemplatePreviewError}
                  tone="error"
                  compact
                />
              ) : null}
            </UiCard>
          </UiCard>
          <UiCard>
            <h3>Deliverability Monitor</h3>
            <p>Total recipients (24h): <strong>{emailTotalRecipients}</strong></p>
            <p>Sent: <strong>{emailSent}</strong> | Failed: <strong>{emailFailed}</strong></p>
            <p>Delivered: <strong>{emailDelivered}</strong></p>
            <p>
              Bounced: <strong>{emailBounced}</strong> | Complaints: <strong>{emailComplained}</strong>
              {' '}| Suppressed: <strong>{emailSuppressed}</strong>
            </p>
            <pre>{textBar(emailProcessedPercent)}</pre>
            <pre>{textBar(emailDeliveredPercent)}</pre>
            <pre>{textBar(emailBouncePercent)}</pre>
            <pre>{textBar(emailComplaintPercent)}</pre>
            <UiCard tone="subcard">
              <h4>Domain Health</h4>
              <p className="va-muted">Status: <strong>{mailerDomainHealthStatus}</strong></p>
              <p className="va-muted">{mailerDomainHealthDetail}</p>
            </UiCard>
            <UiCard tone="subcard">
              <h4>Bounce/Complaint Trend</h4>
              {mailerTrendBars.length === 0 ? (
                <UiStatePanel
                  title="No trend data yet"
                  description="Bounce/complaint trend bars will appear once recent jobs are available."
                  tone="info"
                  compact
                />
              ) : (
                <ul className="va-list va-list-dense">
                  {mailerTrendBars.map((bar, index) => (
                    <li key={`mailer-trend-${index}`}><pre>{bar}</pre></li>
                  ))}
                </ul>
              )}
            </UiCard>
            {emailJobs.length > 0 ? (
              <ul className="va-list va-list-dense">
                {emailJobs.slice(0, 6).map((job: EmailJob, index: number) => (
                  <li key={`mailer-job-${index}`}>
                    <strong>{toText(job.job_id, `job-${index + 1}`)}</strong>
                    <span>{toText(job.status, 'unknown')}</span>
                    <span>{toInt(job.sent)}/{toInt(job.total)} sent</span>
                    <span>
                      Fail: {toInt(job.failed)} | Deliv: {toInt(job.delivered)} | Bounce: {toInt(job.bounced)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <UiStatePanel
                title="No recent mailer jobs"
                description="Queued and completed jobs will appear here once deliveries are processed."
                tone="info"
                compact
              />
            )}
          </UiCard>
        </section>
      </section>

      <section className="va-section-block">
        <header className="va-section-header">
          <h3 className="va-section-title">Investigation & Tracking</h3>
          <p className="va-muted">Lookup individual message status, bulk jobs, and recent history.</p>
        </header>
        <section className="va-grid">
          <UiCard>
            <h3>Email Diagnostics Console</h3>
            <div className="va-inline-tools">
              <UiInput
                placeholder="Message ID"
                value={messageIdInput}
                onChange={(event) => setMessageIdInput(event.target.value)}
              />
              <UiButton
                variant="secondary"
                disabled={investigationBusy.length > 0 || !messageIdInput.trim()}
                onClick={() => {
                  void runInvestigationAction(
                    'email.message.status',
                    { message_id: messageIdInput.trim() },
                    (payload) => setMessageSnapshot(asRecord(payload.message) || payload),
                  );
                }}
              >
                Message Status
              </UiButton>
            </div>
            <div className="va-inline-tools">
              <UiInput
                placeholder="Bulk Job ID"
                value={jobIdInput}
                onChange={(event) => setJobIdInput(event.target.value)}
              />
              <UiButton
                variant="secondary"
                disabled={investigationBusy.length > 0 || !jobIdInput.trim()}
                onClick={() => {
                  void runInvestigationAction(
                    'email.bulk.job',
                    { job_id: jobIdInput.trim() },
                    (payload) => setJobSnapshot(payload),
                  );
                }}
              >
                Job Status
              </UiButton>
              <UiButton
                variant="secondary"
                disabled={investigationBusy.length > 0}
                onClick={() => {
                  void runInvestigationAction(
                    'email.bulk.history',
                    { limit: 12, offset: 0 },
                    (payload) => setHistorySnapshot(
                      Array.isArray(payload.jobs) ? payload.jobs.map(asRecord) : [],
                    ),
                  );
                }}
              >
                Load History
              </UiButton>
            </div>
            {investigationError ? (
              <UiStatePanel
                title="Email investigation failed"
                description={investigationError}
                tone="error"
                compact
              />
            ) : null}
            <div className="va-subcard-grid va-subcard-grid-two">
              <UiCard tone="subcard">
                <h4>Message Snapshot</h4>
                {messageSnapshot ? (
                  <ul className="va-list va-list-dense">
                    <li><strong>ID:</strong> {pickDisplayText([messageSnapshot.message_id, messageIdInput], 'n/a')}</li>
                    <li><strong>Status:</strong> {pickDisplayText([messageSnapshot.status], 'unknown')}</li>
                    <li><strong>Recipient:</strong> {pickDisplayText([messageSnapshot.recipient_email, messageSnapshot.to], 'n/a')}</li>
                    <li><strong>Provider:</strong> {pickDisplayText([messageSnapshot.provider], 'n/a')}</li>
                    <li><strong>Last Attempt:</strong> {pickDisplayText([messageSnapshot.last_attempt_at], 'n/a')}</li>
                  </ul>
                ) : (
                  <UiStatePanel
                    compact
                    title="No message snapshot"
                    description="Run message status lookup to inspect details."
                  />
                )}
              </UiCard>
              <UiCard tone="subcard">
                <h4>Bulk Job Snapshot</h4>
                {jobSnapshot ? (
                  <ul className="va-list va-list-dense">
                    <li><strong>Job ID:</strong> {pickDisplayText([jobSnapshot.job_id, jobIdInput], 'n/a')}</li>
                    <li><strong>Status:</strong> {pickDisplayText([jobSnapshot.status], 'unknown')}</li>
                    <li><strong>Sent:</strong> {pickDisplayText([jobSnapshot.sent], '0')} / {pickDisplayText([jobSnapshot.total], '0')}</li>
                    <li><strong>Delivered:</strong> {pickDisplayText([jobSnapshot.delivered], '0')}</li>
                    <li><strong>Failed:</strong> {pickDisplayText([jobSnapshot.failed], '0')}</li>
                  </ul>
                ) : (
                  <UiStatePanel
                    compact
                    title="No bulk job snapshot"
                    description="Run job status lookup to inspect send progress."
                  />
                )}
              </UiCard>
            </div>
            <UiCard tone="subcard">
              <h4>Recent History</h4>
              {historySnapshot.length === 0 ? (
                <UiStatePanel
                  compact
                  title="No history loaded"
                  description="Run history lookup to inspect recent email bulk jobs."
                />
              ) : (
                <ul className="va-list va-list-dense">
                  {historySnapshot.slice(0, 10).map((job, index) => (
                    <li key={`mailer-history-${index}`}>
                      <strong>{pickDisplayText([job.job_id], `job-${index + 1}`)}</strong>
                      <span>{pickDisplayText([job.status], 'unknown')}</span>
                      <span>{pickDisplayText([job.sent], '0')} / {pickDisplayText([job.total], '0')} sent</span>
                    </li>
                  ))}
                </ul>
              )}
            </UiCard>
          </UiCard>
        </section>
      </section>
    </>
  );
}
