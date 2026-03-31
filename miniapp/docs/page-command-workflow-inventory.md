# VOICEDNUT Mini App Page-to-Command Workflow Inventory

## Purpose

This document is the live-code-derived parity artifact required by [architecture-roadmap.md](/workspaces/voicednut/miniapp/docs/architecture-roadmap.md).

It exists to make one rule concrete:

- every mounted Mini App page must map to a real bot command workflow
- every implemented workflow must preserve the command's real execution semantics
- every divergence must be explicit, limited, and reviewable

This file is an implementation inventory, not a wishlist.

## Source of truth

The mappings below were derived from the live repository implementation:

- `bot/bot.js`
- `bot/commands/*`
- `miniapp/src/components/App.tsx`
- `miniapp/src/contracts/miniappParityContracts.ts`
- `miniapp/src/pages/AdminDashboard/*`
- `miniapp/src/components/admin-dashboard/*`

## Status legend

- `aligned`: the page is a clear Mini App surface for the canonical bot command workflow
- `partial`: the page covers part of the canonical workflow, but not the full command surface yet
- `dashboard-composed`: the page is a composed operational surface built from one or more bot workflows; it is acceptable only if the underlying command semantics remain preserved
- `shell-only`: the route is a shell, hub, or settings surface and must not invent independent business logic
- `missing`: a live bot command exists without a dedicated current Mini App page/workflow surface

# 1. Live mounted Mini App routes

These are the current mounted routes in [App.tsx](/workspaces/voicednut/miniapp/src/components/App.tsx).

