# VOICEDNUT Mini App Architecture Roadmap

## Purpose

This roadmap defines the target architecture, delivery rules, and implementation priorities for the **VOICEDNUT Telegram Mini App** so it remains fully aligned with the live Telegram bot, backend API, and role-based access model in this repository.

This file is the architectural source for Mini App evolution. It is not a marketing document and it is not a speculative feature wishlist.

## Source of Truth

The product contract for the Mini App must come from the **current implementation**, not from outdated notes or assumptions.

The required live parity artifact for page-to-command workflow mapping is:

- `miniapp/docs/page-command-workflow-inventory.md`

### Canonical sources

- `bot/bot.js`
- `bot/commands/*`
- Mini App router, page registry, action handlers, dashboard/homepage, shared UI components
- API routes, controllers, services, auth/bootstrap flows
- Shared constants, schemas, capabilities, and utility modules

## Core Architectural Rule

The Mini App must not become a separate product with its own drifting logic.

Every Mini App page, action, module, and permission must map to one of the following:

- an existing bot slash command
- an existing bot callback action
- an existing backend/API capability
- an explicitly introduced shared contract approved as part of the implementation

Anything else is considered **architecture drift** and must be fixed, gated, redirected, or removed.

Every implemented Mini App page must also preserve the operational intent of its mapped bot command. A page is not considered aligned merely because it links to the same domain concept. It must mirror the command's real workflow, including entry conditions, validation, prechecks, confirmations, execution path, success behavior, failure behavior, and role restrictions unless an explicit shared contract documents an approved divergence.

# 1. Current Product Contract

## Primary bot command surface

The Mini App architecture must align with this command set:

- `/start`
- `/help`
- `/menu`
- `/guide`
- `/health`
- `/call`
- `/calllog`
- `/sms`
- `/email`
- `/smssender`
- `/mailer`
- `/scripts`
- `/persona`
- `/provider`
- `/callerflags`
- `/users`
- `/admin`
- `/status`

## Legacy or compatibility aliases

These may remain supported in code, but they are **not** the primary Mini App contract unless explicitly needed for backward compatibility:

- `/ping`
- `/schedulesms`
- `/smsconversation`
- `/smsstats`
- `/smsstatus`
- `/recentsms`
- `/emailstatus`

## Primary callback/action surface

The Mini App must stay aligned with the live action model, including but not limited to:

- `CALL`
- `SMS`
- `EMAIL`
- `CALLLOG`
- `GUIDE`
- `HELP`
- `MENU`
- `HEALTH`
- `STATUS`
- `USERS`
- `USERS_LIST`
- `CALLER_FLAGS`
- `CALLER_FLAGS_LIST`
- `BULK_SMS`
- `BULK_SMS_PRECHECK`
- `BULK_SMS_SEND`
- `BULK_SMS_STATUS`
- `BULK_SMS_LIST`
- `BULK_SMS_STATS`
- `BULK_EMAIL`
- `BULK_EMAIL_PRECHECK`
- `BULK_EMAIL_SEND`
- `BULK_EMAIL_STATUS`
- `BULK_EMAIL_LIST`
- `BULK_EMAIL_STATS`
- `EMAIL_SEND`
- `EMAIL_STATUS`
- `EMAIL_TIMELINE`
- `EMAIL_BULK`
- `EMAIL_TEMPLATES`
- `EMAIL_HISTORY`
- `PROVIDER_STATUS`
- `PROVIDER_SET`
- `PROVIDER_CONFIRM`
- `PROVIDER_APPLY`
- `SCRIPTS`
- `PERSONA`
- `ADMIN_PANEL`
- `SMS_SEND`
- `SMS_SCHEDULE`
- `SMS_STATUS`
- `SMS_CONVO`
- `SMS_STATS`
- `SMS_RECENT`
- `SMS_RECENT_PAGE`
- `CALLLOG_RECENT`
- `CALLLOG_SEARCH`
- `CALLLOG_DETAILS`
- `CALLLOG_EVENTS`
- `CALL_DETAILS`

Any additional namespaced callback patterns registered in bot runtime must also be considered part of the live contract.

# 2. Architecture Principles

## 2.1 Bot-first parity

The bot remains the functional reference surface. The Mini App is a structured visual layer over the same capabilities.

