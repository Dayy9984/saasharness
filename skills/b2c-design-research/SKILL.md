---
name: b2c-design-research
description: Conduct traceable, anti-copy UI research and translate it into 15 practical same-screen B2C SaaS treatment variants for human selection.
---

# B2C Design Research

## Inputs

- `contracts/product.yml`
- `contracts/ux.yml`
- human-approved `SOUL.md`
- one canonical B2C SaaS screen
- target region and audience
- references and anti-references

## Research procedure

1. Start from the default clean B2C foundation: legibility, predictable hierarchy, familiar controls, accessible focus, and low cognitive load.
2. Form search clusters around practical decisions such as Apple-like selected glass controls, Linear-like density, Miro-like grouping, Stripe-like trust, content readability, Admin density, onboarding spaciousness, and accessibility.
3. Browse Pinterest or other public sources manually or through an authorized browser session.
4. Record reviewed URLs or search URLs in `artifacts/02-ux/pinterest-research.yml`.
5. Record only abstract observations: hierarchy, button material, surface depth, density, radius, focus, accent, motion, trust, and anti-copy constraints.
6. Synthesize exactly 15 original treatment variants of the same conventional screen.
7. Keep IA, layout, content skeleton, and user flow fixed across all candidates.
8. Run research-integrity, treatment-usefulness, and browser-evidence critics independently.

## Quality bar

A useful candidate changes one or more practical component decisions enough for the product owner to compare, but it must remain a clean, readable B2C SaaS interface.

Good comparison axes include:

- solid button ↔ selected glass control;
- flat surface ↔ soft card depth;
- compact ↔ standard ↔ spacious density;
- smaller ↔ larger radius;
- neutral ↔ warmer visual tone;
- standard ↔ stronger focus treatment;
- instant ↔ snappy ↔ smooth spring response;
- content-first ↔ data-scan-first emphasis.

Do not generate neon, brutalist, game-like, novelty, or art-direction themes unless the product owner explicitly requests that product category. Do not alter the approved IA merely to make candidates look different.

## Output

- `artifacts/02-ux/pinterest-research.yml`
- `src/react/ux-lab/theme-catalog.json`
- gallery `/__ux/themes`
- detail pages `/__ux/themes/<theme-id>`
- human-approved `artifacts/02-ux/theme-selection.yml`

Never fabricate reviewed URLs. Query-only scaffolding must remain explicitly marked as unreviewed until browser research occurs.
