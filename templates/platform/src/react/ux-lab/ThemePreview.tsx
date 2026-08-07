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
        <h1>{theme.name}</h1>
        <p>{theme.thesis}</p>
        <a className="ux-back-link" href="/__ux/themes">Back to all 15 treatments</a>
      </header>
      <ThemeFrame theme={theme} />
      <section className="theme-detail-grid">
        <article>
          <h2>What changes</h2>
          <dl>
            <div><dt>Buttons</dt><dd>{theme.buttonTreatment}</dd></div>
            <div><dt>Surfaces</dt><dd>{theme.surfaceTreatment}</dd></div>
            <div><dt>Layout</dt><dd>{theme.layoutTreatment}</dd></div>
            <div><dt>Density</dt><dd>{theme.density}</dd></div>
            <div><dt>Motion</dt><dd>{theme.motion}</dd></div>
          </dl>
        </article>
        <article>
          <h2>Research evidence</h2>
          <ul>{theme.pinterestQueries.map((query) => <li key={query}>{query}</li>)}</ul>
          <p>Record the reviewed public URLs and the specific product principle learned. Do not copy brand assets or recreate another product's visual identity.</p>
        </article>
      </section>
      <section className="theme-approval-panel">
        <h2>Approve this treatment</h2>
        <p>This decision changes only component treatment. The approved IA and user flow remain unchanged.</p>
        <button type="button" onClick={choose}>Choose treatment</button>
        <code>{command}</code>
        {copied && <p role="status">Approval command copied.</p>}
      </section>
    </main>
  );
}
