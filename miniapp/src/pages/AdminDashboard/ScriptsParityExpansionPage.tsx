import { useEffect, useMemo, useState } from 'react';

import { buildModuleRequestState } from './moduleRequestState';
import type { DashboardVm } from './types';
import { useInvestigationAction } from './useInvestigationAction';
import { selectScriptStudioPageVm } from './vmSelectors';
import { UiBadge, UiButton, UiCard, UiInput, UiStatePanel, UiTextarea } from '@/components/ui/AdminPrimitives';
import { DASHBOARD_ACTION_CONTRACTS } from '@/contracts/miniappParityContracts';

type ScriptsParityExpansionPageProps = {
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

function toLifecycleBadgeVariant(value: unknown): 'meta' | 'info' | 'success' | 'error' {
  const normalized = typeof value === 'string'
    ? value.trim().toLowerCase()
    : typeof value === 'number' || typeof value === 'boolean'
      ? String(value).trim().toLowerCase()
      : '';
  if (!normalized) return 'meta';
  if (normalized.includes('active') || normalized.includes('ready') || normalized.includes('published')) {
    return 'success';
  }
  if (normalized.includes('error') || normalized.includes('fail') || normalized.includes('blocked')) {
    return 'error';
  }
  return 'info';
}

export function ScriptsParityExpansionPage({ visible, vm }: ScriptsParityExpansionPageProps) {
  if (!visible) return null;

  const { toText, invokeAction, runAction, busyAction } = selectScriptStudioPageVm(vm);

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
  const {
    investigationBusy,
    investigationError,
    runInvestigationAction,
  } = useInvestigationAction(invokeAction);
  const requestState = buildModuleRequestState({
    busyAction,
    secondaryBusyAction: investigationBusy,
  });
  const controlsBusy = requestState.isBusy;
  const activeAction = requestState.activeActionLabel;

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

  const loadSmsScripts = async (): Promise<void> => {
    await runInvestigationAction(
      DASHBOARD_ACTION_CONTRACTS.SMSSCRIPT_LIST,
      {
        include_builtins: true,
        detailed: true,
      },
      (data) => {
        const customRows = toRows(data.scripts);
        const builtinRows = toRows(data.builtin);
        const merged = [...customRows, ...builtinRows] as SmsScriptRow[];
        setSmsScripts(merged);
        setSelectedSmsScriptName((current) => {
          if (merged.length === 0) return '';
          const currentExists = merged.some((script) => toText(script.name, '') === current);
          return currentExists ? current : toText(merged[0].name, '');
        });
      },
    );
  };

  const loadEmailTemplates = async (): Promise<void> => {
    await runInvestigationAction(
      DASHBOARD_ACTION_CONTRACTS.EMAILTEMPLATE_LIST,
      { limit: 120 },
      (data) => {
        const rows = toRows(data.templates) as EmailTemplateRow[];
        setEmailTemplates(rows);
        setSelectedEmailTemplateId((current) => {
          if (rows.length === 0) return '';
          const currentExists = rows.some((template) => toText(template.template_id, '') === current);
          return currentExists ? current : toText(rows[0].template_id, '');
        });
      },
    );
  };

  useEffect(() => {
    void loadSmsScripts();
    void loadEmailTemplates();
  }, []);

  return (
    <>
      <section className="va-page-intro">
        <p className="va-kicker">Content</p>
        <h2 className="va-page-title">Scripts Parity Expansion</h2>
        <p className="va-muted">Manage SMS scripts and email templates in dedicated parity tooling.</p>
        <div className="va-inline-metrics">
          <UiBadge>SMS scripts {smsScripts.length}</UiBadge>
          <UiBadge>Email templates {emailTemplates.length}</UiBadge>
          <UiBadge>Selected script {selectedSmsScriptName || 'none'}</UiBadge>
          <UiBadge>Selected template {selectedEmailTemplateId || 'none'}</UiBadge>
        </div>
      </section>

      <section className="va-grid">
        <UiCard>
          <h3>SMS Scripts</h3>
          <p className="va-muted">Create, update, and maintain SMS script assets.</p>
          <div className="va-inline-tools">
            <UiButton
              variant="secondary"
              disabled={controlsBusy}
              onClick={() => { void loadSmsScripts(); }}
            >
              Refresh SMS Scripts
            </UiButton>
            <UiInput
              placeholder="Create script name"
              value={smsScriptCreateName}
              onChange={(event) => setSmsScriptCreateName(event.target.value)}
            />
          </div>
          <UiTextarea
            placeholder="Create script content"
            value={smsScriptCreateContent}
            onChange={(event) => setSmsScriptCreateContent(event.target.value)}
            rows={3}
          />
          <div className="va-inline-tools">
            <UiButton
              variant="primary"
              disabled={controlsBusy || !smsScriptCreateName.trim() || !smsScriptCreateContent.trim()}
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
            </UiButton>
          </div>
          {smsScripts.length === 0 ? (
            <UiStatePanel
              compact
              title="No SMS scripts found"
              description="Create a script or refresh to pull latest content."
            />
          ) : (
            <ul className="va-list va-list-dense">
              {smsScripts.slice(0, 40).map((script, index) => {
              const scriptName = toText(script.name, `sms-script-${index + 1}`);
              const builtin = script.is_builtin === true;
              const active = scriptName === selectedSmsScriptName;
              return (
                <li key={`scripts-parity-sms-${scriptName}`}>
                  <strong>{scriptName}</strong>
                  <span>
                    <UiBadge variant={toLifecycleBadgeVariant(script.lifecycle_state)}>
                      Lifecycle {toText(script.lifecycle_state, builtin ? 'builtin' : 'draft')}
                    </UiBadge>
                  </span>
                  <span>
                    <UiBadge variant={builtin ? 'info' : 'meta'}>
                      {builtin ? 'Built-in (read-only)' : 'Custom'}
                    </UiBadge>
                  </span>
                  <UiButton
                    variant="chip"
                    className={active ? 'is-active' : ''}
                    onClick={() => setSelectedSmsScriptName(scriptName)}
                  >
                    {active ? 'Selected' : 'Select'}
                  </UiButton>
                </li>
              );
              })}
            </ul>
          )}
          {selectedSmsScript ? (
            <>
              <h4>SMS Script Editor</h4>
              {selectedSmsScript.is_builtin === true ? (
                <UiStatePanel
                  compact
                  title="Read-only built-in script"
                  description="Clone this script into a custom script if you need to modify content."
                  tone="info"
                />
              ) : null}
              <UiInput value={selectedSmsScriptName} disabled />
              <UiTextarea
                placeholder="Description"
                value={smsScriptDescriptionInput}
                onChange={(event) => setSmsScriptDescriptionInput(event.target.value)}
                rows={2}
                disabled={selectedSmsScript.is_builtin === true}
              />
              <UiTextarea
                placeholder="SMS script content"
                value={smsScriptContentInput}
                onChange={(event) => setSmsScriptContentInput(event.target.value)}
                rows={4}
                disabled={selectedSmsScript.is_builtin === true}
              />
              <div className="va-inline-tools">
                <UiButton
                  variant="primary"
                  disabled={controlsBusy || selectedSmsScript.is_builtin === true || !selectedSmsScriptName}
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
                </UiButton>
                <UiButton
                  variant="secondary"
                  disabled={controlsBusy || selectedSmsScript.is_builtin === true || !selectedSmsScriptName}
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
                </UiButton>
              </div>
            </>
          ) : null}
        </UiCard>

        <UiCard>
          <h3>Email Templates</h3>
          <p className="va-muted">Create and maintain reusable email templates.</p>
          <div className="va-inline-tools">
            <UiButton variant="secondary" disabled={controlsBusy} onClick={() => { void loadEmailTemplates(); }}>
              Refresh Templates
            </UiButton>
            <UiInput
              placeholder="Create template ID"
              value={emailTemplateCreateId}
              onChange={(event) => setEmailTemplateCreateId(event.target.value)}
            />
            <UiButton
              variant="primary"
              disabled={controlsBusy || !emailTemplateCreateId.trim()}
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
            </UiButton>
          </div>
          {emailTemplates.length === 0 ? (
            <UiStatePanel
              compact
              title="No templates found"
              description="Create a template or refresh to pull latest templates."
            />
          ) : (
            <ul className="va-list va-list-dense">
              {emailTemplates.slice(0, 40).map((template, index) => {
              const templateId = toText(template.template_id, `template-${index + 1}`);
              const active = templateId === selectedEmailTemplateId;
              return (
                <li key={`scripts-parity-email-${templateId}`}>
                  <strong>{templateId}</strong>
                  <span>
                    <UiBadge variant={toLifecycleBadgeVariant(template.lifecycle_state)}>
                      {toText(template.lifecycle_state, 'draft')}
                    </UiBadge>
                  </span>
                  <UiButton
                    variant="chip"
                    className={active ? 'is-active' : ''}
                    onClick={() => setSelectedEmailTemplateId(templateId)}
                  >
                    {active ? 'Selected' : 'Select'}
                  </UiButton>
                </li>
              );
              })}
            </ul>
          )}
          {selectedEmailTemplate ? (
            <>
              <h4>Email Template Editor</h4>
              <UiInput value={selectedEmailTemplateId} disabled />
              <UiInput
                placeholder="Subject"
                value={emailTemplateSubjectInput}
                onChange={(event) => setEmailTemplateSubjectInput(event.target.value)}
              />
              <UiTextarea
                placeholder="HTML"
                value={emailTemplateHtmlInput}
                onChange={(event) => setEmailTemplateHtmlInput(event.target.value)}
                rows={3}
              />
              <UiTextarea
                placeholder="Text"
                value={emailTemplateTextInput}
                onChange={(event) => setEmailTemplateTextInput(event.target.value)}
                rows={3}
              />
              <div className="va-inline-tools">
                <UiButton
                  variant="primary"
                  disabled={controlsBusy || !selectedEmailTemplateId}
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
                </UiButton>
                <UiButton
                  variant="secondary"
                  disabled={controlsBusy || !selectedEmailTemplateId}
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
                </UiButton>
              </div>
            </>
          ) : null}
        </UiCard>
      </section>

      {controlsBusy ? (
        <section className="va-grid">
          <UiCard>
            <UiStatePanel
              compact
              title="Request in progress"
              description={`Running ${activeAction || 'request'}...`}
            />
          </UiCard>
        </section>
      ) : null}

      {investigationError ? (
        <section className="va-grid">
          <UiCard>
            <UiStatePanel
              title="Scripts parity action failed"
              description={investigationError}
              tone="error"
            />
          </UiCard>
        </section>
      ) : null}
    </>
  );
}
