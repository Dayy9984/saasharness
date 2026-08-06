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
          <p className="ux-eyebrow">Stage 3 · Locked</p>
          <h1>Approve a theme before mock-data UX work</h1>
          <p>The harness deliberately blocks components and product pages until one of the fifteen design systems is approved in source control.</p>
          <a className="ux-back-link" href="/__ux/themes">← Review all 15 themes</a>
        </header>
        <aside className="ux-warning" role="alert">
          Run <code>saasharness design select-theme . &lt;theme-id&gt; --by "product-owner"</code>, then start the ux-prototype stage.
        </aside>
      </main>
    );
  }

  const fixture = fixtures[fixtureName];
  return (
    <main className="ux-shell">
      <header className="ux-heading">
        <p className="ux-eyebrow">Stage 3 · Modular React mock</p>
        <h1>Approved-theme product prototype</h1>
        <p>This phase uses realistic mock data and reusable components. It starts only after a theme is approved.</p>
        <a className="ux-back-link" href="/__ux">← Design workflow</a>
      </header>
      <StateSwitcher states={Object.keys(fixtures) as FixtureName[]} active={fixtureName} onChange={setFixtureName} />
      <PrototypeShell themeId={approvedThemeId}>
        <MockFeaturePanel fixture={fixture} />
      </PrototypeShell>
    </main>
  );
}
