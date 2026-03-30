# Voicednut Mini App Architecture and Roadmap

This document defines the target architecture and implementation sequence for the Telegram Mini App admin console.

It is designed to keep integration safe, incremental, and production-ready without changing backend contracts.

## Source References

Telegram Mini Apps platform references used for integration constraints:
- About: https://docs.telegram-mini-apps.com/platform/about
- Init Data: https://docs.telegram-mini-apps.com/platform/init-data
- Settings Button: https://docs.telegram-mini-apps.com/platform/settings-button
- Back Button: https://docs.telegram-mini-apps.com/platform/back-button
- Haptic Feedback: https://docs.telegram-mini-apps.com/platform/haptic-feedback
- Theme Params: https://docs.telegram-mini-apps.com/platform/theme-params
- Viewport: https://docs.telegram-mini-apps.com/platform/viewport

Package references:
- Create Mini App: https://docs.telegram-mini-apps.com/packages/tma-js-create-mini-app
- SDK React: https://docs.telegram-mini-apps.com/packages/tma-js-sdk-react
- Init Data Node: https://docs.telegram-mini-apps.com/packages/tma-js-init-data-node

## Current Runtime Architecture

### 1) Platform Shell Layer
Files:
- `src/index.tsx`
- `src/components/Root.tsx`
- `src/components/App.tsx`

Responsibilities:
- Mini App SDK setup and bootstrap.
- Platform control wiring (settings button, back button, viewport/theme integration).
- Top-level routing handoff.

### 2) Navigation Layer
Files:
- `src/navigation/routes.tsx`

Responsibilities:
- Route definitions and page-level boundaries.
- Route-driven lifecycle and rendering flow.

### 3) Admin Domain Layer
Files:
- `src/pages/AdminDashboard/AdminDashboardPage.tsx`
- `src/pages/AdminDashboard/*.tsx` (module pages)
- `src/hooks/admin-dashboard/*`
- `src/services/admin-dashboard/*`

Responsibilities:
- Dashboard state composition across bootstrap, polling, and stream updates.
- Capability-aware module visibility.
- Read and write orchestration to API endpoints.

Current direction:
- Continue reducing monolithic page logic by moving pure primitives and side-effect workflows into dedicated service/hook modules.

### 4) Presentation Layer
Files:
- `src/pages/AdminDashboard/AdminDashboardPage.css`
- module-level page components
- `src/components/admin-dashboard/*` (shared dashboard UI components)

Responsibilities:
- Shared visual tokens and reusable UI primitives.
- Telegram-native, mobile-first dark interface.
- Stable component patterns (cards, chips, buttons, tiles, empty/error states).

## API Contract Boundaries

No backend behavior changes are required for this roadmap. The frontend keeps using:
- `POST /miniapp/session`
- `GET /miniapp/bootstrap`
- `GET /miniapp/jobs/poll`
- `POST /miniapp/action`

Reliability posture:
- Session bootstrap is required before privileged data/actions.
- Polling remains fallback-safe when streaming is degraded.
- Action calls remain capability-gated by backend.

## Strategic Enhancement Backlog (Corrected)

This section replaces the previous Phase A-D priority order and is the canonical execution plan.

Already completed foundation work (kept as baseline):
- Dashboard shell/component extraction, VM builders, transport helpers, request-state primitives, and smoke gating remain in place.
- Existing backend API contracts remain unchanged unless explicitly approved.

### Must-Fix Before Production

1. Reliability-first data + auth layer
- What changes: centralized mini app session manager, Telegram `initData` refresh and re-auth flow, retry policy, stale-while-revalidate cache behavior, and unified error normalization.
- What stays: existing endpoint contracts and capability gating model.
- Effort: M
- Impact: Very High
- Risk: Low-Med
- Likely files affected: `src/services/miniappAuth.ts`, `src/services/admin-dashboard/dashboardTransport.ts`, `src/services/admin-dashboard/dashboardApiContracts.ts`, `src/hooks/admin-dashboard/*`, `src/pages/AdminDashboard/AdminDashboardPage.tsx`.

