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
| `/` | `AdminDashboardPage` | `/admin` | `/menu`, `/start` | runtime bootstrap and visible-module gate | `shell-only` | Dashboard shell and launcher surface. May aggregate entry points, but must not replace command validation or execution semantics. | `/` |
| `/settings` | `SettingsPage` | `/admin` | none | `dashboard_view` | `shell-only` | Settings/support surface. Must remain a navigation and diagnostics layer over real command workflows, not a separate product surface. | `/` |
| `/ops` | `OpsDashboardPage` | `/status` | `/health`, selected `/admin` operational views | `dashboard_view` | `dashboard-composed` | Broader than `/status`. Acceptable only if status and health semantics remain preserved and any admin-only controls keep backend authority. | `/` |
| `/sms` | `SmsSenderPage` | `/smssender` | `/sms`, `/schedulesms`, `/smsconversation`, `/smsstats`, `/smsstatus`, `/recentsms` | `sms_bulk_manage` | `dashboard-composed` | Bulk SMS is the canonical entry, but the page also composes SMS investigation and status flows. It must keep the real send, precheck, schedule, and status semantics. | `/` |
| `/mailer` | `MailerPage` | `/mailer` | `/email`, `/emailstatus` | `email_bulk_manage` | `dashboard-composed` | Bulk email is the canonical entry, but the page also pulls in single-email status/history concerns. It must preserve mailer workflow rules and email status behavior. | `/` |
| `/provider` | `ProviderControlPage` | `/provider` | none | `provider_manage` | `aligned` | Provider diagnostics and switching surface. Must remain bound to provider precheck, confirmation, apply, and rollback semantics. | `/` |
| `/content` | `ScriptStudioPage` | `/scripts` | none | `caller_flags_manage` | `partial` | Script management surface exists, but it is broader than the current bot command summary and must be checked against live review/promotion/simulation flows. | `/` |
| `/calllog` | `CallLogExplorerPage` | `/calllog` | none | `dashboard_view` | `aligned` | Clear parity surface for recent calls, search, details, and events. Must preserve search/detail/event access rules and fallback behavior. | `/` |
| `/callerflags` | `CallerFlagsModerationPage` | `/callerflags` | none | `caller_flags_manage` | `aligned` | Moderation workflow maps directly to caller flag listing and upsert flows. | `/` |
| `/scriptsparity` | `ScriptsParityExpansionPage` | `/scripts` | email template and SMS script parity subflows | `caller_flags_manage` | `dashboard-composed` | Secondary `/scripts` surface for adjacent template/script workflows. This split is allowed only while command ownership remains explicit and non-duplicative. | `/` |
| `/messaging` | `MessagingInvestigationPage` | `/sms` | `/email`, `/smsstatus`, `/smsconversation`, `/recentsms`, `/emailstatus` | `dashboard_view` | `dashboard-composed` | Investigation workspace spans messaging diagnostics across SMS and email. This is useful operationally, but it is not a pure 1:1 command page and must document any cross-command orchestration. | `/` |
| `/persona` | `PersonaManagerPage` | `/persona` | none | `caller_flags_manage` | `aligned` | Persona management surface maps cleanly to the bot command domain. | `/` |
| `/users` | `UsersRolePage` | `/users` | none | `users_manage` | `aligned` | User listing and role assignment surface maps directly to the bot command domain. | `/` |
| `/audit` | `AuditIncidentsPage` | `/admin` | selected operational/admin callback flows | `dashboard_view` | `dashboard-composed` | Admin incident and runbook workspace. Must remain an admin-derived support surface and not invent standalone business workflows. | `/` |

# 2. Live command coverage gaps

These primary bot commands exist in live bot code, but do not currently have a dedicated mounted Mini App route/workflow surface.

| Bot command | Current Mini App state | Gap classification | Notes |
|---|---|---|---|
| `/start` | Indirectly implied by dashboard entry | `missing` | No dedicated landing workflow contract yet. If `/` is the replacement, that must be made explicit and role-aware. |
| `/help` | No mounted dedicated route | `missing` | Help content is not currently represented as a clear Mini App workflow surface. |
| `/menu` | Indirectly implied by dashboard shell | `missing` | The dashboard may act as a visual menu, but that mapping is not yet formalized as workflow parity. |
| `/guide` | No mounted dedicated route | `missing` | No dedicated guide workflow page is mounted. |
| `/health` | Folded into `/ops` | `partial` | Health exists only as part of the composed ops surface, not a distinct workflow entry. |
| `/call` | No mounted dedicated route | `missing` | Call initiation and setup workflow parity is not mounted as a current Mini App page. |
| `/email` | Folded into `/mailer` and `/messaging` | `partial` | Email user flows are represented indirectly through admin-oriented surfaces, not a dedicated canonical page. |

# 3. Command-to-page decomposition that must stay explicit

These command splits already exist in the current Mini App and must remain explicit in shared contracts and audits.

| Canonical bot command | Current Mini App pages | Constraint |
|---|---|---|
| `/admin` | `/`, `/settings`, `/audit` | Each page must declare which part of the admin workflow it owns. None may silently bypass admin role checks or create independent admin semantics. |
| `/scripts` | `/content`, `/scriptsparity` | The split must stay deliberate. Shared ownership, duplicated actions, and inconsistent validations are drift risks. |
| `/sms` | `/sms`, `/messaging` | `/sms` is both a direct messaging workflow and part of a broader investigation surface. The composed page must not override the canonical SMS workflow contract. |
| `/email` | `/mailer`, `/messaging` | Email status and investigation concerns are partially embedded in other pages and need explicit workflow ownership. |
| `/status` | `/ops` | `/ops` may extend `/status`, but it must not replace authoritative status/health semantics with dashboard-only logic. |

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

- formalize `/` as a bot-workflow-owned surface, not just a dashboard shell
- create explicit workflow contracts for `/sms`, `/mailer`, `/ops`, `/audit`, and `/messaging`
- add a dedicated Mini App workflow for `/call`
- decide whether `/help`, `/menu`, `/guide`, and `/start` get dedicated pages or are explicitly absorbed by approved shell contracts
- define command ownership boundaries for the `/scripts` split across `/content` and `/scriptsparity`

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
