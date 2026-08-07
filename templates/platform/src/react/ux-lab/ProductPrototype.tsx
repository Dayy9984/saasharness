import { useState } from 'react';
import { fixtures } from './fixtures';
import { approvedThemeId } from './theme-selection';
import { MockFeaturePanel } from './prototype/MockFeaturePanel';
import { PrototypeShell } from './prototype/PrototypeShell';
import { StateSwitcher } from './prototype/StateSwitcher';

type FixtureName = keyof typeof fixtures;

export function ProductPrototype() {
  const [fixtureName, setFixtureName] = useState<FixtureName>('default');

  if (!approvedThemeId) {
    return (
      <main className="ux-shell">
        <header className="ux-heading">
          <h1>Approve a UI treatment first</h1>
          <p>Product pages remain blocked until a practical component treatment is approved in source control. The IA and user flow do not change between treatments.</p>
          <a className="ux-back-link" href="/__ux/themes">Review all 15 treatments</a>
        </header>
        <aside className="ux-warning" role="alert">
          Run <code>saasharness design select-theme . &lt;theme-id&gt; --by "product-owner"</code>, then start the <code>ux-prototype</code> stage.
        </aside>
      </main>
    );
  }

  const fixture = fixtures[fixtureName];
  return (
    <main className="ux-shell">
      <header className="ux-heading">
        <h1>Complete product mock</h1>
        <p>Use realistic mock data and reusable components to finish the actual IA, core journey, onboarding, settings, billing, and recovery states before production implementation.</p>
        <a className="ux-back-link" href="/__ux">Back to the UX workflow</a>
      </header>
      <div className="prototype-review-bar">
        <StateSwitcher states={Object.keys(fixtures) as FixtureName[]} active={fixtureName} onChange={setFixtureName} />
        <p>Selected treatment: <strong>{approvedThemeId}</strong></p>
      </div>
      <PrototypeShell themeId={approvedThemeId}>
        <MockFeaturePanel fixture={fixture} />
      </PrototypeShell>
    </main>
  );
}
