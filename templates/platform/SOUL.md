# SOUL.md · B2C UI Foundation

> A short, human-approved UI contract. The default is a clean, highly legible, conventional B2C SaaS experience. Use this file to choose practical treatment details—not to invent an artistic theme or change the approved IA.

status: draft

## 1. Non-negotiable foundation

Every screen must prioritize:

- obvious next action and predictable navigation;
- strong text and control visibility;
- low cognitive load and plain-language recovery;
- familiar B2C patterns for sign-in, onboarding, upgrade, billing, account, and support;
- accessible contrast, focus, keyboard behavior, and reduced motion;
- responsive behavior completed in the React mock before production implementation;
- consistent components instead of page-specific decoration.

Visual novelty may never weaken comprehension, trust, speed, or accessibility.

## 2. Product-specific decisions

Discuss only the choices that materially affect this product.

- Product character in 3–5 words:
- Desired warmth: neutral / warm / friendly / premium
- Information density: relaxed / standard / compact
- Surface treatment: flat / soft card / selected glass controls
- Button treatment: solid / subtle glass / low-emphasis neutral
- Accent role:
- Motion character: instant / snappy / smooth / gentle
- Trust sensitivity:
- Regional or cultural considerations:

## 3. Reference principles

References are used for principles, not imitation.

- Apple: clarity, restrained material depth, natural spring response
- Linear: compact speed and disciplined hierarchy
- Miro: visible collaborative affordances and friendly grouping
- Stripe: payment trust, explicit status, and confident recovery
- Notion: quiet chrome and content readability

Add product-specific public references and note exactly what to learn. Do not copy brand assets, protected layouts, or distinctive identity.

| Reference URL or description | Principle to learn | What not to copy |
|---|---|---|
| | | |

## 4. Component rules

Every reusable component must:

1. inherit semantic color, type, spacing, radius, surface, and motion tokens from this contract;
2. expose applicable default, hover, pressed, focus, disabled, loading, success, and error behavior;
3. preserve the approved IA and user flow;
4. keep touch targets and keyboard operation usable;
5. avoid decorative glass, bounce, gradients, and shadows unless they communicate hierarchy or interaction;
6. record any deliberate exception in the page or feature contract.

## 5. Approval

- Product owner:
- Critic decision:
- Approved at:
- Notes:
