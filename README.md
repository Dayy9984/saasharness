# SaaS Harness

A human-in-the-loop B2C SaaS workflow, mandatory critic system, and React Web + Cloudflare-first starter assembler.

## Target outcome

The completed harness is designed to automate:

```text
product interview
→ PRD
→ IA and user journeys
→ React mock UX approval
→ module/folder/DB/cache/infra plan
→ phases and tasks
→ WIP=1 TDD implementation
→ identity/payment/credits/admin integration
→ critic refinement at every stage
→ Preview → Staging → Production
```

The current `v0.2` branch implements the workflow/critic/starter foundation. Production identity, payment, credits, Admin/CS, and deployment modules are still being hardened and generated outputs remain blocked from production.

## Core principles

- **Human-owned intent:** product, market, price, entitlement, privacy, and UX decisions are approved by a person.
- **Mandatory critic:** every document, UX, architecture, plan, implementation, and release stage runs independent critics.
- **Actual UX evidence:** UI/UX cannot pass from source code review alone; critics need a running React mock/preview.
- **WIP=1:** finish one observable feature slice before the next.
- **Risk-adaptive TDD:** Superpowers-style RED–GREEN–REFACTOR for production behavior; scenario-first for journeys.
- **Thin per-project harness, reusable platform code:** common SaaS concerns should live in versioned modules, not be improvised for every product.
- **React web + Cloudflare-first:** with explicit database/backend escape conditions.
- **Region adapters:** Kakao-oriented KR identity, Google-oriented global identity, market-specific payment adapters.
- **No Redis by default.**

## Quick start

```bash
npm install
node ./bin/saasharness.js init ./contracts --name my-saas
# Approve product.yml after the product interview. Leave UX/feature as drafts.
node ./bin/saasharness.js assemble ./contracts --out ./generated/my-saas --prototype
```

Open the generated React UX Lab at `/__ux`, create and critique the real IA/UX, then approve `ux.yml` and `feature.yml` and run strict validation:

```bash
node ./bin/saasharness.js validate ./contracts
node ./bin/saasharness.js plan ./contracts
```

The generated project contains workflow artifacts, critic policy, and B2C skills under `.agents/skills`.

## Mandatory stage workflow

```bash
cd generated/my-saas

saasharness workflow status .
saasharness workflow packet . discovery

# The active AI agent runs each critic independently and writes JSON reports.
saasharness workflow record . discovery intent --report ./intent.json
saasharness workflow record . discovery requirements --report ./requirements.json
saasharness workflow evaluate . discovery

# Revise and re-run if needed:
saasharness workflow revise . discovery

# Human approval after PASS:
saasharness workflow approve . discovery --by "product-owner"
```

Stages:

```text
discovery → ux-ia → architecture → plan → implementation → release
```

## Design and IA integrations

The generated project ships original B2C workflow skills. Optional external integrations:

```bash
saasharness integrations list
saasharness integrations install impeccable --provider codex --project . --execute
```

- **Impeccable 3.5.0** is the default recommended external design critic/detector integration.
- **UI UX Pro Max** is optional and not auto-installed because its current license statements should be reviewed.
- **Open Design** is optional as an external design artifact engine.
- **Spec Kit** and **Superpowers** may be installed as planning/execution adapters; SaaS Harness workflow state remains canonical.

## Commands

| Command | Purpose |
|---|---|
| `init` | Create product, UX, and current-feature contracts |
| `validate` | Block incomplete or unapproved contracts |
| `plan` | Resolve modules, adapters, platform services, DB profile, blockers |
| `assemble --prototype` | Generate the React UX workspace after product approval, before UX approval |
| `assemble` | Generate the strict approved workspace |
| `risk` | Select focused verification from changed paths |
| `workflow status` | Show stage, critic, and approval state |
| `workflow packet` | Generate the required critic input/output contract |
| `workflow record` | Store one independent critic report |
| `workflow evaluate` | Compute pass/revise/block |
| `workflow revise` | Start another bounded critic round |
| `workflow approve` | Human approval and stage advance |
| `integrations list/install` | Inspect or install external skill/plugin adapters |

## Current implementation status

Implemented:

- human-approved contracts and prototype bootstrap;
- region and monetization resolver;
- Cloudflare/D1/PostgreSQL escape profile;
- deterministic module lock;
- generated React/Vite/Hono/Workers app;
- React UX Lab scaffold;
- PRD, IA, journey, screen, design, architecture, DB, cache, infra, latency, phase, task, test, implementation, and release artifacts;
- mandatory critic workflow for every stage;
- universal B2C agent skills;
- focused verification router;
- generated-project install/build/test/audit CI.

Still incomplete:

- production Kakao and Google identity;
- production KR/global payment adapters;
- durable order/subscription/entitlement/credits implementations;
- Admin/CS/privacy UI and operations;
- verifier-owned browser automation;
- Preview→Staging→Production automation;
- three real B2C production pilots.

See [Complete Workflow](docs/full-workflow.md), [Requirements Traceability](docs/requirements-traceability.md), and [Research Validation](docs/research-validation.md).

## Validation

```bash
npm run check
```
