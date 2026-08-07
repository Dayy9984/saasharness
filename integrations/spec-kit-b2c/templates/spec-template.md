# Feature Specification: [FEATURE NAME]

**Feature ID**: `[FEATURE-ID]`  
**Status**: Draft → Critic Review → Human Approved  
**Source contracts**: `product.yml`, `ux.yml`, `feature.yml`

## 1. User and outcome

- **Target user / segment**:
- **Situation and trigger**:
- **Job to be done**:
- **Observable success**:
- **Explicit non-goals**:

## 2. User journey contract

| Step | User intent | UI action | System response | Latency feedback | Failure and recovery |
|---|---|---|---|---|---|
| 1 | | | | | |

### Required states

- [ ] loading / pending
- [ ] empty / first use
- [ ] validation error
- [ ] server or provider error
- [ ] permission / entitlement / paid limit
- [ ] retry / cancel / undo / recovery
- [ ] success and persisted return visit

## 3. Screen and interaction contract

For every affected screen record:

- purpose and entry conditions;
- information priority and primary action;
- data and events;
- keyboard, focus, semantics, and reduced-motion behavior;
- approved React mock route and fixture;
- semantic motion token (`instant`, `snappy`, `smooth`, `gentle`).

UI/UX approval requires a running React artifact. Code-only UX review is invalid.

## 4. Product and policy rules

- identity and account state:
- free / paid entitlement:
- price, refund, cancel, expiry:
- data collection, retention, export, deletion:
- Admin / CS operation:
- audit evidence:

Product policy is human-owned. The implementation may not silently change it.

## 5. Functional requirements

Use stable IDs.

- **REQ-[FEATURE]-001**: Given ... when ... then ...
- **REQ-[FEATURE]-002**: Given ... when ... then ...

## 6. Data, concurrency, and provider behavior

- module owner and public API:
- entities and invariants:
- transaction boundary:
- idempotency / duplicate / replay behavior:
- timeout / partial failure / compensation:
- cache freshness and invalidation:
- external provider reconciliation:

Feature code must not directly use protected tables or provider SDKs.

## 7. Latency and operability

Classify the behavior as immediate, synchronous, external transaction, long-running, or background.

- perceived-latency target:
- backend / provider / queue measurements:
- success, error, cancel, retry metrics:
- cost signal:
- log / trace / audit ownership:

## 8. Acceptance and verifier-owned scenarios

### Builder-visible acceptance

- [ ]

### Independent verifier scenarios

- primary golden journey:
- error / recovery journey:
- high-risk invariant when applicable:

The builder may not weaken verifier-owned evidence to obtain PASS.

## 9. Critic and human approval

Required independent channels:

- product / requirement critic;
- UX / IA / design critic with running artifact evidence;
- implementation or risk critic appropriate to the feature.

Findings require severity, evidence, impact, and confidence. P0/P1 findings block approval. Human approval is required after critic PASS.
