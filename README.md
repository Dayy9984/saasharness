# SaaS Harness

An **upstream-composed B2C SaaS build harness** for product dialogue, human-approved React UX, modular architecture, WIP=1 TDD implementation, independent critic loops, operational platform modules, and Cloudflare release workflows.

The harness checks out agreed GitHub repositories at pinned commits and uses them as bounded implementation bases instead of merely citing them.

## One-command upstream bootstrap

```bash
npm ci
node ./bin/saasharness.js init ./contracts --name my-saas
# Discuss and approve product.yml first.

node ./bin/saasharness.js bootstrap ./contracts \
  --out ./generated/my-saas \
  --provider codex \
  --profile all \
  --prototype \
  --execute
```

`bootstrap --execute`:

1. checks out the pinned `cloudflare/templates` commit;
2. seeds the product from the official `vite-react-template`;
3. overlays B2C contracts, platform modules, workflow state, tests, and evidence rules;
4. checks out approved upstreams under `.saasharness/sources/`;
5. initializes the real Spec Kit B2C preset;
6. installs the pinned Impeccable integration;
7. writes the coding-agent runner configuration;
8. installs, audits, builds, tests, and browser-smoke-verifies the generated project;
9. verifies expected and actual upstream commits.

Profiles:

- `core`: Cloudflare Templates, Spec Kit, Superpowers, Open Design, Impeccable, Pro UI Engineering, AI SaaS Starter, Open SaaS.
- `lifecycle`: `core` plus OpenSpec, GSD Core, and Strands Harness SDK.
- `all`: every verified/licensable pinned upstream, including Meta-Harness and Hermes research sources.

## Human-owned workflow

```text
discovery
→ ux-philosophy
→ ux-themes
→ ux-prototype
→ architecture
→ plan
→ implementation
→ release
```

Every stage follows:

```text
draft
→ builder executes against canonical upstreams
→ independent critics inspect evidence
→ bounded repair loop
→ PASS
→ human approval
```

A builder or critic cannot approve its own stage.

## UI/UX workflow

### 1. Approve a lightweight B2C UI foundation

The default is not an artistic theme. It is a clean, legible, conventional B2C SaaS experience with:

- obvious hierarchy and next actions;
- familiar sign-in, onboarding, upgrade, billing, account, and support patterns;
- predictable navigation and recovery;
- accessible contrast, focus, keyboard behavior, and reduced motion;
- restrained surfaces and effects;
- reusable components;
- responsive behavior completed in the React mock before implementation.

The product owner only decides the details that materially vary by product:

- character and warmth;
- information density;
- surface treatment;
- solid or selectively glass-like controls;
- accent role;
- spring-motion character;
- trust and regional considerations.

These decisions are stored in root [`SOUL.md`](templates/platform/SOUL.md). It is a lightweight component contract, not a branding manifesto.

```bash
saasharness run . --stage ux-philosophy --execute
saasharness workflow approve . ux-philosophy --by "product-owner"
```

### 2. Compare exactly 15 practical UI treatments

The gallery keeps the same conventional B2C SaaS IA, layout, neutral content, and user flow. The variants compare only useful UI decisions:

- solid versus selected glass controls;
- flat versus soft card surfaces;
- compact, standard, or spacious density;
- radius and focus treatment;
- restrained accent and trust cues;
- instant, snappy, smooth, or gentle spring intent.

Novelty themes such as neon, brutalist, game-like, or purely artistic directions are excluded by default.

Public and Pinterest research is allowed as an inspiration index:

- no automated scraping;
- no copying original images, logos, illustrations, brand assets, or exact compositions;
- store reviewed URLs or search URLs and abstract observations;
- learn principles from products such as Apple, Linear, Miro, Stripe, and Notion without reproducing their identity.

Routes:

```text
/__ux/themes
/__ux/themes/<theme-id>
```

```bash
saasharness run . --stage ux-themes --execute
saasharness design list-themes .
saasharness design select-theme . apple-glass-controls --by "product-owner"
saasharness workflow approve . ux-themes --by "product-owner"
```

The source-controlled selection is written to:

```text
artifacts/02-ux/theme-selection.yml
.saasharness/theme-selection.json
src/react/ux-lab/theme-selection.ts
```

### 3. Complete the React mock before production implementation

Only after treatment approval, the harness builds:

- semantic tokens derived from `SOUL.md` and the selected treatment;
- primitives, patterns, feature components, and page boundaries;
- IA, primary journeys, recovery journeys, and screen contracts;
- every required React page with realistic mock data;
- loading, empty, error, permission, paid-limit, long-content, retry, delayed-success, interruption, and reduced-motion states;
- responsive behavior inside the mock itself.

```bash
saasharness run . --stage ux-prototype --execute
# Open /__ux/prototype and use the complete flow.
saasharness workflow approve . ux-prototype --by "product-owner"
```

Human review owns visual and responsive approval. Automated UX verification is intentionally limited to lightweight route and interaction smoke; there is no mandatory 390/1440/1920 matrix, screenshot gate, or visual-score loop.

## Critic model

Critics are required by default, but they inspect the correct evidence for each stage.

