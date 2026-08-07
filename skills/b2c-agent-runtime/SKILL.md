---
name: b2c-agent-runtime
description: Add a production model-agnostic agent runtime only when the generated B2C SaaS product itself needs agents.
---

# Optional Product Agent Runtime

Do not add an agent SDK to an ordinary SaaS product. Activate only when `product.yml` explicitly declares agentic product behavior.

The Strands integration must provide stable model adapters, typed tools, structured output, execution/token/cost limits, hooks, traces, guardrails, steering, interrupt/cancel/resume, credential isolation, and Admin/CS visibility.

`@strands-agents/sdk` product runtime state may not replace `.saasharness/workflow.json`, which controls software development.
