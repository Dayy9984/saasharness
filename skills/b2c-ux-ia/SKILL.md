---
name: b2c-ux-ia
description: Design B2C SaaS IA, user journeys, screen contracts, visual system, spring motion, and a running React mock with human approval.
---

# React UX + IA Lab

The deliverable is a running React mock with realistic fixtures, not a static document.

## Sequence

1. Derive the user mental model and top-level objects.
2. Draft sitemap, navigation, and recovery paths.
3. Define primary and secondary journeys.
4. Define every screen's purpose, entry conditions, primary action, data, events, and states.
5. Generate 2–3 design directions using product references and anti-references.
6. Persist a master design system and page-level exceptions.
7. Implement the chosen direction with mock data in React.
8. Include loading, empty, error, permission, paid-limit, long-content, retry, and delayed-success states.
9. Add semantic spring-motion tokens: instant, snappy, smooth, gentle.
10. Let the human use the flow and approve or reject it.

## Design intelligence stack

1. Product and UX contracts always win.
2. Use the bundled `pro-ui-engineering` subset to choose one primary visual/interaction reference and at most one supporting reference.
3. Use Open Design when available to generate and preview the functional design artifact and maintain DESIGN.md.
4. Use Impeccable to shape, critique, audit, harden, animate, and collect deterministic/browser evidence.
5. Use UI UX Pro Max only after manual license review.

Never claim an external tool is active without installation evidence. Never let a reference override product intent or human approval.

## Spring motion

- Motion must explain press, selection, spatial continuity, sheet/modal origin, drag release, or state transition.
- Do not add decorative bounce to every card or CTA.
- The user must be able to act before a long animation settles.
- Interrupted motion retargets from the current position.
- Reduced-motion behavior preserves information and control.
- Tune in the running React mock instead of blindly copying numbers.

## Mandatory critic loop

Three independent channels:

- `experience`: task clarity, IA, cognitive load, recovery, trust, B2C conversion;
- `design`: hierarchy, specificity, typography, color, density, responsive intent, motion semantics;
- `browser-evidence`: running mock, screenshots/video, accessibility tree, console/network, latency feedback, deterministic detector when installed.

Do not judge UX from source code alone. Iterate up to the configured maximum rounds, then require human approval.
