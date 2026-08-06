---
name: b2c-context-execution
description: Execute long B2C SaaS work with GSD-style fresh contexts, durable state, resume/recovery, and one-feature-at-a-time ownership.
---

# Fresh-context B2C Execution

Adapt GSD Core's fresh-context and durable-state discipline without importing parallel product-feature waves.

Keep `.saasharness/workflow.json`, `.saasharness/execution/STATE.md`, `.saasharness/execution/CONTEXT.md`, and the implementation evidence log current. The chat transcript is not the source of truth.

Each fresh job receives objective/requirement IDs, approved UX/architecture, exact write scope, relevant files, RED scenario, checks, critic evidence, rollback point, and stop conditions.

```text
discuss → plan a context-sized task → execute fresh
→ verify → update durable state → critic → ship or repair
```

Product-feature WIP remains 1. Only independent read-only research, tests, assets, and critic channels may run in parallel. After repeated failure, record evidence, return to the last green commit, reduce the seam, and escalate disputed product/critic objectives.
