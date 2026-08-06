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
        <p className="ux-eyebrow">Human-in-the-loop React UX Lab</p>
        <h1>Clean B2C foundation before components</h1>
        <p>Confirm a short product UI foundation, compare fifteen practical treatments of the same standard SaaS screen, approve one, then build every page and responsive state with realistic mock data.</p>
      </header>
      <ol className="ux-workflow-grid">
        <li>
          <span>1</span>
          <h2>SOUL.md</h2>
          <p>A brief contract for clarity, hierarchy, density, control material, motion, accessibility, references, and anti-patterns. It is not a branding manifesto.</p>
          <code>saasharness run . --stage ux-philosophy --execute</code>
        </li>
        <li>
          <span>2</span>
          <h2>Public research + 15 UI treatments</h2>
          <p>Research clean product interfaces and compare the same IA with subtle button, surface, density, radius, accent, focus, and motion differences.</p>
          <a href="/__ux/themes">Open UI treatment gallery</a>
        </li>
        <li>
          <span>3</span>
          <h2>Treatment approval</h2>
          <p>Selected treatment: <strong>{approvedThemeId ?? 'not source-approved'}</strong></p>
          <p>{themes.length} clean variants are loaded.</p>
        </li>
        <li>
          <span>4</span>
          <h2>Complete React UX mock</h2>
          <p>After approval, construct reusable components and every required page, state, journey, and responsive behavior with realistic mock data before production implementation begins.</p>
          <a href="/__ux/prototype">Open product prototype</a>
        </li>
      </ol>
      <section className="ux-policy-note">
        <h2>Approval order</h2>
        <code>discovery → ux-philosophy → ux-themes → ux-prototype → architecture</code>
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