## 2.2 Shared contract first

Command names, callback names, route names, permissions, and request/response schemas must come from shared definitions wherever possible.

## 2.3 Business logic stays out of UI

The Mini App should orchestrate and present workflows, not reimplement core business rules inside page components.

## 2.4 Mobile-first production UI

The Mini App must be designed primarily for Telegram mobile use:

- clean layout
- fast load
- safe touch targets
- consistent spacing
- resilient empty/loading/error states

## 2.5 Graceful degradation

Unsupported, stale, expired, or unknown actions must never hard-fail in normal usage. They must:

- recover safely
- redirect appropriately
- refresh state
- or return a useful fallback message

## 2.6 Role symmetry

If the bot restricts a feature to admin or authorized users, the Mini App must enforce the same rule. UI hiding alone is not sufficient.

## 2.7 Session and auth resilience

Telegram auth/init handling is a production-critical contract, not an implementation detail.

The Mini App must explicitly define and consistently enforce behavior for:

- expired or invalid init data
- revoked or stale sessions
- bootstrap auth failures
- recoverable auth refresh paths
- blocking auth failures that require re-entry or relaunch

Session recovery logic must be centralized and must not be reimplemented independently in page components.

## 2.8 Transport safety for mutating actions

Mutating Mini App actions must be safe under retry, duplicate taps, slow networks, and partial failures.

The architecture must require:

- idempotency for mutating requests where applicable
- duplicate-submit protection
- correlation/request identifiers
- deterministic timeout handling
- explicit optimistic-update rollback rules
- canonical action envelope validation before mutation dispatch

## 2.9 Runtime contract authority

Not every contract belongs in local static definitions.

The Mini App must distinguish between:

- static shared contracts compiled into the client
- runtime server-authoritative contracts returned by bootstrap, refresh, or action responses

The client may use static contracts for route ids, canonical action ids, labels, and fallback defaults, but server-provided supported actions, enabled modules, permissions, and capability-bearing payloads remain authoritative at runtime.

## 2.10 Observability by default

The Mini App must emit enough diagnostic context to make production failures debuggable without guesswork.

At minimum, critical flows must support:

- request or correlation ids
- action and route identifiers
- failure class/category
- retry/refresh attempts
- latency measurement for bootstrap, refresh, and action paths
- safe user-visible error states that distinguish recoverable from blocking failures

## 2.11 Command-native workflow parity

Every Mini App page must behave as a structured interface for a real bot command workflow, not as an independent UI invention.

This means:

- the page entry point must map to one or more canonical bot commands
- the page must preserve the command's real permissions, defaults, and required inputs
- the page must reuse or mirror the command's actual prechecks, confirmation rules, and execution flow
- the page must preserve command-level success, failure, and post-action behavior
- any intentional divergence from the bot command workflow must be documented as an approved shared contract

The Mini App should improve usability and productivity, but it must not invent alternate business workflows that drift from the bot command surface.

# 3. Target Architecture

## 3.1 Required architecture layers

### Presentation layer

Mini App pages, layouts, components, and route shells.

Responsibilities:

- rendering
- navigation
- view-state
- optimistic UI where safe
- loading/error/empty states

### Interaction layer

Centralized action dispatch, route mapping, page event handling, and recovery flows.

Responsibilities:

- action registry
- route resolution
- safe fallback handling
- telemetry hooks
- command-to-page workflow mapping
- consistent execution orchestration across command-equivalent flows

### Shared contract layer

Single source of truth for:

- slash command names
- callback action names
- route identifiers
- role/capability identifiers
- request/response schemas
- feature flags where needed

### Runtime contract layer

Server-authoritative contract surface for:

- enabled modules
- supported actions for the current user/session
- bootstrap payloads
- refresh/poll payloads
- capability-bearing responses
- action result envelopes

Responsibilities:

- prevent the client from assuming unsupported capabilities
- invalidate stale client assumptions
- drive safe fallback and recovery behavior
- carry authoritative role/capability state

### Backend/API layer

Authoritative business logic, validation, state mutation, role checks, orchestration, and external integrations.

### Telegram integration layer

Bot command registration, callback handling, Mini App launch integration, Telegram auth/init handling, and shared identity continuity.

### Command workflow parity layer

