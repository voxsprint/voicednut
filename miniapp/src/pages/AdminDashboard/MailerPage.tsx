import type { DashboardVm, EmailJob } from './types';
import { selectMailerPageVm } from './vmSelectors';
import { UiStatePanel } from '@/components/ui/AdminPrimitives';

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
    loading,
  } = selectMailerPageVm(vm);
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

  return (
    <>
      <section className="va-page-intro">
        <p className="va-kicker">Messaging</p>
        <h2 className="va-page-title">Email Operations Console</h2>
        <p className="va-muted">
          Build and schedule campaigns, validate template variables, and track deliverability performance.
        </p>
        <div className="va-inline-metrics">
          <span className="va-meta-chip">Audience {mailerRecipientsParsed.length}</span>
          <span className="va-meta-chip">Invalid {mailerInvalidRecipients.length}</span>
          <span className="va-meta-chip">Duplicates {mailerDuplicateCount}</span>
          <span className="va-meta-chip">Delivered {emailDelivered}</span>
          <span className="va-meta-chip">Suppressed {emailSuppressed}</span>
        </div>
      </section>

      {loading && mailerRecipientsParsed.length === 0 ? (
        <section className="va-grid">
          <div className="va-card">
            <UiStatePanel
              title="Loading mailer telemetry"
              description="Syncing recipient analytics, domain health, and recent delivery outcomes."
              tone="info"
            />
          </div>
        </section>
      ) : null}
      <section className="va-section-block">
        <header className="va-section-header">
          <h3 className="va-section-title">Compose & Queue</h3>
          <p className="va-muted">Prepare recipients, draft content, and schedule the outbound batch.</p>
        </header>
        <section className="va-grid">
          <div className="va-card">
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
            <textarea
              id="va-mailer-recipients"
              className="va-input va-textarea"
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
              <input
                className="va-input"
                placeholder="Template ID (optional)"
                value={mailerTemplateIdInput}
                onChange={(event) => setMailerTemplateIdInput(event.target.value)}
              />
            </div>
            <p className="va-card-eyebrow">Content</p>
            <input
              id="va-mailer-subject"
              className="va-input"
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
            <textarea
              id="va-mailer-html-body"
              className="va-input va-textarea"
              placeholder="HTML body (optional)"
              value={mailerHtmlInput}
              onChange={(event) => setMailerHtmlInput(event.target.value)}
              aria-required={mailerBodyRequired}
              aria-invalid={mailerBodyInvalid}
              aria-describedby="va-mailer-body-hint"
              rows={4}
            />
            <textarea
              id="va-mailer-text-body"
              className="va-input va-textarea"
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
            <textarea
              className="va-input va-textarea"
              placeholder={'Variables JSON, e.g. {"first_name":"Ada"}'}
              value={mailerVariablesInput}
              onChange={(event) => setMailerVariablesInput(event.target.value)}
              rows={3}
            />
            <p className="va-card-eyebrow">Scheduling</p>
            <div className="va-inline-tools">
              <label className="va-muted">
                Send at:
                <input
                  className="va-input"
                  type="datetime-local"
                  value={mailerScheduleAt}
                  onChange={(event) => setMailerScheduleAt(event.target.value)}
                />
              </label>
              <button
                type="button"
                disabled={busyAction.length > 0 || !mailerCanSubmit}
                onClick={() => { void sendMailerFromConsole(); }}
              >
                Queue Mailer Job
              </button>
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
            <div className="va-card va-subcard">
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
            </div>
          </div>
          <div className="va-card">
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
            <div className="va-card va-subcard">
              <h4>Domain Health</h4>
              <p className="va-muted">Status: <strong>{mailerDomainHealthStatus}</strong></p>
              <p className="va-muted">{mailerDomainHealthDetail}</p>
            </div>
            <div className="va-card va-subcard">
              <h4>Bounce/Complaint Trend</h4>
              {mailerTrendBars.length === 0 ? (
                <UiStatePanel
                  title="No trend data yet"
                  description="Bounce/complaint trend bars will appear once recent jobs are available."
                  tone="info"
                  compact
                />
              ) : (
                <ul className="va-list">
                  {mailerTrendBars.map((bar, index) => (
                    <li key={`mailer-trend-${index}`}><pre>{bar}</pre></li>
                  ))}
                </ul>
              )}
            </div>
            {emailJobs.length > 0 ? (
              <ul className="va-list">
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
          </div>
        </section>
      </section>
    </>
  );
}
