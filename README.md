# SaaS Harness

An **upstream-composed B2C SaaS build harness** for product dialogue, human-approved design exploration, modular React UX, architecture, WIP=1 TDD implementation, independent critic loops, operational platform modules, and Cloudflare release workflows.

The harness checks out agreed GitHub repositories at pinned commits and uses them as bounded implementation bases instead of treating them as reading references.

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
3. overlays only B2C contracts, platform modules, workflow state, tests, and evidence rules;
4. checks out approved upstreams under `.saasharness/sources/`;
5. initializes the real Spec Kit B2C preset;
6. installs the pinned Impeccable critic;
7. writes the external coding-agent runner configuration;
8. installs, audits, builds, tests, and browser-verifies the generated project;
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

### 1. Discuss the design philosophy

Before themes or components, the product owner and agent discuss:

- product essence and emotional promise;
- audience, context, trust, accessibility, and regional considerations;
- positive and negative design principles;
- typography, color, shape, density, surface, icon, and image grammar;
- spring motion, interruption, latency disclosure, and reduced motion;
- references and anti-references.

The result is the root [`SOUL.md`](templates/platform/SOUL.md). It is the design constitution for every later component, screen, and motion decision.

```bash
saasharness run . --stage ux-philosophy --execute
saasharness workflow approve . ux-philosophy --by "product-owner"
```

Approval is blocked if `SOUL.md` does not exist.

### 2. Research and compare exactly 15 themes

The theme stage uses authorized browser research. Pinterest is treated as an inspiration index, not an asset source:

- no automated Pinterest scraping;
- no downloading or copying original images, logos, illustrations, brand assets, or exact compositions;
- store Pin, Board, or search URLs, visible attribution, abstract observations, and explicit do-not-copy notes;
- render the same neutral screen in exactly 15 materially different visual systems;
- use no realistic product mock data during this comparison phase.

Routes:

```text
/__ux/themes
/__ux/themes/<theme-id>
```

The variants must differ in structural dimensions such as layout, typography, density, shape, texture, hierarchy, or motion—not only color.

```bash
saasharness run . --stage ux-themes --execute
saasharness design list-themes .
saasharness design select-theme . neon-arcade --by "product-owner"
saasharness workflow approve . ux-themes --by "product-owner"
```

Theme approval writes:

```text
artifacts/02-ux/theme-selection.yml
.saasharness/theme-selection.json
src/react/ux-lab/theme-selection.ts
```

### 3. Build the modular React mock-data prototype

Only after theme approval, the harness builds:

- semantic tokens derived from `SOUL.md` and the selected theme;
- primitives, patterns, feature components, and page composition boundaries;
- IA, primary journeys, recovery journeys, and screen contracts;
- modular React pages with realistic mock data;
- loading, empty, error, permission, paid-limit, long-content, retry, delayed-success, interruption, and reduced-motion states.

```bash
saasharness run . --stage ux-prototype --execute
# Open /__ux/prototype and use the complete flow.
saasharness workflow approve . ux-prototype --by "product-owner"
```

UX cannot pass from source review alone. Browser evidence is mandatory.

## Actual stage runner

For Codex, `bootstrap --provider codex` writes a safe provider configuration:

- builder: fresh ephemeral process, workspace-write sandbox, automatic approval review;
- critics: separate ephemeral read-only processes with a strict JSON output schema;
- no dangerous sandbox bypass;
- no automatic human approval.

Run the current stage:

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

Design stages use specialized critics:

| Stage | Required critics |
|---|---|
| `ux-philosophy` | product-fit, design-coherence |
| `ux-themes` | research-integrity, theme-diversity, browser-evidence |
| `ux-prototype` | experience, design, browser-evidence |

## Canonical upstream responsibility map

The pinned source of truth is [`upstreams.lock.json`](upstreams.lock.json).

| Responsibility | Upstream | How it is used |
|---|---|---|
| Initial product/specification lifecycle | `github/spec-kit` | Official CLI plus the included B2C preset; canonical constitution, clarification, spec, plan, tasks, analysis, and checklist artifacts |
| Normal implementation/TDD/debug/review | `obra/superpowers` | Official provider plugin and WIP=1 RED–GREEN–REFACTOR host |
| Running design artifacts | `nexu-io/open-design` | Checked-out daemon/MCP source and DESIGN.md/running artifact host |
| UI engineering references | `yzfly/pro-ui-engineering-skill` | Attributed curated subset copied into each generated project |
| UI critique and hardening | `pbakaus/impeccable` | Pinned install, deterministic detector, browser evidence, critique, audit, harden, and motion review |
| Living changes after baseline | `Fission-AI/OpenSpec` | Proposal, apply, verify, and archive lifecycle |
| Long-horizon recovery | `open-gsd/gsd-core` | Optional fresh-context escape path |
| Money-path safety | `nikandr-surkov/ai-saas-starter` | Attributed ledger, idempotency collision, conditional spend, refund, raw webhook, and single-writer patterns |
| B2C capability coverage | `wasp-lang/open-saas` | Auth/payment/email/jobs/storage/analytics/Admin/test/deploy completeness reference |
| Product-agent runtime | `strands-agents/harness-sdk` | Optional only for agentic products |
| Harness optimization | `stanford-iris-lab/meta-harness` | Isolated outer-loop lab after pilots and sealed evaluation exist |
| Skill/memory candidates | `NousResearch/hermes-agent` | Optional candidate proposer/memory backend; no automatic production promotion |
| Runtime baseline | `cloudflare/templates` | Official React + Vite + Hono + Workers seed |

UI UX Pro Max remains optional pending license clarification. Agent Startup Kit remains unintegrated while its primary repository is unavailable.

## Tetris virtual-environment pilot

The CI includes a deterministic falling-block pilot that proves the new UX lifecycle and a real React interaction path:

```text
assemble approved Tetris contracts
→ verify SOUL.md and 15-theme catalog
→ explicitly approve neon-arcade
→ apply modular playable React implementation
→ dependency audit
→ TypeScript/Vite/Workers build
→ Wrangler dry run
→ engine unit test
→ Playwright theme-gallery test
→ Playwright move / rotate / hard-drop / restart test
```

The CI fixture records public Pinterest reference URLs and abstract observations, but explicitly marks live Pinterest review as not performed. A real project must conduct its own authorized human/browser review rather than fabricate source evidence.

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
- PRD, IA, journeys, screen contracts, architecture, DB/cache/infra/latency, phases, tasks, tests, implementation log, and release runbook.

## Commands

| Command | Purpose |
|---|---|
| `init` | Create B2C product, v3 UX, and feature contracts |
| `validate` | Block incomplete or unapproved contracts |
| `plan` | Resolve modules, adapters, services, DB profile, and blockers |
| `assemble` | Generate the B2C overlay without network bootstrap |
| `bootstrap --execute` | Check out upstreams, seed the official Cloudflare template, install required integrations, and verify the project |
| `design status` | Inspect SOUL, 15-theme catalog, and theme approval state |
| `design list-themes` | List the exact 15 candidates |
| `design select-theme` | Write explicit human-attributed theme approval |
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
