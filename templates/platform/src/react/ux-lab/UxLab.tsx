import { ProductPrototype } from './ProductPrototype';
import { ThemeGallery } from './ThemeGallery';
import { ThemePreview } from './ThemePreview';
import { approvedThemeId } from './theme-selection';
import themes from './theme-catalog.json';
import './ux-lab.css';

function WorkflowHome() {
  return (
    <main className="ux-shell">
      <header className="ux-heading">
        <p className="ux-eyebrow">Human-in-the-loop React UX Lab</p>
        <h1>Design philosophy before components</h1>
        <p>Discuss and approve the product soul, research visual themes, compare fifteen same-screen variants, approve one theme, then build modular pages with mock data.</p>
      </header>
      <ol className="ux-workflow-grid">
        <li>
          <span>1</span>
          <h2>SOUL.md</h2>
          <p>Human discussion establishes product character, visual grammar, motion philosophy, references, anti-references, and component constitution.</p>
          <code>saasharness run . --stage ux-philosophy --execute</code>
        </li>
        <li>
          <span>2</span>
          <h2>Pinterest research + 15 themes</h2>
          <p>Collect URLs and observations without scraping or copying source assets. Render one canonical screen in fifteen materially different systems.</p>
          <a href="/__ux/themes">Open theme gallery</a>
        </li>
        <li>
          <span>3</span>
          <h2>Theme approval</h2>
          <p>Selected theme: <strong>{approvedThemeId ?? 'not source-approved'}</strong></p>
          <p>{themes.length} candidates are loaded.</p>
        </li>
        <li>
          <span>4</span>
          <h2>Modular React mock</h2>
          <p>After approval, construct primitives, patterns, feature components, pages, and critical states using realistic mock data.</p>
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
