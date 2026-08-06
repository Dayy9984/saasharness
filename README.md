# SaaS Harness

An **upstream-composed**, human-in-the-loop B2C SaaS workflow, mandatory critic system, and React Web + Cloudflare-first starter assembler.

SaaS Harness does not aim to replace mature agent frameworks with an original all-in-one methodology. It assigns one upstream to each major responsibility and keeps custom code focused on B2C product policy, regional adapters, Cloudflare assembly, critic evidence, and source-attributed product modules.

## Target outcome

```text
product interview
→ GitHub Spec Kit: constitution / clarify / spec / plan / tasks
→ Open Design + React UX Lab: IA / journeys / running React mock
→ human UX approval
→ Impeccable + mandatory independent critics
→ Starter and versioned B2C module assembly
→ Superpowers: WIP=1 TDD / debugging / review
→ actual identity / payment / credits / Admin integration
→ OpenSpec living changes after baseline
→ Preview → Staging → Production
→ optional Meta-Harness outer-loop improvement after pilots
```

## Canonical upstreams

The pinned source of truth is [`upstreams.lock.json`](upstreams.lock.json).

| Layer | Canonical upstream | Status |
|---|---|---|
| initial specification | [`github/spec-kit`](https://github.com/github/spec-kit) | **required**; official CLI plus the included [`saasharness-b2c` preset](integrations/spec-kit-b2c/) |
| implementation and TDD | [`obra/superpowers`](https://github.com/obra/superpowers) | **required** provider plugin |
| design artifact engine | [`nexu-io/open-design`](https://github.com/nexu-io/open-design) | default external daemon/MCP; React UX Lab fallback |
| UI critique and hardening | [`pbakaus/impeccable`](https://github.com/pbakaus/impeccable) | **required**, pinned project install |
| living change management | [`Fission-AI/OpenSpec`](https://github.com/Fission-AI/OpenSpec) | enabled after the first approved baseline |
| long-horizon context | [`open-gsd/gsd-core`](https://github.com/open-gsd/gsd-core) | optional escape path, not always-on |
| money-path source port | [`nikandr-surkov/ai-saas-starter`](https://github.com/nikandr-surkov/ai-saas-starter) | ledger / idempotency / replay / race patterns, with attribution |
| SaaS capability inventory | [`wasp-lang/open-saas`](https://github.com/wasp-lang/open-saas) | reference profile; Wasp is not the default runtime |
| harness optimization | [`stanford-iris-lab/meta-harness`](https://github.com/stanford-iris-lab/meta-harness) | disabled research outer loop until stable pilots/evals exist |
| memory / skill candidates | [`NousResearch/hermes-agent`](https://github.com/NousResearch/hermes-agent) | optional Meta-Harness proposer/backend; no production self-promotion |
| runtime baseline | [`cloudflare/templates`](https://github.com/cloudflare/templates) | React + Vite + Hono + Workers compatibility source |

See [Upstream-Composed Architecture](docs/upstream-architecture.md) for the responsibility boundaries and what custom code is still justified.

## Core principles

- **Human-owned intent:** product, market, price, entitlement, privacy, and UX decisions are approved by a person.
- **Mandatory critic:** every product, UX, architecture, plan, implementation, and release stage has independent critique.
- **Actual UX evidence:** UI/UX cannot pass from code review alone; critics need a running React mock or Preview.
- **Upstream before invention:** a mature upstream owns each generic workflow. A similar custom implementation does not count as integration.
- **WIP=1:** finish one observable feature slice before the next.
- **Risk-adaptive TDD:** Superpowers RED–GREEN–REFACTOR for production behavior; scenario-first for complete journeys.
- **Thin project layer, reusable platform code:** common SaaS concerns live in versioned modules rather than being improvised for every product.
- **React Web + Cloudflare-first:** with explicit database/backend escape conditions.
- **Region adapters:** Kakao-oriented KR identity, Google-oriented global identity, and market-specific payment adapters.
- **No Redis by default.**
- **Self-improvement is bounded:** Meta-Harness and Hermes may propose candidates only after stable held-out evaluation exists.

## Quick start

```bash
npm install
node ./bin/saasharness.js init ./contracts --name my-saas
# Complete the product interview and approve product.yml.
node ./bin/saasharness.js assemble ./contracts --out ./generated/my-saas --prototype
```

The generated project includes:

- the pinned upstream manifest;
- the actual Spec Kit B2C preset under `.saasharness/upstreams/spec-kit-b2c`;
- B2C critic and workflow skills;
- React UX Lab, artifacts, and Cloudflare starter modules.

Install/verify the canonical upstreams in the generated project:

```bash
cd generated/my-saas
saasharness integrations list

# Runs Spec Kit init and installs the included B2C preset when uv/uvx is available.
saasharness integrations install spec-kit --provider codex --project . --execute

# Installs the pinned Impeccable critic.
saasharness integrations install impeccable --provider codex --project . --execute

# Superpowers and Open Design use their official provider/plugin or daemon/MCP setup.
saasharness integrations install superpowers --provider codex --project .
saasharness integrations install open-design --provider codex --project .
```

Open the React UX Lab at `/__ux`, create and critique the IA/UX, then approve `ux.yml` and `feature.yml`:

```bash
node ./bin/saasharness.js validate ./contracts
node ./bin/saasharness.js plan ./contracts
```

## Mandatory stage workflow

```bash
cd generated/my-saas

saasharness workflow status .
saasharness workflow packet . discovery

# Independent critic reports.
saasharness workflow record . discovery intent --report ./intent.json
saasharness workflow record . discovery requirements --report ./requirements.json
saasharness workflow evaluate . discovery

# Revise and re-run when needed.
saasharness workflow revise . discovery

# Human approval after PASS.
saasharness workflow approve . discovery --by "product-owner"
```

Stages:

```text
discovery → ux-ia → architecture → plan → implementation → release
```

After the first product baseline, use OpenSpec for subsequent proposals and archived changes rather than creating a second living-spec system.

## Commands

| Command | Purpose |
|---|---|
| `init` | Create product, UX, and current-feature contracts |
| `validate` | Block incomplete or unapproved contracts |
| `plan` | Resolve modules, adapters, platform services, DB profile, and blockers |
| `assemble --prototype` | Generate the React UX workspace after product approval |
| `assemble` | Generate the strict approved workspace |
| `risk` | Select focused verification from changed paths |
| `workflow status/packet/record/evaluate/revise/approve` | Run the mandatory critic and approval lifecycle |
| `integrations list/install` | Inspect or install pinned upstream adapters |

## Current implementation status

Implemented:

- human-approved contracts and prototype bootstrap;
- mandatory critic workflow and React UX Lab;
- PRD, IA, journeys, screen contracts, architecture, DB/cache/infra/latency, phases, tasks, tests, and release artifacts;
- official Spec Kit preset and pinned upstream manifest;
- executable integration metadata for Spec Kit, Impeccable, OpenSpec, and GSD plus provider-specific Superpowers/Open Design instructions;
- region and monetization resolver;
- Cloudflare/D1/PostgreSQL escape profile;
- generated React/Vite/Hono/Workers app;
- identity, billing, credits, Admin, privacy, audit, and release module scaffolds;
- focused verification router;
- generated-project install/build/test/audit CI.

Still incomplete:

- production Kakao and Google identity;
- production KR/global payment adapters;
- fully hardened order/subscription/entitlement/credits modules;
- production Admin/CS/privacy workflows;
- verifier-owned browser journeys for all critical paths;
- complete Preview→Staging→Production automation;
- three real B2C production pilots;
- enabled Meta-Harness search. The bounded domain spec exists at [`harness-lab/meta-harness/domain_spec.md`](harness-lab/meta-harness/domain_spec.md), but activation requirements are intentionally unmet.

## Validation

```bash
npm run check
```

The current branch must not claim that generated products are production-ready until the protected modules and adapters pass their real provider, database, recovery, and release tests.
