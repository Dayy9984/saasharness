---
name: b2c-product-discovery
description: Conduct a human-in-the-loop B2C SaaS product interview and produce an approved PRD and product policy contract.
---

# Product Discovery

Ask one high-impact decision or one tightly coupled decision set at a time. Update `product.yml` and `artifacts/01-product/` after every answer.

## Required decisions

- target segment, context, problem, alternatives;
- JTBD and first value moment;
- MVP and explicit non-goals;
- monetization, price, free/paid boundary, entitlement;
- cancellation, refund, account recovery;
- market/region and identity expectations;
- data collection, retention, deletion, privacy sensitivity;
- file, background job, realtime, and AI workload needs;
- cost and scale expectations.

Do not ask the user to choose Redis, queue technology, ORM, or infrastructure internals. Translate product needs into platform choices later.

## Critic loop

Before human approval run:
- `intent`: compare the PRD with the user's original statements and decisions;
- `requirements`: find ambiguity, contradiction, untestable language, missing policy, and scope creep.

Revise only evidence-backed findings. Preserve unresolved market assumptions as experiments rather than pretending they are decisions.
