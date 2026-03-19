import { useState } from 'react';

import type { DashboardVm } from './types';
import { selectSmsPageVm } from './vmSelectors';
import { UiStatePanel } from '@/components/ui/AdminPrimitives';

type SmsSenderPageProps = {
  visible: boolean;
  vm: DashboardVm;
};

export function SmsSenderPage({ visible, vm }: SmsSenderPageProps) {
  if (!visible) return null;

  const {
    smsRecipientsInput,
    setSmsRecipientsInput,
    handleRecipientsFile,
    smsProviderInput,
    setSmsProviderInput,
    smsMessageInput,
    setSmsMessageInput,
    smsScheduleAt,
    setSmsScheduleAt,
    busyAction,
    sendSmsFromConsole,
    smsRecipientsParsed,
    smsInvalidRecipients,
    smsDuplicateCount,
    smsSegmentEstimate,
    smsCostPerSegment,
    setSmsCostPerSegment,
    smsEstimatedCost,
    smsDryRunMode,
    setSmsDryRunMode,
    smsValidationCategories,
    smsRouteSimulationRows,
    smsTotalRecipients,
    smsSuccess,
    smsFailed,
    smsProcessedPercent,
    textBar,
    invokeAction,
    loading,
  } = selectSmsPageVm(vm);
  const smsHasRecipients = smsRecipientsParsed.length > 0;
  const smsHasMessage = smsMessageInput.trim().length > 0;
  const smsRecipientsInvalid = !smsHasRecipients;
  const smsMessageInvalid = !smsHasMessage;
  const smsCanSubmit = smsHasRecipients && smsHasMessage;
  const smsReadinessHint = !smsHasRecipients && !smsHasMessage
    ? 'Add at least one valid recipient and a message body to enable batch execution.'
    : !smsHasRecipients
      ? 'Add at least one valid recipient to enable batch execution.'
      : 'Add a message body to enable batch execution.';
  const [statusSidInput, setStatusSidInput] = useState<string>('');
  const [conversationPhoneInput, setConversationPhoneInput] = useState<string>('');
  const [investigationBusy, setInvestigationBusy] = useState<string>('');
  const [investigationError, setInvestigationError] = useState<string>('');
  const [statusSnapshot, setStatusSnapshot] = useState<Record<string, unknown> | null>(null);
  const [recentMessages, setRecentMessages] = useState<Array<Record<string, unknown>>>([]);
  const [conversationMessages, setConversationMessages] = useState<Array<Record<string, unknown>>>([]);
  const [statsSnapshot, setStatsSnapshot] = useState<Record<string, unknown> | null>(null);

  const asRecord = (value: unknown): Record<string, unknown> => (
    value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {}
  );
  const asDisplayText = (value: unknown, fallback = ''): string => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed ? trimmed : fallback;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    return fallback;
  };
  const pickDisplayText = (values: unknown[], fallback = ''): string => {
    for (const value of values) {
      const next = asDisplayText(value);
      if (next) return next;
    }
    return fallback;
  };

  const runInvestigationAction = async (
    action: string,
    payload: Record<string, unknown>,
    onSuccess: (payload: Record<string, unknown>) => void,
  ): Promise<void> => {
    setInvestigationBusy(action);
    setInvestigationError('');
    try {
      const data = await invokeAction(action, payload);
      onSuccess(asRecord(data));
    } catch (error) {
      setInvestigationError(error instanceof Error ? error.message : String(error));
    } finally {
      setInvestigationBusy('');
    }
  };

  return (
    <>
      <section className="va-page-intro">
        <p className="va-kicker">Messaging</p>
        <h2 className="va-page-title">SMS Operations Console</h2>
        <p className="va-muted">
          Compose bulk SMS campaigns, validate recipients, estimate cost, and monitor completion.
        </p>
        <div className="va-inline-metrics">
          <span className="va-meta-chip">Recipients {smsRecipientsParsed.length}</span>
          <span className="va-meta-chip">Invalid {smsInvalidRecipients.length}</span>
          <span className="va-meta-chip">Duplicates {smsDuplicateCount}</span>
          <span className="va-meta-chip">Segments {smsSegmentEstimate.segments}</span>
          <span className="va-meta-chip">Est. cost ${smsEstimatedCost.toFixed(4)}</span>
        </div>
      </section>

      {loading && smsRecipientsParsed.length === 0 ? (
        <section className="va-grid">
          <div className="va-card">
            <UiStatePanel
              title="Loading SMS telemetry"
              description="Syncing recipient analytics, route simulation, and job outcomes."
              tone="info"
            />
          </div>
        </section>
      ) : null}

      <section className="va-section-block">
        <header className="va-section-header">
          <h3 className="va-section-title">Compose & Validate</h3>
          <p className="va-muted">Prepare recipients, author message, and configure delivery settings.</p>
        </header>
        <section className="va-grid">
      <div className="va-card">
        <h3>SMS Sender Console</h3>
        {!smsRecipientsInput.trim() && !smsMessageInput.trim() ? (
          <UiStatePanel
            title="Start a new SMS batch"
            description="Paste recipients and a message body, or upload a CSV/TXT recipient list."
            tone="info"
            compact
          />
        ) : null}
        <p className="va-card-eyebrow">Audience</p>
        <textarea
          id="va-sms-recipients"
          className="va-input va-textarea"
          placeholder="Recipients (+15551230001), separated by comma/newline"
          value={smsRecipientsInput}
          onChange={(event) => setSmsRecipientsInput(event.target.value)}
          aria-required
          aria-invalid={smsRecipientsInvalid}
          aria-describedby="va-sms-recipients-hint"
          rows={5}
        />
        <p id="va-sms-recipients-hint" className="va-field-hint">
          Enter one or more valid phone numbers. This field is required for batch send.
        </p>
        <div className="va-inline-tools">
          <input
            type="file"
            accept=".csv,.txt"
            aria-label="Upload SMS recipients file"
            onChange={(event) => {
              const file = event.target.files?.[0] || null;
              void handleRecipientsFile(file, 'sms');
              event.currentTarget.value = '';
            }}
          />
          <input
            className="va-input"
            placeholder="Provider (optional)"
            value={smsProviderInput}
            onChange={(event) => setSmsProviderInput(event.target.value)}
          />
        </div>
        <p className="va-card-eyebrow">Message</p>
        <textarea
          id="va-sms-message"
          className="va-input va-textarea"
          placeholder="Message body"
          value={smsMessageInput}
          onChange={(event) => setSmsMessageInput(event.target.value)}
          aria-required
          aria-invalid={smsMessageInvalid}
          aria-describedby="va-sms-message-hint"
          rows={4}
        />
        <p id="va-sms-message-hint" className="va-field-hint">
          Message content is required to execute a send or schedule operation.
        </p>
        <p className="va-card-eyebrow">Delivery Settings</p>
        <div className="va-inline-tools">
          <label className="va-muted">
            Schedule at:
            <input
              className="va-input"
              type="datetime-local"
              value={smsScheduleAt}
              onChange={(event) => setSmsScheduleAt(event.target.value)}
            />
          </label>
          <label className="va-muted">
            Cost/segment ($):
            <input
              className="va-input"
              inputMode="decimal"
              placeholder="0.0075"
              value={smsCostPerSegment}
              onChange={(event) => setSmsCostPerSegment(event.target.value)}
            />
          </label>
          <label className="va-muted">
            <input
              type="checkbox"
              checked={smsDryRunMode}
              onChange={(event) => setSmsDryRunMode(event.target.checked)}
            />
            {' '}Dry-run only
          </label>
          <button
            type="button"
            disabled={busyAction.length > 0 || !smsCanSubmit}
            onClick={() => { void sendSmsFromConsole(); }}
          >
            {smsDryRunMode ? 'Run Dry-Run' : smsScheduleAt ? 'Schedule SMS Batch' : 'Send SMS Batch'}
          </button>
        </div>
        {!smsCanSubmit ? (
          <UiStatePanel
            title="Batch requirements not met"
            description={smsReadinessHint}
            tone="warning"
            compact
          />
        ) : null}
        <div className="va-inline-tools">
          <div className="va-card va-subcard">
            <h4>Validation Preview</h4>
            <p className="va-muted">Valid: <strong>{smsValidationCategories.valid}</strong></p>
            <p className="va-muted">Invalid: <strong>{smsValidationCategories.invalid}</strong></p>
            <p className="va-muted">Duplicates: <strong>{smsValidationCategories.duplicate}</strong></p>
            <p className="va-muted">Likely landline: <strong>{smsValidationCategories.likelyLandline}</strong></p>
          </div>
          <div className="va-card va-subcard">
            <h4>Cost Estimate</h4>
            <p className="va-muted">Estimated send cost: <strong>${smsEstimatedCost.toFixed(4)}</strong></p>
            <p className="va-muted">
              Based on {smsSegmentEstimate.segments} segment(s) per recipient and your cost/segment.
            </p>
          </div>
        </div>
        <p className="va-muted">
          Recipients: <strong>{smsRecipientsParsed.length}</strong>
          {' '}| Invalid: <strong>{smsInvalidRecipients.length}</strong>
          {' '}| Duplicates removed: <strong>{smsDuplicateCount}</strong>
        </p>
        <p className="va-muted">
          Segment estimate: <strong>{smsSegmentEstimate.segments}</strong>
          {' '}segment(s), {smsSegmentEstimate.perSegment} chars/segment.
        </p>
        <h4>Route Simulation</h4>
        {smsRouteSimulationRows.length === 0 ? (
          <UiStatePanel
            title="Route simulation warming up"
            description="Provider routing diagnostics will appear after the first parse/run cycle."
            tone="info"
            compact
          />
        ) : (
          <ul className="va-list">
            {smsRouteSimulationRows.map((row) => (
              <li key={`sms-route-${row.provider}`}>
                <strong>{row.provider}</strong>
                <span>Ready: {row.ready ? 'yes' : 'no'} | Degraded: {row.degraded ? 'yes' : 'no'}</span>
                <span>Parity gaps: {row.parityGapCount}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="va-card">
        <h3>SMS Job Tracker</h3>
        <p>Total recipients (24h): <strong>{smsTotalRecipients}</strong></p>
        <p>Successful: <strong>{smsSuccess}</strong> | Failed: <strong>{smsFailed}</strong></p>
        <pre>{textBar(smsProcessedPercent)}</pre>
        {smsInvalidRecipients.length > 0 ? (
          <UiStatePanel
            title="Recipient format warnings"
            description={`Suppression preview: ${smsInvalidRecipients.slice(0, 10).join(', ')}`}
            tone="warning"
            compact
          />
        ) : null}
      </div>
        </section>
      </section>

      <section className="va-section-block">
        <header className="va-section-header">
          <h3 className="va-section-title">Investigation & Status</h3>
          <p className="va-muted">Message-level diagnostics for recent, conversation, and SID lookups.</p>
        </header>
        <section className="va-grid">
          <div className="va-card">
            <h3>SMS Message Lookup</h3>
            <div className="va-inline-tools">
              <input
                className="va-input"
                placeholder="Message SID"
                value={statusSidInput}
                onChange={(event) => setStatusSidInput(event.target.value)}
              />
              <button
                type="button"
                disabled={investigationBusy.length > 0 || !statusSidInput.trim()}
                onClick={() => {
                  void runInvestigationAction(
                    'sms.message.status',
                    { message_sid: statusSidInput.trim() },
                    (payload) => setStatusSnapshot(asRecord(payload.message) || payload),
                  );
                }}
              >
                Check Status
              </button>
            </div>
            <div className="va-inline-tools">
              <input
                className="va-input"
                placeholder="Phone for conversation (+1555...)"
                value={conversationPhoneInput}
                onChange={(event) => setConversationPhoneInput(event.target.value)}
              />
              <button
                type="button"
                disabled={investigationBusy.length > 0 || !conversationPhoneInput.trim()}
                onClick={() => {
                  void runInvestigationAction(
                    'sms.messages.conversation',
                    { phone: conversationPhoneInput.trim(), limit: 20 },
                    (payload) => setConversationMessages(
                      Array.isArray(payload.messages) ? payload.messages.map(asRecord) : [],
                    ),
                  );
                }}
              >
                Load Conversation
              </button>
              <button
                type="button"
                disabled={investigationBusy.length > 0}
                onClick={() => {
                  void runInvestigationAction(
                    'sms.messages.recent',
                    { limit: 12, offset: 0 },
                    (payload) => setRecentMessages(
                      Array.isArray(payload.messages) ? payload.messages.map(asRecord) : [],
                    ),
                  );
                }}
              >
                Recent
              </button>
              <button
                type="button"
                disabled={investigationBusy.length > 0}
                onClick={() => {
                  void runInvestigationAction(
                    'sms.stats',
                    { hours: 24 },
                    (payload) => setStatsSnapshot(payload),
                  );
                }}
              >
                Stats
              </button>
            </div>
            {investigationError ? (
              <UiStatePanel
                title="SMS investigation failed"
                description={investigationError}
                tone="error"
                compact
              />
            ) : null}
            <div className="va-inline-tools">
              <div className="va-card va-subcard">
                <h4>Status Snapshot</h4>
                {statusSnapshot ? (
                  <ul className="va-list">
                    <li><strong>SID:</strong> {pickDisplayText([statusSnapshot.message_sid, statusSidInput], 'n/a')}</li>
                    <li><strong>Status:</strong> {pickDisplayText([statusSnapshot.status], 'unknown')}</li>
                    <li><strong>To:</strong> {pickDisplayText([statusSnapshot.to_number], 'n/a')}</li>
                    <li><strong>From:</strong> {pickDisplayText([statusSnapshot.from_number], 'n/a')}</li>
                    <li><strong>Provider:</strong> {pickDisplayText([statusSnapshot.provider], 'n/a')}</li>
                  </ul>
                ) : (
                  <p className="va-muted">Run a SID lookup to load status details.</p>
                )}
              </div>
              <div className="va-card va-subcard">
                <h4>Recent Messages</h4>
                {recentMessages.length === 0 ? (
                  <p className="va-muted">No recent messages loaded.</p>
                ) : (
                  <ul className="va-list">
                    {recentMessages.slice(0, 8).map((message, index) => (
                      <li key={`sms-recent-${index}`}>
                        <strong>{pickDisplayText([message.message_sid], `message-${index + 1}`)}</strong>
                        <span>{pickDisplayText([message.status], 'unknown')}</span>
                        <span>{pickDisplayText([message.to_number, message.from_number], 'n/a')}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div className="va-inline-tools">
              <div className="va-card va-subcard">
                <h4>Conversation</h4>
                {conversationMessages.length === 0 ? (
                  <p className="va-muted">Load a phone number to inspect conversation history.</p>
                ) : (
                  <ul className="va-list">
                    {conversationMessages.slice(0, 10).map((message, index) => (
                      <li key={`sms-convo-${index}`}>
                        <strong>{pickDisplayText([message.direction], 'unknown')}</strong>
                        <span>{pickDisplayText([message.status], 'unknown')}</span>
                        <span>{pickDisplayText([message.body], '').slice(0, 120) || 'No body'}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="va-card va-subcard">
                <h4>Stats Snapshot</h4>
                {statsSnapshot ? (
                  <ul className="va-list">
                    <li><strong>Total:</strong> {pickDisplayText([statsSnapshot.total_messages, statsSnapshot.total], '0')}</li>
                    <li><strong>Sent:</strong> {pickDisplayText([statsSnapshot.sent_messages], '0')}</li>
                    <li><strong>Received:</strong> {pickDisplayText([statsSnapshot.received_messages], '0')}</li>
                    <li><strong>Delivered:</strong> {pickDisplayText([statsSnapshot.delivered_count], '0')}</li>
                    <li><strong>Failed:</strong> {pickDisplayText([statsSnapshot.failed_count], '0')}</li>
                    <li><strong>Success Rate:</strong> {pickDisplayText([statsSnapshot.success_rate], '0')}%</li>
                  </ul>
                ) : (
                  <p className="va-muted">Run stats lookup to inspect current SMS posture.</p>
                )}
              </div>
            </div>
          </div>
        </section>
      </section>
    </>
  );
}
