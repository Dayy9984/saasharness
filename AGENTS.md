# AGENTS.md

## Mission

Build the complete B2C SaaS harness around a React Web + Cloudflare-first Golden Path:

```text
human product dialogue
→ PRD critique + human approval
→ React UX/IA lab critique + human approval
→ architecture/DB/folder/infra critique + human approval
→ phase/task plan critique + human approval
→ WIP=1 TDD implementation + critic
→ staging/release critic + human production approval
```

## Non-negotiable rules

1. This is a B2C SaaS harness, not a generic app generator.
2. Product policy belongs to the human; platform implementation defaults belong to the harness.
3. React web and Cloudflare are defaults. Mobile is not generated unless explicitly added later.
4. KR identity defaults to Kakao; global identity defaults to Google. Payment remains a market adapter.
5. Redis is not a default.
6. Every workflow stage requires independent critic channels and human approval.
7. UX critics must inspect a running React artifact; code-only UX review is invalid.
8. Findings need evidence, user/product impact, confidence, and severity.
9. Do not loop forever: obey stage maximum rounds and escalate unresolved P0/P1 issues.
10. Work on one releaseable feature slice at a time.
11. Use strict test-first development for domain, API, DB, auth, billing, credits, privacy, and observable UI behavior.
12. Use scenario-first tests for complete user journeys.
13. Do not weaken tests or critic evidence to obtain GREEN/PASS.
14. Keep product features behind module public boundaries.
15. Route verification by changed risk; do not run every gate on every edit.
16. Provider/module contract stubs are not production-ready.
17. Production release requires human approval, staging evidence, migration/recovery, and resolved blockers.
18. Automatic self-improvement and exhaustive UI search remain outside the core until real pilots justify them.

## Required checks

```bash
npm run check
```
