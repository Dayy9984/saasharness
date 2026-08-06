import themes from './theme-catalog.json';
import { ThemeFrame } from './ThemeFrame';

export function ThemeGallery() {
  return (
    <main className="ux-shell">
      <header className="ux-heading">
        <p className="ux-eyebrow">Stage 2 · Theme exploration</p>
        <h1>15 materially different directions</h1>
        <p>
          Every card renders the same neutral screen. Compare hierarchy, typography, shape, density, texture, and motion intent—not product data.
        </p>
        <a className="ux-back-link" href="/__ux">← Design workflow</a>
      </header>
      <section className="theme-grid" aria-label="Design theme candidates">
        {themes.map((theme, index) => (
          <article className="theme-card" key={theme.id} data-theme-id={theme.id}>
            <div className="theme-card__meta">
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div>
                <h2>{theme.name}</h2>
                <p>{theme.thesis}</p>
              </div>
            </div>
            <ThemeFrame theme={theme} compact />
            <div className="theme-card__footer">
              <span>{theme.fontMood}</span>
              <span>{theme.density}</span>
              <a href={`/__ux/themes/${theme.id}`}>Open full preview</a>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
