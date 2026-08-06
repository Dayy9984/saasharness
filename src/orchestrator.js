import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { ensureDir, exists, readUtf8, writeUtf8 } from './fs-utils.js';
import {
  CRITIC_POLICY,
  workflowStatus,
  createCriticPacket,
  recordCriticReport,
  evaluateStage,
  reviseStage,
} from './workflow.js';

export const STAGE_RECIPES = Object.freeze({
  discovery: {
    upstreams: ['spec-kit'],
    objective: 'Turn raw product dialogue into an approved B2C product constitution, clarified requirements, product specification, policy decisions, and explicit unresolved questions.',
    rules: [
      'Use GitHub Spec Kit as the canonical specification host when its checkout or installed integration is present.',
      'Do not invent infrastructure details the product owner did not ask to decide.',
      'Keep contracts/product.yml and the Spec Kit artifacts consistent; report conflicts instead of silently choosing one.',
    ],
  },
  'ux-philosophy': {
    upstreams: ['open-design', 'pro-ui-engineering', 'impeccable'],
    objective: 'Create a brief human-approved SOUL.md for a clean, highly legible B2C SaaS foundation before component generation.',
    rules: [
      'Keep the discussion practical: product character, density, surface treatment, button treatment, accent, motion, trust, accessibility, and references.',
      'Default to conventional high-clarity B2C SaaS patterns inspired by principles from Apple, Linear, Miro, Stripe, and Notion without copying their identity.',
      'SOUL.md is a lightweight component contract, not a branding manifesto or an invitation to artistic novelty.',
      'Do not generate the fifteen UI treatments or modular product pages until this stage is human-approved.',
    ],
  },
  'ux-themes': {
    upstreams: ['open-design', 'pro-ui-engineering', 'impeccable'],
    objective: 'Research clean product-interface references and render exactly 15 practical component-treatment variants of one standard B2C SaaS screen for human selection.',
    rules: [
      'Do not automate Pinterest scraping or copy source images, illustrations, logos, brand assets, or exact compositions.',
      'Store reviewed public URLs or search URLs, visible attribution, abstract observations, and explicit do-not-copy notes in artifacts/02-ux/pinterest-research.yml.',
      'Use the same IA, layout, neutral content skeleton, and user flow across all fifteen candidates.',
      'Do not create neon, brutalist, game-like, novelty, or art-direction themes unless the product owner explicitly requests that product category.',
      'Vary only useful product choices such as button material, selected glass controls, surface depth, density, radius, accent, focus, and motion intent.',
      'Render the gallery at /__ux/themes and one full preview at /__ux/themes/<theme-id>.',
      'Run Impeccable and a lightweight browser smoke against the running gallery. Human selection must be written with saasharness design select-theme.',
    ],
  },
  'ux-prototype': {
    upstreams: ['open-design', 'pro-ui-engineering', 'impeccable'],
    objective: 'Using the approved SOUL and selected UI treatment, produce the real IA, journeys, reusable component system, pages, and running React prototype with realistic mock data.',
    rules: [
      'Do not begin until artifacts/02-ux/theme-selection.yml is approved.',
      'Derive semantic tokens, primitives, patterns, feature components, and page composition from SOUL.md and the approved treatment.',
      'Use Open Design as the running design-artifact host where available; React UX Lab remains the fallback and evidence store.',
      'Complete required page behavior, responsive behavior, loading, empty, error, permission, paid-limit, long-content, interruption, retry, delayed-success, and reduced-motion states in the mock before production implementation.',
      'Human review owns visual and responsive approval. Automated browser checks are limited to route and interaction smoke, not exhaustive viewport or visual-score gates.',
      'Run experience, design, and browser-evidence critics against the running mock; source review alone cannot pass UX.',
    ],
  },
  architecture: {
    upstreams: ['spec-kit', 'cloudflare-react-template', 'ai-saas-starter', 'open-saas'],
    objective: 'Create a maintainable React/Cloudflare architecture, module boundaries, database model, cache/freshness policy, provider adapters, latency budgets, operations, and recovery design.',
    rules: [
      'Use the pinned Cloudflare Vite React template as the runtime base and overlay only B2C-specific modules.',
      'Use AI SaaS Starter money-path invariants and Open SaaS capability coverage as attributed upstream constraints.',
      'Do not mark provider, database, payment, privacy, or release modules production-ready without the required evidence.',
    ],
  },
  plan: {
    upstreams: ['spec-kit', 'superpowers'],
    objective: 'Convert the approved product, UX, and architecture into ordered phases and exact WIP=1 implementation tasks with acceptance, tests, dependencies, migration, and rollback evidence.',
    rules: [
      'Spec Kit tasks are canonical; do not maintain a competing task system.',
      'Use Superpowers planning discipline: small observable slices, exact paths, explicit RED evidence, and review checkpoints.',
      'Only one product feature may be active even when independent evidence collection runs in parallel.',
    ],
  },
  implementation: {
    upstreams: ['superpowers', 'ai-saas-starter', 'impeccable'],
    objective: 'Implement exactly one approved feature slice with strict RED-GREEN-REFACTOR, scenario-first journeys, protected module boundaries, independent code review, and runtime evidence.',
    rules: [
      'Use the official Superpowers implementation/TDD/debug/review workflow when available.',
      'Do not weaken tests, bypass public module boundaries, or mutate append-only money ledgers.',
      'Run browser evidence for observable UI and replay/race/refund tests for protected money paths.',
    ],
  },
  release: {
    upstreams: ['openspec', 'cloudflare-react-template', 'impeccable'],
    objective: 'Produce Preview, Staging, migration/recovery rehearsal, critical journey evidence, release-risk review, and a human production-approval packet.',
    rules: [
      'Use OpenSpec for the living change record after the first approved baseline.',
      'A production promotion remains human-approved and must not occur while blocker statuses or failed recovery drills remain.',
      'Capture deploy identifiers, migrations, rollback/forward-recovery steps, observability links, and post-release verification.',
    ],
  },
});

