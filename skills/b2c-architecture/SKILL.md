---
name: b2c-architecture
description: Turn approved product and UX contracts into maintainable frontend, backend, data, cache, infrastructure, policy, and latency architecture.
---

# B2C Architecture

Generate and review:

- module graph and provider adapters;
- frontend feature/public boundaries and reusable UI layers;
- backend domain/public boundaries and transaction ownership;
- DB entities, constraints, indexes, migrations, inbox/outbox, ledgers;
- cache/freshness/consistency policy;
- local, preview, staging, and production environments;
- Cloudflare-first services and explicit escape criteria;
- identity and market-specific payment adapters;
- Admin, CS, audit, privacy, export, deletion;
- trace, metric, log, latency, error, queue, provider, and cost signals.

## Defaults

- React web target.
- Cloudflare-first.
- KR identity defaults to Kakao; global identity defaults to Google.
- Payment provider remains market-selectable behind a stable billing domain.
- Redis is not a default dependency.
- Mobile is not generated unless explicitly added as a future target.

## Critic loop

- `standards`: security, accessibility, data integrity, concurrency, provider isolation, maintainability;
- `operability`: environments, release, migration, recovery, admin/CS, observability, latency and cost.

Architecture approval is human-in-the-loop. The critic may identify gaps but must not silently change product policy.