Shared execution model for translating bot command behavior into Mini App page workflows.

Responsibilities:

- map each implemented page to canonical bot command workflow(s)
- preserve command entry requirements and defaults
- reuse shared validation, precheck, confirmation, and execution semantics
- define approved workflow divergences explicitly when the Mini App improves UX without changing business behavior
- prevent page-only workflow inventions that bypass the main bot contract

# 4. Required Shared Contracts

The codebase should converge toward shared definitions for the following:

## 4.1 Commands

One shared module defining:

- primary commands
- aliases
- visibility by role
- display labels/descriptions

## 4.2 Callback actions

One shared module defining:

- action names
- namespaced patterns
- supported payload shapes
- route targets or handler targets

## 4.3 Routes/screens

One shared route catalog defining:

- route ids
- screen labels
- required role/capability
- linked bot command(s)
- fallback behavior

## 4.4 Roles and capabilities

One shared authorization definition covering:

- guest
- authorized user
- admin
- capability-to-command mapping
- capability-to-route mapping

## 4.5 Data schemas

Shared request/response schemas for key workflows:

- call flows
- call logs
- SMS flows
- bulk SMS
- email flows
- bulk email
- provider switching
- users management
- caller flags
- status/health views

These shared schemas must also cover transport envelopes for:

- bootstrap responses
- refresh or poll responses
- action request envelopes
- action response envelopes
- event or timeline payloads
- error payloads used by the Mini App shell

## 4.6 Session and auth contract

One shared auth/session contract defining:

- Telegram init-data validation requirements
- bootstrap auth prerequisites
- recoverable auth error classes
- blocking auth error classes
- session refresh rules
- logout or re-entry requirements after invalidation

## 4.7 Action transport contract

One shared transport contract defining:

- which actions are mutating
- idempotency-key requirements
- request/correlation-id behavior
- timeout expectations
- duplicate-submit policy
- optimistic UI and rollback rules
- stale-contract retry and refresh behavior

## 4.8 Observability contract

One shared observability definition covering:

- required telemetry fields
- log/event naming conventions
- correlation-id propagation
- failure-class taxonomy
- minimum diagnostics for bootstrap, refresh, and action failures
- safe redaction rules for user/session data

## 4.9 Parity matrix artifact

One maintained parity artifact defining, for every intended Mini App feature surface:

- bot command
- callback/action
- Mini App route or screen
- backend/API dependency
- required role/capability
- runtime payload/schema
- fallback or degraded behavior
- regression coverage status

## 4.10 Command workflow contract

One shared command-workflow contract defining, for every Mini App page mapped to a bot command or approved dashboard-composed route:

- canonical bot command name
- optional callback/action aliases
- page or route entry point
- required role/capability
- required inputs and defaults
- validation and precheck steps
- confirmation requirements
- execution handler or backend capability
- success-state behavior
- failure-state behavior
- post-action navigation or follow-up state
- any approved Mini App-specific UX enhancement that does not change business semantics

For dashboard-composed routes, the same contract must also declare:

- why the route is allowed to aggregate more than one bot workflow
- the command-ownership boundary between the composed route and any command-native pages
- which action families may be executed directly on the composed route
- which workflows must redirect or hand off to another command-owned page
- the degraded-state and fallback path when one underlying workflow is unavailable at runtime

## 4.11 Dashboard-composed route contract

One shared dashboard-composed route contract defining, for every non-bot-native operational route:

- route id and mounted path
- canonical bot command owner
- approved related commands, aliases, or callback families
- required capability and runtime visibility gate
- allowed read-only and mutating action families
- workflow ownership boundaries with command-native pages
- validation, confirmation, and execution safeguards
- degraded-state behavior when one contributing workflow is unavailable
- fallback path back to a command-owned route or dashboard shell
- approved Mini App-only productivity enhancements that do not change bot/API semantics

# 5. Mini App Parity Model

## Required page-to-command correspondence