| Route | Page component | Canonical bot command | Related commands / aliases | Capability | Workflow status | Notes | Fallback |
|---|---|---|---|---|---|---|---|
| `/` | `AdminDashboardPage` | `/admin` | `/menu`, `/start` | runtime bootstrap and visible-module gate | `shell-only` | Dashboard shell and launcher surface. It now exposes explicit on-page ownership and handoff rules for `/admin`, `/menu`, `/start`, and `/settings`, but it still must not replace command validation or execution semantics. | `/` |
| `/start` | `StartCommandPage` | `/start` | none | runtime bootstrap access-tier gate | `aligned` | Dedicated command page mirrors bot `/start` semantics with role-aware welcome posture and command-native workflow launch paths. | `/` |
| `/call` | `CallCommandPage` | `/call` | none | runtime bootstrap access-tier gate | `partial` | Dedicated command page now executes both custom and script-backed `/outbound-call` launches against the live backend contract, forwards selected script metadata, resolves in-page `{placeholders}` when the catalog is available, reuses bootstrap provider posture for payment-flow guard acknowledgement, mirrors the live bot phase order for recipient capture, configuration branch, script-or-custom setup, and launch review, and keeps a webhook-backed live call console visible for the active call SID by polling the shared call detail and call-status contracts, restoring that SID after Mini App refresh for the same Telegram session and reattaching to the latest still-active call for that session when the backend continuity route finds one. Script catalog browsing remains constrained by the current Mini App capability contract, and the bot's conversational waits and voice-picker pagination are still compressed into the command page. | `/` |
| `/sms` | `SmsCommandPage` | `/sms` | none | runtime bootstrap access-tier gate | `partial` | Dedicated command page now mirrors the live `/sms` launcher order for send, schedule, status, conversation, recent, and stats actions, executes shared SMS actions directly (`sms.bulk.send` for single-recipient send, `sms.schedule.send`, `sms.message.status`, `sms.messages.conversation`, `sms.messages.recent`, `sms.stats`, `provider.get(channel=sms)` for bot-aligned bulk precheck, and `sms.bulk.status` for recent-job, summary, and job-status diagnostics), and supports bot callback action parity (`SMS_SEND`, `SMS_SCHEDULE`, `SMS_STATUS`, `SMS_CONVO`, `SMS_RECENT`, `SMS_RECENT_PAGE:*`, `SMS_STATS`, `BULK_SMS_PRECHECK`, `BULK_SMS_LIST`, `BULK_SMS_STATUS:*`, `BULK_SMS_STATS`) through shared alias contracts with safe fallback behavior, while high-volume bulk ownership remains in `/smssender`. | `/` |
| `/email` | `EmailCommandPage` | `/email` | none | runtime bootstrap access-tier gate | `partial` | Dedicated command page now mirrors the live `/email` launcher order for send, status, templates, and history actions, executes shared email actions directly (`email.bulk.send` for single-recipient send/schedule, `email.preview`, `email.message.status` for status/timeline, `emailtemplate.list`, `email.bulk.history`, `email.bulk.job`, `email.bulk.stats`, `provider.get(channel=email)` for bot-aligned bulk precheck), and supports bot callback action parity (`EMAIL_SEND`, `EMAIL_STATUS:*`, `EMAIL_TIMELINE:*`, `EMAIL_TEMPLATES`, `EMAIL_HISTORY`, `EMAIL_BULK:*`, `BULK_EMAIL_PRECHECK`, `BULK_EMAIL_SEND`, `BULK_EMAIL_STATUS:*`, `BULK_EMAIL_LIST`, `BULK_EMAIL_PAGE:*`, `BULK_EMAIL_STATS`) through shared alias contracts with safe fallback behavior, while high-volume bulk ownership remains in `/mailer`. | `/` |
| `/scripts` | `ScriptsCommandPage` | `/scripts` | none | runtime bootstrap access-tier gate | `partial` | Dedicated command page now restores `/scripts` as a command-native Mini App entry point, keeps admin gating explicit, and hands operators into the existing Script Studio (`/content`) and Scripts Parity Expansion (`/scriptsparity`) workspaces without treating those routes as standalone product surfaces. Call-script lifecycle ownership remains in Script Studio, while SMS script and email template parity ownership remains in Scripts Parity Expansion. | `/` |
| `/help` | `HelpCommandPage` | `/help` | none | runtime bootstrap access-tier gate | `aligned` | Dedicated command page mirrors bot help semantics: role-aware guidance plus quick actions that only open live Mini App workflows. Missing or partial routes remain explicit instead of pretending parity exists. | `/` |
| `/menu` | `MenuCommandPage` | `/menu` | none | runtime bootstrap access-tier gate | `aligned` | Dedicated command menu surface mirrors the bot quick-action keyboard and keeps visibility tied to current access tier. | `/` |
| `/guide` | `GuideCommandPage` | `/guide` | none | runtime bootstrap access-tier gate | `aligned` | Dedicated guide page mirrors bot operating guidance and keeps admin-only controls visible only when the session access tier allows it. | `/` |
| `/health` | `HealthCommandPage` | `/health` | none | runtime bootstrap access-tier gate | `aligned` | Dedicated command page mirrors bot `/health` semantics with a server-authoritative runtime posture snapshot and explicit degraded-state reporting. | `/` |
| `/status` | `StatusCommandPage` | `/status` | none | runtime bootstrap access-tier gate | `aligned` | Dedicated admin command page mirrors bot `/status` semantics with deep runtime posture, queue, and bridge-state visibility sourced from bootstrap parity data. | `/` |
| `/settings` | `SettingsPage` | `/admin` | none | `dashboard_view` | `shell-only` | Settings/support surface. Must remain a navigation and diagnostics layer over real command workflows, not a separate product surface. | `/` |
| `/ops` | `OpsDashboardPage` | `/status` | selected `/admin` operational views | `dashboard_view` | `dashboard-composed` | Broader than `/status`, but now backed by an explicit shared workflow contract covering runtime controls, call explorer inputs, action families, degraded-state behavior, and fallback rules. Acceptable only if status semantics remain preserved and any admin-only controls keep backend authority. | `/` |
| `/smssender` | `SmsSenderPage` | `/smssender` | `/schedulesms`, `/smsconversation`, `/smsstats`, `/smsstatus`, `/recentsms` | `sms_bulk_manage` | `dashboard-composed` | Bulk SMS sender remains the canonical high-volume execution surface. It must keep real send, precheck, schedule, and status semantics while the `/sms` command page owns top-level command orchestration. | `/` |
| `/mailer` | `MailerPage` | `/mailer` | `/emailstatus` | `email_bulk_manage` | `dashboard-composed` | Bulk email is the canonical entry, and the page now exposes an explicit shared workflow contract for queueing, provider prechecks, diagnostics, degradation, and Mini App-only productivity enhancements. It must preserve mailer workflow rules and email status behavior. | `/` |
| `/provider` | `ProviderControlPage` | `/provider` | none | `provider_manage` | `aligned` | Provider diagnostics and switching surface. Must remain bound to provider precheck, confirmation, apply, and rollback semantics. | `/` |
| `/content` | `ScriptStudioPage` | `/scripts` | none | `caller_flags_manage` | `partial` | Primary `/scripts` workspace now exposes an explicit shared workflow contract for draft, review, promote-live, simulation, and adjacent persona/caller-flag support flows, and it now declares itself as a downstream handoff from the canonical `/scripts` command page. It remains partial because the bot’s broader conversational guidance and future script-side callback families still need ongoing parity review. | `/` |
| `/calllog` | `CallLogExplorerPage` | `/calllog` | none | `dashboard_view` | `aligned` | Clear parity surface for recent calls, search, details, and events. Must preserve search/detail/event access rules and fallback behavior. | `/` |
| `/callerflags` | `CallerFlagsModerationPage` | `/callerflags` | none | `caller_flags_manage` | `aligned` | Moderation workflow maps directly to caller flag listing and upsert flows. | `/` |
| `/scriptsparity` | `ScriptsParityExpansionPage` | `/scripts` | email template and SMS script parity subflows | `caller_flags_manage` | `dashboard-composed` | Secondary `/scripts` surface now exposes an explicit shared workflow contract for SMS script and email template parity workflows and a visible downstream handoff back to the canonical `/scripts` entry point and Script Studio. The split is acceptable only while ownership boundaries, validations, and fallback behavior remain synchronized with the canonical `/scripts` command contract. | `/` |
| `/messaging` | `MessagingInvestigationPage` | `/sms` | `/email`, `/smsstatus`, `/smsconversation`, `/recentsms`, `/emailstatus` | `dashboard_view` | `dashboard-composed` | Investigation workspace spans messaging diagnostics across SMS and email and now declares a shared workflow contract for required lookup inputs, capability gates, read-only execution rules, degraded-state behavior, and approved cross-channel productivity enhancements. It is not a pure 1:1 command page and must keep cross-command orchestration explicit. | `/` |
| `/persona` | `PersonaManagerPage` | `/persona` | none | `caller_flags_manage` | `aligned` | Persona management surface maps cleanly to the bot command domain. | `/` |
| `/users` | `UsersRolePage` | `/users` | none | `users_manage` | `aligned` | User listing and role assignment surface maps directly to the bot command domain. | `/` |
| `/audit` | `AuditIncidentsPage` | `/admin` | selected operational/admin callback flows | `dashboard_view` | `dashboard-composed` | Admin incident and runbook workspace now exposes a shared workflow contract for runbook gating, saved-query and export rules, success/failure handling, and degraded-state behavior. It must remain an admin-derived support surface and not invent standalone business workflows. | `/` |

