# Complete Upstream-Composed SaaS Harness Workflow

## 1. Create and approve the product contract

```bash
saasharness init ./contracts --name my-product
```

The product owner and coding agent complete `product.yml`. Market, pricing, entitlement, privacy, and product intent remain human-owned. Low-level infrastructure is resolved after product approval.

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

1. creates a temporary pinned checkout of `cloudflare/templates`;
2. copies its official `vite-react-template` into the destination;
3. overlays the B2C platform, contracts, modules, skills, tests, workflow state, and evidence rules;
4. checks out the selected upstream profile into `.saasharness/sources/`;
5. runs the official Spec Kit initializer with the included B2C preset;
6. installs the pinned Impeccable project integration;
7. records source commits and runs the upstream doctor.

Use `core`, `lifecycle`, or `all` depending on whether living-change, long-context, product-agent, Meta-Harness, and Hermes sources are required.

## 3. Configure the external coding-agent processes

```bash
saasharness agent init . --provider external-agent-cli
```

Edit `.saasharness/agent.json`, or set:

```bash
export SAASHARNESS_BUILDER_COMMAND_JSON='["agent-cli","...","-"]'
export SAASHARNESS_CRITIC_COMMAND_JSON='["agent-cli","...","-"]'
```

Commands are argv arrays, not shell strings. The stage prompt is passed through stdin. Builder and critics run in separate processes.

## 4. Execute the current stage

```bash
saasharness run . --execute
```

Stages:

```text
discovery
→ ux-ia
→ architecture
→ plan
→ implementation
→ release
```

For each stage the runner:

1. reads the current human-approved contracts and workflow state;
2. generates a stage prompt naming the canonical local upstream checkouts;
3. invokes the builder process;
4. runs stage verification;
5. creates the mandatory critic packet;
6. invokes one isolated critic process per required channel;
7. validates each JSON report against the critic schema;
8. synthesizes pass, revise, or block;
9. runs another builder round when revision is allowed;
10. stops at PASS for human approval, or escalates after the bounded maximum.

## 5. Human approval

```bash
saasharness workflow approve . discovery --by "product-owner"
```

Approval never comes from the builder or critic process. The current stage advances only after the required critic decision is `pass` and the human approves it.

## 6. Stage ownership

### Discovery

Canonical base: GitHub Spec Kit.

Outputs include product constitution, clarified requirements, product specification, policy decisions, assumptions, and unresolved questions. `contracts/product.yml` and Spec Kit artifacts must remain consistent.

### UX / IA

Canonical bases: Open Design, Pro UI Engineering, Impeccable, React UX Lab.

The deliverable is a running React experience, not a static document. It must include realistic fixtures, recovery paths, paid limits, interruption, long content, responsiveness, accessibility, spring motion, and reduced-motion behavior.

Required independent channels:

```text
experience
+ design
+ browser-evidence
```

### Architecture

Canonical bases: Cloudflare Templates, Spec Kit, AI SaaS Starter safety invariants, and Open SaaS capability coverage.

The stage covers frontend/backend/module boundaries, D1 or PostgreSQL+Hyperdrive, migrations, cache/freshness, identity/payment adapters, Admin/CS/privacy, queues/storage/email/realtime, latency, traces, cost, and recovery.

### Plan

Canonical bases: Spec Kit and Superpowers.

Spec Kit tasks are canonical. Product-feature WIP remains one. Tasks include exact paths, dependencies, acceptance, RED evidence, migration, rollback, critic, and runtime verification.

### Implementation

Canonical base: Superpowers, with attributed AI SaaS Starter money-path constraints and Impeccable UI verification.

Strict RED-GREEN-REFACTOR applies to domain/API/data/auth/billing/credits/privacy and observable UI behavior. Full journeys are scenario-first. Tests may not be weakened to obtain GREEN.

### Release

Canonical bases: OpenSpec, Cloudflare release tooling, and independent release critics.

```text
Preview
→ Staging
→ migration/recovery rehearsal
→ critical journeys
→ release-risk + release-evidence critics
→ human production approval
→ Production
```

## 7. Upstream maintenance

```bash
saasharness upstreams sync . --profile all --execute
saasharness upstreams doctor . --profile all
```

All source workspaces are detached at exact commits from `upstreams.lock.json`. No floating default branch is accepted. `upstream-sources.json` records expected and actual commits.

## 8. Manual critic controls

The automated runner uses the same public workflow primitives:

```bash
saasharness workflow packet . ux-ia
saasharness workflow record . ux-ia experience --report ./experience.json
saasharness workflow record . ux-ia design --report ./design.json
saasharness workflow record . ux-ia browser-evidence --report ./browser.json
saasharness workflow evaluate . ux-ia
saasharness workflow revise . ux-ia
```

## 9. Production evidence

Generated code remains blocked from production until the selected product passes its real provider and operational gates. These include account lifecycles, payment/refund/subscription states, idempotency and replay, database race/recovery, operator journeys, deployed environment promotion, and post-release verification. The harness automates the workflow and evidence collection; it does not fabricate credentials or claim unexecuted sandbox evidence.
