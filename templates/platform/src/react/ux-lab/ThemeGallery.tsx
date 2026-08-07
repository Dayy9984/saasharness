import themes from './theme-catalog.json';
import { ThemeFrame } from './ThemeFrame';

export function ThemeGallery() {
  return (
    <main className="ux-shell">
      <header className="ux-heading">
        <h1>Compare 15 practical UI treatments</h1>
        <p>
          The navigation, content, and user flow are identical in every preview. Review only the component-level choices that matter in a commercial B2C SaaS: density, buttons, surfaces, borders, focus, accent, and motion.
        </p>
        <a className="ux-back-link" href="/__ux">Back to the UX workflow</a>
      </header>
      <section className="theme-grid" aria-label="B2C SaaS UI treatment candidates">
        {themes.map((theme, index) => (
          <article className="theme-card" key={theme.id} data-theme-id={theme.id}>
            <div className="theme-card__meta">
              <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <div>
                <h2>{theme.name}</h2>
                <p>{theme.thesis}</p>
              </div>
            </div>
            <ThemeFrame theme={theme} compact />
            <div className="theme-card__footer">
              <span>{theme.buttonTreatment}</span>
              <span>{theme.density}</span>
              <a href={`/__ux/themes/${theme.id}`}>Open preview</a>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
