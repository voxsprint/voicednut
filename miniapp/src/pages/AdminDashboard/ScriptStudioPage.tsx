import { useEffect, useMemo, useState } from 'react';

import type { CallScriptRow, DashboardVm } from './types';
import { selectScriptStudioPageVm } from './vmSelectors';
import { UiSelect, UiStatePanel } from '@/components/ui/AdminPrimitives';
import { DASHBOARD_ACTION_CONTRACTS } from '@/contracts/miniappParityContracts';

type ScriptStudioPageProps = {
  visible: boolean;
  vm: DashboardVm;
};

type SmsScriptRow = {
  name?: unknown;
  description?: unknown;
  content?: unknown;
  is_builtin?: unknown;
  lifecycle_state?: unknown;
};

type EmailTemplateRow = {
  template_id?: unknown;
  subject?: unknown;
  html?: unknown;
  text?: unknown;
  lifecycle_state?: unknown;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function toRows(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => asRecord(entry));
}

export function ScriptStudioPage({ visible, vm }: ScriptStudioPageProps) {
  if (!visible) return null;

  const {
    scriptFlowFilter,
    setScriptFlowFilter,
    refreshCallScriptsModule,
    callScriptsTotal,
    callScripts,
    toInt,
    toText,
    selectedCallScriptId,
    setSelectedCallScriptId,
    selectedCallScript,
    selectedCallScriptLifecycleState,
    selectedCallScriptLifecycle,
    formatTime,
    scriptNameInput,
    setScriptNameInput,
    scriptDefaultProfileInput,
    setScriptDefaultProfileInput,
    scriptDescriptionInput,
    setScriptDescriptionInput,
    scriptPromptInput,
    setScriptPromptInput,
    scriptFirstMessageInput,
    setScriptFirstMessageInput,
    scriptObjectiveTagsInput,
    setScriptObjectiveTagsInput,
    busyAction,
    saveCallScriptDraft,
    submitCallScriptForReview,
    scriptReviewNoteInput,
    setScriptReviewNoteInput,
    reviewCallScript,
    promoteCallScriptLive,
    scriptSimulationVariablesInput,
    setScriptSimulationVariablesInput,
    simulateCallScript,
    scriptSimulationResult,
    runAction,
    invokeAction,
  } = selectScriptStudioPageVm(vm);

  const [studioBusy, setStudioBusy] = useState<string>('');
  const [studioError, setStudioError] = useState<string>('');
  const [smsScripts, setSmsScripts] = useState<SmsScriptRow[]>([]);
  const [selectedSmsScriptName, setSelectedSmsScriptName] = useState<string>('');
  const [smsScriptDescriptionInput, setSmsScriptDescriptionInput] = useState<string>('');
  const [smsScriptContentInput, setSmsScriptContentInput] = useState<string>('');
  const [smsScriptCreateName, setSmsScriptCreateName] = useState<string>('');
  const [smsScriptCreateContent, setSmsScriptCreateContent] = useState<string>('');
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplateRow[]>([]);
  const [selectedEmailTemplateId, setSelectedEmailTemplateId] = useState<string>('');
  const [emailTemplateSubjectInput, setEmailTemplateSubjectInput] = useState<string>('');
  const [emailTemplateHtmlInput, setEmailTemplateHtmlInput] = useState<string>('');
  const [emailTemplateTextInput, setEmailTemplateTextInput] = useState<string>('');
  const [emailTemplateCreateId, setEmailTemplateCreateId] = useState<string>('');
  const [callerFlags, setCallerFlags] = useState<Array<Record<string, unknown>>>([]);
  const [callerFlagsStatusFilter, setCallerFlagsStatusFilter] = useState<string>('all');
  const [callerFlagPhoneInput, setCallerFlagPhoneInput] = useState<string>('');
  const [callerFlagStatusInput, setCallerFlagStatusInput] = useState<string>('blocked');
  const [callerFlagNoteInput, setCallerFlagNoteInput] = useState<string>('');
  const [personaBuiltin, setPersonaBuiltin] = useState<Array<Record<string, unknown>>>([]);
  const [personaCustom, setPersonaCustom] = useState<Array<Record<string, unknown>>>([]);

  const selectedSmsScript = useMemo(() => (
    smsScripts.find((script) => toText(script.name, '') === selectedSmsScriptName) || null
  ), [selectedSmsScriptName, smsScripts, toText]);
  const selectedEmailTemplate = useMemo(() => (
    emailTemplates.find((template) => toText(template.template_id, '') === selectedEmailTemplateId) || null
  ), [emailTemplates, selectedEmailTemplateId, toText]);

  useEffect(() => {
    if (!selectedSmsScript) return;
    setSmsScriptDescriptionInput(toText(selectedSmsScript.description, ''));
    setSmsScriptContentInput(toText(selectedSmsScript.content, ''));
  }, [selectedSmsScript, toText]);

  useEffect(() => {
    if (!selectedEmailTemplate) return;
    setEmailTemplateSubjectInput(toText(selectedEmailTemplate.subject, ''));
    setEmailTemplateHtmlInput(toText(selectedEmailTemplate.html, ''));
    setEmailTemplateTextInput(toText(selectedEmailTemplate.text, ''));
  }, [selectedEmailTemplate, toText]);

  const executeStudioAction = async (
    action: string,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> => {
    setStudioBusy(action);
    setStudioError('');
    try {
      const data = await invokeAction(action, payload);
      return asRecord(data);
    } catch (error) {
      setStudioError(error instanceof Error ? error.message : String(error));
      return {};
    } finally {
      setStudioBusy('');
    }
  };

  const loadSmsScripts = async (): Promise<void> => {
    const data = await executeStudioAction(DASHBOARD_ACTION_CONTRACTS.SMSSCRIPT_LIST, {
      include_builtins: true,
      detailed: true,
    });
    const customRows = toRows(data.scripts);
    const builtinRows = toRows(data.builtin);
    const merged = [...customRows, ...builtinRows] as SmsScriptRow[];
    setSmsScripts(merged);
    setSelectedSmsScriptName((current) => {
      if (merged.length === 0) return '';
      const currentExists = merged.some((script) => toText(script.name, '') === current);
      return currentExists ? current : toText(merged[0].name, '');
    });
  };

  const loadEmailTemplates = async (): Promise<void> => {
    const data = await executeStudioAction(DASHBOARD_ACTION_CONTRACTS.EMAILTEMPLATE_LIST, { limit: 120 });
    const rows = toRows(data.templates) as EmailTemplateRow[];
    setEmailTemplates(rows);
    setSelectedEmailTemplateId((current) => {
      if (rows.length === 0) return '';
      const currentExists = rows.some((template) => toText(template.template_id, '') === current);
      return currentExists ? current : toText(rows[0].template_id, '');
    });
  };

  const loadCallerFlags = async (): Promise<void> => {
    const status = callerFlagsStatusFilter === 'all' ? undefined : callerFlagsStatusFilter;
    const data = await executeStudioAction(DASHBOARD_ACTION_CONTRACTS.CALLERFLAGS_LIST, {
      status,
      limit: 120,
    });
    setCallerFlags(toRows(data.flags));
  };

  const loadPersonas = async (): Promise<void> => {
    const data = await executeStudioAction(DASHBOARD_ACTION_CONTRACTS.PERSONA_LIST, {});
    setPersonaBuiltin(toRows(data.builtin));
    setPersonaCustom(toRows(data.custom));
  };

  useEffect(() => {
    void loadSmsScripts();
    void loadEmailTemplates();
    void loadCallerFlags();
    void loadPersonas();
  }, []);

  return (
    <section className="va-grid">
      <div className="va-card">
        <h3>Call Scripts</h3>
        <p className="va-muted">
          Draft edits, review approvals, and promote-live workflow for call scripts.
        </p>
        <div className="va-inline-tools">
          <input
            className="va-input"
            placeholder="Flow filter (optional)"
            value={scriptFlowFilter}
            onChange={(event) => setScriptFlowFilter(event.target.value)}
          />
          <button
            type="button"
            onClick={() => { void refreshCallScriptsModule(); }}
          >
            Refresh Scripts
          </button>
        </div>
        <p className="va-muted">
          Scripts available: <strong>{callScriptsTotal}</strong>
        </p>
        <ul className="va-list">
          {callScripts.slice(0, 60).map((script: CallScriptRow) => {
            const scriptId = toInt(script.id);
            const lifecycle = toText(script.lifecycle_state, 'draft');
            const active = scriptId === selectedCallScriptId;
            return (
              <li key={`call-script-${scriptId}`}>
                <strong>{toText(script.name, `script-${scriptId || 'unknown'}`)}</strong>
                <span>
                  ID: {scriptId} | Flow: {toText(script.flow_type, 'general')} | v{toInt(script.version, 1)}
                </span>
                <span>
                  Lifecycle: <strong>{lifecycle}</strong>
                  {' '}| Persona(default_profile): <strong>{toText(script.default_profile, 'general')}</strong>
                </span>
                <button
                  type="button"
                  className={active ? 'va-chip is-active' : 'va-chip'}
                  onClick={() => setSelectedCallScriptId(scriptId)}
                >
                  {active ? 'Selected' : 'Select'}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="va-card">
        <h3>Call Script Editor</h3>
        {selectedCallScript ? (
          <>
            <p>
              Editing script: <strong>{toText(selectedCallScript.name, 'unknown')}</strong>
              {' '}(# {selectedCallScriptId})
            </p>
            <p className="va-muted">
              Lifecycle: <strong>{selectedCallScriptLifecycleState}</strong>
              {' '}| Submitted: <strong>{formatTime(selectedCallScriptLifecycle.submitted_for_review_at)}</strong>
              {' '}| Reviewed: <strong>{formatTime(selectedCallScriptLifecycle.reviewed_at)}</strong>
            </p>
            <input
              className="va-input"
              placeholder="Script name"
              value={scriptNameInput}
              onChange={(event) => setScriptNameInput(event.target.value)}
            />
            <input
              className="va-input"
              placeholder="Persona profile (default_profile)"
              value={scriptDefaultProfileInput}
              onChange={(event) => setScriptDefaultProfileInput(event.target.value)}
            />
            <textarea
              className="va-input va-textarea"
              placeholder="Description"
              value={scriptDescriptionInput}
              onChange={(event) => setScriptDescriptionInput(event.target.value)}
              rows={2}
            />
            <textarea
              className="va-input va-textarea"
              placeholder="Prompt"
              value={scriptPromptInput}
              onChange={(event) => setScriptPromptInput(event.target.value)}
              rows={6}
            />
            <textarea
              className="va-input va-textarea"
              placeholder="First message"
              value={scriptFirstMessageInput}
              onChange={(event) => setScriptFirstMessageInput(event.target.value)}
              rows={3}
            />
            <input
              className="va-input"
              placeholder="Objective tags (comma-separated)"
              value={scriptObjectiveTagsInput}
              onChange={(event) => setScriptObjectiveTagsInput(event.target.value)}
            />
            <div className="va-inline-tools">
              <button
                type="button"
                disabled={busyAction.length > 0}
                onClick={() => { void saveCallScriptDraft(); }}
              >
                Save Draft
              </button>
              <button
                type="button"
                disabled={busyAction.length > 0}
                onClick={() => { void submitCallScriptForReview(); }}
              >
                Submit Review
              </button>
            </div>
            <textarea
              className="va-input va-textarea"
              placeholder="Review note / approval reason"
              value={scriptReviewNoteInput}
              onChange={(event) => setScriptReviewNoteInput(event.target.value)}
              rows={2}
            />
            <div className="va-inline-tools">
              <button
                type="button"
                disabled={busyAction.length > 0}
                onClick={() => { void reviewCallScript('approve'); }}
              >
                Approve
              </button>
              <button
                type="button"
                disabled={busyAction.length > 0}
                onClick={() => { void reviewCallScript('reject'); }}
              >
                Reject
              </button>
              <button
                type="button"
                disabled={busyAction.length > 0}
                onClick={() => { void promoteCallScriptLive(); }}
              >
                Promote Live
              </button>
            </div>
            <h4>Simulation</h4>
            <textarea
              className="va-input va-textarea"
              placeholder={'Variables JSON, e.g. {"customer_name":"Ada"}'}
              value={scriptSimulationVariablesInput}
              onChange={(event) => setScriptSimulationVariablesInput(event.target.value)}
              rows={3}
            />
            <div className="va-inline-tools">
              <button
                type="button"
                disabled={busyAction.length > 0}
                onClick={() => { void simulateCallScript(); }}
              >
                Run Simulation
              </button>
            </div>
            {scriptSimulationResult ? (
              <pre>
                {JSON.stringify(asRecord(scriptSimulationResult).simulation || scriptSimulationResult, null, 2)}
              </pre>
            ) : null}
          </>
        ) : (
          <p className="va-muted">Select a script from the list to edit and review.</p>
        )}
      </div>

      <div className="va-card">
        <h3>SMS Scripts</h3>
        <p className="va-muted">Parity expansion: manage custom SMS scripts from Mini App.</p>
        <div className="va-inline-tools">
          <button
            type="button"
            disabled={studioBusy.length > 0 || busyAction.length > 0}
            onClick={() => { void loadSmsScripts(); }}
          >
            Refresh SMS Scripts
          </button>
          <input
            className="va-input"
            placeholder="Create script name"
            value={smsScriptCreateName}
            onChange={(event) => setSmsScriptCreateName(event.target.value)}
          />
        </div>
        <textarea
          className="va-input va-textarea"
          placeholder="Create script content"
          value={smsScriptCreateContent}
          onChange={(event) => setSmsScriptCreateContent(event.target.value)}
          rows={3}
        />
        <div className="va-inline-tools">
          <button
            type="button"
            disabled={
              studioBusy.length > 0
              || busyAction.length > 0
              || !smsScriptCreateName.trim()
              || !smsScriptCreateContent.trim()
            }
            onClick={() => {
              void runAction(
                DASHBOARD_ACTION_CONTRACTS.SMSSCRIPT_CREATE,
                {
                  name: smsScriptCreateName.trim(),
                  content: smsScriptCreateContent,
                },
                {
                  successMessage: `Created SMS script "${smsScriptCreateName.trim()}"`,
                  onSuccess: () => {
                    setSmsScriptCreateName('');
                    setSmsScriptCreateContent('');
                    void loadSmsScripts();
                  },
                },
              );
            }}
          >
            Create SMS Script
          </button>
        </div>
        <ul className="va-list">
          {smsScripts.slice(0, 40).map((script, index) => {
            const scriptName = toText(script.name, `sms-script-${index + 1}`);
            const builtin = script.is_builtin === true;
            const active = scriptName === selectedSmsScriptName;
            return (
              <li key={`sms-script-row-${scriptName}`}>
                <strong>{scriptName}</strong>
                <span>Lifecycle: {toText(script.lifecycle_state, builtin ? 'builtin' : 'draft')}</span>
                <span>{builtin ? 'Built-in (read-only)' : 'Custom'}</span>
                <button
                  type="button"
                  className={active ? 'va-chip is-active' : 'va-chip'}
                  onClick={() => setSelectedSmsScriptName(scriptName)}
                >
                  {active ? 'Selected' : 'Select'}
                </button>
              </li>
            );
          })}
        </ul>
        {selectedSmsScript ? (
          <>
            <h4>SMS Script Editor</h4>
            <input
              className="va-input"
              value={selectedSmsScriptName}
              onChange={(event) => setSelectedSmsScriptName(event.target.value)}
              disabled
            />
            <textarea
              className="va-input va-textarea"
              placeholder="Description"
              value={smsScriptDescriptionInput}
              onChange={(event) => setSmsScriptDescriptionInput(event.target.value)}
              rows={2}
              disabled={selectedSmsScript.is_builtin === true}
            />
            <textarea
              className="va-input va-textarea"
              placeholder="SMS script content"
              value={smsScriptContentInput}
              onChange={(event) => setSmsScriptContentInput(event.target.value)}
              rows={4}
              disabled={selectedSmsScript.is_builtin === true}
            />
            <div className="va-inline-tools">
              <button
                type="button"
                disabled={
                  studioBusy.length > 0
                  || busyAction.length > 0
                  || selectedSmsScript.is_builtin === true
                  || !selectedSmsScriptName
                }
                onClick={() => {
                  void runAction(
                    DASHBOARD_ACTION_CONTRACTS.SMSSCRIPT_UPDATE,
                    {
                      script_name: selectedSmsScriptName,
                      description: smsScriptDescriptionInput,
                      content: smsScriptContentInput,
                    },
                    {
                      successMessage: `Updated SMS script "${selectedSmsScriptName}"`,
                      onSuccess: () => {
                        void loadSmsScripts();
                      },
                    },
                  );
                }}
              >
                Save SMS Script
              </button>
              <button
                type="button"
                disabled={
                  studioBusy.length > 0
                  || busyAction.length > 0
                  || selectedSmsScript.is_builtin === true
                  || !selectedSmsScriptName
                }
                onClick={() => {
                  void runAction(
                    DASHBOARD_ACTION_CONTRACTS.SMSSCRIPT_DELETE,
                    { script_name: selectedSmsScriptName },
                    {
                      confirmText: `Delete SMS script "${selectedSmsScriptName}"?`,
                      successMessage: `Deleted SMS script "${selectedSmsScriptName}"`,
                      onSuccess: () => {
                        void loadSmsScripts();
                      },
                    },
                  );
                }}
              >
                Delete SMS Script
              </button>
            </div>
          </>
        ) : null}
      </div>

      <div className="va-card">
        <h3>Email Templates</h3>
        <p className="va-muted">Parity expansion: manage outbound email templates from Mini App.</p>
        <div className="va-inline-tools">
          <button
            type="button"
            disabled={studioBusy.length > 0}
            onClick={() => { void loadEmailTemplates(); }}
          >
            Refresh Templates
          </button>
          <input
            className="va-input"
            placeholder="Create template ID"
            value={emailTemplateCreateId}
            onChange={(event) => setEmailTemplateCreateId(event.target.value)}
          />
          <button
            type="button"
            disabled={studioBusy.length > 0 || busyAction.length > 0 || !emailTemplateCreateId.trim()}
            onClick={() => {
              void runAction(
                DASHBOARD_ACTION_CONTRACTS.EMAILTEMPLATE_CREATE,
                {
                  template_id: emailTemplateCreateId.trim(),
                  subject: 'New template subject',
                  text: 'Template body',
                },
                {
                  successMessage: `Created template "${emailTemplateCreateId.trim()}"`,
                  onSuccess: () => {
                    setEmailTemplateCreateId('');
                    void loadEmailTemplates();
                  },
                },
              );
            }}
          >
            Create Template
          </button>
        </div>
        <ul className="va-list">
          {emailTemplates.slice(0, 40).map((template, index) => {
            const templateId = toText(template.template_id, `template-${index + 1}`);
            const active = templateId === selectedEmailTemplateId;
            return (
              <li key={`email-template-row-${templateId}`}>
                <strong>{templateId}</strong>
                <span>{toText(template.lifecycle_state, 'draft')}</span>
                <button
                  type="button"
                  className={active ? 'va-chip is-active' : 'va-chip'}
                  onClick={() => setSelectedEmailTemplateId(templateId)}
                >
                  {active ? 'Selected' : 'Select'}
                </button>
              </li>
            );
          })}
        </ul>
        {selectedEmailTemplate ? (
          <>
            <h4>Email Template Editor</h4>
            <input
              className="va-input"
              value={selectedEmailTemplateId}
              disabled
            />
            <input
              className="va-input"
              placeholder="Subject"
              value={emailTemplateSubjectInput}
              onChange={(event) => setEmailTemplateSubjectInput(event.target.value)}
            />
            <textarea
              className="va-input va-textarea"
              placeholder="HTML"
              value={emailTemplateHtmlInput}
              onChange={(event) => setEmailTemplateHtmlInput(event.target.value)}
              rows={3}
            />
            <textarea
              className="va-input va-textarea"
              placeholder="Text"
              value={emailTemplateTextInput}
              onChange={(event) => setEmailTemplateTextInput(event.target.value)}
              rows={3}
            />
            <div className="va-inline-tools">
              <button
                type="button"
                disabled={studioBusy.length > 0 || busyAction.length > 0 || !selectedEmailTemplateId}
                onClick={() => {
                  void runAction(
                    DASHBOARD_ACTION_CONTRACTS.EMAILTEMPLATE_UPDATE,
                    {
                      template_id: selectedEmailTemplateId,
                      subject: emailTemplateSubjectInput,
                      html: emailTemplateHtmlInput,
                      text: emailTemplateTextInput,
                    },
                    {
                      successMessage: `Updated template "${selectedEmailTemplateId}"`,
                      onSuccess: () => {
                        void loadEmailTemplates();
                      },
                    },
                  );
                }}
              >
                Save Template
              </button>
              <button
                type="button"
                disabled={studioBusy.length > 0 || busyAction.length > 0 || !selectedEmailTemplateId}
                onClick={() => {
                  void runAction(
                    DASHBOARD_ACTION_CONTRACTS.EMAILTEMPLATE_DELETE,
                    { template_id: selectedEmailTemplateId },
                    {
                      confirmText: `Delete template "${selectedEmailTemplateId}"?`,
                      successMessage: `Deleted template "${selectedEmailTemplateId}"`,
                      onSuccess: () => {
                        void loadEmailTemplates();
                      },
                    },
                  );
                }}
              >
                Delete Template
              </button>
            </div>
          </>
        ) : null}
      </div>

      <div className="va-card">
        <h3>Caller Flags Moderation</h3>
        <p className="va-muted">Allow, block, and spam classifications for inbound caller controls.</p>
        <div className="va-inline-tools">
          <UiSelect
            value={callerFlagsStatusFilter}
            onChange={(event) => setCallerFlagsStatusFilter(event.target.value)}
          >
            <option value="all">All</option>
            <option value="allowed">Allowed</option>
            <option value="blocked">Blocked</option>
            <option value="spam">Spam</option>
          </UiSelect>
          <button
            type="button"
            disabled={studioBusy.length > 0}
            onClick={() => { void loadCallerFlags(); }}
          >
            Refresh Flags
          </button>
        </div>
        <div className="va-inline-tools">
          <input
            className="va-input"
            placeholder="Phone (+1555...)"
            value={callerFlagPhoneInput}
            onChange={(event) => setCallerFlagPhoneInput(event.target.value)}
          />
          <UiSelect
            value={callerFlagStatusInput}
            onChange={(event) => setCallerFlagStatusInput(event.target.value)}
          >
            <option value="blocked">Blocked</option>
            <option value="allowed">Allowed</option>
            <option value="spam">Spam</option>
          </UiSelect>
          <input
            className="va-input"
            placeholder="Note (optional)"
            value={callerFlagNoteInput}
            onChange={(event) => setCallerFlagNoteInput(event.target.value)}
          />
          <button
            type="button"
            disabled={studioBusy.length > 0 || busyAction.length > 0 || !callerFlagPhoneInput.trim()}
            onClick={() => {
              void runAction(
                DASHBOARD_ACTION_CONTRACTS.CALLERFLAGS_UPSERT,
                {
                  phone_number: callerFlagPhoneInput.trim(),
                  status: callerFlagStatusInput,
                  note: callerFlagNoteInput.trim() || undefined,
                },
                {
                  successMessage: `Updated caller flag for ${callerFlagPhoneInput.trim()}`,
                  onSuccess: () => {
                    setCallerFlagPhoneInput('');
                    setCallerFlagNoteInput('');
                    void loadCallerFlags();
                  },
                },
              );
            }}
          >
            Upsert Flag
          </button>
        </div>
        {callerFlags.length === 0 ? (
          <p className="va-muted">No caller flags loaded.</p>
        ) : (
          <ul className="va-list">
            {callerFlags.slice(0, 40).map((flag, index) => (
              <li key={`caller-flag-${index}`}>
                <strong>{toText(flag.phone_number, 'n/a')}</strong>
                <span>{toText(flag.status, 'unknown')}</span>
                <span>{toText(flag.note, 'no note')}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="va-card">
        <h3>Persona Manager</h3>
        <p className="va-muted">
          Persona catalog visibility for Mini App parity with bot persona workflows.
        </p>
        <div className="va-inline-tools">
          <button
            type="button"
            disabled={studioBusy.length > 0}
            onClick={() => { void loadPersonas(); }}
          >
            Refresh Personas
          </button>
        </div>
        <div className="va-inline-tools">
          <div className="va-card va-subcard">
            <h4>Built-in Personas ({personaBuiltin.length})</h4>
            {personaBuiltin.length === 0 ? (
              <p className="va-muted">No built-in personas reported.</p>
            ) : (
              <ul className="va-list">
                {personaBuiltin.slice(0, 20).map((persona, index) => (
                  <li key={`persona-builtin-${index}`}>
                    <strong>{toText(persona.label, toText(persona.name, `builtin-${index + 1}`))}</strong>
                    <span>{toText(persona.id, 'n/a')}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="va-card va-subcard">
            <h4>Custom Personas ({personaCustom.length})</h4>
            {personaCustom.length === 0 ? (
              <UiStatePanel
                title="No custom personas available"
                description="This environment currently exposes built-ins only."
                tone="info"
                compact
              />
            ) : (
              <ul className="va-list">
                {personaCustom.slice(0, 20).map((persona, index) => (
                  <li key={`persona-custom-${index}`}>
                    <strong>{toText(persona.label, toText(persona.name, `custom-${index + 1}`))}</strong>
                    <span>{toText(persona.slug, toText(persona.id, 'n/a'))}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {studioError ? (
        <div className="va-card">
          <UiStatePanel
            title="Studio action failed"
            description={studioError}
            tone="error"
          />
        </div>
      ) : null}
    </section>
  );
}