| Bot Command | Mini App Responsibility |
|---|---|
| `/start` | landing screen or role-aware dashboard |
| `/help` | help / commands guide screen |
| `/menu` | quick actions dashboard |
| `/guide` | usage guide screen |
| `/health` | health summary for authorized users |
| `/call` | call workflow entry and setup flow |
| `/calllog` | call log, recent calls, search, details, events |
| `/sms` | SMS center |
| `/email` | Email center |
| `/smssender` | bulk SMS admin sender |
| `/mailer` | bulk email admin mailer |
| `/scripts` | script management |
| `/persona` | persona management |
| `/provider` | provider management |
| `/callerflags` | caller flags admin tools |
| `/users` | user management |
| `/admin` | Mini App admin console entry |
| `/status` | deep system/admin status |

## Allowed dashboard-composed route correspondence

These routes are acceptable even though they are not all bot-native slash commands, but only when they remain explicitly command-owned and contract-backed.

| Mini App Route | Canonical Bot Command Owner | Related Commands / Families | Required constraint |
|---|---|---|---|
| `/ops` | `/status` | `/health`, selected admin runtime views | Must remain an operational extension of status/health semantics and must not invent independent admin controls. |
| `/mailer` | `/mailer` | `/email`, `/emailstatus` | Must remain the canonical high-volume email workflow surface and preserve provider precheck, queueing, status, and degradation behavior. |
| `/messaging` | `/sms` | `/email`, message-status and conversation diagnostics | Must remain an investigation workspace over existing messaging workflows and keep cross-command orchestration explicit. |
| `/audit` | `/admin` | selected admin/status callback families | Must remain a support and incident workspace derived from admin-owned workflows rather than a standalone business surface. |

## Allowed command-split route correspondence

These routes are acceptable when one canonical bot command is intentionally decomposed into more than one Mini App page, but only if the ownership boundary is explicit and shared contracts prevent overlap drift.

| Mini App Route | Canonical Bot Command Owner | Related Commands / Families | Required constraint |
|---|---|---|---|
| `/content` | `/scripts` | `/persona`, caller-flag support flows | Must remain the primary call-script lifecycle workspace for drafting, review, promote-live, and simulation behavior without inventing script semantics that bypass the canonical `/scripts` command contract. |
| `/scriptsparity` | `/scripts` | `/sms`, `/email`, SMS script and email template parity families | Must remain a bounded parity extension for adjacent content assets and may not duplicate or silently diverge from `/content` ownership, validation rules, or fallback behavior. |

## Required parity behavior

- A Mini App route must not exist without a valid bot/API equivalent.
- A bot feature with an intended visual workflow should have a Mini App equivalent.
- Hidden or disabled routes must still be validated server-side.
- Dashboard modules must match actual supported capabilities.
- Runtime payloads must be validated before the UI consumes them.
- Static route/action contracts must not override server-authoritative supported-action or capability responses.
- Every degraded flow must define its fallback route, fallback message, or disabled-state behavior.
- Every implemented page must declare its canonical bot command mapping.
- Every implemented page must preserve the main bot command workflow, not only the label or destination.
- If a page composes multiple related bot actions, the command workflow contract must define the orchestration explicitly.
- Every dashboard-composed route must declare its canonical command owner, related command families, and handoff boundaries.
- Every command-split route must declare which part of the canonical command workflow it owns and which related workflows it may not absorb.
- No dashboard-composed route may become the only place where a business workflow can be understood or executed unless it is itself the canonical command-owned surface.
- Mini App productivity enhancements are allowed only when they remain execution-compatible with the underlying bot/API workflow.

## Required page-to-command workflow correspondence

For every implemented page, parity must include all of the following:

- command entry mapping
- required permissions and visibility
- input collection requirements
- preflight validation and safety checks
- confirmation or approval steps where applicable
- actual execution path
- success feedback and resulting state
- failure handling and recovery
- follow-up actions or next-step shortcuts where the bot already provides them

The Mini App may compress or improve the operator experience, but it must not weaken or replace the underlying bot command workflow semantics.

Dashboard-composed routes may aggregate investigation, diagnostics, or productivity helpers, but they must still execute the same backend actions, preserve the same permissions, and honor the same fallback rules as the bot-owned workflows they represent.

# 6. Known Risk Areas to Eliminate

## 6.1 Unsupported Mini App actions

The “Unsupported miniapp action” class of failure indicates an architectural mismatch between:

- action creation
- action registration
- route resolution
- page handlers
- or fallback logic

### Required resolution

- centralize action registration
- remove duplicated string literals
- normalize action parsing
- add safe unknown-action fallback
- add regression coverage for all valid action paths

