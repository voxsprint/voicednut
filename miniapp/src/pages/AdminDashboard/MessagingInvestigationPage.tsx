import { useState } from 'react';

import type { DashboardVm } from './types';
import { selectSmsPageVm } from './vmSelectors';
import { UiBadge, UiButton, UiCard, UiInput, UiStatePanel } from '@/components/ui/AdminPrimitives';

type MessagingInvestigationPageProps = {
  visible: boolean;
  vm: DashboardVm;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asDisplayText(value: unknown, fallback = ''): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : fallback;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return fallback;
}

function pickDisplayText(values: unknown[], fallback = ''): string {
  for (const value of values) {
    const next = asDisplayText(value);
    if (next) return next;
  }
  return fallback;
}

export function MessagingInvestigationPage({ visible, vm }: MessagingInvestigationPageProps) {
  if (!visible) return null;

  const { invokeAction, busyAction } = selectSmsPageVm(vm);

  const [busy, setBusy] = useState<string>('');
  const [error, setError] = useState<string>('');

  const [statusSidInput, setStatusSidInput] = useState<string>('');
  const [conversationPhoneInput, setConversationPhoneInput] = useState<string>('');
  const [statusSnapshot, setStatusSnapshot] = useState<Record<string, unknown> | null>(null);
  const [recentMessages, setRecentMessages] = useState<Array<Record<string, unknown>>>([]);
  const [conversationMessages, setConversationMessages] = useState<Array<Record<string, unknown>>>([]);
  const [smsStatsSnapshot, setSmsStatsSnapshot] = useState<Record<string, unknown> | null>(null);

  const [messageIdInput, setMessageIdInput] = useState<string>('');
  const [jobIdInput, setJobIdInput] = useState<string>('');
  const [messageSnapshot, setMessageSnapshot] = useState<Record<string, unknown> | null>(null);
  const [jobSnapshot, setJobSnapshot] = useState<Record<string, unknown> | null>(null);
  const [historySnapshot, setHistorySnapshot] = useState<Array<Record<string, unknown>>>([]);
  const controlsBusy = busy.length > 0 || busyAction.length > 0;
  const hasSmsInvestigationData = Boolean(
    statusSnapshot
    || smsStatsSnapshot
    || recentMessages.length > 0
    || conversationMessages.length > 0,
  );
  const hasEmailInvestigationData = Boolean(
    messageSnapshot
    || jobSnapshot
    || historySnapshot.length > 0,
  );

  const runAction = async (
    action: string,
    payload: Record<string, unknown>,
    onSuccess: (payload: Record<string, unknown>) => void,
  ): Promise<void> => {
    setBusy(action);
    setError('');
    try {
      const result = await invokeAction(action, payload);
      onSuccess(asRecord(result));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setBusy('');
    }
  };

  return (
    <>
      <section className="va-page-intro">
        <p className="va-kicker">Messaging</p>
        <h2 className="va-page-title">Messaging Investigation</h2>
        <p className="va-muted">Unified diagnostics for SMS and email delivery events, status, and history.</p>
        <div className="va-inline-metrics">
          <UiBadge>SMS recent {recentMessages.length}</UiBadge>
          <UiBadge>SMS conversation {conversationMessages.length}</UiBadge>
          <UiBadge>Email jobs {historySnapshot.length}</UiBadge>
          <UiBadge variant={error ? 'error' : controlsBusy ? 'info' : 'success'}>
            {error ? 'State error' : controlsBusy ? 'State busy' : 'State ready'}
          </UiBadge>
        </div>
      </section>

      {error ? (
        <section className="va-grid">
          <UiCard>
            <UiStatePanel
              title="Messaging investigation failed"
              description={error}
              tone="error"
            />
          </UiCard>
        </section>
      ) : null}

      {controlsBusy ? (
        <section className="va-grid">
          <UiCard>
            <UiStatePanel
              compact
              title="Request in progress"
              description={`Running ${busy || busyAction}...`}
            />
          </UiCard>
        </section>
      ) : null}

      <section className="va-section-block">
        <header className="va-section-header">
          <h3 className="va-section-title">SMS Diagnostics</h3>
          <p className="va-muted">Investigate delivery status, phone conversation history, and delivery stats.</p>
        </header>
        <section className="va-grid">
          <UiCard className="va-investigation-card">
          <h3>SMS Investigation</h3>
          {!hasSmsInvestigationData ? (
            <UiStatePanel
              compact
              title="No SMS diagnostics loaded"
              description="Run status, conversation, recent, or stats queries to populate this workspace."
              tone="info"
            />
          ) : null}
          <div className="va-inline-tools">
            <UiInput
              placeholder="Message SID"
              value={statusSidInput}
              onChange={(event) => setStatusSidInput(event.target.value)}
            />
            <UiButton
              variant="secondary"
              disabled={controlsBusy || !statusSidInput.trim()}
              onClick={() => {
                void runAction('sms.message.status', { message_sid: statusSidInput.trim() }, (payload) => {
                  setStatusSnapshot(asRecord(payload.message) || payload);
                });
              }}
            >
              Check Status
            </UiButton>
          </div>
          <div className="va-inline-tools">
            <UiInput
              placeholder="Phone for conversation (+1555...)"
              value={conversationPhoneInput}
              onChange={(event) => setConversationPhoneInput(event.target.value)}
            />
            <UiButton
              variant="secondary"
              disabled={controlsBusy || !conversationPhoneInput.trim()}
              onClick={() => {
                void runAction('sms.messages.conversation', { phone: conversationPhoneInput.trim(), limit: 20 }, (payload) => {
                  setConversationMessages(Array.isArray(payload.messages) ? payload.messages.map(asRecord) : []);
                });
              }}
            >
              Load Conversation
            </UiButton>
            <UiButton
              variant="secondary"
              disabled={controlsBusy}
              onClick={() => {
                void runAction('sms.messages.recent', { limit: 12, offset: 0 }, (payload) => {
                  setRecentMessages(Array.isArray(payload.messages) ? payload.messages.map(asRecord) : []);
                });
              }}
            >
              Recent
            </UiButton>
            <UiButton
              variant="secondary"
              disabled={controlsBusy}
              onClick={() => {
                void runAction('sms.stats', { hours: 24 }, (payload) => setSmsStatsSnapshot(payload));
              }}
            >
              Stats
            </UiButton>
          </div>
          <div className="va-subcard-grid va-subcard-grid-two">
            <UiCard tone="subcard">
              <h4>Status Snapshot</h4>
              {statusSnapshot ? (
                <ul className="va-native-list">
                  <li className="va-native-list-row">
                    <div className="va-native-list-head">
                      <strong>Message SID</strong>
                      <span className="va-native-list-value">{pickDisplayText([statusSnapshot.message_sid, statusSidInput], 'n/a')}</span>
                    </div>
                  </li>
                  <li className="va-native-list-row">
                    <div className="va-native-list-head">
                      <strong>Status</strong>
                      <span className="va-native-list-value">{pickDisplayText([statusSnapshot.status], 'unknown')}</span>
                    </div>
                  </li>
                  <li className="va-native-list-row">
                    <div className="va-native-list-head">
                      <strong>To</strong>
                      <span className="va-native-list-value">{pickDisplayText([statusSnapshot.to_number], 'n/a')}</span>
                    </div>
                  </li>
                  <li className="va-native-list-row">
                    <div className="va-native-list-head">
                      <strong>From</strong>
                      <span className="va-native-list-value">{pickDisplayText([statusSnapshot.from_number], 'n/a')}</span>
                    </div>
                  </li>
                  <li className="va-native-list-row">
                    <div className="va-native-list-head">
                      <strong>Provider</strong>
                      <span className="va-native-list-value">{pickDisplayText([statusSnapshot.provider], 'n/a')}</span>
                    </div>
                  </li>
                </ul>
              ) : (
                <UiStatePanel
                  compact
                  title="No status snapshot"
                  description="Run a SID lookup to load status details."
                />
              )}
            </UiCard>
            <UiCard tone="subcard">
              <h4>Recent Messages</h4>
              {recentMessages.length === 0 ? (
                <UiStatePanel
                  compact
                  title="No recent messages loaded"
                  description="Run a recent-message query to populate this list."
                />
              ) : (
                <ul className="va-native-list">
                  {recentMessages.slice(0, 10).map((message, index) => (
                    <li key={`msg-investigation-recent-${index}`} className="va-native-list-row">
                      <div className="va-native-list-head">
                        <strong>{pickDisplayText([message.message_sid], `message-${index + 1}`)}</strong>
                        <span className="va-native-list-value">{pickDisplayText([message.status], 'unknown')}</span>
                      </div>
                      <div className="va-native-list-meta">
                        <span>{pickDisplayText([message.to_number, message.from_number], 'n/a')}</span>
                        <span>{pickDisplayText([message.provider], 'provider:n/a')}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </UiCard>
          </div>
          <div className="va-subcard-grid va-subcard-grid-two">
            <UiCard tone="subcard">
              <h4>Conversation</h4>
              {conversationMessages.length === 0 ? (
                <UiStatePanel
                  compact
                  title="No conversation loaded"
                  description="Load a phone number to inspect conversation history."
                />
              ) : (
                <ul className="va-native-list">
                  {conversationMessages.slice(0, 12).map((message, index) => (
                    <li key={`msg-investigation-convo-${index}`} className="va-native-list-row">
                      <div className="va-native-list-head">
                        <strong>{pickDisplayText([message.direction], 'unknown')}</strong>
                        <span className="va-native-list-value">{pickDisplayText([message.status], 'unknown')}</span>
                      </div>
                      <div className="va-native-list-meta">
                        <span>{pickDisplayText([message.body], '').slice(0, 120) || 'No body'}</span>
                        <span>{pickDisplayText([message.message_sid], `message-${index + 1}`)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </UiCard>
            <UiCard tone="subcard">
              <h4>SMS Stats Snapshot</h4>
              {smsStatsSnapshot ? (
                <ul className="va-native-list">
                  <li className="va-native-list-row">
                    <div className="va-native-list-head">
                      <strong>Total</strong>
                      <span className="va-native-list-value">{pickDisplayText([smsStatsSnapshot.total_messages, smsStatsSnapshot.total], '0')}</span>
                    </div>
                  </li>
                  <li className="va-native-list-row">
                    <div className="va-native-list-head">
                      <strong>Sent</strong>
                      <span className="va-native-list-value">{pickDisplayText([smsStatsSnapshot.sent_messages], '0')}</span>
                    </div>
                  </li>
                  <li className="va-native-list-row">
                    <div className="va-native-list-head">
                      <strong>Received</strong>
                      <span className="va-native-list-value">{pickDisplayText([smsStatsSnapshot.received_messages], '0')}</span>
                    </div>
                  </li>
                  <li className="va-native-list-row">
                    <div className="va-native-list-head">
                      <strong>Delivered</strong>
                      <span className="va-native-list-value">{pickDisplayText([smsStatsSnapshot.delivered_count], '0')}</span>
                    </div>
                  </li>
                  <li className="va-native-list-row">
                    <div className="va-native-list-head">
                      <strong>Failed</strong>
                      <span className="va-native-list-value">{pickDisplayText([smsStatsSnapshot.failed_count], '0')}</span>
                    </div>
                  </li>
                  <li className="va-native-list-row">
                    <div className="va-native-list-head">
                      <strong>Success Rate</strong>
                      <span className="va-native-list-value">{pickDisplayText([smsStatsSnapshot.success_rate], '0')}%</span>
                    </div>
                  </li>
                </ul>
              ) : (
                <UiStatePanel
                  compact
                  title="No SMS stats loaded"
                  description="Run a stats lookup to inspect current SMS posture."
                />
              )}
            </UiCard>
          </div>
          </UiCard>
        </section>
      </section>

      <section className="va-section-block">
        <header className="va-section-header">
          <h3 className="va-section-title">Email Diagnostics</h3>
          <p className="va-muted">Inspect single-message status, bulk job snapshots, and recent batch history.</p>
        </header>
        <section className="va-grid">
          <UiCard className="va-investigation-card">
          <h3>Email Investigation</h3>
          {!hasEmailInvestigationData ? (
            <UiStatePanel
              compact
              title="No email diagnostics loaded"
              description="Run message status, job status, or history queries to populate this workspace."
              tone="info"
            />
          ) : null}
          <div className="va-inline-tools">
            <UiInput
              placeholder="Message ID"
              value={messageIdInput}
              onChange={(event) => setMessageIdInput(event.target.value)}
            />
            <UiButton
              variant="secondary"
              disabled={controlsBusy || !messageIdInput.trim()}
              onClick={() => {
                void runAction('email.message.status', { message_id: messageIdInput.trim() }, (payload) => {
                  setMessageSnapshot(asRecord(payload.message) || payload);
                });
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
              disabled={controlsBusy || !jobIdInput.trim()}
              onClick={() => {
                void runAction('email.bulk.job', { job_id: jobIdInput.trim() }, (payload) => setJobSnapshot(payload));
              }}
            >
              Job Status
            </UiButton>
            <UiButton
              variant="secondary"
              disabled={controlsBusy}
              onClick={() => {
                void runAction('email.bulk.history', { limit: 12, offset: 0 }, (payload) => {
                  setHistorySnapshot(Array.isArray(payload.jobs) ? payload.jobs.map(asRecord) : []);
                });
              }}
            >
              Load History
            </UiButton>
          </div>
          <div className="va-subcard-grid va-subcard-grid-two">
            <UiCard tone="subcard">
              <h4>Message Snapshot</h4>
              {messageSnapshot ? (
                <ul className="va-native-list">
                  <li className="va-native-list-row">
                    <div className="va-native-list-head">
                      <strong>Message ID</strong>
                      <span className="va-native-list-value">{pickDisplayText([messageSnapshot.message_id, messageIdInput], 'n/a')}</span>
                    </div>
                  </li>
                  <li className="va-native-list-row">
                    <div className="va-native-list-head">
                      <strong>Status</strong>
                      <span className="va-native-list-value">{pickDisplayText([messageSnapshot.status], 'unknown')}</span>
                    </div>
                  </li>
                  <li className="va-native-list-row">
                    <div className="va-native-list-head">
                      <strong>Recipient</strong>
                      <span className="va-native-list-value">{pickDisplayText([messageSnapshot.recipient_email, messageSnapshot.to], 'n/a')}</span>
                    </div>
                  </li>
                  <li className="va-native-list-row">
                    <div className="va-native-list-head">
                      <strong>Provider</strong>
                      <span className="va-native-list-value">{pickDisplayText([messageSnapshot.provider], 'n/a')}</span>
                    </div>
                  </li>
                  <li className="va-native-list-row">
                    <div className="va-native-list-head">
                      <strong>Last Attempt</strong>
                      <span className="va-native-list-value">{pickDisplayText([messageSnapshot.last_attempt_at], 'n/a')}</span>
                    </div>
                  </li>
                </ul>
              ) : (
                <UiStatePanel
                  compact
                  title="No message snapshot"
                  description="Run message status lookup to inspect delivery details."
                />
              )}
            </UiCard>
            <UiCard tone="subcard">
              <h4>Bulk Job Snapshot</h4>
              {jobSnapshot ? (
                <ul className="va-native-list">
                  <li className="va-native-list-row">
                    <div className="va-native-list-head">
                      <strong>Job ID</strong>
                      <span className="va-native-list-value">{pickDisplayText([jobSnapshot.job_id, jobIdInput], 'n/a')}</span>
                    </div>
                  </li>
                  <li className="va-native-list-row">
                    <div className="va-native-list-head">
                      <strong>Status</strong>
                      <span className="va-native-list-value">{pickDisplayText([jobSnapshot.status], 'unknown')}</span>
                    </div>
                  </li>
                  <li className="va-native-list-row">
                    <div className="va-native-list-head">
                      <strong>Sent</strong>
                      <span className="va-native-list-value">{pickDisplayText([jobSnapshot.sent], '0')} / {pickDisplayText([jobSnapshot.total], '0')}</span>
                    </div>
                  </li>
                  <li className="va-native-list-row">
                    <div className="va-native-list-head">
                      <strong>Delivered</strong>
                      <span className="va-native-list-value">{pickDisplayText([jobSnapshot.delivered], '0')}</span>
                    </div>
                  </li>
                  <li className="va-native-list-row">
                    <div className="va-native-list-head">
                      <strong>Failed</strong>
                      <span className="va-native-list-value">{pickDisplayText([jobSnapshot.failed], '0')}</span>
                    </div>
                  </li>
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
                description="Load email bulk history to inspect recent jobs."
              />
            ) : (
              <ul className="va-native-list">
                {historySnapshot.slice(0, 12).map((job, index) => (
                  <li key={`msg-investigation-email-history-${index}`} className="va-native-list-row">
                    <div className="va-native-list-head">
                      <strong>{pickDisplayText([job.job_id], `job-${index + 1}`)}</strong>
                      <span className="va-native-list-value">{pickDisplayText([job.status], 'unknown')}</span>
                    </div>
                    <div className="va-native-list-meta">
                      <span>{pickDisplayText([job.sent], '0')} / {pickDisplayText([job.total], '0')} sent</span>
                      <span>{pickDisplayText([job.provider], 'provider:n/a')}</span>
                    </div>
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
