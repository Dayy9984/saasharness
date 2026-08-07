export interface MockFeatureState {
  state: string;
  title: string;
  message: string;
}

export function MockFeaturePanel({ fixture }: { fixture: MockFeatureState }) {
  return (
    <article className="mock-feature-panel" data-state={fixture.state} aria-live="polite">
      <div>
        <p className="ux-eyebrow">Approved-theme mock data</p>
        <h2>{fixture.title}</h2>
        <p>{fixture.message}</p>
      </div>
      <div className="mock-feature-panel__visual" aria-hidden="true">
        <span /><span /><span /><span /><span /><span />
      </div>
      <button type="button">Primary action</button>
    </article>
  );
}