export function stageVerificationPlan(stage) {
  if (stage === 'ux-philosophy') return [['npm', ['run', 'check']]];
  if (stage === 'ux-themes' || stage === 'ux-prototype') return [
    ['npm', ['run', 'check']],
    ['npm', ['run', 'test:e2e']],
  ];
  if (stage === 'implementation' || stage === 'release') return [
    ['npm', ['run', 'check']],
    ['npm', ['test']],
    ['npm', ['run', 'test:e2e']],
  ];
  return [['npm', ['run', 'check']]];
}

function parseCommand(value, label) {
  if (!Array.isArray(value) || value.length === 0 || value.some((part) => typeof part !== 'string' || part.length === 0)) {
    throw new Error(`${label} must be a non-empty JSON string array`);
  }
  return value;
}

export async function writeAgentConfig(projectDir = '.', options = {}) {
  const target = path.resolve(options.path ?? path.join(projectDir, '.saasharness', 'agent.json'));
  if (await exists(target) && !options.force) return { path: target, created: false };
  const config = {
    version: 1,
    provider: options.provider ?? 'external-agent-cli',
    builder: {
      command: ['__SET_BUILDER_COMMAND__'],
      input: 'stdin',
    },
    critic: {
      command: ['__SET_CRITIC_COMMAND__'],
      input: 'stdin',
      output: 'json-stdout',
    },
    verification: true,
  };
  await writeUtf8(target, `${JSON.stringify(config, null, 2)}\n`);
  return { path: target, created: true, config };
}

export async function loadAgentConfig(projectDir = '.', options = {}) {
  const configPath = path.resolve(options.configPath ?? path.join(projectDir, '.saasharness', 'agent.json'));
  const config = await exists(configPath) ? JSON.parse(await readUtf8(configPath)) : {};
  const builderFromEnv = process.env.SAASHARNESS_BUILDER_COMMAND_JSON;
  const criticFromEnv = process.env.SAASHARNESS_CRITIC_COMMAND_JSON;
  const builder = builderFromEnv ? JSON.parse(builderFromEnv) : config.builder?.command;
  const critic = criticFromEnv ? JSON.parse(criticFromEnv) : config.critic?.command;
  return {
    configPath,
    provider: config.provider ?? 'external-agent-cli',
    builder: parseCommand(builder, 'builder command'),
    critic: parseCommand(critic, 'critic command'),
    verification: config.verification !== false,
  };
}

