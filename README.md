# SaaS Harness

An **upstream-composed B2C SaaS build harness** for product dialogue, human-approved React UX, architecture, WIP=1 TDD implementation, independent critic loops, operational platform modules, and Cloudflare release workflows.

The harness now checks out the agreed GitHub repositories at pinned commits and uses them as bounded implementation bases instead of treating them as reading references.

## One-command upstream bootstrap

```bash
npm ci
node ./bin/saasharness.js init ./contracts --name my-saas
# Complete product.yml and approve the product contract.

node ./bin/saasharness.js bootstrap ./contracts \
  --out ./generated/my-saas \
  --provider codex \
  --profile all \
  --prototype \
  --execute
```

`bootstrap --execute` performs the following work:

1. checks out the pinned `cloudflare/templates` commit;
2. seeds the project from its official `vite-react-template`;
3. overlays only the B2C contracts, platform modules, workflow state, tests, and operational policy;
4. checks out the approved upstream repositories under `.saasharness/sources/`;
5. initializes the official Spec Kit B2C preset;
6. installs the pinned Impeccable critic;
7. writes the external coding-agent runner configuration;
8. runs the upstream doctor and returns all unresolved blockers.

Profiles:

- `core`: Cloudflare Templates, Spec Kit, Superpowers, Open Design, Impeccable, Pro UI Engineering, AI SaaS Starter, Open SaaS.
- `lifecycle`: `core` plus OpenSpec, GSD Core, and Strands Harness SDK.
- `all`: every verified/licensable pinned upstream, including Meta-Harness and Hermes research sources. License-blocked or unavailable repositories are not cloned silently.

## Actual stage runner

Configure the builder and critic commands in `.saasharness/agent.json`, or provide JSON argv arrays through the environment:

```bash
export SAASHARNESS_BUILDER_COMMAND_JSON='["your-agent-cli","...","-"]'
export SAASHARNESS_CRITIC_COMMAND_JSON='["your-agent-cli","...","-"]'
```

Then run the current stage:

```bash
cd ./generated/my-saas
saasharness run . --execute
```

The runner now performs an executable bounded loop:

```text
builder agent in a fresh process
→ stage verification
→ isolated critic process per required channel
→ JSON report validation
→ pass / revise / block synthesis
→ bounded automatic repair round
→ human approval gate
```

It does not accept a single agent's self-review as evidence. UX uses separate experience, design, and browser-evidence critics. Implementation uses spec-compliance, code-quality, and runtime-evidence critics. Production approval remains human-owned.

## Canonical upstream responsibility map

The pinned source of truth is [`upstreams.lock.json`](upstreams.lock.json).

| Responsibility | Upstream | How it is used |
|---|---|---|
| Initial product/specification lifecycle | `github/spec-kit` | Official CLI plus the included `saasharness-b2c` preset; canonical constitution, clarification, spec, plan, tasks, analysis, and checklist artifacts |
| Normal implementation/TDD/debug/review | `obra/superpowers` | Official provider plugin and WIP=1 RED-GREEN-REFACTOR execution host |
| Running design artifacts | `nexu-io/open-design` | Checked-out daemon/MCP source and canonical DESIGN.md/running artifact host |
| UI engineering references | `yzfly/pro-ui-engineering-skill` | Attributed curated B2C subset copied into each generated project |
| UI critique and hardening | `pbakaus/impeccable` | Pinned install, deterministic detector, browser evidence, critique, audit, harden, and motion review |
| Living changes after baseline | `Fission-AI/OpenSpec` | Proposal, apply, verify, and archive lifecycle |
| Long-horizon recovery | `open-gsd/gsd-core` | Optional fresh-context escape path when the normal small-batch flow cannot fit |
| Money-path safety | `nikandr-surkov/ai-saas-starter` | Attributed ledger, idempotency collision, conditional spend, compensating refund, raw webhook, and single-writer patterns |
| B2C capability coverage | `wasp-lang/open-saas` | Auth/payment/email/jobs/storage/analytics/Admin/test/deploy completeness reference; Wasp is not forced as the runtime |
| Product-agent runtime | `strands-agents/harness-sdk` | Optional only when the generated SaaS itself contains agents |
| Harness optimization | `stanford-iris-lab/meta-harness` | Isolated outer-loop lab after pilots, frozen search/held-out sets, and a fixed budget exist |
| Skill/memory candidates | `NousResearch/hermes-agent` | Optional Meta-Harness proposer/memory backend; no automatic production promotion |
| Runtime baseline | `cloudflare/templates` | Official Vite + React + Hono + Workers project seed |

