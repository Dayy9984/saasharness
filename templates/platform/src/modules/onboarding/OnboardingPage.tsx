import type { OnboardingContext } from '@onboardjs/core';
import {
  OnboardingErrorBoundary,
  OnboardingProvider,
  useOnboarding,
} from '@onboardjs/react';
import { runtimeConfig } from '../../generated/runtime-config';

interface ProductOnboardingContext extends OnboardingContext<{ id?: string }> {
  flowData: OnboardingContext['flowData'] & {
    goal?: string;
    firstActionConfirmed?: boolean;
  };
}

const flowId = 'product-first-value';
const flowVersion = '1.0.0';

async function persistProgress(
  context: ProductOnboardingContext,
  currentStepId: string | null,
  completed: boolean,
) {
  const response = await fetch(`/api/onboarding/${flowId}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      flowVersion,
      currentStepId,
      context,
      completed,
    }),
  });
  if (response.status === 401) return;
  if (!response.ok) throw new Error(`onboarding persistence failed (${response.status})`);
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

const steps = [
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
        fallback={({ error, resetErrorBoundary }) => (
          <section className="onboarding-error" role="alert">
            <h1>This step could not load</h1>
            <p>{error.message}</p>
            <button type="button" onClick={resetErrorBoundary}>Try again</button>
          </section>
        )}
      >
        {renderStep()}
      </OnboardingErrorBoundary>
      <footer className="onboarding-actions">
        <button type="button" onClick={() => previous()} disabled={!state.canGoPrevious || loading.isAnyLoading}>Back</button>
        {state.currentStep?.isSkippable && (
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
        localStoragePersistence={{ key: `saasharness:${runtimeConfig.profileHash}:${flowId}` }}
        onStepChange={(newStep, _oldStep, context) => {
          void persistProgress(context, newStep ? String(newStep.id) : null, false).catch(console.error);
        }}
        onFlowComplete={(context) => {
          void persistProgress(context, null, true).catch(console.error);
        }}
      >
        <OnboardingControls />
      </OnboardingProvider>
    </main>
  );
}
