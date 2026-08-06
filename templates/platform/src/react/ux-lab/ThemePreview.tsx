import { useState } from 'react';
import themes from './theme-catalog.json';
import { ThemeFrame } from './ThemeFrame';

export function ThemePreview({ themeId }: { themeId: string }) {
  const [copied, setCopied] = useState(false);
  const theme = themes.find((candidate) => candidate.id === themeId);
  if (!theme) {
    return (
      <main className="ux-shell">
        <h1>Theme not found</h1>
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
        <p className="ux-eyebrow">Theme detail · {theme.id}</p>
        <h1>{theme.name}</h1>
        <p>{theme.thesis}</p>
        <a className="ux-back-link" href="/__ux/themes">← All 15 themes</a>
      </header>
      <ThemeFrame theme={theme} />
      <section className="theme-detail-grid">
        <article>
          <h2>Design grammar</h2>
          <dl>
            <div><dt>Typography</dt><dd>{theme.fontMood}</dd></div>
            <div><dt>Shape</dt><dd>{theme.shape}</dd></div>
            <div><dt>Density</dt><dd>{theme.density}</dd></div>
            <div><dt>Motion</dt><dd>{theme.motion}</dd></div>
          </dl>
        </article>
        <article>
          <h2>Pinterest research queries</h2>
          <ul>{theme.pinterestQueries.map((query) => <li key={query}>{query}</li>)}</ul>
          <p>Replace query-only scaffolding with reviewed Pin/Board URLs and abstract observations before approval.</p>
        </article>
      </section>
      <section className="theme-approval-panel">
        <h2>Human approval</h2>
        <p>Browser selection is only a local preference. The source-of-truth approval is written by the harness CLI.</p>
        <button type="button" onClick={choose}>Choose and copy approval command</button>
        <code>{command}</code>
        {copied && <p role="status">Command copied.</p>}
      </section>
    </main>
  );
}
