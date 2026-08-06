import { cp, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(process.argv[2] ?? '');
if (!process.argv[2]) throw new Error('usage: node test/fixtures/apply-tetris-pilot.mjs <generated-project>');

const fixtureDir = path.join(here, 'tetris-pilot');
await cp(fixtureDir, projectDir, { recursive: true, force: true });

await writeFile(path.join(projectDir, 'SOUL.md'), `# Tetris Pilot · UI Foundation\n\nStatus: approved for CI pilot\nApproved by: tetris-pilot-fixture\n\n## Non-negotiable foundation\n\nA fast, legible block puzzle with a conventional product shell. The board is the hero; controls and score support it without decorative competition.\n\n## Product-specific decisions\n\n- Character: precise, calm, tactile\n- Density: standard\n- Surface treatment: clean neutral panels\n- Button treatment: selected Apple-like glass controls\n- Motion: immediate feedback with bounded spring response\n- Accessibility: keyboard and touch controls, visible focus, reduced motion\n\n## Component rules\n\n1. Every input produces immediate visible feedback.\n2. The grid remains readable at a glance.\n3. Glass is used only on actionable controls, not every surface.\n4. Motion may explain press and state change but never delay control.\n5. No copied third-party imagery, logos, or branded assets.\n`);

await mkdir(path.join(projectDir, 'artifacts', '02-ux'), { recursive: true });
await writeFile(path.join(projectDir, 'artifacts', '02-ux', 'pinterest-research.yml'), `version: 2\nsource: public-reference-pages\ncollection_mode: recorded-public-urls\nautomated_scraping: forbidden\nasset_copying: forbidden\nlive_reviewed: false\nnotes: >-\n  CI cannot claim a live human Pinterest session. The pilot records public URLs and abstract observations only, then tests the treatment-selection and prototype workflow.\nreferences:\n  - url: https://developer.apple.com/design/human-interface-guidelines/\n    observation: Clarity, selected material depth, direct manipulation, and reduced-motion principles.\n  - url: https://linear.app/\n    observation: Compact hierarchy and fast keyboard-oriented interaction.\n  - url: https://miro.com/\n    observation: Friendly grouping and obvious collaborative controls.\n  - url: https://stripe.com/\n    observation: Trustworthy status, action hierarchy, and restrained depth.\n  - url: https://www.notion.com/\n    observation: Quiet chrome and content readability.\n`);

await writeFile(path.join(projectDir, 'artifacts', '02-ux', 'prototype-approval.md'), `# Tetris Pilot Prototype Evidence\n\n- UI treatment: apple-glass-controls\n- Human approval: simulated by the explicit CI fixture command, not inferred by the agent\n- Prototype: playable deterministic Tetris\n- Verification: unit tests + lightweight Playwright interaction journey\n- Responsive approval: treated as a human mock-stage responsibility, not a multi-viewport CI gate\n- Public research caveat: URLs recorded; live human research remains a real-project responsibility\n`);

console.log(JSON.stringify({ projectDir, fixtureDir, applied: true }, null, 2));