UI UX Pro Max remains optional pending license clarification. The previously cited Agent Startup Kit is explicitly not integrated while its primary repository is unavailable.

## Human-owned workflow

```text
discovery
→ UX / IA
→ architecture
→ plan
→ implementation
→ release
```

Each stage is:

```text
draft
→ execute against canonical upstreams
→ independent critics
→ bounded revision
→ PASS
→ human approval
```

Manual workflow commands remain available:

```bash
saasharness workflow status .
saasharness workflow packet . discovery
saasharness workflow record . discovery intent --report ./intent.json
saasharness workflow record . discovery requirements --report ./requirements.json
saasharness workflow evaluate . discovery
saasharness workflow revise . discovery
saasharness workflow approve . discovery --by "product-owner"
```

## Upstream source management

```bash
saasharness upstreams sync . --profile all --execute
saasharness upstreams doctor . --profile all
```

Every checkout is detached at the exact commit from `upstreams.lock.json`. The generated `.saasharness/upstream-sources.json` records repository, expected commit, actual commit, local path, and status.

## Generated B2C platform

The generated project includes:

- React 19, Vite, Hono, and Cloudflare Workers;
- D1 default with PostgreSQL + Hyperdrive escape criteria;
- Google/Kakao OIDC code with state, nonce, signature, issuer, audience, and expiry checks;
- Stripe/Toss payment boundaries;
- order, payment, subscription, entitlement, and credits data models;
- append-only credit ledger and idempotency protections;
- webhook inbox/outbox and audit trail;
- Admin/CS APIs and UI scaffold;
- privacy export/delete paths;
- security headers and request timing;
- React UX Lab and Playwright browser verification;
- Preview, Staging, and Production environment/deploy workflows;
- generated PRD, IA, journeys, screen contracts, architecture, DB/cache/infra/latency, phases, tasks, tests, implementation log, and release runbook.

The repository and generated-project CI verify syntax, unit/integration tests, dependency audit, TypeScript/Vite/Workers build, Wrangler dry-run, Vitest, and Playwright.

## Commands

| Command | Purpose |
|---|---|
| `init` | Create B2C product, UX, and feature contracts |
| `validate` | Block incomplete or unapproved contracts |
| `plan` | Resolve modules, adapters, services, DB profile, and blockers |
| `assemble` | Generate the B2C overlay without network bootstrap |
| `bootstrap --execute` | Check out upstream bases, seed from Cloudflare's official template, install required integrations, and generate the project |
| `upstreams sync` | Materialize pinned GitHub sources locally |
| `upstreams doctor` | Verify commits, sentinels, and required tools |
| `agent init` | Create the external builder/critic command contract |
| `run --execute` | Execute builder, verification, isolated critics, and bounded repair for the current stage |
| `workflow ...` | Inspect or manually control critic reports and human approval |
| `risk` | Route verification from changed paths |
| `integrations list/install` | Inspect or install official bounded integrations |

## Production evidence boundary

Code generation and orchestration are executable, but a generated product remains `productionReady: false` until its selected providers and environments pass their real evidence gates: Google/Kakao account lifecycles, Stripe/Toss payment and refund/subscription lifecycles, D1/PostgreSQL replay/race/migration/recovery, complete operator journeys, deployed Preview→Staging→Production drills, and representative production pilots.

```bash
npm run check
```

See [`docs/full-workflow.md`](docs/full-workflow.md), [`docs/upstream-architecture.md`](docs/upstream-architecture.md), and [`docs/requirements-traceability.md`](docs/requirements-traceability.md).
