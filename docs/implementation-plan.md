# Lean Harness v0.1 Implementation Plan

## Goal

Deliver an executable vertical path from approved contracts to a deterministic React + Cloudflare starter.

## Implemented increments

### I0 — Foundation

- Node 22 ESM CLI
- dependency-free harness core
- repository rules and CI

### I1 — Contracts

- `product.yml`, `ux.yml`, `feature.yml`
- approval gates
- explicit distinction between owner approval and usability evidence

### I2 — Resolver

- KR/global identity defaults
- monetization-driven module selection
- conditional Cloudflare services
- D1 / PostgreSQL + Hyperdrive escape rules
- deterministic profile hash

### I3 — Assembler

- React + Vite + Hono + Workers structure
- generated module boundaries
- module lock and architecture view
- production-readiness warnings
- web-only assertion

### I4 — Focused verification

- path-based low / medium / high / critical routing
- money/security checks only for relevant changes

## Next increments

1. Integrate real Kakao and Google identity adapters.
2. Add one KR payment adapter and one global payment adapter.
3. Implement durable order, subscription, entitlement, and credits modules.
4. Add D1 and PostgreSQL integration/race/replay tests.
5. Add verifier-owned Playwright golden journeys.
6. Add Preview → Staging → Production release automation.
7. Run three product pilots before changing critic or gate defaults.