## 6.2 Homepage/dashboard drift

The homepage/dashboard must not expose modules that are:

- stale
- unsupported
- permission-incompatible
- or visually inconsistent

### Required resolution

- show only supported modules
- use shared action definitions
- use shared avatar/user-profile components
- standardize layout and spacing

### Recommended homepage structure

The homepage/dashboard should behave as the standard frontend home for the main bot, not as a slash-command mirror.

- Header block: avatar, role, workspace status, one-line system posture. Keep the current top-shell idea from `DashboardTopShell.tsx`, but make the copy role-aware: `Limited access`, `Ready for work`, or `Admin console healthy`.
- Primary action rail: 3-4 strongest actions only, based on the bot's real `/start` priorities from `bot/bot.js`. Suggested labels: `New Call`, `Messaging`, `Call History`, `System Health`.
- Workspace launcher: keep the grouped launcher concept from `dashboardShellConfig.ts`, but rename groups and cards in operator language, not command language.
- Recent activity / continue where you left off: recent call lookup, pending SMS batch, latest mailer job, open incident. This makes the homepage productive instead of just navigational.
- Access-aware support block: for guests, show `Request Access`, `How It Works`, `Usage Guide`; for users, show `Help` and `Operational Rules`; for admins, show `Users & Access` and `Incident Center`.
- Admin strip: only for admins, surface the things that `/start` and `/menu` currently elevate: `Bulk SMS`, `Mailer`, `Users`, `Caller Flags`, `Scripts`, `Provider`, `Status`.

### Frontend translation

Use this mapping internally, but do not show slash commands in the UI:

| Bot command | Frontend label |
|---|---|
| `/start` | `Home` |
| `/menu` | `Quick Actions` |
| `/help` | `Help Center` |
| `/guide` | `Usage Guide` |
| `/health` | `System Health` |
| `/status` | `Incident Status` |
| `/smssender` | `Bulk SMS` |
| `/mailer` | `Mailer` |
| `/provider` | `Provider Control` |
| `/users` | `Users & Roles` |

### Sample homepage behavior

#### Guest home

- Hero: `Limited access`
- Primary cards: `Explore Call Flow`, `Explore Messaging`, `View Call History`, all with lock messaging where execution is restricted
- Secondary rows: `Usage Guide`, `Help Center`, `Request Access`
- Empty-state message: `You can review workflows now. Execution unlocks after approval.`

#### Authorized user home

- Hero: `Ready to work`
- Primary cards: `New Call`, `Messaging`, `Call History`, `System Health`
- Continue section: `Resume last lookup`, `Recent delivery checks`
- Secondary rows: `Help Center`, `Usage Guide`

#### Admin home

- Hero: `Admin console healthy`
- Status strip: incidents, queue backlog, provider readiness, last healthy sync
- Primary cards: `Operations`, `Bulk SMS`, `Mailer`, `Provider Control`
- Admin tools list rows: `Users & Roles`, `Caller Flags`, `Scripts`, `Audit`
- Bottom action bar: `Refresh`, `Settings`

For each page improvement, the workflow will be:

Inspect the relevant bot command handlers and supporting flows first.
Map the real actions, states, role gates, validations, and fallback behavior.
Improve the frontend page to match that behavior using standard app UI, not slash-command UI.
Preserve parity with the real bot/API contract if design pressure conflicts with implementation.
Validate the page against both the current frontend route and the command-backed behavior it represents.

## 6.3 UI inconsistency in shared profile/avatar rendering

The dashboard avatar must match the same rounded/circular rendering model used on other pages.

### Required resolution

- reuse shared avatar component if it exists
- standardize border radius, clipping, centering, spacing, and size behavior
- remove page-specific drift in avatar rendering

## 6.4 Role mismatch

Admin-only bot features must remain admin-only in the Mini App. Authorized-user and guest experiences must match the live bot access model.

## 6.5 Session/auth mismatch

The Mini App must not silently assume that a cached session, Telegram init payload, or prior bootstrap result is still valid.

### Required resolution

- centralize session/auth error classification
- distinguish recoverable auth refresh from blocking auth failure
- invalidate stale auth/session state deterministically
- provide user-safe recovery or relaunch guidance
- add regression coverage for expired, invalid, and revoked-session paths

