# /workspaces/voicednut/AGENTS.md
# Project guidance loaded by Codex for this repository (layered with global ~/.codex/AGENTS.md).

## Working agreements (always)
- Behave like a senior engineer: correctness first, then clarity, then speed.
- Prefer small, reviewable diffs; avoid drive-by formatting changes.
- Preserve public APIs and behavior unless explicitly asked to change them.
- Do not introduce new dependencies without explicit approval.
- When uncertain, ask one targeted question or present 2 options with tradeoffs.

## Execution defaults
- Start by restating intent and constraints.
- Read surrounding code before edits; match local conventions.
- Implement minimal viable changes first, then harden.
- Verify with fastest relevant checks and report outcomes.
- If checks cannot run, state exact commands that should be run.

## Codex artifacts
- Do not create or persist a repo-root `.codex/` directory in this repository.
- Store convention fingerprints and Codex local artifacts under `~/.codex/` instead (for example `~/.codex/conventions/`).

## Integration docs policy (required)
- For Twilio, Vonage, AWS, OpenRouter, Deepgram, and grammY work, use docs-first workflow.
- Run `/home/codespace/.codex/skills/workflow-automation/scripts/workflow-run-integration-audit.sh [repo-root] --check-latest` when repository access is available.
- Always load `/home/codespace/.codex/skills/integration-docs-kit/references/provider-docs-index.md` first.
- Then load provider-specific references from cookbook/playbooks/checklists.
- Use Context7 first for package docs and version compatibility.
- Cross-check provider webhook/auth/payload behavior with official docs before code changes.
- If docs and local code differ, state the mismatch explicitly.

## Refactoring
- Refactor in safe steps: mechanical rename -> extraction -> simplification -> optimization.
- Keep functions named for intent and reduce deeply nested branching.
- Remove dead code only when proven unused (or with approval).

## Review/debug expectations
- For reviews, prioritize bugs, regressions, and edge-case failures over style.
- For debugging, reproduce first, isolate root cause, then patch minimally.
- Always include file references and explain why the issue occurs.

## Preferred MCP/tool usage
- Prefer `fs` for repository inspection/editing.
- Use `openaiDeveloperDocs` for OpenAI/Codex docs and `context7` for third-party docs.
- Use `playwright` when UI/runtime validation is required.
- If a tool fails, continue with safe fallback and state limitation briefly.
- Never expose secrets in logs or outputs.

## Skill routing hints
- Provider/API docs lookup and integration behavior validation -> use `integration-docs-kit`.
- Feature implementation/code generation -> use `intent-codegen`.
- Complex code reading/explanation -> use `legacy-code-explainer`.
- Bug/edge-case/code-risk review -> use `bug-risk-review`.
- Repro + root-cause + fix -> use `debug-fix-playbook`.
- Repetitive setup/refactor/test/migration loops -> use `workflow-automation`.
- Vercel preview/production deployments -> use `vercel-deploy`.
- Recurring provider drift/docs-sync maintenance -> use `integration-maintenance`.

## Output format (fast + useful)
- Provide a concise plan (3-6 bullets max).
- Then provide a short "What changed" summary:
  - Files touched
  - Key behavior changes
  - Any follow-ups / risks
- Do not paste unified diffs by default.
- Include exact commands to run when relevant.

## Telegram Mini Apps docs sync (required)
- For Telegram Mini App work (`miniapp/**`, `@tma.js/*`, Telegram platform APIs), use docs-first workflow.
- Load `/home/codespace/.codex/skills/integration-docs-kit/references/telegram-mini-apps-docs-index.md` first.
- Prioritize platform references: About, Init Data, Settings Button, Back Button, Haptic Feedback.
- Cross-check auth/signature verification against Init Data docs before code changes.
- Use Context7 for `@tma.js` package version compatibility when available.

