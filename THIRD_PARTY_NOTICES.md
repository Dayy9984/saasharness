# Third-party notices and integration boundaries

SaaS Harness follows an **upstream-first** architecture. Exact repository commits, versions, roles, and activation rules are recorded in [`upstreams.lock.json`](upstreams.lock.json).

## Installed or executable upstream integrations

- **GitHub Spec Kit** — MIT. Official CLI is the canonical initial specification host. This repository adds a B2C preset through Spec Kit's official preset mechanism; it does not replace the Spec Kit lifecycle.
- **obra/superpowers** — MIT. Official provider plugin is the canonical implementation, RED–GREEN–REFACTOR, debugging, review, and branch-completion host.
- **Impeccable** — Apache-2.0. Pinned project installation (`impeccable@3.5.0`) is the canonical UI critic and deterministic frontend detector.
- **Open Design** — Apache-2.0. External daemon/MCP is the default design-artifact engine where available. Its own installation, runtime, assets, and license terms apply.
- **OpenSpec** — MIT. Official npm CLI is the living-change host after the first approved baseline.
- **GSD Core** — MIT. Official npm package is an optional long-horizon execution and recovery path.
- **Cloudflare templates** — Apache-2.0. The generated React/Vite/Hono/Workers shape is kept compatible with the pinned official template. Security-patched dependency versions may intentionally differ from an older upstream pin.

## Attributed source ports and references

- **nikandr-surkov/ai-saas-starter** — MIT. The Cloudflare module pack ports and adapts money-path invariants and tests such as append-only ledgers, unique idempotency, conditional atomic spend, compensating refunds, subscription single-writer rules, and replay/race coverage. Product-specific UI, Next.js, Better Auth, and Stripe are not treated as universal defaults.
- **wasp-lang/open-saas** — MIT. Used as a B2C SaaS feature and operational-completeness reference. The Wasp runtime is not bundled in the default React + Cloudflare profile.

## Research-only upstreams

- **stanford-iris-lab/meta-harness** — MIT. Used only by the separate bounded optimization lab described in `harness-lab/meta-harness/domain_spec.md`.
- **NousResearch/hermes-agent** — MIT. May be used as an optional proposer, persistent memory, or skill-candidate backend in the lab. Hermes-created skills cannot self-promote into the production harness.

## Not bundled by default

- **UI UX Pro Max** — the repository root and package metadata state MIT, while `cli/README.md` states CC-BY-NC-4.0. It is not bundled or auto-enabled until the license is clarified.

A project is not described as integrated merely because SaaS Harness uses a similar idea. Integration requires an official pinned CLI/plugin/preset/MCP adapter, an attributed source port with tests, or a benchmark-compatible research adapter.

When external tools are installed, their own licenses, notices, trademarks, generated assets, and dependency licenses apply.