# 2. Live command coverage gaps

These primary bot commands now have dedicated mounted Mini App routes, but some are still only partially aligned with the full bot workflow contract.

| Bot command | Current Mini App state | Gap classification | Notes |
|---|---|---|---|
| `/call` | Dedicated `/call` route now mounted; command page now mirrors the live setup phases while executing direct custom and script-backed `/outbound-call` launches with placeholder resolution, provider-guard review, and a webhook-backed live call console that follows, restores, and can reattach to the latest still-active call SID for the same Telegram session | `partial` | Command ownership is explicit and execution is command-native. Remaining gaps are capability-gated script browsing for some sessions, the bot's conversation-by-conversation waits, and voice selection UX that is still flattened into the Mini App form. |
| `/sms` | Dedicated `/sms` route now mounted; command page now mirrors the live launcher order while executing direct single-recipient send/schedule plus diagnostics, provider-readiness precheck, and bulk-status actions and handing off high-volume execution to `/smssender` | `partial` | Command ownership is explicit and core execution is command-native, and callback action parity now covers the `BULK_SMS_*` callback family in addition to the core SMS actions. Remaining gaps are the bot’s conversation-by-conversation prompt choreography and any new callback families introduced later in the live bot. |
| `/email` | Dedicated `/email` route now mounted; command page now mirrors the live launcher order while executing direct single-recipient send/schedule plus preview/status/timeline/templates/history, provider-readiness bulk precheck, bulk-job, and bulk-stats actions and handing off high-volume execution to `/mailer` | `partial` | Command ownership is explicit and core execution is command-native, and callback action parity now covers send/status/timeline/templates/history plus `BULK_EMAIL_PRECHECK`, `BULK_EMAIL_SEND`, `BULK_EMAIL_STATUS:*`, `BULK_EMAIL_LIST`, `BULK_EMAIL_PAGE:*`, and `BULK_EMAIL_STATS`. Remaining gaps are the bot’s conversation-by-conversation prompt choreography and any deeper callback families introduced later in the live bot. |
| `/scripts` | Dedicated `/scripts` route now mounted; command page restores canonical command ownership first and explicitly hands operators into `/content` for call-script lifecycle work and `/scriptsparity` for SMS/email parity work | `partial` | Command ownership is now explicit in the live route surface. Remaining gaps are that the downstream workspaces are still split and must stay synchronized with the canonical `/scripts` command contract, validations, and fallback boundaries. |

