---
name: b2c-release
description: Promote a verified B2C SaaS feature through preview, staging, and production with migration, recovery, operations, and human approval.
---

# Release and Operations

## Promotion

1. Preview from the feature branch.
2. Staging with sandbox identity/payment and production-like topology.
3. Migration and recovery rehearsal.
4. Critical user journeys.
5. Release critic.
6. Human production approval.
7. Production promotion and monitoring.

Promote the same application artifact when possible. Version schema, bindings, queues, and storage contracts separately.

## Required evidence

- auth/payment mode and secrets;
- migration result and forward/rollback recovery;
- health, logs, traces, metrics, latency, errors, provider failures, and cost;
- admin/CS operations;
- privacy/export/delete behavior;
- incident and customer communication path.

## Release critics

- `release-risk`: security, data, money, migration, provider, and operational risk;
- `release-evidence`: staging journeys, configuration, recovery, dashboards, and ownership.

Production release is always human-approved.
