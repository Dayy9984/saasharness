# Complete Upstream-Composed SaaS Harness Workflow

## 1. Create and approve the product contract

```bash
saasharness init ./contracts --name my-product
```

The product owner and coding agent complete `product.yml`. Market, pricing, entitlement, privacy, and product intent remain human-owned. Low-level infrastructure is resolved after product approval.

New projects receive UX contract version 3, which explicitly separates design philosophy, theme exploration, and the real mock-data prototype.

## 2. Bootstrap from pinned GitHub bases

```bash
saasharness bootstrap ./contracts \
  --out ./my-product \
  --provider codex \
  --profile all \
  --prototype \
  --execute
```

The executable bootstrap:

1. creates a pinned checkout of `cloudflare/templates`;
2. copies its official `vite-react-template` into the destination;
3. overlays the B2C platform, contracts, modules, skills, tests, workflow state, and evidence rules;
4. checks out the selected upstream profile into `.saasharness/sources/`;
5. runs the official Spec Kit initializer with the included B2C preset;
6. installs the pinned Impeccable project integration;
7. installs, audits, builds, unit-tests, and browser-tests the generated project;
8. records source commits and runs the upstream doctor.

## 3. Configure the coding-agent processes

`--provider codex` writes a ready non-interactive Codex configuration. Other providers can use:

```bash
saasharness agent init . --provider external-agent-cli
```

or environment argv arrays:

```bash
export SAASHARNESS_BUILDER_COMMAND_JSON='["agent-cli","...","-"]'
export SAASHARNESS_CRITIC_COMMAND_JSON='["agent-cli","...","-"]'
```

Commands are argv arrays, not shell strings. Builder and critics run in separate processes.

## 4. Execute the stage lifecycle

```bash
saasharness run . --execute
```

Stages:

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

For each stage the runner:

1. reads human-owned contracts and workflow state;
2. generates a prompt naming the canonical local upstream checkouts;
3. invokes a fresh builder process;
4. runs stage verification;
5. creates the mandatory critic packet;
6. invokes one isolated critic process per channel;
7. validates each JSON report;
8. synthesizes pass, revise, or block;
9. runs another builder round when allowed;
10. stops at PASS for human approval or escalates after the bounded maximum.

## 5. Discovery

Canonical base: GitHub Spec Kit.

Outputs include product constitution, clarified requirements, product specification, policy decisions, assumptions, and unresolved questions. `contracts/product.yml` and Spec Kit artifacts must remain consistent.

## 6. UX stage A — design philosophy

Canonical bases: Open Design, Pro UI Engineering, and Impeccable.

The product owner and agent discuss the design philosophy before components. The root `SOUL.md` captures:

- product essence and emotional promise;
- audience, context, trust, accessibility, and regional considerations;
- design principles with positive and negative rules;
- typography, color, shape, density, surface, icon, illustration, and image grammar;
- spring-motion, interruption, latency disclosure, and reduced-motion philosophy;
- references, anti-references, and component constitution.

Required critics:

```text
product-fit
+ design-coherence
```

Approval is blocked if `SOUL.md` is absent.

```bash
saasharness run . --stage ux-philosophy --execute
saasharness workflow approve . ux-philosophy --by "product-owner"
```

## 7. UX stage B — Pinterest research and 15-theme exploration

Pinterest is used through authorized browser research. The workflow forbids automatic scraping and source-asset copying.

Store in `artifacts/02-ux/pinterest-research.yml`:

- Pin, Board, or search URL;
- visible attribution where available;
- abstract observations about layout, type, palette, texture, shape, density, interaction, and motion;
- explicit `do_not_copy` notes.

Generate exactly 15 materially different systems for the same neutral canonical screen. This phase contains no realistic product mock data.

Routes:

```text
/__ux/themes
/__ux/themes/<theme-id>
```

Required critics:

```text
research-integrity
+ theme-diversity
+ browser-evidence
```

Human approval is explicit:

```bash
saasharness design status .
saasharness design list-themes .
saasharness design select-theme . <theme-id> --by "product-owner"
saasharness workflow approve . ux-themes --by "product-owner"
```

The source-controlled selection is required before the prototype stage.

## 8. UX stage C — modular React mock-data prototype

Using the approved `SOUL.md` and selected theme, the harness builds:

- semantic tokens;
- reusable primitives and patterns;
- feature components with public boundaries;
- page composition;
- IA and primary/recovery journeys;
- screen contracts;
- realistic mock data;
- loading, empty, error, permission, paid-limit, long-content, retry, delayed-success, interruption, responsive, and reduced-motion behavior.

The running prototype is at:

```text
/__ux/prototype
```

Required critics:

```text
experience
+ design
+ browser-evidence
```

Source review alone cannot pass this stage.

## 9. Architecture

Canonical bases: Cloudflare Templates, Spec Kit, AI SaaS Starter safety invariants, and Open SaaS capability coverage.

The stage covers frontend/backend/module boundaries, D1 or PostgreSQL+Hyperdrive, migrations, cache/freshness, identity/payment adapters, Admin/CS/privacy, queues/storage/email/realtime, latency, traces, cost, and recovery.

## 10. Plan and implementation

Plan uses Spec Kit and Superpowers. Spec Kit tasks are canonical, and product-feature WIP remains one.

Implementation uses Superpowers, attributed money-path constraints, and Impeccable UI verification. Strict RED–GREEN–REFACTOR applies to domain/API/data/auth/billing/credits/privacy and observable UI behavior. Full journeys are scenario-first.

## 11. Release

Canonical bases: OpenSpec, Cloudflare release tooling, and release critics.

```text
Preview
→ Staging
→ migration/recovery rehearsal
→ critical journeys
→ release-risk + release-evidence critics
→ human production approval
→ Production
```

## 12. Tetris pilot

The CI virtual environment exercises the new UX lifecycle with a simple playable falling-block game:

```text
approved product/UX/feature contracts
→ SOUL.md
→ 15-theme gallery
→ explicit neon-arcade theme approval
→ modular React Tetris
→ engine unit test
→ browser theme-gallery journey
→ browser move / rotate / hard-drop / restart journey
```

The pilot records public Pinterest reference URLs and abstract observations. It does not claim a live authenticated Pinterest review; that remains a real human-research responsibility.

## 13. Manual critic controls

```bash
saasharness workflow packet . ux-themes
saasharness workflow record . ux-themes research-integrity --report ./research.json
saasharness workflow record . ux-themes theme-diversity --report ./diversity.json
saasharness workflow record . ux-themes browser-evidence --report ./browser.json
saasharness workflow evaluate . ux-themes
saasharness workflow revise . ux-themes
```

## 14. Production evidence

Generated code remains blocked from production until the selected product passes real provider and operational gates: account lifecycles, payment/refund/subscription states, idempotency and replay, database race/recovery, operator journeys, deployed environment promotion, and post-release verification. The harness automates workflow and evidence collection; it does not fabricate credentials or unexecuted sandbox evidence.
