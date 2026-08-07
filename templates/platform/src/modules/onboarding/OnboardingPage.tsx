import type {
  LoadedData,
  OnboardingContext,
  OnboardingStep,
} from '@onboardjs/core';
import {
  OnboardingErrorBoundary,
  OnboardingProvider,
  useOnboarding,
} from '@onboardjs/react';
import { runtimeConfig } from '../../generated/runtime-config';
import './onboarding.css';

interface ProductOnboardingContext extends OnboardingContext<{ id?: string }> {
  flowData: OnboardingContext['flowData'] & {
    goal?: string;
    firstActionConfirmed?: boolean;
  };
}

const flowId = 'product-first-value';
const flowVersion = '1.0.0';
const localKey = `saasharness:${runtimeConfig.profileHash}:${flowId}`;

function loadLocal(): LoadedData<ProductOnboardingContext> | null {
  try {
    const raw = localStorage.getItem(localKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      timestamp?: number;
      data?: LoadedData<ProductOnboardingContext>;
    };
    return parsed.data ?? null;
  } catch {
    localStorage.removeItem(localKey);
    return null;
  }
}

function persistLocal(
  context: ProductOnboardingContext,
  currentStepId: string | number | null,
) {
  const data: LoadedData<ProductOnboardingContext> = {
    ...context,
    flowData: context.flowData,
    currentStepId,
  };
  localStorage.setItem(localKey, JSON.stringify({ timestamp: Date.now(), data }));
}

async function loadProgress(): Promise<LoadedData<ProductOnboardingContext> | null> {
  try {
    const response = await fetch(`/api/onboarding/${flowId}`, {
      headers: { accept: 'application/json' },
    });
    if (response.status === 401) return loadLocal();
    if (!response.ok) throw new Error(`onboarding load failed (${response.status})`);
    const body = await response.json() as {
      progress: null | {
        currentStepId: string | null;
        context: ProductOnboardingContext;
        status: 'in-progress' | 'completed';
      };
    };
    if (!body.progress) return loadLocal();
    const loaded: LoadedData<ProductOnboardingContext> = {
      ...body.progress.context,
      currentStepId: body.progress.status === 'completed'
        ? null
        : body.progress.currentStepId,
    };
    localStorage.setItem(localKey, JSON.stringify({ timestamp: Date.now(), data: loaded }));
    return loaded;
  } catch (error) {
    console.warn('Using local onboarding progress because server resume was unavailable', error);
    return loadLocal();
  }
}