2. Operator-safe action framework
- What changes: destructive-action confirmation layer, idempotency keys for writes, optimistic updates with rollback, and audit trail entries for all admin actions.
- What stays: existing action endpoint shape (`POST /miniapp/action`) and module permissions model.
- Effort: M-L
- Impact: Very High
- Risk: Med
- Likely files affected: `src/hooks/admin-dashboard/useDashboardActions.ts`, `src/services/admin-dashboard/dashboardActionGuards.ts`, `src/components/admin-dashboard/DashboardActionDialog.tsx`, `src/pages/AdminDashboard/*`.

3. Professional UI system v1 (non-cosmetic)
- What changes: strict design tokens (spacing/type/radius/shadows), reusable `status card`, `metric tile`, `incident row`, and `action bar` primitives, and consistent empty/loading/error state surfaces.
- What stays: current dark brand direction and Telegram-first layout constraints.
- Effort: M
- Impact: High
- Risk: Low
- Likely files affected: `src/components/ui/AdminPrimitives.tsx`, `src/components/admin-dashboard/*`, `src/pages/AdminDashboard/AdminDashboardPage.css`, `src/styles/*`.

4. Telegram-native interaction polish
- What changes: hardened Back/Settings lifecycle handling, reliable theme sync, haptic feedback on key actions, viewport/safe-area resilience, and pull-to-refresh semantics.
- What stays: existing routing topology and dashboard module boundaries.
- Effort: M
- Impact: High
- Risk: Low-Med
- Likely files affected: `src/components/Root.tsx`, `src/components/App.tsx`, `src/hooks/*telegram*`, `src/pages/AdminDashboard/AdminDashboardPage.tsx`.

5. Observability + incident UX
- What changes: frontend telemetry for load/failure/auth-expiry classes, correlation IDs surfaced in operator UI, diagnostics panel, and grouped runtime errors.
- What stays: current status rail and incident summary surface direction.
- Effort: M
- Impact: High
- Risk: Low
- Likely files affected: `src/components/admin-dashboard/DashboardStatusRail.tsx`, `src/services/admin-dashboard/*`, `src/pages/AdminDashboard/*`, `scripts/smoke-admin-dashboard.mjs`.

6. Production access model hardening
- What changes: strict server-side RBAC enforcement per operation, feature flags by role/workspace, and sensitive-value redaction in UI-visible logs.
- What stays: existing role labels and workspace selection UX.
- Effort: M
- Impact: High
- Risk: Med
- Likely files affected: `api/functions/*miniapp*`, `api/services/miniappAuth.js`, `src/services/admin-dashboard/dashboardApiContracts.ts`, `src/pages/AdminDashboard/*`.

### Premium Polish Improvements

7. Task-centric navigation model
- What changes: workflow-first IA (`Monitor`, `Incidents`, `Queues`, `Providers`, `Runbooks`) with clear primary and secondary actions.
- What stays: module capability gating and focused-module concept.
- Effort: M
- Impact: High
- Risk: Low
- Likely files affected: `src/navigation/routes.tsx`, `src/components/admin-dashboard/DashboardChrome.tsx`, `src/pages/AdminDashboard/AdminDashboardPage.tsx`.

8. Command surface for power users
- What changes: searchable command palette, role-aware command visibility, and keyboard shortcuts where supported.
- What stays: current module actions and guardrails.
- Effort: M
- Impact: Med-High
- Risk: Med
- Likely files affected: `src/components/admin-dashboard/*`, `src/hooks/admin-dashboard/*`, `src/pages/AdminDashboard/*`.

9. Data density modes
- What changes: compact and comfortable modes, list/table mode switching for dense workflows, sticky filters, and saved views.
- What stays: default mobile-first ergonomics.
- Effort: M
- Impact: Med
- Risk: Low
- Likely files affected: `src/components/admin-dashboard/*`, `src/pages/AdminDashboard/*`, `src/services/admin-dashboard/dashboardLayout.ts`.

### Architecture and Maintainability Improvements

10. Performance budgets + runtime safeguards
- What changes: bundle-size budgets, route-level splitting, abortable requests, and render-cost profiling for dashboard modules.
- What stays: current framework/toolchain stack.
- Effort: M
- Impact: Med-High
- Risk: Low
- Likely files affected: `vite.config.*`, `src/navigation/routes.tsx`, `src/hooks/admin-dashboard/*`, `package.json`.

