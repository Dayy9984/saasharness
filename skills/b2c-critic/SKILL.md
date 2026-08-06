---
name: b2c-critic
description: Run mandatory independent, evidence-based critique and refinement at every B2C SaaS workflow stage.
---

# Mandatory Critic

Critique is a default workflow mechanism, not an optional final polish step.

## Principles

1. Every stage must run the channels listed in `.saasharness/critic-policy.json`.
2. Channels assess independently before synthesis to reduce anchoring.
3. Findings require observable evidence and user/product impact.
4. A critic reports symptoms and risks; it does not assert an unverified root cause.
5. P0/P1 findings block approval. P2/P3 are prioritized, not automatically blocking.
6. UX requires a running artifact. Code-only UX critique is invalid.
7. Implementation critique uses the feature/UX contract, diff, tests, and runtime evidence.
8. Release critique uses staging, migration, recovery, configuration, and operations evidence.
9. Stop at the configured maximum rounds and escalate instead of looping forever.

## Report schema

```json
{
  "stage": "ux-ia",
  "channel": "experience",
  "round": 1,
  "method": "independent",
  "verdict": "revise",
  "findings": [
    {
      "severity": "P1",
      "title": "Checkout state does not explain delayed activation",
      "evidence": "Preview video 00:18; user sees success before entitlement is confirmed",
      "impact": "Users may retry payment or distrust the product",
      "confidence": 0.92,
      "requiresHumanDecision": false
    }
  ]
}
```

## UX dual/tri-channel pattern

Adapt the proven pattern used by design critic tools:
- one unanchored product/design assessment;
- one deterministic/browser evidence assessment;
- optionally one user/task assessment.

Do not expose the first channel's findings to the others before synthesis.

## Refinement

After a revise decision, fix the smallest coherent set of issues, rerun the same task/evidence, and start the next critic round. Do not add unrelated features or redesign the product to satisfy a critic score.
