# Upstream-Composed Architecture

SaaS Harness is not intended to replace every mature coding-agent framework with an original implementation. Its custom surface is limited to B2C product policy, React and Cloudflare assembly, regional provider adapters, cross-upstream evidence, and source-attributed product modules.

The exact pinned sources and roles live in [`upstreams.lock.json`](../upstreams.lock.json).

## Canonical responsibility map

| Responsibility | Canonical upstream | How SaaS Harness uses it |
|---|---|---|
| 0→1 specification | GitHub Spec Kit | Official CLI with the project-local `saasharness-b2c` preset. Constitution, clarify, specify, plan, tasks, analyze, checklist, converge, and implementation artifacts remain Spec Kit responsibilities. |
| Implementation discipline | obra/superpowers | Official provider plugin. Brainstorming, plans, RED–GREEN–REFACTOR, systematic debugging, subagent execution, review, and branch completion remain Superpowers responsibilities. |
| Design artifact generation | nexu-io/open-design | External daemon/MCP, DESIGN.md, templates, skills, and running preview. The React UX Lab is the fallback and evidence store, not a competing design framework. |
| UI critique and hardening | pbakaus/impeccable | Required pinned project installation. Its critic, audit, harden, animate, and deterministic detector surfaces feed the mandatory critic workflow. |
| Living changes | Fission-AI/OpenSpec | Installed after the initial approved baseline. Proposal → apply → verify → archive manages product evolution instead of inventing another change-spec format. |
| Long-horizon recovery | open-gsd/gsd-core | Optional for phases that cannot stay within the normal Superpowers small-batch flow. It is not run alongside Superpowers by default. |
| Money-path implementation | nikandr-surkov/ai-saas-starter | Source-attributed port of ledger, idempotency, single-writer billing, replay/race, and scoped-agent safety patterns into Cloudflare modules. |
| B2C capability completeness | wasp-lang/open-saas | Capability and operational-path reference. Wasp is not the default runtime. |
| Harness optimization | stanford-iris-lab/meta-harness | Separate outer-loop lab after repeated pilots, stable evaluators, search/held-out splits, and an explicit budget exist. |
| Persistent skill candidates | NousResearch/hermes-agent | Optional proposer or memory backend in the lab. Hermes-created skills remain candidates until independently evaluated. |
| Runtime starter | cloudflare/templates | React + Vite + Hono + Workers compatibility baseline, with security-patched dependency versions when upstream pins are stale. |

## What is original here

Custom code is justified only where upstreams do not supply the B2C-specific requirement:

- product, region, price, entitlement, privacy, and target-market contracts;
- React Web + Cloudflare module assembly;
- Kakao / Google and market-specific payment adapter boundaries;
- B2C Admin, CS, privacy, audit, latency, and release evidence contracts;
- mapping between Spec Kit, Open Design, Superpowers, OpenSpec, and the generated project;
- Cloudflare ports of source-attributed SaaS safety patterns;
- critic evidence schema and human approval state.

A source URL or a similar idea is not an integration. A repository counts as integrated only when at least one of these exists:

1. an official CLI/package/plugin installed and pinned;
2. an official preset, extension, skill, or MCP adapter;
3. a source-level code port with file/commit attribution and regression tests;
4. an executable adapter with a verification test;
5. a separate benchmark lab following the upstream interface.

## Why the upstreams are not all always-on

Several upstreams overlap. Running all of them for every task recreates the heavy framework soup the project is designed to avoid.

- Spec Kit owns initial artifacts; OpenSpec owns changes after baseline.
- Superpowers owns the normal implementation loop; GSD is an escape hatch for unusually long phases.
- Open Design creates and previews design artifacts; Impeccable independently critiques and hardens them.
- Meta-Harness and Hermes operate outside the production path and cannot modify protected evaluators, credentials, payment, identity, privacy, or release controls.

This division maximizes reuse without multiplying state machines, documents, and agents.

## Meta-Harness and Hermes boundary

Meta-Harness can make the coding harness improve over repeated episodes, but only when the domain has a stable measurable loop. The repository's bounded onboarding spec is in [`harness-lab/meta-harness/domain_spec.md`](../harness-lab/meta-harness/domain_spec.md).

The outer loop may optimize context selection, skill activation, task decomposition, critic prompts, evidence ordering, and bounded retry policies. It may not optimize by changing product intent, weakening tests, seeing held-out answers, editing production modules, or self-promoting candidates.

Hermes memory and autonomous skill creation can provide proposer candidates, but they do not make those candidates correct. Promotion still requires search-set and held-out evaluation, cost comparison, and human approval.