11. Test strategy for confidence
- What changes: API adapter contract tests, critical-flow smoke tests, auth-expiry regression coverage, and CI validation gates.
- What stays: existing local smoke gate entrypoints.
- Effort: M-L
- Impact: High
- Risk: Low
- Likely files affected: `miniapp/tests/*`, `scripts/smoke-admin-dashboard.mjs`, CI workflow files under `.github/workflows/*`.

12. Module boundary cleanup
- What changes: explicit frontend architecture boundaries (app shell, domain modules, shared UI, infra adapters), typed API client boundaries, and removal of cross-feature coupling.
- What stays: endpoint contracts and dashboard module intent.
- Effort: L
- Impact: High (long-term)
- Risk: Med
- Likely files affected: `src/pages/AdminDashboard/*`, `src/services/admin-dashboard/*`, `src/components/admin-dashboard/*`, `src/navigation/*`.

## Best Top 5 Next Enhancements (Execution Order)

1. Reliability-first data + auth layer.
2. Operator-safe action framework.
3. Professional UI system v1 primitives and state consistency.
4. Telegram-native interaction polish.
5. Observability and incident UX.

## Execution Status Snapshot

Current implementation status for active workstream:
- Track 1 (Reliability-first data + auth layer): In Progress.
- Track 2 (Operator-safe action framework): In Progress.
- Track 3 (Professional UI system v1): In Progress.
- Track 4 (Telegram-native interaction polish): In Progress.
- Track 5 (Observability + incident UX): In Progress.

Track 1 completed slices:
- Session and refresh error-code normalization extracted into shared `dashboardSessionErrors` helpers.
- Bootstrap and poll loaders suppress generic fatal copy for recognized session-blocking error classes.
- Expired cached session token path now attempts secure `/miniapp/session/refresh` before fallback session bootstrap.
- Session cache reader supports stale-token recovery mode to avoid dropping refresh candidates too early.

Track 1 next slices:
- Add bounded retry/backoff utility for idempotent reads (`bootstrap`, `poll`) with jitter.
- Add structured diagnostics payload (correlation id, failure class, endpoint) in status rail.
- Add regression smoke checks for `miniapp_init_data_expired` and `miniapp_token_expired` recovery paths.

Track 2 completed slices:
- Action execution now enforces in-flight dedupe by action plus stable payload fingerprint to block accidental double submissions.
- Duplicate submit attempts are surfaced as operator-visible activity events without invoking backend writes.
- Action lifecycle events now emit started/cancelled/succeeded/failed entries with trace and idempotency hints for operator-side correlation.
- Low-risk runtime canary actions now apply optimistic UI updates and rollback deterministically on action failure.

## Product Quality Bar (Top-Grade Standard)

The mini app is considered production-grade only when all criteria below are met:
- Reliability: no unactionable fatal states in primary operator flows; every failure path provides a recover action.
- UX consistency: all dashboard modules use standardized loading, empty, success, warning, and error states.
- Telegram-native compliance: Back/Settings/theme/viewport/haptics are deterministic across supported Telegram clients.
- Operator safety: destructive actions require confirmation and produce immutable audit events.
- Security and access: RBAC enforcement is server-authoritative, never UI-only.
- Observability: every critical request path emits traceable telemetry with correlation identifiers.
- Performance: first meaningful dashboard content under agreed budget and no avoidable blocking work on app boot.
- Testability: critical flows are covered by smoke checks and regression tests with CI gating.

## North-Star Metrics and SLO Targets

Use these targets to measure readiness and catch regressions early:
- Session bootstrap success rate: >= 99.5%.
- Auth-expiry recovery success rate (no manual reload): >= 99.0%.
- Dashboard load p95 (Telegram webview): <= 2.5s.
- Action success confirmation latency p95: <= 1.5s (excluding long-running jobs).
- Client-side fatal error rate: < 0.5% of sessions.
- Stream-to-poll fallback recovery: < 5s to stable degraded mode.
- Incident acknowledgement interaction success: >= 99%.

## Implementation Blueprint for Top 5 (Detailed)

