# Domain Spec: B2C SaaS Coding Harness Optimization

## Status

**Disabled by default. Research outer loop only.**

This lab follows `stanford-iris-lab/meta-harness`. It must not be activated merely because the repository can run. Activation requires the evidence listed below.

## Domain summary

- **Task**: improve the workflow around a fixed coding model as it turns an approved B2C feature specification into a verified feature slice.
- **Evaluation unit**: one approved feature slice, from Spec Kit artifacts through implementation, independent verification, and staging evidence.
- **Fixed components**:
  - base model and coding-agent version for one experiment;
  - Spec Kit artifact interface;
  - Superpowers execution and TDD interface;
  - product contracts and human-approved UX;
  - protected module APIs, evaluators, held-out tasks, permissions, credentials, and production release policy.
- **Candidate-editable components**:
  - context selection and retrieval;
  - task decomposition within WIP=1;
  - which approved skills are loaded and when;
  - critic prompts, evidence ordering, and bounded retry policy;
  - trace summaries and handoff format;
  - focused verification selection below immutable high-risk requirements.
- **Explicitly out of scope**:
  - changing product policy or approved UX;
  - changing the base model during one experiment;
  - weakening tests, evaluator code, held-out data, security boundaries, or release approval;
  - editing production identity, payment, credits, privacy, or migration logic to improve benchmark scores;
  - autonomous promotion of a candidate into production.

## Activation requirements

Do not run search until all are true:

1. at least three representative B2C pilots exist;
2. at least 30 completed feature episodes with traces exist;
3. each task has verifier-owned outcomes, not only builder-authored tests;
4. a search set and a contamination-resistant held-out set are frozen;
5. evaluation noise and flaky-test rate are measured;
6. candidate budget is explicit in dollars, tokens, wall-clock time, and candidate count;
7. the manual baseline and strongest upstream-composed baseline are recorded.

Until then, store traces and improve the harness manually.

## Candidate harness interface

```python
class CandidateHarness:
    def prepare(self, episode, artifacts, prior_experience): ...
    def run(self, fixed_agent, tool_surface, budget): ...
    def summarize(self, trajectory): ...
```

Every candidate must emit:

- selected context and skill activation log;
- plan and task graph;
- tool calls and changed files;
- tests and browser evidence;
- critic reports and revisions;
- token, latency, wall-clock, and API cost;
- final verifier result.

## Evaluation plan

### Search-set metrics

- verifier-owned feature completion;
- escaped P0/P1 defects;
- requirement-to-evidence coverage;
- lead time and wall-clock verification share;
- critic finding precision and accepted-fix rate;
- context and API cost;
- scope drift and module-boundary violations.

### Held-out metrics

Use features from different product archetypes and time periods:

1. subscription content/tool SaaS;
2. credits-based AI SaaS;
3. transactional order/payment SaaS.

A candidate must not regress any immutable payment, authorization, privacy, migration, or data-integrity condition.

### Secondary constraints

- no increase in human intervention for equivalent quality unless explicitly accepted;
- no test-specific production branches;
- no change to evaluator, permissions, credentials, or budget;
- no candidate promotion based only on search-set results.

## Baselines

1. upstream-composed baseline: Spec Kit + Superpowers + Open Design/React UX Lab + Impeccable + focused verification;
2. same baseline with critic disabled;
3. same baseline with fixed one-round critic;
4. same baseline with current hand-written context and task policies.

## Experience and logging

Store candidates under:

```text
harness-lab/runs/<experiment>/<candidate>/
├── source/
├── config.json
├── search-results.json
├── held-out-results.json
├── trajectories/
├── evidence/
└── decision.md
```

Preserve failed and rejected candidates. The proposer may read prior candidate code, scores, and traces through the filesystem, following Meta-Harness, but never the sealed held-out answers.

## Hermes option

Hermes Agent may be used as an optional proposer or persistent skill-memory backend. Its autonomous memory and skill improvement do **not** count as verified harness improvement. Any Hermes-created or revised skill is only a candidate until it passes the same search-set, held-out, cost, and human-approval process.

The production SaaS runtime must never self-modify from Hermes memory or Meta-Harness search output.

## Open questions

- frozen coding model and tool surface: `unknown`;
- minimum candidate count and budget: `unknown`;
- final held-out split: `unknown`;
- acceptable critic false-positive rate: `unknown`;
- promotion threshold versus the upstream-composed baseline: `unknown`.
