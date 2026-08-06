# Complete SaaS Harness Workflow

## 1. Start the contracts

```bash
saasharness init ./contracts --name my-product
```

The product owner and coding agent use `b2c-product-discovery` to discuss the product. The agent updates `product.yml`; it does not ask the user to choose low-level infrastructure.

## 2. Bootstrap the React UX workspace

After the product contract is approved, UX and the first feature may still be drafts:

```bash
saasharness plan ./contracts --prototype
saasharness assemble ./contracts --out ./my-product --prototype
```

The assembler creates:

- React + Cloudflare Workers web workspace;
- selected module boundaries and `module-lock.json`;
- product, UX, architecture, plan, implementation, and release artifacts;
- workflow and critic policy;
- B2C workflow skills under `.agents/skills`;
- React UX Lab scaffold at `/__ux`;
- CI, base migration, environment/release guidance.

## 3. Run the stage workflow

```bash
cd my-product
saasharness workflow status .
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

Every stage is draft → independent critics → evaluation → revision if needed → human approval.

## 4. Run critics

Create a packet:

```bash
saasharness workflow packet . discovery
```

The active AI agent reads the packet and runs each required channel independently. It writes one JSON report per channel. Example:

```bash
saasharness workflow record . discovery intent --report ./intent.json
saasharness workflow record . discovery requirements --report ./requirements.json
saasharness workflow evaluate . discovery
```

If the decision is `revise`, update the artifact and start the next round:

```bash
saasharness workflow revise . discovery
```

If the decision is `pass`, the human approves:

```bash
saasharness workflow approve . discovery --by "product-owner"
```

The same process applies to every stage.

## 5. Build UX with a human

Open the generated app:

```bash
npm install
npm run dev
```

Visit `/__ux`. Use `b2c-ux-ia` to replace the scaffold with the real IA, journeys, screen states, visual system, copy, and spring motion.

Recommended design integration:

```bash
saasharness integrations install impeccable --provider codex --project . --execute
```

Then use Impeccable's shape/critique/audit/harden tools as additional evidence. The harness still requires its own three UX critic channels and human approval.

## 6. Approve architecture and implementation plan

The architecture stage covers:

- frontend/backend/module boundaries;
- DB model and migrations;
- cache/freshness;
- Cloudflare services and escape profile;
- identity/payment adapters;
- Admin/CS/privacy;
- latency, errors, traces, metrics, cost.

The plan stage turns one feature into phases and ordered tasks. WIP stays at one feature.

## 7. Implement with TDD

Use `b2c-tdd`.

- Strict RED–GREEN–REFACTOR for domain/API/data/auth/billing/credits/privacy and observable UI behavior.
- Scenario-first for full journeys.
- Record RED/GREEN/runtime evidence.
- Run focused checks selected by:

```bash
saasharness risk <changed-files...>
```

Before implementation approval, run spec-compliance, code-quality, and runtime-evidence critics.

## 8. Release

Use `b2c-release`.

```text
Preview
→ Staging
→ migration/recovery rehearsal
→ critical journeys
→ release critics
→ human production approval
→ Production
```

A generated project remains blocked from production while provider/module warnings exist.
