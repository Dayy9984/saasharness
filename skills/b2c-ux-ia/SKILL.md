---
name: b2c-ux-ia
description: Establish a human-approved design philosophy, research visual themes, compare 15 same-screen React variants, approve one theme, then build modular IA, journeys, pages, and mock-data UX.
---

# React UX + IA Lab

The UX process is not allowed to jump directly from a product brief to components. It has three separately criticized and human-approved stages.

```text
ux-philosophy
→ ux-themes
→ ux-prototype
```

## Stage 1 · Design philosophy and SOUL.md

Discuss the design philosophy with the product owner before generating visual candidates.

Create and maintain root `SOUL.md` as the canonical source for:

- product essence and emotional promise;
- audience, context, trust, accessibility, and regional considerations;
- 3–5 positive and negative design principles;
- typography, color, shape, density, surface, icon, and image grammar;
- spring-motion, interruption, latency disclosure, and reduced-motion philosophy;
- references and anti-references;
- the component constitution every later component must obey.

Do not approve this stage until `product-fit` and `design-coherence` critics pass and a human approves it.

## Stage 2 · Pinterest research and 15-theme gallery

Use authorized browser research. Pinterest is an inspiration index, not an asset source.

- Do not scrape Pinterest automatically.
- Store Pin, Board, or search URLs, visible creator/board attribution, and abstract observations.
- Do not download or copy original images, illustrations, logos, brand assets, or exact compositions.
- Research layout, typography, palette, texture, shape, density, interaction, and motion ideas.
- Use Open Design and the bundled Pro UI Engineering references to turn research into original candidate systems.

Generate **exactly 15 materially different variants** of one canonical screen.

All 15 variants must:

- use the same neutral content skeleton;
- contain no realistic product mock data;
- be comparable in a single gallery at `/__ux/themes`;
- open to a full preview at `/__ux/themes/<theme-id>`;
- differ in more than hue—layout, type, shape, density, texture, hierarchy, or motion must change;
- record Pinterest queries and reviewed URLs in `artifacts/02-ux/pinterest-research.yml`.

Critic channels:

- `research-integrity`: source traceability, anti-copy compliance, useful observation quality;
- `theme-diversity`: real conceptual diversity and fit with SOUL.md;
- `browser-evidence`: gallery, detail pages, responsive behavior, console/accessibility evidence.

A human selects the theme through:

```bash
saasharness design select-theme . <theme-id> --by "product-owner"
```

Theme approval is source-controlled and blocks the next stage.

## Stage 3 · Modular React mock-data prototype

Only after theme approval:

1. derive semantic design tokens from `SOUL.md` and the approved theme;
2. define primitives, patterns, feature components, and page composition boundaries;
3. create the IA, sitemap, primary and recovery journeys;
4. define every screen's purpose, entry conditions, primary action, data, events, and states;
5. implement modular React pages using realistic mock data;
6. include loading, empty, error, permission, paid-limit, long-content, retry, delayed-success, interruption, and reduced-motion states;
7. preserve the same component system across all pages;
8. let the human use the flow and approve or reject it.

## Design intelligence stack

1. Product contract and human-approved `SOUL.md` always win.
2. Pinterest research supplies attributed observations, never copied assets.
3. The bundled `pro-ui-engineering` subset supplies candidate visual and interaction references.
4. Open Design is the preferred running design-artifact host where available.
5. Impeccable shapes, critiques, audits, hardens, animates, and supplies deterministic/browser evidence.
6. UI UX Pro Max remains optional until its license is manually reviewed.

## Spring motion

- Motion explains press, selection, spatial continuity, sheet/modal origin, drag release, or state transition.
- Decorative bounce on every card or CTA is forbidden.
- A usable state may not wait for a long animation to settle.
- Interrupted motion retargets from the current position.
- Reduced-motion preserves meaning, focus, and control.
- Tune motion in the running React prototype rather than copying arbitrary spring numbers.

## Final UX critics

- `experience`: task clarity, IA, cognitive load, recovery, trust, and conversion;
- `design`: hierarchy, specificity, typography, color, density, responsive intent, component consistency, and motion semantics;
- `browser-evidence`: running mock, screenshots/video, accessibility tree, console/network, latency feedback, and deterministic detectors.

UX may never pass from source-code review alone.
