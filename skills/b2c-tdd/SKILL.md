---
name: b2c-tdd
description: Implement one B2C SaaS feature slice at a time using Superpowers-style RED-GREEN-REFACTOR, scenario-first journeys, and two-stage critique.
---

# B2C TDD Execution

Use the approved `feature.yml`, UX contract, architecture, phases, and tasks.

## Strict test-first

Required for:
- domain rules and state machines;
- API and jobs;
- database constraints, transactions, idempotency, concurrency;
- identity, authorization, billing, entitlement, credits, privacy;
- observable React behavior.

Sequence:
1. write a failing test;
2. run it and confirm the expected failure;
3. write the smallest production change;
4. run it and confirm GREEN;
5. refactor while GREEN;
6. record evidence in `artifacts/05-implementation/implementation-log.md`.

## Scenario-first

Use for complete journeys such as onboarding, payment confirmation, first value, recovery, cancellation, and actual UI → API → DB wiring.

## Exceptions

Throwaway React UX exploration, subjective visual direction, static assets, and simple configuration may use human approval or validation-first, but production behavior still needs tests before release.

## Review

After the slice is green:
- spec-compliance critic;
- code-quality critic;
- runtime-evidence critic.

Do not weaken tests or alter requirements to manufacture GREEN.
