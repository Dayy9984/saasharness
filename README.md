# SaaS Harness

An **upstream-composed**, human-in-the-loop B2C SaaS workflow, mandatory critic system, and React Web + Cloudflare-first product assembler.

SaaS Harness does not replace mature frameworks with an original all-in-one methodology. It assigns one bounded responsibility to each upstream and keeps custom code focused on B2C product policy, regional adapters, Cloudflare assembly, critic evidence, and attributed product modules.

## Target outcome

```text
product interview
→ Spec Kit: constitution / clarify / spec / plan / tasks
→ Open Design + React UX Lab + Pro UI references
→ UX/design/browser critics + human approval
→ reusable B2C platform assembly
→ Superpowers: WIP=1 TDD / debugging / review
→ identity / payment / credits / Admin / privacy
→ Preview → Staging → Production
→ OpenSpec living changes after baseline
→ optional GSD recovery or agent-runtime/research layers when justified
```

## Upstream responsibility map

The machine-readable source of truth is [`upstreams.lock.json`](upstreams.lock.json).

| Responsibility | Upstream | Activation |
|---|---|---|
| initial specification | `github/spec-kit` | required official CLI + included B2C preset |
| implementation/TDD | `obra/superpowers` | required provider plugin |
| running design artifacts | `nexu-io/open-design` | default external MCP/daemon; React UX Lab fallback |
| UI engineering references | `yzfly/pro-ui-engineering-skill` | attributed curated subset bundled in every generated project |
| UI critique/hardening | `pbakaus/impeccable` | required pinned project install |
| optional design search | UI UX Pro Max | manual license review before external install |
| living changes | `Fission-AI/OpenSpec` | after first approved baseline |
| long-context recovery | `open-gsd/gsd-core` | only when normal small-batch flow is insufficient |
| money-path safety | `nikandr-surkov/ai-saas-starter` | attributed ledger/idempotency/single-writer pattern port |
| B2C capability coverage | `wasp-lang/open-saas` | reference profile; Wasp runtime is not copied |
| product agent runtime | `strands-agents/harness-sdk` | only when the generated SaaS itself is agentic |
| harness research | Meta-Harness + Hermes | isolated after real pilots and sealed evaluation exist |
| React/Workers baseline | `cloudflare/templates` | required compatibility source + independent audit |
| previous Agent Startup Kit candidate | `Blink-h/agent-startup-kit` | not integrated because the primary repository is unavailable/404 |

See [`docs/upstream-architecture.md`](docs/upstream-architecture.md) and [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

## Core principles

- Humans approve product, market, price, entitlement, privacy, documents, and React UX.
- Critics run at every product/UX/architecture/plan/implementation/release stage.
- UX cannot pass from code review alone; a running React artifact is required.
- Product-feature WIP is 1.
- Superpowers-style RED–GREEN–REFACTOR covers production behavior; complete journeys are scenario-first.
- Common SaaS infrastructure lives in versioned modules rather than being improvised per feature.
- React Web + Cloudflare are defaults, with explicit database/backend escape criteria.
- KR identity defaults to Kakao, global identity to Google; payments remain market adapters.
- Redis is not a default.
- Overlapping upstream state machines are not all run simultaneously.

## Quick start

```bash
npm install
node ./bin/saasharness.js init ./contracts --name my-saas
# Complete the product interview and approve product.yml.
node ./bin/saasharness.js assemble ./contracts --out ./generated/my-saas --prototype
cd ./generated/my-saas
npm install
npm run dev
```

Open `/__ux`. The generated project receives:

- the Spec Kit B2C preset and pinned upstream lock;
- B2C product, UX, architecture, TDD, critic, release, living-change, context-recovery, platform, and optional agent-runtime skills;
- the attributed Pro UI Engineering subset;
- React UX Lab, planning artifacts, Cloudflare runtime modules, tests, and release workflows.

Install/verify external upstreams:

```bash
saasharness integrations list
saasharness integrations install spec-kit --provider codex --project . --execute
saasharness integrations install impeccable --provider codex --project . --execute
saasharness integrations install superpowers --provider codex --project .
saasharness integrations install open-design --provider codex --project .
```

OpenSpec is installed after the first baseline. GSD is an escape hatch. Strands is installed only for agentic products. Pro UI Engineering is already bundled and requires no install.

## Mandatory critic workflow

```bash
saasharness workflow status .
saasharness workflow packet . discovery
saasharness workflow record . discovery intent --report ./intent.json
saasharness workflow record . discovery requirements --report ./requirements.json
saasharness workflow evaluate . discovery
saasharness workflow revise . discovery
saasharness workflow approve . discovery --by "product-owner"
```

Stages:

```text
discovery → ux-ia → architecture → plan → implementation → release
```

Every stage requires independent critics and human approval; unresolved P0/P1 findings escalate after bounded rounds.

## Generated platform

The current generator includes React/Vite/Hono/Workers, D1 or Hyperdrive selection, OIDC Google/Kakao code, Stripe/Toss payment paths, order/subscription/entitlement/credits schemas, append-only ledger, webhook inbox/outbox, Admin/CS, privacy export/delete, security headers, request timing, Playwright, and environment/deploy workflows.

CI checks the harness and generated project through dependency audit, TypeScript/Vite/Workers build, Wrangler dry-run, Vitest, and Playwright.

Generated products remain `productionReady: false` until real provider credentials, sandbox lifecycle suites, database race/replay/recovery, deployed Preview→Staging→Production, and representative production pilots pass.

## Commands

| Command | Purpose |
|---|---|
| `init` | create product, UX, and current-feature contracts |
| `validate` | block incomplete or unapproved contracts |
| `plan` | resolve modules, adapters, services, DB profile, and blockers |
| `assemble --prototype` | create the React UX workspace after product approval |
| `assemble` | create the strict approved project |
| `risk` | select focused verification from changed paths |
| `workflow ...` | mandatory critic and approval lifecycle |
| `integrations list/install` | inspect or install bounded upstream adapters |

## Validation

```bash
npm run check
```

See [`docs/full-workflow.md`](docs/full-workflow.md) and [`docs/requirements-traceability.md`](docs/requirements-traceability.md).
