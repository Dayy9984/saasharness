# Conversation Requirements Traceability

- **Implemented**: executable code or generated artifact exists and is covered by repository tests.
- **Implemented, external validation pending**: executable code exists, but real provider credentials, sandbox evidence, or deployed production evidence remains product-specific.
- **Partially implemented**: a material executable path remains.
- **Default-off**: intentionally excluded from the normal web path.

| Requirement from the conversation | Status | Evidence / remaining work |
|---|---|---|
| B2C SaaS-specific, not generic app generation | Implemented | B2C contracts, resolver, platform pack, artifacts, and stage recipes |
| Build from mature GitHub repositories rather than inventing most of the harness | Implemented | `upstream-workspace.js` checks out exact commits from `upstreams.lock.json`; Cloudflare's official Vite React template seeds the project before B2C overlays |
| A source URL alone must not count as integration | Implemented | Exact checkout, sentinel doctor, local pinned installer, executable adapter, attributed source port, or explicit non-integrated state is required |
| One command should assemble the upstream bases and generated SaaS | Implemented | `bootstrap --execute` syncs upstreams, seeds the project, installs required integrations, audits, builds, tests, and runs Playwright |
| Questions and documents are human-in-the-loop before execution | Implemented | Product discovery, Spec Kit B2C preset, stage critics, and human approvals |
| PRD, module/folder/DB structure, phase→task plan | Implemented | Generated artifacts plus Spec Kit preset templates |
| React mock-data UX/IA with human approval | Implemented as platform | `/__ux`, UX stage recipe, Open Design source, Pro UI subset, Impeccable, Playwright, and human approval |
| Apple-like spring/physics and reduced motion | Implemented in UX toolkit | Bundled attributed Apple/Rauno guidance and semantic motion requirements; product-specific tuning remains browser/human work |
| Precise critic in every stage | Implemented | Six-stage policy with isolated external critic processes, JSON schema validation, evidence, severity, confidence, bounded repair, and approval |
| Critic should run automatically rather than only accepting manually authored JSON | Implemented | `saasharness run . --execute` invokes builder, verification, each critic channel, synthesis, and repair rounds |
| Critics must be independent | Implemented | Every channel is a separate process invocation and is instructed not to read other critic reports before synthesis |
| UX critic must see the running experience | Implemented | UX policy requires experience, design, and browser-evidence channels plus Playwright verification |
| One feature fully completed before the next | Implemented | WIP=1 in workflow, Spec Kit preset, Superpowers path, and stage prompts |
| TDD based on Superpowers | Implemented and required upstream | Official provider plugin remains canonical; implementation recipe enforces RED-GREEN-REFACTOR and scenario-first journeys |
| Tests themselves may be wrong and require independent review | Implemented | Plan testability critic and implementation spec/code/runtime critics are separate from the builder |
| All agreed repositories have explicit roles and exact versions | Implemented | `upstreams.lock.json`, detached source workspaces, doctor manifest, architecture map, and notices |
| Spec Kit | Implemented as actual base | Exact source checkout, official CLI from local pinned source, project-local B2C preset, canonical discovery/plan artifacts |
| Superpowers | Implemented as canonical provider plugin | Exact source checkout and provider-plugin activation contract; no competing invented executor is presented as Superpowers |
| Open Design | Implemented as actual design source | Exact source checkout and local daemon/MCP installer plan; React UX Lab is fallback/evidence surface |
| Impeccable | Implemented as required UI critic | Exact source checkout and local pinned package install, critic workflow, deterministic/browser evidence contract |
| Pro UI Engineering | Implemented as attributed bundle | Curated B2C references copied into each generated project |
| OpenSpec | Implemented as lifecycle base | Exact source checkout and local CLI installer for changes after the first approved baseline |
| GSD / get-shit-done | Implemented as optional successor base | Active `open-gsd/gsd-core` source checkout and optional local installer; WIP=1 retained |
| AI SaaS Starter | Implemented as attributed safety-pattern port | Ledger/idempotency/single-writer/webhook/refund patterns ported into Cloudflare modules, with upstream source present locally |
| Open SaaS | Implemented as completeness base/reference | Exact source checkout covers auth/payment/email/jobs/storage/analytics/Admin/test/deploy inventory; Wasp runtime is not forced |
| Strands Harness SDK | Optional product runtime | Exact source checkout and local package installation only for agentic product capabilities |
| Meta-Harness | Implemented as isolated research base, default-off | Exact source checkout available under `all`; domain spec blocks activation until pilots, search/held-out sets, and budget exist |
| Hermes Agent | Implemented as isolated candidate/memory base, default-off | Exact source checkout available under `all`; candidates cannot self-promote into production |
| UI UX Pro Max | Optional, license review | not cloned or installed automatically because visible license statements conflict |
| Agent Startup Kit | Not integrated, explicitly tracked | primary repository remains unavailable/404; no false attribution |
| React default, app/mobile optional | Implemented | web-only default resolver |
| Cloudflare default with escape criteria | Implemented | official Cloudflare template base, Workers/Assets, D1/Hyperdrive, and conditional services |
| KR Kakao, global Google | Implemented, sandbox pending | generated OIDC state/nonce/JWKS/issuer/audience/expiry code; real sandbox account lifecycle remains |
| Market-dependent payment | Implemented, sandbox pending | Stripe/Toss paths behind billing domain; KR recurring remains adapter-specific and must be verified |
| Redis not default | Implemented | cache policy and runtime profile omit it |
| Billing/subscription/entitlement/credits/idempotency | Implemented, hardening pending | schema and code exist; real replay/race/refund/subscription suites remain |
| Admin/CS/audit/privacy | Implemented, operator validation pending | generated APIs, Admin UI scaffold, export/delete, and audit trail |
| Maintainable frontend/backend/UI module boundaries | Implemented | public boundaries, folder rules, source lock, and protected modules |
| DB model/migrations/inbox/outbox | Implemented for D1; Postgres partial | full D1 schema; Hyperdrive/PostgreSQL adapter requires deeper transactions and recovery tests |
| Cache/freshness policy | Partially implemented | generated policy exists; product-specific runtime cache adapters and invalidation evidence remain |
| Local→Preview→Staging→Production | Implemented as workflow; live drill pending | generated Wrangler environments and deployment workflow; real account promotion/recovery drill remains |
| Feature latency and observability | Partially implemented | server timing/logs and SLO artifacts; full dashboards, cost attribution, and field telemetry remain |
| Risk-focused verification and browser evidence | Implemented | risk router, bootstrap audit/build/test, Vitest, and Playwright |
| Self-improvement must not destabilize core | Implemented | Meta-Harness/Hermes isolated behind immutable protected modules and pilot/evaluation prerequisites |
| Completed discovery→UX→architecture→plan→implementation→release orchestration | Implemented as executable workflow | external builder/critic command must be configured; the runner then executes each current stage with bounded repair and human approval |

## Completion statement

The repository now contains an executable upstream-based B2C SaaS bootstrap and stage orchestrator rather than only a starter generator or integration map. It checks out the agreed repositories at pinned commits, seeds the runtime from Cloudflare's official React template, invokes local pinned integrations, runs builder and independent critics, and verifies the generated project.

A specific generated SaaS is not automatically production-proven without its real credentials and external systems. Remaining evidence is Google/Kakao and Stripe/Toss lifecycle testing, D1/PostgreSQL concurrency and recovery, complete operator journeys, deployed environment promotion/recovery, and representative production pilots. These are product-environment verification gates, not missing generic workflow stages.
