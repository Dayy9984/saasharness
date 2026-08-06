# UI/UX, IA, Critic, and Workflow Research Validation

## External design systems

### Impeccable

Impeccable 3.5.0 is Apache-2.0 and ships design context setup, shape, critique, audit, harden, animate, live browser iteration, and deterministic anti-pattern detection. Its critique design separates an unanchored design assessment from deterministic/browser evidence before synthesis.

SaaS Harness adopts this as the default recommended external design critic, but keeps its own workflow state and report schema canonical.

### UI UX Pro Max

The upstream skill contains a searchable design-intelligence workflow for product patterns, styles, palettes, typography, UX rules, motion, and stack guidance. Open Design's catalog entry explicitly warns that the catalog-only file is not the full workflow.

SaaS Harness does not vendor or auto-enable the bundle because the repository/package and CLI documentation currently contain inconsistent license statements. It remains an optional user-installed extension after license review.

### Open Design

Open Design is Apache-2.0 and provides a broader design-artifact and skill/plugin ecosystem. SaaS Harness adopts the design-contract and skill-packaging patterns without embedding the large desktop/daemon product.

## Critic architecture

The default critic is mandatory at every stage:

- discovery: intent + requirements;
- UX/IA: experience + design + browser evidence;
- architecture: standards + operability;
- plan: scope + testability;
- implementation: spec compliance + code quality + runtime evidence;
- release: release risk + release evidence.

Independent channels reduce anchoring. UX cannot be judged from code alone. Findings need severity, evidence, impact, and confidence. P0/P1 findings block approval. Iteration is bounded and escalates to a human after the maximum rounds.

This combines independent assessment and deterministic evidence patterns from Impeccable, iterative visual refinement evidence, the product owner's requirement that critique drive every artifact and implementation stage, and DORA's warning to keep feedback fast and tests curated.

## Planning and TDD

GitHub Spec Kit supports Spec → Plan → Tasks → Implement, clarification, cross-artifact analysis, and customizable presets/extensions. Superpowers adds Socratic brainstorming, bite-sized plans, RED–GREEN–REFACTOR, task execution, and code review.

SaaS Harness ships B2C-specific internal skills rather than making these tools mandatory. Optional adapters may install upstream tools, while `product.yml`, `ux.yml`, `feature.yml`, `.saasharness/workflow.json`, and `module-lock.json` remain canonical.

## Why WIP=1 remains

DORA recommends small, independent, valuable, testable work units completed in hours to a few days, especially with AI-generated code. SaaS Harness therefore implements one observable feature slice at a time and permits only independent evidence collection in parallel.

## Validation boundary

The workflow/critic/assembler can be tested without credentials. Real production validation still requires provider credentials and sandbox tests, actual auth/payment/credits/admin modules, database race/replay/recovery, browser journeys, staging and production release drills, and three representative B2C pilots.
