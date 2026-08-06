import themes from './theme-catalog.json';
import { ThemeFrame } from './ThemeFrame';

export function ThemeGallery() {
  return (
    <main className="ux-shell">
      <header className="ux-heading">
        <p className="ux-eyebrow">Stage 2 · UI treatment comparison</p>
        <h1>15 clean B2C SaaS variants</h1>
        <p>
          Every candidate keeps the same conventional IA, hierarchy, content, and interaction model. Compare only useful product-design choices such as button material, surface depth, density, radius, focus, accent, and motion intent.
        </p>
        <a className="ux-back-link" href="/__ux">← Design workflow</a>
      </header>
      <section className="theme-grid" aria-label="B2C SaaS UI treatment candidates">
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
              <span>{theme.buttonTreatment}</span>
              <span>{theme.density}</span>
              <a href={`/__ux/themes/${theme.id}`}>Open full preview</a>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
