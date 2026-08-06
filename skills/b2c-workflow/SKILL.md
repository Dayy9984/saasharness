---
name: b2c-workflow
description: Orchestrate the complete B2C SaaS workflow from product interview through React UX approval, architecture, TDD implementation, critic loops, and release.
---

# B2C SaaS Workflow

## Canonical flow

1. Product discovery and policy interview
2. Spec Kit PRD/spec critique and human approval
3. IA, journeys, screen contracts, design system, and running React mock
4. Open Design/Pro UI candidate generation, Impeccable/browser critics, human UX approval
5. Architecture, module graph, folder structure, DB/cache/infra/latency plan
6. Architecture critique and human approval
7. Feature phases and tasks
8. Plan critique and human approval
9. One releaseable feature slice at a time
10. Superpowers-style TDD or scenario-first implementation
11. Spec/code/runtime critic loop
12. Preview, staging, release evidence, release critic, human production approval
13. OpenSpec living changes after the approved baseline

`.saasharness/workflow.json` is authoritative. Do not run overlapping upstream state machines as independent authorities.

## Upstream responsibility

- Spec Kit: initial artifact grammar and agent adapters.
- Superpowers: normal small-batch TDD/debug/review.
- Open Design: running design artifact engine.
- Pro UI Engineering: bundled candidate visual systems and spring physics.
- Impeccable: required independent UI critique and hardening.
- OpenSpec: post-baseline change deltas.
- GSD Core: optional fresh-context recovery for unusually long phases.
- Open SaaS + AI SaaS Starter: completeness coverage and money-path safety.
- Strands Harness SDK: optional only when the product itself is agentic.
- Meta-Harness/Hermes: isolated research lab after pilots.

## Critic-first rule

Every stage has independent critic channels. UX critics inspect a running React mock or Preview; code alone is not acceptable evidence.

## WIP and escalation

Product-feature WIP is 1. Independent evidence may run in parallel, but coupled UI/state/data work has one implementation owner.

Stop and return to the human when product policy, IA, pricing, privacy, or payment changes; P0/P1 findings remain after maximum rounds; critics dispute the objective; a module is not production-ready; or production release is requested.
