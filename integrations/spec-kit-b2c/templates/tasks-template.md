# Tasks: [FEATURE NAME]

> WIP limit: one product feature. Tasks are ordered. Behavior tests or failing scenarios precede production behavior code.

## Phase 0 · Inputs and upstream readiness

- [ ] T001 Confirm product, UX, and feature contracts are approved
- [ ] T002 Confirm `upstreams.lock.json` and `module-lock.json` versions
- [ ] T003 Verify Spec Kit preset, Superpowers, Open Design/React UX Lab, and Impeccable availability for their stages
- [ ] T004 Generate independent critic packets and preserve baseline evidence

## Phase 1 · RED / failing scenario

- [ ] T010 Write one failing domain, API, DB, or React behavior test for REQ-[ID]
- [ ] T011 Run the test and record the expected failure reason
- [ ] T012 Write one failing primary or recovery journey where the behavior crosses UI → API → DB

## Phase 2 · Minimal vertical implementation

- [ ] T020 Implement the smallest domain and persistence change through the owning module
- [ ] T021 Implement API / job behavior through public contracts
- [ ] T022 Implement the approved React states and interactions without copying prototype business logic
- [ ] T023 Add analytics, trace, latency, error, and audit evidence touched by this slice
- [ ] T024 Add Admin / CS operation only when this slice creates an operational need

## Phase 3 · GREEN and refactor

- [ ] T030 Run focused tests and obtain GREEN
- [ ] T031 Refactor while preserving GREEN and module boundaries
- [ ] T032 Run actual UI → API → DB journey
- [ ] T033 Run replay / race / refund / migration checks only when the risk router requires them

## Phase 4 · Independent critique

- [ ] T040 Run spec-compliance critic
- [ ] T041 Run code-quality critic
- [ ] T042 Run runtime / browser-evidence critic
- [ ] T043 Repair the smallest coherent set of evidence-backed P0/P1 findings
- [ ] T044 Re-run affected evidence; escalate after the configured maximum rounds

## Phase 5 · Releaseable checkpoint

- [ ] T050 Update OpenSpec change artifacts when the product baseline already exists
- [ ] T051 Verify Preview and Staging with sandbox providers
- [ ] T052 Rehearse migration and recovery when data shape changed
- [ ] T053 Human approval for production policy, payment, privacy, or irreversible change
- [ ] T054 Close the feature slice before selecting the next feature

## Completion evidence

- requirement IDs:
- RED evidence:
- GREEN evidence:
- running browser evidence:
- verifier-owned scenario results:
- critic reports:
- human approval:
- release / rollback reference:
