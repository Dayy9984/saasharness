---
name: b2c-design-research
description: Conduct traceable, anti-copy visual research and translate it into 15 original same-screen theme systems for human selection.
---

# B2C Design Research

## Inputs

- `contracts/product.yml`
- `contracts/ux.yml`
- human-approved `SOUL.md`
- primary canonical screen purpose
- target region and audience
- references and anti-references

## Research procedure

1. Form 5–8 search clusters from the product soul, audience, and interaction context.
2. Browse Pinterest manually or through an authorized browser session.
3. Record Pin, Board, or search URLs and visible attribution in `artifacts/02-ux/pinterest-research.yml`.
4. For each reference, record only abstract observations: layout, type, color, texture, shape, density, interaction, motion, and trust cues.
5. Record what must not be copied.
6. Synthesize exactly 15 original candidate systems.
7. Render the same neutral screen in all candidates.
8. Run research-integrity, theme-diversity, and browser-evidence critics independently.

## Quality bar

A candidate is not distinct if it changes only colors, gradients, shadows, or radius. At least two structural dimensions must change.

The set should cover meaningful extremes without becoming random:

- calm ↔ energetic;
- dense ↔ spacious;
- editorial ↔ instrument-like;
- soft ↔ geometric;
- familiar ↔ expressive;
- light ↔ dark;
- consumer warmth ↔ technical precision.

## Output

- `artifacts/02-ux/pinterest-research.yml`
- `src/react/ux-lab/theme-catalog.json`
- gallery `/__ux/themes`
- detail pages `/__ux/themes/<theme-id>`
- human-approved `artifacts/02-ux/theme-selection.yml`

Never fabricate reviewed Pin URLs. Query-only scaffolding must remain explicitly marked as unreviewed until browser research occurs.
