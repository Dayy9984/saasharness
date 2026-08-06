---
name: b2c-workflow
description: Orchestrate the complete B2C SaaS workflow from product interview through React UX approval, architecture, TDD implementation, critic loops, and release.
---

# B2C SaaS Workflow

Use this skill as the default entry point for a SaaS Harness project.

## Canonical flow

1. Product discovery and policy interview
2. PRD critique and human approval
3. IA, user journeys, screen contracts, design system, and running React mock
4. UX/design/browser critique loop and human approval
5. Architecture, module graph, folder structure, DB/cache/infra/latency plan
6. Architecture critique and human approval
7. Feature phases and tasks
8. Plan critique and human approval
9. One releaseable feature slice at a time
10. Risk-adaptive TDD or scenario-first implementation
11. Spec/code/runtime critic loop
12. Preview, staging, release evidence, release critic, human production approval

The workflow state in `.saasharness/workflow.json` is authoritative. Never skip a stage or mark it approved without the required critic channels.

## Critic-first rule

Every stage has at least two independent critic channels. Critics must not see one another's findings before synthesis. UX critics must inspect a running React mock or preview; code alone is not acceptable UX evidence.

Use:

```bash
saasharness workflow status .
saasharness workflow packet . <stage>
saasharness workflow record . <stage> <channel> --report <report.json>
saasharness workflow evaluate . <stage>
saasharness workflow revise . <stage>
saasharness workflow approve . <stage> --by "<human>"
```

## WIP limit

Only one product feature slice may be in implementation at a time. Independent evidence collection may run in parallel, but coupled UI/state/data work has one implementation owner.

## Escalation

Stop and return to the human when:
- a product policy, IA, pricing, privacy, or payment decision changes;
- P0/P1 findings remain after the configured maximum rounds;
- critics disagree on the objective or required behavior;
- a provider/module is not production-ready;
- production release is requested.