### Track 1: Reliability-First Data and Auth Layer

Scope:
- Introduce a single session lifecycle controller for token/bootstrap state.
- Add request middleware for retryable failures with bounded backoff and jitter.
- Add stale-while-revalidate caching for bootstrap and derived view-model slices.
- Normalize API error shapes into deterministic domain error categories.

Definition of done:
- Expired init data no longer leaves dashboard in terminal error state.
- Any 401/403/auth-expired class triggers controlled re-auth attempt or clear blocked state.
- Polling and stream paths use unified error categorization and consistent UI messaging.
- Retry policy excludes unsafe writes and is limited to idempotent read paths.

Likely implementation files:
- `src/services/miniappAuth.ts`
- `src/services/admin-dashboard/dashboardTransport.ts`
- `src/services/admin-dashboard/dashboardApiContracts.ts`
- `src/services/admin-dashboard/dashboardVm/*`
- `src/hooks/admin-dashboard/useDashboardPollingLoop.ts`
- `src/hooks/admin-dashboard/useDashboardEventStream.ts`

### Track 2: Operator-Safe Action Framework

Scope:
- Enforce confirm-before-execute for destructive and high-impact actions.
- Generate idempotency keys for write actions and attach to transport layer.
- Support optimistic UI for low-risk actions with rollback on failure.
- Surface action timeline entries in UI with status, actor, and correlation id.

Definition of done:
- No destructive action executes from a single accidental tap.
- Duplicate action submissions do not trigger double execution.
- Action failures rollback UI state and show deterministic remediation guidance.
- Action records are inspectable from operator surfaces.

Likely implementation files:
- `src/hooks/admin-dashboard/useDashboardActions.ts`
- `src/hooks/admin-dashboard/useDashboardRuntimeControls.ts`
- `src/components/admin-dashboard/DashboardActionDialog.tsx`
- `src/components/admin-dashboard/DashboardStatusRail.tsx`
- `src/services/admin-dashboard/dashboardActionGuards.ts`

### Track 3: Professional UI System v1

Scope:
- Formalize token system for color, type, spacing, radius, elevation, motion, and interaction states.
- Build canonical primitives for metric tiles, status cards, incident rows, and action bars.
- Consolidate all transient UI states (loading/empty/error/blocked/degraded) to shared components.
- Enforce role and capability badge consistency with semantic status colors.

Definition of done:
- No module uses ad-hoc state visuals outside shared primitives.
- Card layout, spacing rhythm, and typography scale are consistent on mobile and desktop.
- Critical operator surfaces can be scanned in < 5s for current sync status and incidents.
- Accessibility baseline: clear focus ring, contrast-compliant text, and screen-reader labels on controls.

Likely implementation files:
- `src/components/ui/AdminPrimitives.tsx`
- `src/components/admin-dashboard/DashboardStateCards.tsx`
- `src/components/admin-dashboard/DashboardChrome.tsx`
- `src/components/admin-dashboard/DashboardTopShell.tsx`
- `src/pages/AdminDashboard/AdminDashboardPage.css`

### Track 4: Telegram-Native Interaction Polish

Scope:
- Harden Back/Settings button subscription lifecycle and route transitions.
- Keep theme and viewport in sync with Telegram runtime updates.
- Add haptic feedback for confirm/success/error states where appropriate.
- Add safe-area handling and pull-to-refresh semantics for top-level dashboard refresh.

Definition of done:
- Telegram controls never remain stale after route/module transitions.
- No clipped UI in notched devices or dynamic viewport changes.
- Pull-to-refresh invokes deterministic data refresh without duplicate in-flight requests.
- Haptics are present only for key interactions and never spammy.

Likely implementation files:
- `src/components/Root.tsx`
- `src/components/App.tsx`
- `src/hooks/admin-dashboard/useDashboardModuleRoute.ts`
- `src/pages/AdminDashboard/AdminDashboardPage.tsx`
- `src/services/admin-dashboard/dashboardTransport.ts`

### Track 5: Observability and Incident UX

Scope:
- Emit client telemetry events for bootstrap latency, auth failures, and action outcomes.
- Surface request and action correlation ids in status/error panels.
- Add diagnostics panel with environment, last sync health, and recent failure classes.
- Group errors by normalized type to reduce alert noise and speed triage.