## 6.6 Runtime contract drift

A locally known route or action is not sufficient proof that the current runtime session supports it.

### Required resolution

- treat bootstrap/refresh capability data as authoritative
- refresh stale supported-action contracts before blocking when safe
- prevent modules from rendering as enabled unless runtime support confirms them
- add regression coverage for stale contract recovery paths

## 6.7 Observability blind spots

Routing and action failures that cannot be correlated, classified, or traced are production risks.

### Required resolution

- standardize action/route telemetry fields
- propagate request/correlation ids through Mini App critical paths
- classify failure types consistently
- expose safe diagnostics for support and admin flows
- verify instrumentation exists for bootstrap, refresh, and action failures

## 6.8 Workflow facsimile drift

A Mini App page that looks equivalent to a bot command but does not execute the same operational workflow is a product and architecture defect.

### Required resolution

- map every implemented page to a canonical bot command workflow contract
- remove page-only shortcuts that bypass required command validation or confirmation logic
- reuse shared execution handlers and backend capabilities instead of reproducing business logic in UI code
- document and approve any Mini App-specific workflow compression or batching
- add regression coverage proving that critical pages preserve bot-command semantics

# 7. Delivery Roadmap

## Phase 1 — Architecture audit and parity baseline

Deliverables:

- inventory of bot commands
- inventory of callback actions
- inventory of Mini App routes/screens
- inventory of API dependencies
- role/capability matrix
- drift report
- parity matrix
- auth/session lifecycle map
- runtime-contract inventory
- failure-mode inventory for bootstrap, refresh, and action flows
- page-to-command workflow inventory
- command-workflow divergence report

Exit criteria:

- all unsupported or ambiguous surfaces identified
- shared contract targets defined
- parity matrix fields standardized
- auth, runtime-contract, and degraded-state gaps identified
- implemented pages mapped to canonical bot workflows
- all page-only workflow inventions identified
- `miniapp/docs/page-command-workflow-inventory.md` reflects the mounted route surface

## Phase 2 — Shared contract consolidation

Deliverables:

- central command definitions
- central callback action definitions
- central route registry
- central role/capability mapping
- schema normalization for key workflows
- explicit split between static client contracts and runtime server contracts
- central session/auth contract
- central action transport contract
- central observability contract
- central command workflow contract
- central page-to-command mapping registry

Exit criteria:

- stringly-typed routing reduced
- Mini App actions derived from shared definitions
- drift-prone literals eliminated
- static and runtime contract boundaries documented
- key payload envelopes normalized
- workflow mappings are explicit for implemented pages

## Phase 3 — Routing and action hardening

Deliverables:

- centralized action dispatch
- safe fallback for unknown/stale actions
- route guards
- recovery flow for expired actions
- telemetry for action failures
- session/auth error classification
- stale-contract refresh rules
- idempotent mutation handling
- degraded-state standards for blocked, disabled, expired, and partial-data flows
- command-equivalent execution paths enforced for implemented pages

Exit criteria:

- no normal-path unsupported action failures
- stale actions recover safely
- auth/session failures recover or block deterministically
- mutating actions are retry-safe by contract
- implemented pages do not bypass required bot-command workflow steps

## Phase 4 — Homepage/dashboard cleanup

Deliverables:

- role-aware dashboard
- supported-feature-only module list
- shared avatar/profile rendering
- consistent layout primitives
- polished mobile presentation

Exit criteria:

- homepage matches shared UI standards
- dashboard no longer exposes unsupported actions

## Phase 5 — Workflow parity completion

Deliverables:

- call workflow parity
- call log parity
- SMS center parity
- email center parity
- bulk SMS parity
- bulk email parity
- provider/users/callerflags/persona/scripts/status parity
- synchronized workflow contracts for dashboard-composed routes such as `/ops`, `/mailer`, `/messaging`, and `/audit`
- synchronized ownership contracts for command-split `/scripts` routes such as `/content` and `/scriptsparity`

Exit criteria:

- route-to-command parity established for all intended product areas
- workflow payload and fallback parity established for all intended product areas
- command-workflow parity established for all implemented pages in intended product areas
- dashboard-composed routes remain explicitly command-owned and do not drift into standalone product logic

