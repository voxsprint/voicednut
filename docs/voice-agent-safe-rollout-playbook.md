# Voice Agent Safe Rollout Playbook

This playbook defines how to ship major feature upgrades while preserving existing production behavior.

## Goals

- Keep all new capabilities opt-in and disabled by default.
- Avoid breaking existing APIs, scripts, and provider routing.
- Prove quality, reliability, and business lift before global enablement.
- Guarantee fast rollback with a single toggle per feature.

## Scope (Top Features)

1. Predictive Dialer Campaign Engine
2. Automated Post-Call QA Scoring
3. Unified Customer Timeline (Voice/SMS/Email/Telegram)
4. Live Agent Assist on Handoff

## Non-Negotiable Safety Rules

1. Feature flags must default to `false`.
2. Data model changes must be additive only (new tables/columns/indexes, no destructive migrations).
3. Existing endpoints and payload contracts must remain backward compatible.
4. New decision logic must run in shadow mode before affecting live routing/actions.
5. Every feature must have explicit kill switch + rollback steps documented before release.

## Flag Contract

Use this naming scheme for all new rollouts:

- `FEATURE_<NAME>_ENABLED=false`: hard gate for live behavior.
- `FEATURE_<NAME>_SHADOW_MODE=true`: evaluate logic and collect metrics without enforcement.
- `FEATURE_<NAME>_ROLLOUT_PERCENT=0`: traffic split for controlled rollout.
- `FEATURE_<NAME>_ALLOWLIST=`: comma-separated script/profile/user ids for opt-in cohorts.
- `FEATURE_<NAME>_KILL_SWITCH=false`: immediate hard off.

Suggested first-pass flags:

- `FEATURE_PREDICTIVE_DIALER_*`
- `FEATURE_POST_CALL_QA_*`
- `FEATURE_UNIFIED_TIMELINE_*`
- `FEATURE_AGENT_ASSIST_*`

## Progressive Rollout Stages

### Stage 0: Build + Contract Validation

- Flag state: `ENABLED=false`, `SHADOW_MODE=true`, `ROLLOUT_PERCENT=0`
- Run logic in read-only/observe-only path.
- Store diagnostics in new telemetry records without mutating call outcomes.
- Exit criteria:
  - No increase in API 5xx over baseline.
  - No increase in p95 latency > 5%.
  - No schema/contract validation failures in test suite.

### Stage 1: Internal Dogfood

- Keep global rollout at 0%.
- Enable via allowlist only (internal scripts, test numbers, admin accounts).
- Validate dashboards, logs, and false positive/negative rates.
- Exit criteria:
  - 3 consecutive days with no Sev-1/Sev-2 incidents.
  - Metric drift within thresholds defined below.

### Stage 2: Canary (1-5%)

- Turn on `ENABLED=true`, keep strict percent gate.
- Start at 1%, then 5% if healthy for 24-48 hours.
- Compare control vs treatment by campaign/profile/provider.
- Exit criteria:
  - Error delta <= +0.3 percentage points.
  - p95 latency delta <= +10%.
  - No material regression in completion/containment/conversion KPIs.

### Stage 3: Ramp (10% -> 25% -> 50%)

- Increase only one step per observation window.
- Freeze ramp on any breach and roll back one stage.
- Exit criteria:
  - Two full business cycles (weekday + weekend) without guardrail breach.

### Stage 4: Full Availability

- Set `ROLLOUT_PERCENT=100`.
- Keep kill switch and monitoring permanently.
- Keep shadow probes for at least 2 weeks after full launch.

## Guardrails and Thresholds

Track by feature and by provider (`twilio`, `vonage`, `aws` where relevant):

- API/server error rate
- Provider transport errors
- Timeout rate
- Call completion rate
- Human handoff rate
- Voicemail/answer ratio
- Sentiment regression
- Conversion KPI (for campaign features)

Default stop conditions:

1. Error rate increase > 0.3 percentage points vs control
2. Timeout increase > 1.0 percentage points vs control
3. p95 latency increase > 10%
4. High-severity compliance violation > 0
5. 2 consecutive canary windows with degraded conversion > 5%

When any stop condition triggers:

1. Flip `FEATURE_<NAME>_KILL_SWITCH=true`
2. Set `FEATURE_<NAME>_ROLLOUT_PERCENT=0`
3. Keep `SHADOW_MODE=true` for forensic diagnostics

## Feature-Specific Acceptance Criteria

### Predictive Dialer

- Must enforce abandonment and pacing limits.
- Must honor voicemail detection and retry windows.
- Must not alter non-campaign call flows.
- Success metrics:
  - Higher connect rate vs baseline
  - No SLA breach on callback timing

### Post-Call QA Scoring

- Must be asynchronous and non-blocking for call completion.
- Must support deterministic scorecard versioning.
- Must preserve existing transcript pipeline untouched.
- Success metrics:
  - >= 95% scoring coverage for completed calls
  - Stable false-positive rate in flagged QA alerts

### Unified Customer Timeline

- Must be read-through additive (do not remove existing per-channel views).
- Must provide channel provenance for each event.
- Must preserve existing audit and access controls.
- Success metrics:
  - Higher first-contact resolution for assisted workflows
  - Reduced repeat-contact rate

### Live Agent Assist

- Must trigger only on explicit handoff/assist conditions.
- Must never block handoff execution.
- Must include confidence score and source trace.
- Success metrics:
  - Lower handling time for escalated calls
  - Improved post-handoff resolution rate

## Data and Schema Safety

1. Add new tables for experimental feature outputs and telemetry.
2. Add nullable columns only when extending existing entities.
3. Backfills must be idempotent and chunked.
4. Keep all migration scripts reversible when feasible.

## Rollback Runbook

Use the following operational sequence for any feature regression:

1. Set kill switch:
   - `FEATURE_<NAME>_KILL_SWITCH=true`
2. Stop live treatment:
   - `FEATURE_<NAME>_ROLLOUT_PERCENT=0`
   - `FEATURE_<NAME>_ENABLED=false`
3. Restart API process using your current deployment method.
4. Confirm rollback:
   - Health endpoint passes
   - Error/timeout metrics return to baseline
   - Existing call and messaging flows remain normal

## Verification Checklist (Per Release)

1. Unit tests for flag gating and fallback behavior.
2. Integration tests for old contracts and payload compatibility.
3. Shadow mode dry-run in production-like environment.
4. Canary observation report with control vs treatment metrics.
5. Rollback drill executed successfully before ramping beyond 5%.

## Immediate Implementation Order

1. Post-Call QA Scoring (lowest runtime risk, highest ops visibility)
2. Predictive Dialer (high business upside, controlled campaign scope)
3. Unified Timeline (workflow lift, additive data model)
4. Live Agent Assist (depends on timeline + QA signals for best results)

