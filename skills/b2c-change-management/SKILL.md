---
name: b2c-change-management
description: Manage post-baseline B2C SaaS changes with an OpenSpec-style explore, propose, delta-spec, design, tasks, apply, verify, and archive lifecycle.
---

# B2C Living Change Management

Use this skill only after the initial product, UX, architecture, and first feature baseline are approved.

## Canonical authority

- `product.yml` owns product policy.
- `ux.yml` owns approved UX intent.
- `feature.yml` owns the current WIP=1 slice.
- `.saasharness/workflow.json` owns stage and critic state.
- A change folder records a delta; it does not silently rewrite those authorities.

## Lifecycle

```text
explore → proposal → requirement delta/scenarios → design → tasks
→ critic + human approval → apply with TDD → runtime verification
→ archive and update the approved baseline
```

Separate `ADDED`, `MODIFIED`, and `REMOVED` requirements. Product policy, price, entitlement, privacy, IA, and provider changes require human approval. When upstream OpenSpec is installed, map its artifacts into the SaaS Harness workflow rather than maintaining a competing approval state.
