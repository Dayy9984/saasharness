# Conversation Requirements Traceability

- **Implemented**: executable code or generated artifact exists and is covered by repository tests.
- **Implemented, external validation pending**: executable code exists, but real provider credentials, sandbox evidence, or deployed production evidence remains product-specific.
- **Partially implemented**: a material executable path remains.
- **Default-off**: intentionally excluded from the normal web path.

| Requirement from the conversation | Status | Evidence / remaining work |
|---|---|---|
| B2C SaaS-specific, not generic app generation | Implemented | B2C contracts, resolver, platform pack, artifacts, and stage recipes |
| Build from mature GitHub repositories rather than inventing most of the harness | Implemented | Exact source checkout from `upstreams.lock.json`; Cloudflare official React template seeds the project before B2C overlays |
| One command should assemble upstream bases and generated SaaS | Implemented | `bootstrap --execute` syncs upstreams, seeds, installs, audits, builds, tests, and browser-smoke-verifies |
| Questions and documents are human-in-the-loop before execution | Implemented | Product discovery, Spec Kit B2C preset, independent stage critics, and human approvals |
| PRD, module/folder/DB structure, phase→task plan | Implemented | Generated artifacts plus Spec Kit preset templates |
| Discuss UI foundation before component generation | Implemented | `ux-philosophy` stage and mandatory root `SOUL.md` |
| SOUL.md should be practical rather than an oversized brand manifesto | Implemented | Lightweight clean-B2C foundation, product-specific density/surface/button/motion/trust decisions, and component rules |
| Clean Apple/Linear/Miro/Stripe/Notion-like product quality should be the default | Implemented as principles | Standard Clean default plus reference principles; copying distinctive brand identity is forbidden |
| Compare 15 versions of one screen | Implemented | Exactly 15 unique treatment variants in `theme-catalog.json`; same standard screen and same flow |
| Variants should change useful UI treatment, not become artistic themes | Implemented | Allowed axes are buttons, selected glass controls, surfaces, density, radius, accent, focus, and motion; novelty themes are prohibited by default |
| Apple-like glass buttons may be selectable | Implemented | `apple-glass-controls` treatment uses selective translucent controls without changing IA |
| Public/Pinterest research should be traceable and anti-copy | Implemented with evidence policy | URL/observation contract; scraping and copied source assets are forbidden |
| Design-comparison candidates must be browsable as gallery and detail pages | Implemented | `/__ux/themes` and `/__ux/themes/<theme-id>` |
| Design-comparison candidates should not use realistic product mock data | Implemented | neutral fixed screen skeleton in `ThemeFrame.tsx` |
| Human selects treatment before actual UX work | Implemented | `design select-theme` writes source-controlled approval; workflow blocks the next stage without it |
| After treatment approval, build all modular React pages with realistic mock data | Implemented as platform workflow | `/__ux/prototype`, component inventory, state fixtures, IA/journey/screen artifacts, and `ux-prototype` stage |
| Responsive behavior is completed and approved in the React mock | Implemented as human-owned requirement | UX contract and SOUL require responsive completion before implementation |
| Do not add 390/1440/1920 or screenshot gates | Implemented | explicit viewport assertions, overflow gate, screenshot capture, and CI artifact upload removed; browser checks are route/interaction smoke only |
| React mock-data UX/IA with human approval | Implemented | running prototype, Open Design/Pro UI/Impeccable stack, critics, and human approval |
| Apple-like spring/physics and reduced motion | Implemented in UX toolkit | semantic motion rules, Pro UI guidance, reduced-motion CSS; product-specific tuning remains browser/human work |
| Precise critic in every stage | Implemented | eight-stage policy with isolated critics, JSON schema, evidence, severity, confidence, bounded repair, and human approval |
| Critics must run automatically and independently | Implemented | `saasharness run . --execute` spawns isolated builder/critic processes and synthesizes reports |
| UX critic must see the running experience | Implemented | treatment and prototype stages require browser-evidence critics and Playwright smoke |
| One feature fully completed before the next | Implemented | WIP=1 in workflow, Spec Kit preset, Superpowers path, and stage prompts |
| TDD based on Superpowers | Implemented and required upstream | official provider plugin remains canonical; implementation recipe enforces RED–GREEN–REFACTOR and scenario-first journeys |
| Tests themselves may be wrong and require independent review | Implemented | plan testability and implementation spec/code/runtime critics are separate from the builder |
| Test the workflow with a simple Tetris | Implemented | dedicated GitHub Actions pilot: assembly, treatment selection, React game, engine test, build, Wrangler dry-run, and interaction smoke |
| Tetris pilot should not be treated as UI quality proof | Implemented | pilot validates workflow and gameplay only; viewport/screenshot quality claims removed |
| All agreed repositories have explicit roles and exact versions | Implemented | `upstreams.lock.json`, detached source workspaces, doctor manifest, architecture map, and notices |
| Spec Kit | Implemented as actual base | exact checkout, official local CLI, project-local B2C preset, canonical discovery/plan artifacts |
| Superpowers | Implemented as canonical provider plugin | exact checkout and provider-plugin activation contract |
| Open Design | Implemented as actual design source | exact checkout and local daemon/MCP installer plan; React UX Lab is fallback/evidence surface |
| Impeccable | Implemented as required UI critic | exact checkout and local pinned package install, critic workflow, deterministic/browser evidence contract |
| Pro UI Engineering | Implemented as attributed bundle | curated B2C references copied into each generated project |
| OpenSpec | Implemented as lifecycle base | exact checkout and local CLI installer for changes after first baseline |
| GSD / get-shit-done | Implemented as optional successor base | active `open-gsd/gsd-core`; WIP=1 retained |
| AI SaaS Starter | Implemented as attributed safety-pattern port | ledger/idempotency/single-writer/webhook/refund patterns ported into Cloudflare modules |
| Open SaaS | Implemented as completeness base/reference | exact checkout covers Auth/payment/email/jobs/storage/analytics/Admin/test/deploy inventory |
| Strands Harness SDK | Optional product runtime | exact checkout and local installation only for agentic products |
| Meta-Harness | Implemented as isolated research base, default-off | activation waits for pilots, search/held-out sets, and budget |
| Hermes Agent | Implemented as isolated candidate/memory base, default-off | candidates cannot self-promote |
| React default, app/mobile optional | Implemented | web-only default resolver |
| Cloudflare default with escape criteria | Implemented | official template base, Workers/Assets, D1/Hyperdrive, and conditional services |
| KR Kakao, global Google | Implemented, sandbox pending | generated OIDC checks; real sandbox lifecycle remains |
| Market-dependent payment | Implemented, sandbox pending | Stripe/Toss paths behind billing domain; recurring flows require provider validation |
| Redis not default | Implemented | cache policy and runtime profile omit it |
| Billing/subscription/entitlement/credits/idempotency | Implemented, hardening pending | schema and code exist; real replay/race/refund/subscription suites remain |
| Admin/CS/audit/privacy | Implemented, operator validation pending | generated APIs, Admin UI scaffold, export/delete, and audit trail |
| Maintainable frontend/backend/UI module boundaries | Implemented | public boundaries, folder rules, source lock, protected modules, and component inventory |
| DB model/migrations/inbox/outbox | Implemented for D1; Postgres partial | full D1 schema; Hyperdrive/PostgreSQL needs deeper transaction/recovery tests |
| Cache/freshness policy | Partially implemented | generated policy exists; product-specific runtime invalidation evidence remains |
| Local→Preview→Staging→Production | Implemented as workflow; live drill pending | generated Wrangler environments and deploy workflow; real promotion/recovery remains |
| Feature latency and observability | Partially implemented | server timing/logs and SLO artifacts; full dashboards, cost, and field telemetry remain |
| Risk-focused verification | Implemented | risk router, bootstrap audit/build/test, Vitest, and lightweight Playwright smoke |
| Self-improvement must not destabilize core | Implemented | Meta-Harness/Hermes remain behind protected modules and pilot/evaluation prerequisites |
| Completed discovery→UX→architecture→plan→implementation→release orchestration | Implemented as executable workflow | external agent provider must be configured; runner executes each stage with bounded repair and human approval |

## Completion statement

The design path now matches the intended product workflow:

```text
product discovery
→ short clean-B2C SOUL.md
→ traceable public research
→ 15 same-screen practical UI treatments
→ explicit human treatment selection
→ complete modular React mock-data UX including responsive behavior
→ human UX approval
→ architecture and implementation
```

The Tetris pilot verifies that the flow, treatment selection, React build, game engine, and interaction smoke run. It does not claim that fixed viewport checks or screenshots can prove UI quality.

A generated customer SaaS is not automatically production-proven without real credentials and external systems. Remaining evidence includes Google/Kakao and Stripe/Toss lifecycle testing, D1/PostgreSQL concurrency and recovery, complete operator journeys, deployed environment promotion/recovery, and representative production pilots.
