import { cp, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(process.argv[2] ?? '');
if (!process.argv[2]) throw new Error('usage: node test/fixtures/apply-tetris-pilot.mjs <generated-project>');

const fixtureDir = path.join(here, 'tetris-pilot');
await cp(fixtureDir, projectDir, { recursive: true, force: true });

await writeFile(path.join(projectDir, 'SOUL.md'), `# Tetris Pilot · Product Soul\n\nStatus: approved for CI pilot\nApproved by: tetris-pilot-fixture\n\n## Product essence\n\nA fast, tactile block puzzle that feels precise rather than noisy. The board is the hero; controls and score support it without competing for attention.\n\n## Design principles\n\n1. Every input produces immediate, visible feedback.\n2. The grid remains readable at a glance.\n3. Neon is used as signal, not decoration.\n4. Spring motion may explain press and state change but never delay control.\n5. Keyboard and touch controls remain understandable without instructions hidden behind hover.\n\n## Visual grammar\n\n- Dark field with high-contrast active pieces.\n- Compact mono labels for score and state.\n- Rounded controls with restrained glow.\n- No copied Pinterest imagery, logos, or branded assets.\n\n## Component constitution\n\nAll product components inherit these principles. Page-specific exceptions require a written reason and human review.\n`);

await mkdir(path.join(projectDir, 'artifacts', '02-ux'), { recursive: true });
await writeFile(path.join(projectDir, 'artifacts', '02-ux', 'pinterest-research.yml'), `version: 1\nsource: pinterest-public-pages\ncollection_mode: manual-browser-review\nautomated_scraping: forbidden\nasset_copying: forbidden\nlive_reviewed: false\nnotes: >-\n  CI cannot claim a live Pinterest session. This pilot stores public reference URLs and abstract observations only, then tests the theme-selection and prototype workflow.\nreferences:\n  - url: https://www.pinterest.com/erikachoi/game-ui/\n    observation: Broad game UI board useful for hierarchy and HUD-density comparison.\n  - url: https://www.pinterest.com/sana1ra/game-ui-design/\n    observation: Varied game-interface directions for typography, panels, and score treatment.\n  - url: https://kr.pinterest.com/pin/nemoless--293648838211623091/\n    observation: Tetris-specific composition reference; no source asset copied.\n  - url: https://ru.pinterest.com/pin/183521753553907318/\n    observation: Flat block-puzzle treatment and simplified control hierarchy.\n  - url: https://in.pinterest.com/pin/neon-tetris-game-console-vector-design--29414203811007429/\n    observation: Neon signal language and contrast reference.\n  - url: https://www.pinterest.com/pin/rhythm-game-ui-cyberpunk-synth-retro-style-rizal-saputra-in-2025--533606255869412156/\n    observation: Retro-synth HUD framing and color rhythm.\n  - url: https://www.pinterest.com/pin/810999845438423825/\n    observation: Retro-futurist panel hierarchy and technical typography.\n  - url: https://kr.pinterest.com/pin/304837468549536955/\n    observation: Minimal dashboard restraint for a quiet alternative.\n`);

await writeFile(path.join(projectDir, 'artifacts', '02-ux', 'prototype-approval.md'), `# Tetris Pilot Prototype Evidence\n\n- Theme: neon-arcade\n- Human approval: simulated by the explicit CI fixture command, not inferred by the agent\n- Prototype: playable deterministic Tetris\n- Verification: unit tests + Playwright browser journey\n- Pinterest caveat: public references recorded; live human Pinterest review remains a real-project responsibility\n`);

console.log(JSON.stringify({ projectDir, fixtureDir, applied: true }, null, 2));
