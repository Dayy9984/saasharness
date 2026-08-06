import { useState } from 'react';
import themes from './theme-catalog.json';
import { ThemeFrame } from './ThemeFrame';

export function ThemePreview({ themeId }: { themeId: string }) {
  const [copied, setCopied] = useState(false);
  const theme = themes.find((candidate) => candidate.id === themeId);
  if (!theme) {
    return (
      <main className="ux-shell">
        <h1>UI treatment not found</h1>
        <a href="/__ux/themes">Return to gallery</a>
      </main>
    );
  }

  const command = `saasharness design select-theme . ${theme.id} --by "product-owner"`;
  const choose = async () => {
    localStorage.setItem('saasharness-theme-candidate', theme.id);
    try {
      await navigator.clipboard?.writeText(command);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main className="ux-shell">
      <header className="ux-heading">
        <p className="ux-eyebrow">UI treatment · {theme.id}</p>
        <h1>{theme.name}</h1>
        <p>{theme.thesis}</p>
        <a className="ux-back-link" href="/__ux/themes">← All 15 variants</a>
      </header>
      <ThemeFrame theme={theme} />
      <section className="theme-detail-grid">
        <article>
          <h2>Practical differences</h2>
          <dl>
            <div><dt>Buttons</dt><dd>{theme.buttonTreatment}</dd></div>
            <div><dt>Surfaces</dt><dd>{theme.surfaceTreatment}</dd></div>
            <div><dt>Layout</dt><dd>{theme.layoutTreatment}</dd></div>
            <div><dt>Density</dt><dd>{theme.density}</dd></div>
            <div><dt>Motion</dt><dd>{theme.motion}</dd></div>
          </dl>
        </article>
        <article>
          <h2>Reference research queries</h2>
          <ul>{theme.pinterestQueries.map((query) => <li key={query}>{query}</li>)}</ul>
          <p>Record reviewed public URLs and the specific UI principle learned. Do not copy third-party assets or reproduce another product's brand.</p>
        </article>
      </section>
      <section className="theme-approval-panel">
        <h2>Human approval</h2>
        <p>The selected variant changes the component treatment, not the approved IA or user flow. The CLI writes the source-controlled decision.</p>
        <button type="button" onClick={choose}>Choose and copy approval command</button>
        <code>{command}</code>
        {copied && <p role="status">Command copied.</p>}
      </section>
    </main>
  );
}
