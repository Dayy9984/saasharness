# AGENTS.md

## Mission

Build a thin B2C SaaS project harness around a thick, reusable React + Cloudflare Golden Path.

## Non-negotiable rules

1. Do not turn the repository into a universal platform compiler.
2. Do not add mobile output to the base profile.
3. Do not claim that contract-only provider adapters are production-ready.
4. Work on one observable feature slice at a time.
5. Use strict test-first development for domain, API, DB, auth, billing, credits, privacy, and observable UI behavior.
6. Use scenario-first tests for full user journeys.
7. Do not weaken tests to get GREEN.
8. Keep product features behind module public boundaries.
9. Route verification by changed risk; do not run every gate on every edit.
10. Keep self-improvement and exhaustive UI evaluation out of the core runtime.

## Required checks

```bash
npm run check
```
