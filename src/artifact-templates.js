import { CRITIC_POLICY, initialWorkflowState } from './workflow.js';

function quote(value) {
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function stageChecklist(stage) {
  const policy = CRITIC_POLICY[stage];
  return policy.channels.map((channel) => `- [ ] Independent critic channel: \`${channel}\``).join('\n');
}

export function workflowArtifactFiles(plan) {
  const state = initialWorkflowState(plan.profileHash);
  const product = plan.product;
  const feature = plan.feature;
  return {
    '.saasharness/workflow.json': `${JSON.stringify(state, null, 2)}\n`,
    '.saasharness/critic-policy.json': `${JSON.stringify(CRITIC_POLICY, null, 2)}\n`,
    '.saasharness/integrations.json': `${JSON.stringify({
      design: {
        default: ['internal-b2c-ux-ia', 'internal-b2c-critic'],
        recommended: ['impeccable'],
        optional: ['ui-ux-pro-max', 'open-design'],
      },
      planning: { recommended: ['spec-kit', 'superpowers'] },
    }, null, 2)}\n`,

    'artifacts/01-product/prd.md': `# Product Requirements · ${product.name}

> Human-in-the-loop artifact. Do not approve until the user has reviewed every product decision.

## Problem and target user

- Target market: \`${product.region}\`
- User problem:
- Current alternatives:
- Why now:

## Product promise

- Primary job to be done:
- First value moment:
- Success signal:
- Explicit non-goals:

## Business and policy

- Monetization: \`${product.monetization}\`
- Free/paid boundary:
- Entitlements:
- Refund/cancel policy:
- Data collection and retention:

## MVP feature queue

1. ${feature.name}
2.
3.

## Assumptions and experiments

| Assumption | Evidence | Status | Next test |
|---|---|---|---|
| | | unknown | |

## Required critic before approval

${stageChecklist('discovery')}
`,
    'artifacts/01-product/policies.yml': `version: 1
region: ${product.region}
monetization: ${product.monetization}
identity:
  providers: ${JSON.stringify(plan.moduleLock.adapters.identity.map((item) => item.provider))}
payment:
  provider: ${quote(plan.moduleLock.adapters.payment?.provider ?? 'none')}
privacy:
  pii_level: basic
  retention_days: 365
  deletion: full-delete
release:
  production_requires_human_approval: true
`,

    'artifacts/02-ux/ia.md': `# Information Architecture · ${product.name}

> Build and review this as a running React mock, not as prose alone.

## User mental model

- Top-level objects:
- Primary navigation:
- Secondary navigation:
- Search/browse model:
- Account, billing, help, and recovery locations:

## Sitemap

\`\`\`text
/
├── ...
\`\`\`

## Navigation rules

- Predictable back behavior:
- Deep-link behavior:
- Auth and entitlement boundaries:
- Empty-state destination:
`,
    'artifacts/02-ux/journeys.md': `# User Journeys

## Primary journey · ${plan.ux.journey}

**Goal:**

**Entry state:**

| Step | User intent | UI action | System response | Latency feedback | Error/recovery |
| 1 | | | | | |

## Required B2C journeys

- [ ] Sign up / sign in
- [ ] Onboarding and first value
- [ ] Upgrade or payment
- [ ] Paid entitlement becomes visible
- [ ] Return visit
- [ ] Cancel / refund / account recovery when applicable
`,
    'artifacts/02-ux/screen-contracts.yml': `version: 1
screens:
  - id: SCREEN-001
    route: /
    purpose: ""
    entry_conditions: []
    primary_action: ""
    states: [loading, empty, ready, error, permission, paid-limit]
    data: []
    events: []
    accessibility:
      initial_focus: ""
      focus_return: ""
    motion:
      token: smooth
      meaning: spatial-continuity
`,
    'artifacts/02-ux/design-system.md': `# B2C UI System Contract

## Default foundation

- Clean, highly legible, conventional B2C SaaS hierarchy
- Familiar navigation, onboarding, billing, account, support, and recovery patterns
- Accessible contrast, focus, keyboard operation, and reduced motion
- Responsive behavior completed in the running React mock before production implementation
- Practical component treatment only; no novelty theme or IA change without an explicit product decision

## Approved product-specific treatment

- Product character:
- Density:
- Surface treatment:
- Button treatment:
- Accent role:
- Trust considerations:
- Approved treatment ID:
- References and anti-references:

## Foundation tokens

- Color roles:
- Typography:
- Spacing and density:
- Radius and elevation:
- Focus treatment:
- Icon language:
- Responsive behavior:

## Motion semantics

| Token | Use | Spring intent | Reduced-motion fallback |
|---|---|---|---|
| instant | press feedback | fast critically damped | none/opacity |
| snappy | tabs, toggles | slight physical response | short fade |
| smooth | modal, sheet, layout | gentle settling | fade |
| gentle | onboarding emphasis | low-frequency delight | no movement |

## React mock approval

- Mock URL:
- Required pages complete:
- Fixture set:
- Primary journey exercised:
- Recovery journey exercised:
- Responsive behavior reviewed by human:
- Reduced-motion reviewed:
- Product-owner approval:
- Target-user evidence:
- Automated browser scope: route and interaction smoke only

## Required critic before approval

${stageChecklist('ux-prototype')}
`,

    'artifacts/03-architecture/module-graph.md': `# B2C Module Graph

## Selected modules

${plan.modules.map((module) => `- \`${module}\``).join('\n')}

## Rules

- Product features call module public APIs only.
- Identity, billing, entitlement, credits, privacy, and audit own their protected tables.
- Provider adapters may vary by market without changing product-domain APIs.
- Each module declares transactions, idempotency, observability, admin/support operations, and rollback.
`,
    'artifacts/03-architecture/folder-structure.md': `# Maintainable Folder Structure

\`\`\`text
src/
├── react/
│   ├── app/
│   ├── features/<feature>/{components,state,api,schemas,events,tests}
│   └── ui/{primitives,patterns,forms,feedback,layout,motion,tokens}
├── worker/
│   ├── routes/
│   └── middleware/
├── modules/<domain>/{public,commands,queries,policies,repositories,events,schema,tests}
└── generated/
\`\`\`

Cross-feature imports must use a feature's public boundary. Direct provider SDK and protected database access are forbidden from feature code.
`,
    'artifacts/03-architecture/db-model.md': `# Database Model

- Selected profile: \`${plan.moduleLock.adapters.database.provider}\`

## Modeling rules

- Module-owned tables
- FK, UNIQUE, CHECK, and NOT NULL constraints by default
- Integer minor units for money and integer credits
- Append-only ledger for credits and financial adjustments
- Inbox de-duplication for external events
- Outbox/durable job for asynchronous side effects
- Applied migrations are immutable
- Expand → backfill → compatible rollout → contract

## Entities

| Entity | Owner module | Primary key | Invariants | Retention |
|---|---|---|---|---|
| user | identity | | | |
`,
    'artifacts/03-architecture/cache-policy.md': `# Cache and Freshness Policy

| Data class | Default policy | Invalidation | Consistency |
|---|---|---|---|
| Public marketing content | edge/CDN | deploy/tag | eventual |
| User-private data | private/no-store | authoritative write | read-your-writes |
| Balance/subscription/entitlement | authoritative | domain event | strict |
| Aggregates | async + TTL | rebuild | eventual |
| Immutable generated files | object storage + metadata | versioned | immutable |

Redis is not a default dependency. Add it only when a concrete protocol or cross-platform shared-state requirement cannot be met by the selected platform services.
`,
    'artifacts/03-architecture/infra-profile.md': `# Infrastructure and Environments

- Preferred platform: Cloudflare
- Services: ${plan.cloudflare.map((service) => `\`${service}\``).join(', ')}
- Database: \`${plan.moduleLock.adapters.database.provider}\`

## Environments

| Environment | Identity/payment | Data | Release |
|---|---|---|---|
| Local | fixture/sandbox | synthetic | developer |
| Preview | sandbox | isolated | PR |
| Staging | sandbox, production-like | test | automated promotion |
| Production | live | real | human approval |

## Escape conditions

Use PostgreSQL + Hyperdrive or an external backend when write throughput, relational complexity, database size, strict consistency, compliance, or long CPU work exceed the Cloudflare default profile.
`,
    'artifacts/03-architecture/latency-slo.md': `# Feature Latency and Observability

## Interaction classes

| Class | Examples | Measure |
|---|---|---|
| Immediate | press, toggle | input → visual response |
| Synchronous | save, search | input → usable completion |
| External transaction | OAuth, checkout | initiation and confirmed state separately |
| Long-running | AI generation, export | acknowledgement, queue, execution, completion |
| Background | webhook, email | freshness and failure rate |

For each feature generate trace spans, latency histograms, success/error/cancel metrics, provider latency, queue delay, cost, and an SLO draft tied to the user goal.
`,

    'artifacts/04-plan/phases.md': `# Implementation Phases

## Phase 0 · Approved foundations

- Product and complete React UX artifacts approved
- Architecture critic passed
- Module and provider blockers visible

## Phase 1 · Current releaseable slice

- Feature: \`${feature.name}\`
- Requirement ID: \`${feature.id}\`
- WIP limit: 1
- Target duration: hours to a few days

## Phase 2 · Integration and release

- Actual UI → API → DB wiring
- Focused regression
- Staging evidence
- Release decision
`,
    'artifacts/04-plan/tasks.md': `# Tasks · ${feature.name}

> Tasks are ordered. Tests/scenarios precede production behavior code.

- [ ] T001 Confirm feature contract, non-goals, and critic inputs
- [ ] T002 Write RED test or failing user scenario
- [ ] T003 Implement the smallest domain/API/data change
- [ ] T004 Implement approved React behavior and states
- [ ] T005 Verify actual UI → API → DB wiring
- [ ] T006 Run risk-routed checks
- [ ] T007 Run mandatory implementation critics
- [ ] T008 Repair evidence-backed P0/P1 findings
- [ ] T009 Run staging journey and update runbook
`,
    'artifacts/04-plan/test-strategy.md': `# Risk-Adaptive Test Strategy

- Strict RED → GREEN → REFACTOR: domain, API, DB, auth, billing, credits, privacy, observable UI behavior
- Scenario-first: signup, onboarding, payment completion, first value, recovery
- Human-approved exception: throwaway UX mock and subjective component-treatment exploration
- Complete UI, IA, user flow, and responsive behavior in the React mock before implementation
- Builder tests plus verifier-owned golden journeys
- Do not weaken tests to obtain GREEN
- Prefer a small reliable suite over a large brittle suite
- Do not add fixed viewport matrices, screenshot gates, or visual-score loops by default

## Required critic before approval

${stageChecklist('plan')}
`,

    'artifacts/05-implementation/implementation-log.md': `# Implementation Evidence Log

| Task | RED evidence | GREEN evidence | Diff | Runtime evidence | Critic decision |
|---|---|---|---|---|---|
| | | | | | |

## Required implementation critic inputs

- Feature and UX contract
- Git diff
- Test output
- Running preview
- Browser/network/console evidence
- Latency and error signals
`,
    'artifacts/06-release/release-plan.md': `# Release Plan

## Promotion

Local → Preview → Staging → Production

- Promote the same application artifact with environment-specific configuration.
- Version schema/bindings separately.
- Rehearse migration and recovery in staging.
- Production requires human approval.

## Release evidence

- [ ] Critical journeys
- [ ] Auth/payment sandbox
- [ ] Migration rehearsal
- [ ] Rollback or forward-recovery procedure
- [ ] Secrets and provider mode
- [ ] Error, latency, and cost dashboards
`,
    'artifacts/06-release/runbook.md': `# Operations Runbook

## Health and ownership

- Health endpoint:
- Dashboard:
- On-call/owner:
- Admin and CS surface:

## Common incidents

| Incident | Detection | Immediate action | Recovery | Customer communication |
|---|---|---|---|---|
| OAuth failure | | | | |
| Payment event delayed/duplicated | | | | |
| Credit mismatch | | | | |
| Queue backlog | | | | |

## Production blockers

${plan.warnings.map((warning) => `- **${warning.code}**: ${warning.message}`).join('\n')}
`,
  };
}