# 3. Command-to-page decomposition that must stay explicit

These command splits already exist in the current Mini App and must remain explicit in shared contracts and audits.

| Canonical bot command | Current Mini App pages | Constraint |
|---|---|---|
| `/admin` | `/`, `/settings`, `/audit` | Each page must declare which part of the admin workflow it owns. None may silently bypass admin role checks or create independent admin semantics. |
| `/scripts` | `/scripts`, `/content`, `/scriptsparity` | `/scripts` is now the command-native entry and handoff surface. `/content` owns call-script lifecycle and supporting review/simulation context, while `/scriptsparity` owns SMS script and email-template parity flows. Shared ownership, duplicated actions, or drift in validations/fallbacks remain risks and must be audited continuously. |
| `/sms` | `/sms`, `/smssender`, `/messaging` | `/sms` is now command-native; downstream execution ownership across sender and investigation routes must stay explicit. |
| `/email` | `/email`, `/mailer`, `/messaging` | `/email` is now command-native; downstream execution ownership across mailer and investigation routes must stay explicit. |
| `/status` | `/status`, `/ops` | `/status` is the command-native parity route. `/ops` may extend it, but it must not replace authoritative status semantics with dashboard-only logic. |

# 4. Implemented page files not in the live route surface

These page files exist in the repository, but are not part of the currently mounted Mini App routes in [App.tsx](/workspaces/voicednut/miniapp/src/components/App.tsx).

| Page file | Current state | Action needed |
|---|---|---|
| `miniapp/src/pages/IndexPage/IndexPage.tsx` | implemented but not mounted | Either document it as non-product/demo surface or remove from parity discussions |
| `miniapp/src/pages/TONConnectPage/TONConnectPage.tsx` | implemented but not mounted | Same rule: do not count as live Mini App parity surface unless routed |
| `miniapp/src/pages/LaunchParamsPage.tsx` | implemented but not mounted | Keep excluded from parity claims unless mounted intentionally |
| `miniapp/src/pages/ThemeParamsPage.tsx` | implemented but not mounted | Keep excluded from parity claims unless mounted intentionally |
| `miniapp/src/pages/InitDataPage.tsx` | implemented but not mounted | Useful for diagnostics, but not part of the current product route surface |

# 5. Current implementation priorities from this inventory

## Highest priority gaps

- keep the explicit workflow contracts for `/mailer`, `/ops`, `/audit`, and `/messaging` synchronized with live bot ownership, page behavior, and action inventories
- keep `/call` phase parity and live-console posture synchronized with any bot-side wizard or call-status surface changes, especially script browsing, placeholder prompts, backend continuity reattachment, and voice selection behavior
- keep `/sms` callback inventory synchronized with any newly introduced bot callback families and decide whether remaining bot conversation choreography should stay form-based or be modeled more literally
- keep `/email` callback inventory synchronized with any newly introduced bot callback families and decide whether remaining bot conversation choreography should stay form-based or be modeled more literally
- keep the `/scripts` command page plus the explicit workflow contracts for `/content` and `/scriptsparity` synchronized with live `/scripts` ownership, action inventories, and fallback boundaries

## Required follow-up fields for each page contract

Every page listed above should be backed by a page-level workflow contract containing:

- canonical bot command
- approved related commands or aliases
- required role or capability
- required inputs
- validation and precheck steps
- confirmation rules
- execution handler or action family
- success and failure behavior
- degraded-state behavior
- fallback path
- approved Mini App-only productivity enhancements

## Maintenance rule

Update this file whenever any of the following change:

- mounted Mini App routes
- dashboard module inventory
- canonical bot command mappings
- workflow ownership between composed pages
- role or capability requirements
- page-level execution semantics
- approved command-workflow divergences
