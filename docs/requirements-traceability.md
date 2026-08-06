# Conversation Requirements Traceability

- **Implemented**: executable code or generated artifact exists and is covered by repository tests.
- **Implemented, external validation pending**: executable code exists, but real provider credentials, sandbox evidence, or deployed production evidence remains product-specific.
- **Partially implemented**: a material executable path remains.
- **Default-off**: intentionally excluded from the normal web path.

| Requirement from the conversation | Status | Evidence / remaining work |
|---|---|---|
| B2C SaaS-specific, not generic app generation | Implemented | B2C contracts, resolver, platform pack, artifacts, and stage recipes |
| Build from mature GitHub repositories rather than inventing most of the harness | Implemented | Exact source checkout from `upstreams.lock.json`; Cloudflare's official Vite React template seeds the project before B2C overlays |
| A source URL alone must not count as integration | Implemented | Exact checkout, sentinel doctor, local pinned installer, executable adapter, attributed port, or explicit non-integrated state is required |
| One command should assemble the upstream bases and generated SaaS | Implemented | `bootstrap --execute` syncs upstreams, seeds the project, installs required integrations, audits, builds, tests, and runs Playwright |
| Questions and documents are human-in-the-loop before execution | Implemented | Product discovery, Spec Kit B2C preset, independent stage critics, and human approvals |
| PRD, module/folder/DB structure, phase→task plan | Implemented | Generated artifacts plus Spec Kit preset templates |
| Discuss design philosophy before UI component generation | Implemented | `ux-philosophy` stage and mandatory root `SOUL.md` |
| Use SOUL.md as the base for every component and page | Implemented | Generated component constitution, stage prompt, component inventory, and approval prerequisite |
| Research multiple visual themes through Pinterest | Implemented with evidence policy | `pinterest-research.yml`, browser-research skill, URL/attribution/observation contract; automatic scraping and copied source assets are forbidden |
| Produce 15 versions of one screen for comparison | Implemented | exactly 15 unique theme systems in `theme-catalog.json`, same neutral canonical screen, unit and Playwright count checks |
| Theme variants should be browsable as a gallery and full mock | Implemented | `/__ux/themes` and `/__ux/themes/<theme-id>` |
| Design-comparison mocks must not use realistic mock data | Implemented | neutral labels and fixed same-screen skeleton in `ThemeFrame.tsx` |
| Human approval must select the theme before actual UX work | Implemented | `design select-theme` writes source-controlled approval; workflow blocks theme-stage approval without it |
| After theme approval, build modular React pages with mock data | Implemented as platform workflow | `/__ux/prototype`, semantic theme shell, component inventory, state switcher, mock feature components, `ux-prototype` stage |
| React mock-data UX/IA with human approval | Implemented | running prototype, Open Design/Pro UI/Impeccable stack, browser evidence, and human approval |
| Apple-like spring/physics and reduced motion | Implemented in UX toolkit | semantic motion rules in SOUL/skills, Pro UI guidance, reduced-motion CSS; product-specific tuning remains browser/human work |
| Precise critic in every stage | Implemented | eight-stage policy with isolated critics, JSON schema, evidence, severity, confidence, bounded repair, and human approval |
| Critic should run automatically rather than only accepting manual JSON | Implemented | `saasharness run . --execute` invokes builder, verification, each critic channel, synthesis, and repair rounds |
| Critics must be independent | Implemented | every channel is a separate process and may not read other reports before synthesis |
| UX critic must see the running experience | Implemented | theme and prototype stages require browser-evidence critics and Playwright |
| One feature fully completed before the next | Implemented | WIP=1 in workflow, Spec Kit preset, Superpowers path, and stage prompts |
| TDD based on Superpowers | Implemented and required upstream | official provider plugin remains canonical; implementation recipe enforces RED–GREEN–REFACTOR and scenario-first journeys |
| Tests themselves may be wrong and require independent review | Implemented | plan testability and implementation spec/code/runtime critics are separate from the builder |
| Test the new workflow by creating a simple Tetris in a virtual environment | Implemented | dedicated GitHub Actions `tetris-pilot`: assembly, 15-theme approval, React game, engine test, build, Wrangler dry-run, and Playwright controls |
| All agreed repositories have explicit roles and exact versions | Implemented | `upstreams.lock.json`, detached source workspaces, doctor manifest, architecture map, and notices |
| Spec Kit | Implemented as actual base | exact checkout, official local CLI, project-local B2C preset, canonical discovery/plan artifacts |
| Superpowers | Implemented as canonical provider plugin | exact checkout and provider-plugin activation contract; no competing executor is presented as Superpowers |
| Open Design | Implemented as actual design source | exact checkout and local daemon/MCP installer plan; React UX Lab is fallback/evidence surface |
| Impeccable | Implemented as required UI critic | exact checkout and local pinned package install, critic workflow, deterministic/browser evidence contract |
| Pro UI Engineering | Implemented as attributed bundle | curated B2C references copied into each generated project |
| OpenSpec | Implemented as lifecycle base | exact checkout and local CLI installer for changes after first baseline |
| GSD / get-shit-done | Implemented as optional successor base | active `open-gsd/gsd-core`; WIP=1 retained |
| AI SaaS Starter | Implemented as attributed safety-pattern port | ledger/idempotency/single-writer/webhook/refund patterns ported into Cloudflare modules |
| Open SaaS | Implemented as completeness base/reference | exact checkout covers auth/payment/email/jobs/storage/analytics/Admin/test/deploy inventory; Wasp is not forced |
| Strands Harness SDK | Optional product runtime | exact checkout and local installation only for agentic products |
| Meta-Harness | Implemented as isolated research base, default-off | exact checkout available under `all`; activation waits for pilots, search/held-out sets, and budget |
| Hermes Agent | Implemented as isolated candidate/memory base, default-off | exact checkout available under `all`; candidates cannot self-promote |
| UI UX Pro Max | Optional, license review | not cloned or installed automatically because visible license statements conflict |
| Agent Startup Kit | Not integrated, explicitly tracked | primary repository remains unavailable/404; no false attribution |
| React default, app/mobile optional | Implemented | web-only default resolver |
| Cloudflare default with escape criteria | Implemented | official template base, Workers/Assets, D1/Hyperdrive, and conditional services |
| KR Kakao, global Google | Implemented, sandbox pending | generated OIDC checks; real sandbox account lifecycle remains |
| Market-dependent payment | Implemented, sandbox pending | Stripe/Toss paths behind billing domain; recurring flows require provider-specific validation |
| Redis not default | Implemented | cache policy and runtime profile omit it |
| Billing/subscription/entitlement/credits/idempotency | Implemented, hardening pending | schema and code exist; real replay/race/refund/subscription suites remain |
| Admin/CS/audit/privacy | Implemented, operator validation pending | generated APIs, Admin UI scaffold, export/delete, and audit trail |
| Maintainable frontend/backend/UI module boundaries | Implemented | public boundaries, folder rules, source lock, protected modules, and approved-theme component inventory |
| DB model/migrations/inbox/outbox | Implemented for D1; Postgres partial | full D1 schema; Hyperdrive/PostgreSQL needs deeper transaction/recovery tests |
| Cache/freshness policy | Partially implemented | generated policy exists; product-specific runtime invalidation evidence remains |
| Local→Preview→Staging→Production | Implemented as workflow; live drill pending | generated Wrangler environments and deploy workflow; real account promotion/recovery remains |
| Feature latency and observability | Partially implemented | server timing/logs and SLO artifacts; full dashboards, cost, and field telemetry remain |
| Risk-focused verification and browser evidence | Implemented | risk router, bootstrap audit/build/test, Vitest, Playwright, and dedicated Tetris pilot |
| Self-improvement must not destabilize core | Implemented | Meta-Harness/Hermes remain behind immutable protected modules and pilot/eval prerequisites |
| Completed discovery→UX→architecture→plan→implementation→release orchestration | Implemented as executable workflow | external agent provider must be configured; the runner executes each stage with bounded repair and human approval |

## Completion statement

The repository contains an executable upstream-based B2C SaaS bootstrap and stage orchestrator. It now also enforces the requested design sequence:

```text
product discovery
→ human design-philosophy dialogue
→ SOUL.md
→ traceable Pinterest research
→ 15 same-screen design variants
→ explicit human theme selection
→ modular React mock-data prototype
→ architecture and implementation
```

The dedicated Tetris virtual-environment pilot verifies that the theme gallery, selection contract, React build, game engine, and browser controls actually run.

A generated customer SaaS is not automatically production-proven without real credentials and external systems. Remaining evidence includes Google/Kakao and Stripe/Toss lifecycle testing, D1/PostgreSQL concurrency and recovery, complete operator journeys, deployed environment promotion/recovery, and representative production pilots.
