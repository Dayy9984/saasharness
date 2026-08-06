---
name: b2c-saas-platform
description: Apply the reusable B2C SaaS capability inventory and money-path safety patterns adapted from mature SaaS starters.
---

# B2C SaaS Platform Pack

Common infrastructure is versioned and reused through public module boundaries.

Open SaaS supplies the capability-completeness reference: identity, payments, email, jobs, storage, analytics, Admin, tests, and deployment. AI SaaS Starter supplies money-path rigor: append-only credits, unique idempotency, collision checks, conditional spends, compensating refunds, raw webhooks, and single-writer ownership.

Money uses integer minor units. Credits use integers. Feature code never accesses protected tables or provider SDKs directly. Webhooks tolerate duplicate/out-of-order delivery and trigger authoritative reconciliation.

The user decides market, price, entitlement, refund, privacy, workload, and scale. The harness selects the platform modules. Wasp/Prisma/Astro and Next.js/Vercel/Postgres runtimes are not copied into the Cloudflare-first default profile.
