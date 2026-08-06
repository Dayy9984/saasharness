# Architecture

## Goal

A user approves product policy, a running React UX contract, and one feature slice. The harness then assembles a deterministic React + Cloudflare starter and provides a constrained TDD / scenario-first implementation path.

## Core runtime

1. **Contract loader** — reads `product.yml`, `ux.yml`, and `feature.yml`.
2. **Approval validator** — blocks assembly before product, UX, and feature approval.
3. **Product resolver** — chooses region defaults, modules, Cloudflare services, and the DB profile.
4. **Module registry** — records reusable module and adapter versions.
5. **Starter assembler** — creates a web-only React + Workers workspace and `module-lock.json`.
6. **Risk router** — chooses focused checks from changed paths.

## Deliberate limits

- No mobile target in v0.1.
- No universal policy compiler.
- No live Kakao, Google, or payment provider implementation.
- No automatic self-improvement.
- No exhaustive viewport or hidden-eval runtime.

## Product resolver rules

- KR identity defaults to Kakao; global defaults to Google.
- Monetized products activate billing and entitlement modules.
- Credits and subscription modules follow the monetization model.
- Queues, R2, and Durable Objects activate only when product capabilities require them.
- D1 is the default data profile; high scale, relational complexity, strict consistency, write-heavy workloads, or compliance constraints escape to PostgreSQL + Hyperdrive.

## Production boundary

The generated starter exposes module `public.ts` boundaries. Those files are contracts, not complete provider implementations. Production release must remain blocked until the selected auth and payment adapters have passed sandbox/live validation, replay/recovery tests, and operator review.