## Skills
A skill is a set of local instructions to follow that is stored in a `SKILL.md` file. Below is the list of skills that can be used. Each entry includes a name, description, and file path so you can open the source for full instructions when using a specific skill.
### Available skills
- bug-risk-review: Use when reviewing code for bugs, logic errors, race conditions, security flaws, and unhandled edge cases. Optimized for rapid triage, high-signal findings, and actionable remediation guidance. (file: /home/codespace/.codex/skills/bug-risk-review/SKILL.md)
- debug-fix-playbook: Use when diagnosing failures, reproducing bugs, and delivering verified fixes. Emphasizes reproducibility, hypothesis-driven debugging, minimal patches, and regression prevention. (file: /home/codespace/.codex/skills/debug-fix-playbook/SKILL.md)
- integration-docs-kit: Use when work touches Twilio, Vonage, AWS, OpenRouter, Deepgram, or grammY. Detects integration surface, maps to official docs + Context7, and enforces evidence-backed implementation/review. (file: /home/codespace/.codex/skills/integration-docs-kit/SKILL.md)
- intent-codegen: Use when the user asks to implement features or generate code that must match existing project architecture, conventions, and intent. Optimized for fast constraint extraction, minimal diffs, and risk-scaled verification. (file: /home/codespace/.codex/skills/intent-codegen/SKILL.md)
- legacy-code-explainer: Use when the user asks to understand, explain, or untangle complex/legacy code. Produces layered explanations, call/data-flow maps, invariants, and concrete refactor-safe guidance. (file: /home/codespace/.codex/skills/legacy-code-explainer/SKILL.md)
- voxly-provider-contract-guard: Use for Voxly provider-facing changes to enforce docs-backed webhook/auth contract checks, version drift detection, and deterministic provider validation commands. (file: /home/codespace/.codex/skills/voxly-provider-contract-guard/SKILL.md)
- workflow-automation: Use when the user asks to automate repetitive engineering workflows such as setup, refactoring loops, migrations, lint/test runs, and release-prep checks. Includes reusable local scripts. (file: /home/codespace/.codex/skills/workflow-automation/SKILL.md)
- vercel-deploy: Deploy applications and websites to Vercel. Use when users ask to deploy, publish a preview link, or ship to production on Vercel. (file: /home/codespace/.codex/skills/vercel-deploy/SKILL.md)
- integration-maintenance: Use when users ask to maintain provider integrations over time with drift checks, docs-sync audits, and safe upgrade planning. (file: /home/codespace/.codex/skills/integration-maintenance/SKILL.md)
- skill-creator: Guide for creating effective skills. This skill should be used when users want to create a new skill (or update an existing skill) that extends Codex's capabilities with specialized knowledge, workflows, or tool integrations. (file: /home/codespace/.codex/skills/.system/skill-creator/SKILL.md)
- skill-installer: Install Codex skills into $CODEX_HOME/skills from a curated list or a GitHub repo path. Use when a user asks to list installable skills, install a curated skill, or install a skill from another repo (including private repos). (file: /home/codespace/.codex/skills/.system/skill-installer/SKILL.md)
### How to use skills
- Discovery: The list above is the skills available in this session (name + description + file path). Skill bodies live on disk at the listed paths.
- Trigger rules: If the user names a skill (with `$SkillName` or plain text) OR the task clearly matches a skill's description shown above, you must use that skill for that turn. Multiple mentions mean use them all. Do not carry skills across turns unless re-mentioned.
- Missing/blocked: If a named skill isn't in the list or the path can't be read, say so briefly and continue with the best fallback.
- How to use a skill (progressive disclosure):
  1) After deciding to use a skill, open its `SKILL.md`. Read only enough to follow the workflow.
  2) When `SKILL.md` references relative paths (e.g., `scripts/foo.py`), resolve them relative to the skill directory listed above first, and only consider other paths if needed.
  3) If `SKILL.md` points to extra folders such as `references/`, load only the specific files needed for the request; don't bulk-load everything.
  4) If `scripts/` exist, prefer running or patching them instead of retyping large code blocks.
  5) If `assets/` or templates exist, reuse them instead of recreating from scratch.
- Coordination and sequencing:
  - If multiple skills apply, choose the minimal set that covers the request and state the order you'll use them.
  - Announce which skill(s) you're using and why (one short line). If you skip an obvious skill, say why.
- Context hygiene:
  - Keep context small: summarize long sections instead of pasting them; only load extra files when needed.
  - Avoid deep reference-chasing: prefer opening only files directly linked from `SKILL.md` unless you're blocked.
  - When variants exist (frameworks, providers, domains), pick only the relevant reference file(s) and note that choice.
- Safety and fallback: If a skill can't be applied cleanly (missing files, unclear instructions), state the issue, pick the next-best approach, and continue.
