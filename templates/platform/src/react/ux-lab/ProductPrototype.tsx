import { useState } from 'react';
import { fixtures } from './fixtures';
import themes from './theme-catalog.json';
import { approvedThemeId } from './theme-selection';
import { MockFeaturePanel } from './prototype/MockFeaturePanel';
import { PrototypeShell } from './prototype/PrototypeShell';
import { StateSwitcher } from './prototype/StateSwitcher';

type FixtureName = keyof typeof fixtures;

export function ProductPrototype() {
  const [fixtureName, setFixtureName] = useState<FixtureName>('default');
  const themeId = approvedThemeId ?? localStorage.getItem('saasharness-theme-candidate') ?? themes[0].id;
  const fixture = fixtures[fixtureName];
  return (
    <main className="ux-shell">
      <header className="ux-heading">
        <p className="ux-eyebrow">Stage 3 · Modular React mock</p>
        <h1>Approved-theme product prototype</h1>
        <p>This phase uses realistic mock data and reusable components. It starts only after a theme is approved.</p>
        <a className="ux-back-link" href="/__ux">← Design workflow</a>
      </header>
      {!approvedThemeId && (
        <aside className="ux-warning" role="alert">
          No source-controlled theme approval exists yet. Run the design select-theme command before approving this stage.
        </aside>
      )}
      <StateSwitcher states={Object.keys(fixtures) as FixtureName[]} active={fixtureName} onChange={setFixtureName} />
      <PrototypeShell themeId={themeId}>
        <MockFeaturePanel fixture={fixture} />
      </PrototypeShell>
    </main>
  );
}