Definition of done:
- Operator can identify failing subsystem and correlation id without browser devtools.
- Recurring client failures are grouped and trendable.
- Diagnostics panel is accessible from dashboard shell and safe for production usage.
- Smoke script validates key telemetry and diagnostics rendering paths.

Likely implementation files:
- `src/components/admin-dashboard/DashboardStatusRail.tsx`
- `src/components/admin-dashboard/DashboardShellFrame.tsx`
- `src/services/admin-dashboard/dashboardApiContracts.ts`
- `src/services/admin-dashboard/dashboardTransport.ts`
- `scripts/smoke-admin-dashboard.mjs`

## Extended Enhancements for Top-Notch Version (Post-Top 12)

13. Runbook and guided recovery engine
- Add inline runbooks for each critical failure class with one-tap safe remediation actions.

14. Incident timeline intelligence
- Add timeline of events, retries, provider switches, and operator interventions for every incident.

15. Provider health confidence scoring
- Add composite provider score from latency, error classes, queue depth, and fallback rate.

16. Workspace governance center
- Add environment-level policy controls, approval tiers, and action windows by role.

17. Adaptive dashboard summaries
- Add role-aware executive summary cards and per-workspace watchlists.

18. Offline and poor-network resilience
- Add explicit offline mode, queued refresh attempts, and reconnection guidance.

19. Internationalization and localization readiness
- Add UI copy strategy, message key boundaries, and locale-safe formatting.

20. Change intelligence and release notes feed
- Add in-app release highlights and migration notices for operators.

## Execution Structure and Delivery Cadence

Suggested execution model:
- Wave 1 (Production hardening): tracks 1, 2, and 4.
- Wave 2 (Professional UX): track 3 and high-impact parts of track 5.
- Wave 3 (Scale and maintainability): remaining observability plus items 10-12 and selected extended enhancements.

PR sizing guideline:
- Keep each PR focused to one track slice with <= 8 files where possible.
- Each PR must include a rollback note and explicit risk surface.
- Each PR must include before/after operator behavior notes.

## Security and Compliance Readiness Checklist

- Enforce server-side permission checks for all write actions.
- Ensure sensitive values are redacted in logs, telemetry, and diagnostics.
- Validate init data and auth timestamps strictly against accepted skew windows.
- Guard against replay on write operations with idempotency and expiry windows.
- Ensure all operator-facing errors avoid leaking implementation secrets.

## Operator UX Principles (Non-Negotiable)

- Every alert must answer: what happened, what is impacted, what to do next.
- Every critical action must expose scope, consequence, and rollback path.
- Every degraded state must preserve at least one safe operational path.
- Every module must communicate freshness timestamp and data trust level.
- Every empty state must provide meaningful next action, never dead ends.

## Verification Gate Per Change

Run minimum checks after each meaningful refactor:

```bash
npm --prefix miniapp run lint
npm --prefix miniapp run build
npm --prefix miniapp run smoke:admin-dashboard
```

For auth/session-critical changes, also verify manually:
- Launch from Telegram bot menu only.
- Confirm init-data validation and session bootstrap succeeds.
- Confirm settings and back button lifecycle work on supported clients.

## Deployment Guardrails (Vercel)

- Root: `miniapp`
- Build: `npm run build`
- Output: `dist`
- Required env:
  - `VITE_API_BASE_URL` (preferred)
  - or `VITE_API_BASE`

Rollout checklist:
- Confirm API URL targets correct environment.
- Confirm bot `MINI_APP_URL` points to current Vercel deployment.
- Smoke test with real Telegram launch, not standalone browser only.
- Run deployment commands from `miniapp/` only.
- Never create or keep `/workspaces/voicednut/.vercel` for this app.
- If Vercel project root differs from `miniapp`, override with explicit deploy path command:
  - `vercel deploy /workspaces/voicednut/miniapp --prod --yes`

## Non-Goals

To keep upgrades safe, this roadmap intentionally avoids:
- backend endpoint contract changes
- new external dependencies unless explicitly approved
- large rewrites that reduce release confidence