export function expandCommand(command, replacements) {
  return command.map((part) => part.replace(/\{(project|stage|round|channel|prompt|output)\}/g, (_match, key) => replacements[key] ?? ''));
}

function runProcess(command, options = {}) {
  const [bin, ...args] = command;
  const capture = options.capture === true;
  const result = spawnSync(bin, args, {
    cwd: options.cwd,
    input: options.input,
    encoding: 'utf8',
    env: { ...process.env, ...options.env },
    maxBuffer: 32 * 1024 * 1024,
    stdio: capture ? ['pipe', 'pipe', 'pipe'] : ['pipe', 'inherit', 'inherit'],
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const stderr = capture && typeof result.stderr === 'string' ? result.stderr.trim() : '';
    throw new Error(`${command.join(' ')} failed with status ${result.status}${stderr ? `: ${stderr}` : ''}`);
  }
  return capture ? `${result.stdout ?? ''}` : '';
}

export function parseJsonOutput(raw) {
  const text = String(raw ?? '').trim();
  if (!text) throw new Error('critic produced no JSON output');
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return JSON.parse(fenced[1].trim());
  try {
    return JSON.parse(text);
  } catch {
    const first = text.indexOf('{');
    const last = text.lastIndexOf('}');
    if (first >= 0 && last > first) return JSON.parse(text.slice(first, last + 1));
    throw new Error('critic output did not contain a JSON object');
  }
}

function artifactList(policy) {
  return policy.artifacts.map((item) => `- ${item}`).join('\n');
}

export function buildStagePrompt(stage, input = {}) {
  const recipe = STAGE_RECIPES[stage];
  const policy = CRITIC_POLICY[stage];
  if (!recipe || !policy) throw new Error(`unknown stage: ${stage}`);
  const prior = input.previousSummary ? `\nPrevious review summary:\n${JSON.stringify(input.previousSummary, null, 2)}\n` : '';
  return `# SaaS Harness Stage Run\n\nStage: ${stage}\nRound: ${input.round ?? 1}\nProject: ${input.projectDir}\n\n## Objective\n\n${recipe.objective}\n\n## Canonical upstreams\n\n${recipe.upstreams.map((item) => `- ${item}: .saasharness/sources/${item}`).join('\n')}\n\n## Required rules\n\n${recipe.rules.map((rule) => `- ${rule}`).join('\n')}\n\n## Stage artifacts\n\n${artifactList(policy)}\n\n## Work contract\n\n1. Read the human-approved contracts and current workflow state.\n2. Use the listed upstream checkout or installed official integration as the canonical generic workflow.\n3. Modify the project and artifacts; do not merely describe changes.\n4. Preserve product intent, approved UX, WIP=1, protected module boundaries, and production blockers.\n5. Run the stage-appropriate tests before returning.\n6. Do not approve the stage; independent critics and a human own approval.\n${prior}`;
}

export function buildCriticPrompt(stage, channel, packet, input = {}) {
  return `# Independent SaaS Harness Critic\n\nYou are the isolated ${channel} critic for stage ${stage}, round ${packet.round}.\nDo not read or infer another critic's report. Assess only the project, required artifacts, and observable evidence.\n\nProject: ${input.projectDir}\nRequired evidence:\n${packet.requiredEvidence.map((item) => `- ${item}`).join('\n')}\n\nArtifacts:\n${packet.artifacts.map((item) => `- ${item}`).join('\n')}\n\nReturn exactly one JSON object and no prose using this shape:\n${JSON.stringify({
    stage,
    channel,
    round: packet.round,
    method: channel === 'browser-evidence' ? 'browser' : 'independent',
    verdict: 'pass|revise|block',
    findings: [{
      severity: 'P0|P1|P2|P3',
      title: 'specific problem',
      evidence: 'observable evidence, file, browser trace, test, or user quote',
      impact: 'user, product, operational, or maintenance impact',
      confidence: 0.0,
      requiresHumanDecision: false,
    }],
  }, null, 2)}\n\nA pass requires no P0/P1 findings and sufficient evidence for this channel.`;
}

function runVerification(projectDir, stage) {
  for (const [bin, args] of stageVerificationPlan(stage)) runProcess([bin, ...args], { cwd: projectDir });
}

async function previousSummary(projectDir, stage, round) {
  if (round <= 1) return null;
  const summaryPath = path.join(projectDir, '.saasharness', 'reviews', stage, `round-${round - 1}`, 'summary.json');
  return await exists(summaryPath) ? JSON.parse(await readUtf8(summaryPath)) : null;
}

export async function runStageLoop(projectDir = '.', options = {}) {
  const root = path.resolve(projectDir);
  const status = await workflowStatus(root);
  const stage = options.stage ?? status.currentStage;
  if (!STAGE_RECIPES[stage]) throw new Error(`unknown or completed stage: ${stage}`);
  if (status.currentStage !== stage && !options.allowOutOfOrder) {
    throw new Error(`current workflow stage is ${status.currentStage}; refusing to run ${stage}`);
  }
  const stageState = status.stages.find((item) => item.stage === stage);
  const planned = {
    stage,
    round: stageState.round,
    recipe: STAGE_RECIPES[stage],
    verification: stageVerificationPlan(stage),
    humanApprovalRequired: true,
  };
  if (!options.execute) return { execute: false, ...planned };

  const agent = await loadAgentConfig(root, options);
  let round = stageState.round;
  const maxRounds = CRITIC_POLICY[stage].maxRounds;
  while (round <= maxRounds) {
    const runDir = path.join(root, '.saasharness', 'runs', stage, `round-${round}`);
    await ensureDir(runDir);
    const promptPath = path.join(runDir, 'builder.md');
    const builderPrompt = buildStagePrompt(stage, {
      projectDir: root,
      round,
      previousSummary: await previousSummary(root, stage, round),
    });
    await writeUtf8(promptPath, builderPrompt);
    const builderCommand = expandCommand(agent.builder, {
      project: root,
      stage,
      round: String(round),
      channel: '',
      prompt: promptPath,
      output: path.join(runDir, 'builder-output.txt'),
    });
    runProcess(builderCommand, {
      cwd: root,
      input: builderPrompt,
      env: { SAASHARNESS_STAGE: stage, SAASHARNESS_ROUND: String(round), SAASHARNESS_PROMPT_FILE: promptPath },
    });
    if (agent.verification) runVerification(root, stage);

    const { packet } = await createCriticPacket(root, stage);
    for (const channel of packet.requiredChannels) {
      const criticPrompt = buildCriticPrompt(stage, channel, packet, { projectDir: root });
      const criticPromptPath = path.join(runDir, `critic-${channel}.md`);
      const rawOutputPath = path.join(runDir, `critic-${channel}.raw.txt`);
      const incomingReportPath = path.join(runDir, `critic-${channel}.json`);
      await writeUtf8(criticPromptPath, criticPrompt);
      const criticCommand = expandCommand(agent.critic, {
        project: root,
        stage,
        round: String(round),
        channel,
        prompt: criticPromptPath,
        output: incomingReportPath,
      });
      const raw = runProcess(criticCommand, {
        cwd: root,
        input: criticPrompt,
        capture: true,
        env: {
          SAASHARNESS_STAGE: stage,
          SAASHARNESS_ROUND: String(round),
          SAASHARNESS_CHANNEL: channel,
          SAASHARNESS_PROMPT_FILE: criticPromptPath,
          SAASHARNESS_OUTPUT_FILE: incomingReportPath,
        },
      });
      await writeUtf8(rawOutputPath, raw);
      const report = parseJsonOutput(raw);
      await writeUtf8(incomingReportPath, `${JSON.stringify(report, null, 2)}\n`);
      await recordCriticReport(root, stage, channel, incomingReportPath);
    }

    const summary = await evaluateStage(root, stage);
    await writeUtf8(path.join(runDir, 'result.json'), `${JSON.stringify({ stage, round, summary }, null, 2)}\n`);
    if (summary.decision === 'pass') {
      return { execute: true, stage, round, decision: 'pass', humanApprovalRequired: true, summary };
    }
    try {
      const revised = await reviseStage(root, stage);
      round = revised.round;
    } catch (error) {
      return {
        execute: true,
        stage,
        round,
        decision: 'human-escalation',
        humanApprovalRequired: true,
        error: error.message,
        summary,
      };
    }
  }
  return { execute: true, stage, round, decision: 'human-escalation', humanApprovalRequired: true };
}