| Stage | Required critics |
|---|---|
| `discovery` | intent, requirements |
| `ux-philosophy` | product-fit, design-coherence |
| `ux-themes` | research-integrity, treatment-usefulness, browser-evidence |
| `ux-prototype` | experience, design, browser-evidence |
| `architecture` | standards, operability |
| `plan` | scope, testability |
| `implementation` | spec-compliance, code-quality, runtime-evidence |
| `release` | release-risk, release-evidence |

UX cannot pass from source review alone. Browser critics inspect the running mock and interaction evidence, while the human owns taste, responsive completion, and final approval.

## Actual stage runner

For Codex, `bootstrap --provider codex` writes a safe provider configuration:

- builder: fresh ephemeral process with workspace-write sandbox;
- critics: separate ephemeral read-only processes with a strict JSON schema;
- no dangerous sandbox bypass;
- no automatic human approval.

```bash
cd ./generated/my-saas
saasharness run . --execute
```

The runner performs:

```text
fresh builder process
→ stage-specific verification
→ one isolated critic per required channel
→ strict report validation
→ pass / revise / block synthesis
→ bounded repair round
→ human approval gate
```

## Canonical upstream responsibility map

The pinned source of truth is [`upstreams.lock.json`](upstreams.lock.json).

| Responsibility | Upstream | How it is used |
|---|---|---|
| Initial specification lifecycle | `github/spec-kit` | Official CLI plus the included B2C preset; constitution, clarification, spec, plan, tasks, analysis, and checklist |
| Implementation/TDD/debug/review | `obra/superpowers` | Official provider plugin and WIP=1 RED–GREEN–REFACTOR host |
| Running design artifacts | `nexu-io/open-design` | Checked-out daemon/MCP source and DESIGN.md/running artifact host |
| UI engineering references | `yzfly/pro-ui-engineering-skill` | Attributed curated subset copied into generated projects |
| UI critique and hardening | `pbakaus/impeccable` | Pinned install, deterministic checks, browser evidence, critique, audit, harden, and motion review |
| Living changes after baseline | `Fission-AI/OpenSpec` | Proposal, apply, verify, and archive lifecycle |
| Long-horizon recovery | `open-gsd/gsd-core` | Optional fresh-context escape path |
| Money-path safety | `nikandr-surkov/ai-saas-starter` | Attributed ledger, idempotency, conditional spend, refund, raw webhook, and single-writer patterns |
| B2C capability coverage | `wasp-lang/open-saas` | Auth/payment/email/jobs/storage/analytics/Admin/test/deploy completeness reference |
| Product-agent runtime | `strands-agents/harness-sdk` | Optional only for agentic products |
| Harness optimization | `stanford-iris-lab/meta-harness` | Isolated outer-loop lab after pilots and sealed evaluation exist |
| Skill/memory candidates | `NousResearch/hermes-agent` | Optional candidate proposer/memory backend; no automatic production promotion |
| Runtime baseline | `cloudflare/templates` | Official React + Vite + Hono + Workers seed |

UI UX Pro Max remains optional pending license clarification. Agent Startup Kit remains unintegrated while its primary repository is unavailable.

## Generated B2C platform

The generated project includes:

- React 19, Vite, Hono, and Cloudflare Workers;
- D1 default with PostgreSQL + Hyperdrive escape criteria;
- Google/Kakao OIDC boundaries;
- Stripe/Toss payment boundaries;
- order, payment, subscription, entitlement, and credits data models;
- append-only credit ledger and idempotency protections;
- webhook inbox/outbox and audit trail;
- Admin/CS APIs and UI scaffold;
- privacy export/delete paths;
- security headers and request timing;
- Preview, Staging, and Production workflows;
- generated PRD, IA, journeys, screen contracts, architecture, DB/cache/infra/latency, phases, tasks, tests, implementation log, and release runbook.

## Commands

| Command | Purpose |
|---|---|
| `init` | Create B2C product, UX, and feature contracts |
| `validate` | Block incomplete or unapproved contracts |
| `plan` | Resolve modules, adapters, services, DB profile, and blockers |
| `assemble` | Generate the B2C overlay without network bootstrap |
| `bootstrap --execute` | Check out upstreams, seed the official Cloudflare template, install integrations, and verify the project |
| `design status` | Inspect SOUL, 15-treatment catalog, and approval state |
| `design list-themes` | List the exact 15 treatment candidates |
| `design select-theme` | Write explicit human-attributed treatment approval |
| `upstreams sync/doctor/install` | Materialize, verify, and install pinned upstream sources |
| `agent init` | Create the external builder/critic command contract |
| `run --execute` | Execute builder, verification, isolated critics, and bounded repair |
| `workflow ...` | Inspect or control critic reports and human approvals |
| `risk` | Route verification from changed paths |

## Production evidence boundary

A generated customer product remains `productionReady: false` until its selected external systems pass real evidence gates: Google/Kakao account lifecycles, Stripe/Toss payment/refund/subscription lifecycles, D1/PostgreSQL replay/race/migration/recovery, complete operator journeys, deployed Preview→Staging→Production drills, and representative production pilots.

```bash
npm run check
```

See [`docs/full-workflow.md`](docs/full-workflow.md), [`docs/upstream-architecture.md`](docs/upstream-architecture.md), and [`docs/requirements-traceability.md`](docs/requirements-traceability.md).