async function persistProgress(
  context: ProductOnboardingContext,
  currentStepId: string | number | null,
  completed: boolean,
) {
  persistLocal(context, currentStepId);
  try {
    const response = await fetch(`/api/onboarding/${flowId}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        flowVersion,
        currentStepId: currentStepId === null ? null : String(currentStepId),
        context,
        completed,
      }),
    });
    if (response.status === 401) return;
    if (!response.ok) throw new Error(`onboarding persistence failed (${response.status})`);
  } catch (error) {
    console.warn('Onboarding progress remains available locally; server sync failed', error);
  }
}

async function clearProgress() {
  localStorage.removeItem(localKey);
  try {
    const response = await fetch(`/api/onboarding/${flowId}`, { method: 'DELETE' });
    if (response.status !== 401 && !response.ok) {
      throw new Error(`onboarding clear failed (${response.status})`);
    }
  } catch (error) {
    console.warn('Local onboarding progress was cleared; server clear failed', error);
  }
}

function WelcomeStep() {
  return (
    <section className="onboarding-step">
      <h1>Set up your workspace</h1>
      <p>We will ask only for the information required to reach the first useful result.</p>
      <ul>
        <li>Confirm your immediate goal</li>
        <li>Review the first action</li>
        <li>Enter the product with progress preserved</li>
      </ul>
    </section>
  );
}

function GoalStep() {
  const { state, updateContext } = useOnboarding<ProductOnboardingContext>();
  const goal = String(state.context.flowData.goal ?? '');
  return (
    <section className="onboarding-step">
      <h1>What do you need to accomplish first?</h1>
      <p>This answer should change the first-value flow, not only the welcome copy.</p>
      <label className="onboarding-field">
        <span>Immediate goal</span>
        <textarea
          value={goal}
          onChange={(event) => updateContext({
            flowData: { ...state.context.flowData, goal: event.target.value },
          })}
          placeholder="For example: publish the first survey and collect a response"
          rows={4}
        />
      </label>
    </section>
  );
}

function FirstValueStep() {
  const { state, updateContext } = useOnboarding<ProductOnboardingContext>();
  const confirmed = state.context.flowData.firstActionConfirmed === true;
  return (
    <section className="onboarding-step">
      <h1>Confirm the first product action</h1>
      <p>The current releaseable feature is <strong>{runtimeConfig.feature.name}</strong>. The product should open directly into that flow after onboarding.</p>
      <label className="onboarding-check">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => updateContext({
            flowData: { ...state.context.flowData, firstActionConfirmed: event.target.checked },
          })}
        />
        <span>I understand the next action and where to recover if it fails.</span>
      </label>
    </section>
  );
}

const steps: OnboardingStep<ProductOnboardingContext>[] = [
  { id: 'welcome', component: WelcomeStep, nextStep: 'goal' },
  { id: 'goal', component: GoalStep, previousStep: 'welcome', nextStep: 'first-value' },
  { id: 'first-value', component: FirstValueStep, previousStep: 'goal', nextStep: null },
];

function OnboardingControls() {
  const {
    state,
    next,
    previous,
    skip,
    loading,
    renderStep,
    resetFlow,
  } = useOnboarding<ProductOnboardingContext>();

  if (!state?.currentStep && !state?.isCompleted) {
    return <p role="status">Loading onboarding progress…</p>;
  }
  if (state.isCompleted) {
    return (
      <section className="onboarding-complete">
        <h1>Setup complete</h1>
        <p>Your next action is ready. Progress is retained so returning users do not repeat onboarding.</p>
        <a href="/">Continue to the product</a>
        <button type="button" onClick={() => resetFlow()}>Review setup again</button>
      </section>
    );
  }

  return (
    <div className="onboarding-card">
      <div className="onboarding-progress-row">
        <span>Step {state.currentStepNumber} of {state.totalSteps}</span>
        <progress value={state.currentStepNumber} max={state.totalSteps} aria-label="Onboarding progress" />
      </div>
      <OnboardingErrorBoundary
        fallback={({ error, resetError }) => (
          <section className="onboarding-error" role="alert">
            <h1>This step could not load</h1>
            <p>{error.message}</p>
            <button type="button" onClick={resetError}>Try again</button>
          </section>
        )}
      >
        {renderStep()}
      </OnboardingErrorBoundary>
      <footer className="onboarding-actions">
        <button type="button" onClick={() => previous()} disabled={!state.canGoPrevious || loading.isAnyLoading}>Back</button>
        {state.isSkippable && (
          <button type="button" onClick={() => skip()} disabled={loading.isAnyLoading}>Skip</button>
        )}
        <button type="button" className="is-primary" onClick={() => next()} disabled={!state.canGoNext || loading.isAnyLoading}>
          {state.currentStepNumber === state.totalSteps ? 'Finish' : 'Continue'}
        </button>
      </footer>
    </div>
  );
}

export function OnboardingPage() {
  return (
    <main className="onboarding-shell">
      <OnboardingProvider<ProductOnboardingContext>
        flowId={flowId}
        flowName="Product first value"
        flowVersion={flowVersion}
        steps={steps}
        initialStepId="welcome"
        initialContext={{ flowData: {} }}
        customOnDataLoad={loadProgress}
        customOnDataPersist={(context, currentStepId) => persistProgress(context, currentStepId, false)}
        customOnClearPersistedData={clearProgress}
        onFlowComplete={(context) => persistProgress(context, null, true)}
      >
        <OnboardingControls />
      </OnboardingProvider>
    </main>
  );
}