## Phase 6 — Production hardening

Deliverables:

- lint clean
- type-check clean
- test coverage for routing, permissions, and parity
- robust loading/error/empty states
- observability for key user paths
- regression coverage for auth/session, stale-contract, and degraded-state flows
- supportable diagnostics for production incidents

Exit criteria:

- build passes
- regression coverage exists
- deployment-safe confidence achieved
- production failures are traceable by contract identifiers and correlation metadata

# 8. Definition of Done

The Mini App architecture is considered aligned only when all of the following are true:

- No broken or unsupported Mini App actions in normal usage
- Shared command/action contracts are introduced or clearly centralized
- Homepage/dashboard is visually consistent with shared components
- Mini App routes correspond to real bot and API capabilities
- Role gating matches bot behavior exactly
- Unknown/stale actions fail safely
- Runtime contracts are treated as authoritative at execution time
- Session/auth failures are classified and handled deterministically
- Mutating actions are safe under retry and duplicate submission
- Bootstrap, refresh, and action flows emit usable diagnostics
- Every implemented page has an explicit bot-command workflow contract
- Implemented pages execute command-equivalent workflows or document approved divergence
- Dashboard-composed routes have explicit command ownership, action-family boundaries, and fallback contracts
- Relevant tests, lint, type-check, and build pass
- Architecture drift is documented or removed

# 9. Required Engineering Standards

## Every change must include

- root cause
- implementation plan
- files changed
- contract impact
- command workflow impact
- tests added or updated
- validation steps and results
- parity gaps found
- follow-up risks or technical debt

## Preferred implementation style

- inspect first
- map parity
- fix highest-risk drift first
- keep diffs small
- prefer shared contracts over local patches
- validate before closing work
- preserve server-authoritative runtime behavior over client convenience
- define degraded-state behavior, not only success-path behavior
- preserve bot-command workflow semantics when adding Mini App productivity enhancements

# 10. Codex Working Rules

When using Codex or any coding agent against this roadmap:

1. Inspect the repository before editing.
2. Treat live bot code as the contract.
3. Build or update the parity matrix before major feature work.
4. Do not add Mini App features without a bot/API mapping.
5. Do not leave duplicated command/action strings if a shared contract can replace them.
6. Do not solve architecture problems with page-only hacks.
7. Do not stop at visual fixes; verify permissions, contracts, routing, and backend compatibility.
8. Do not assume static client contracts are authoritative when runtime server contracts disagree.
9. Do not ship mutating Mini App actions without retry/idempotency semantics defined.
10. Do not close work without checking degraded-state behavior for the touched flow.
11. Do not implement a Mini App page without tracing it to the main bot command workflow it represents.
12. Do not replace command validation, confirmation, or execution semantics with UI-only approximations.
13. When improving productivity, compress the workflow only if the underlying command behavior remains preserved.

# 11. Immediate Priorities

## Highest priority

- Remove all causes of `Unsupported miniapp action`
- Align dashboard modules to real supported actions
- Centralize action and route definitions
- Fix shared avatar rendering consistency
- Formalize session/auth failure handling
- Formalize runtime-contract vs static-contract boundaries
- Keep page-to-command workflow contracts synchronized with implemented pages
- Keep dashboard-composed route ownership contracts synchronized with live command/action inventories
- Keep `/scripts` split ownership contracts synchronized across `/content`, `/scriptsparity`, and the canonical `/scripts` workflow

## Next priority

- Complete route/command/capability parity matrix
- Enforce role symmetry across bot and Mini App
- Expand regression coverage around routing and permissions
- Expand regression coverage around auth/session, stale-contract refresh, and degraded-state behavior
- Expand regression coverage proving command-workflow parity for implemented pages

# 12. Maintenance Rule

This roadmap must be updated whenever any of the following change:

- bot command surface
- callback action model
- Mini App routing model
- authorization/capability logic
- major shared data contracts
- admin/user role behavior
- auth/session lifecycle behavior
- runtime contract model
- observability contract
- regression matrix for critical failure modes
- page-to-command workflow mappings
- approved Mini App workflow divergences from bot-command behavior
- the contents of `miniapp/docs/page-command-workflow-inventory.md`

If the implementation and this roadmap diverge, the live code must be re-audited and this document must be corrected immediately.
