---
name: b2c-ux-ia
description: Establish a lightweight human-approved B2C UI foundation, compare 15 practical same-screen treatments, approve one, then build modular IA, journeys, pages, and mock-data UX.
---

# React UX + IA Lab

The UX process must not jump directly from a product brief to production components. It has three separately criticized and human-approved stages.

```text
ux-philosophy
→ ux-themes
→ ux-prototype
```

## Stage 1 · Lightweight UI foundation and SOUL.md

Discuss only the product-specific decisions needed on top of a clean B2C SaaS default.

The default foundation is:

- strong readability and obvious hierarchy;
- familiar sign-in, onboarding, upgrade, billing, account, and support patterns;
- predictable navigation and recovery;
- accessible contrast, focus, keyboard behavior, and reduced motion;
- reusable components and restrained visual effects;
- responsive behavior completed in the React mock before production implementation.

Maintain root `SOUL.md` as the canonical source for:

- 3–5 words describing product character;
- warmth and information density;
- surface and button treatment;
- accent role and trust sensitivity;
- spring-motion character and reduced-motion behavior;
- public reference principles and anti-patterns;
- the component rules every later component must obey.

Use principles from products such as Apple, Linear, Miro, Stripe, and Notion without copying their identity. `SOUL.md` is a short UI contract, not a branding manifesto.

Do not approve this stage until `product-fit` and `design-coherence` critics pass and a human approves it.

## Stage 2 · Public research and 15 UI treatment variants

Use authorized browser research. Pinterest and other public sources are inspiration indexes, not asset sources.

- Do not scrape sources automatically.
- Store reviewed URLs or search URLs and abstract observations.
- Do not download or copy original images, illustrations, logos, brand assets, or exact compositions.
- Research clarity, hierarchy, controls, surfaces, density, focus, accessibility, and motion.
- Use Open Design and the bundled Pro UI Engineering references to turn observations into original treatment candidates.

Generate **exactly 15 practical variants** of one conventional B2C SaaS screen.

All 15 variants must:

- use the same IA, layout, neutral content skeleton, and user flow;
- contain no realistic product mock data;
- be comparable in one gallery at `/__ux/themes`;
- open to a full preview at `/__ux/themes/<theme-id>`;
- vary only useful component treatment such as buttons, selected glass controls, surfaces, density, radius, accent, focus, and motion intent;
- remain readable, accessible, calm, and appropriate for a general B2C SaaS product;
- avoid neon, brutalist, game-like, novelty, or art-direction themes unless explicitly required by the product category;
- record public research evidence in `artifacts/02-ux/pinterest-research.yml`.

Critic channels:

- `research-integrity`: source traceability, anti-copy compliance, and useful observation quality;
- `treatment-usefulness`: whether each variation is practical, legible, distinct enough to compare, and consistent with the approved IA;
- `browser-evidence`: whether the gallery and detail pages actually run and communicate the treatment differences.

A human selects the treatment through:

```bash
saasharness design select-theme . <theme-id> --by "product-owner"
```

The source-controlled selection blocks the next stage.

## Stage 3 · Complete modular React mock-data prototype

Only after treatment approval:

1. derive semantic design tokens from `SOUL.md` and the approved treatment;
2. define primitives, patterns, feature components, and page composition boundaries;
3. create the IA, sitemap, primary and recovery journeys;
4. define every screen's purpose, entry conditions, primary action, data, events, and states;
5. implement every required React page using realistic mock data;
6. complete responsive behavior in the mock itself;
7. include loading, empty, error, permission, paid-limit, long-content, retry, delayed-success, interruption, and reduced-motion states;
8. preserve the same component system across all pages;
9. let the human use the complete flow and approve or reject it.

Human review owns visual and responsive approval. Automated browser checks are lightweight route and interaction smoke tests, not exhaustive viewport matrices or visual-score gates.

## Design intelligence stack

1. Product contract and human-approved `SOUL.md` always win.
2. Public research supplies attributed observations, never copied assets.
3. The bundled `pro-ui-engineering` subset supplies practical visual and interaction references.
4. Open Design is the preferred running design-artifact host where available.
5. Impeccable shapes, critiques, audits, hardens, animates, and supplies deterministic/browser evidence.
6. UI UX Pro Max remains optional until its license is manually reviewed.

## Spring motion

- Motion explains press, selection, spatial continuity, sheet/modal origin, drag release, or state transition.
- Apple-like glass and spring treatment may be used selectively on controls where it improves feedback or depth.
- Decorative bounce, blur, glass, gradients, or shadows on every component are forbidden.
- A usable state may not wait for a long animation to settle.
- Interrupted motion retargets from the current position.
- Reduced motion preserves meaning, focus, and control.
- Tune motion in the running React prototype rather than copying arbitrary spring numbers.

## Final UX critics

- `experience`: task clarity, IA, cognitive load, recovery, trust, and conversion;
- `design`: hierarchy, readability, component consistency, product specificity, and motion semantics;
- `browser-evidence`: running mock, interaction trace, accessibility tree, console/network, and latency feedback.

UX may never pass from source-code review alone.
