# Implementation Plan: [FEATURE NAME]

**Spec**: `[SPEC PATH]`  
**Golden Path**: React Web + Cloudflare-first  
**Execution host**: upstream Superpowers  
**Living change host after baseline**: upstream OpenSpec

## 1. Reuse before invention

List the upstream or versioned module used for every repeated concern.

| Concern | Upstream / module | Version or commit | Reused artifact | Custom code justification |
|---|---|---|---|---|
| specification | GitHub Spec Kit + saasharness-b2c preset | | spec / plan / tasks | B2C-only template sections |
| implementation | obra/superpowers | | TDD, debugging, review | provider bridge only |
| design generation | Open Design | | DESIGN.md / prototype engine | product-specific design contract |
| UI critique | Impeccable | | critique / audit / harden | B2C evidence schema |
| living change | OpenSpec | | proposal / apply / archive | artifact mapping only |
| money path | ai-saas-starter source port | | ledger / idempotency / tests | Cloudflare adaptation |

No repeated infrastructure may be reimplemented without an explicit reason.

## 2. Architecture and module boundaries

- frontend feature boundary:
- reusable UI primitives and patterns:
- backend domain module and `public.ts`:
- protected persistence owner:
- provider adapter:
- Admin / CS surface:
- analytics and audit events:

Cross-feature imports use public boundaries only.

## 3. Data and migrations

- selected database profile and escape rationale:
- tables, keys, constraints, and indexes:
- transaction / single-writer boundary:
- inbox / outbox / ledger requirements:
- expand → backfill → compatible rollout → contract plan:
- recovery or compensating migration:

## 4. Platform and environments

- Cloudflare services activated by product capability:
- Local:
- Preview:
- Staging:
- Production:
- sandbox / live provider separation:
- secrets and human release approval:

Cloudflare-first is a default, not an absolute. Record the escape condition if PostgreSQL, another backend, or external compute is required.

## 5. UX implementation handoff

- approved React mock route / commit:
- screen contracts and fixture states:
- visual references / anti-references:
- motion semantics and reduced-motion fallback:
- implementation drift comparison:

Prototype code is not production code. Promote contracts, tokens, fixtures, copy, and journey evidence—not untested business logic.

## 6. Test and critic strategy

### Strict test-first

Domain, API, DB, identity, authorization, billing, entitlement, credits, privacy, and observable UI behavior.

### Scenario-first

Complete user journeys and actual UI → API → DB wiring.

### Human-approved exploration

Throwaway UX prototype, subjective visual direction, and motion exploration.

### Independent verification

- builder-visible tests:
- verifier-owned golden / recovery journeys:
- high-risk replay / race / refund / migration tests:
- mandatory critic channels:

## 7. Performance and operations

- interaction latency class:
- trace and metric names:
- provider and queue latency:
- error, cancellation, retry, and cost:
- dashboard / Admin / CS evidence:
- release and incident owner:

## 8. WIP=1 delivery sequence

Finish one observable vertical slice before selecting the next. Parallel work is limited to independent evidence or non-conflicting support tasks.

## 9. Approval

- [ ] Spec Kit analyze / checklist complete
- [ ] architecture critic PASS
- [ ] testability critic PASS
- [ ] product owner approved irreversible choices
