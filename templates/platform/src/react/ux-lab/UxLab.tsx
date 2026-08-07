import { ProductPrototype } from './ProductPrototype';
import { ThemeGallery } from './ThemeGallery';
import { ThemePreview } from './ThemePreview';
import { approvedThemeId } from './theme-selection';
import themes from './theme-catalog.json';
import './ux-lab.css';
import './theme-structures.css';

function WorkflowHome() {
  return (
    <main className="ux-shell">
      <header className="ux-heading">
        <h1>React UX approval workflow</h1>
        <p>Agree on a short product UI foundation, compare practical treatments of one screen, approve one, then complete every page and state with realistic mock data before production implementation.</p>
      </header>
      <ol className="ux-workflow-list">
        <li>
          <span className="ux-step-number">1</span>
          <div>
            <h2>Approve the UI foundation</h2>
            <p><code>SOUL.md</code> records hierarchy, density, control material, motion, accessibility, references, and explicit anti-patterns. It stays short.</p>
            <code>saasharness run . --stage ux-philosophy --execute</code>
          </div>
        </li>
        <li>
          <span className="ux-step-number">2</span>
          <div>
            <h2>Compare 15 component treatments</h2>
            <p>The IA, layout, content, and task remain fixed. Only useful control and surface decisions change.</p>
            <a href="/__ux/themes">Open the treatment gallery</a>
          </div>
        </li>
        <li>
          <span className="ux-step-number">3</span>
          <div>
            <h2>Record the human selection</h2>
            <p>Selected treatment: <strong>{approvedThemeId ?? 'not approved'}</strong>. {themes.length} candidates are available.</p>
          </div>
        </li>
        <li>
          <span className="ux-step-number">4</span>
          <div>
            <h2>Complete the product mock</h2>
            <p>Build the real IA, onboarding, core flow, settings, billing, empty, loading, error, permission, and recovery states as reusable React components.</p>
            <a href="/__ux/prototype">Open the product prototype</a>
          </div>
        </li>
      </ol>
      <section className="ux-policy-note">
        <h2>Stage order</h2>
        <code>discovery → ux-philosophy → ux-themes → ux-prototype → architecture</code>
        <p>Each stage runs independent critics and still requires explicit human approval.</p>
      </section>
    </main>
  );
}

export function UxLab() {
  const path = window.location.pathname.replace(/\/+$/, '');
  if (path === '/__ux/themes') return <ThemeGallery />;
  if (path.startsWith('/__ux/themes/')) return <ThemePreview themeId={decodeURIComponent(path.split('/').at(-1) ?? '')} />;
  if (path === '/__ux/prototype') return <ProductPrototype />;
  return <WorkflowHome />;
}
