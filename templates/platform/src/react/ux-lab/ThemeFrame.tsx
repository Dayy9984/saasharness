import type { CSSProperties } from 'react';
import themes from './theme-catalog.json';

type Theme = (typeof themes)[number];

const projects = [
  { name: 'Customer onboarding', status: 'In progress', updated: 'Today' },
  { name: 'Billing recovery', status: 'Ready for review', updated: 'Yesterday' },
  { name: 'Account settings', status: 'Draft', updated: '3 days ago' },
];

export function ThemeFrame({ theme, compact = false }: { theme: Theme; compact?: boolean }) {
  const style = {
    '--theme-bg': theme.background,
    '--theme-surface': theme.surface,
    '--theme-text': theme.text,
    '--theme-muted': theme.muted,
    '--theme-accent': theme.accent,
    '--theme-accent-2': theme.accent2,
    '--theme-border': theme.border,
    '--theme-radius': theme.radius,
    '--theme-shadow': theme.shadow,
    '--theme-button-bg': theme.buttonBg,
    '--theme-button-text': theme.buttonText,
    '--theme-button-border': theme.buttonBorder,
    '--theme-button-shadow': theme.buttonShadow,
    '--theme-panel-backdrop': theme.panelBackdrop,
    '--theme-panel-blur': theme.panelBlur,
  } as CSSProperties;

  return (
    <section
      className={`theme-frame theme-frame--${theme.id} ${compact ? 'theme-frame--compact' : ''}`}
      data-theme-system={theme.id}
      style={style}
      aria-label={`${theme.name} UI treatment preview`}
    >
      <header className="theme-frame__topbar">
        <strong>Workspace</strong>
        <div className="theme-frame__top-actions" aria-hidden="true">
          <span className="theme-frame__search">Search</span>
          <span className="theme-frame__avatar">J</span>
        </div>
      </header>
      <div className="theme-frame__body">
        <nav className="theme-frame__rail" aria-label="Preview navigation">
          <span className="is-active">Overview</span>
          <span>Projects</span>
          <span>Activity</span>
          <span>Settings</span>
        </nav>
        <div className="theme-frame__content">
          <header className="theme-frame__pagehead">
            <div>
              <h2>Projects</h2>
              <p>Review active work and move the next item forward.</p>
            </div>
            <span className="theme-frame__primary-action" aria-hidden="true">New project</span>
          </header>
          <div className="theme-frame__toolbar" aria-hidden="true">
            <span>Search projects</span>
            <span>All statuses</span>
          </div>
          <div className="theme-frame__table" role="table" aria-label="Project list preview">
            <div className="theme-frame__table-head" role="row">
              <span role="columnheader">Project</span>
              <span role="columnheader">Status</span>
              <span role="columnheader">Updated</span>
            </div>
            {projects.map((project) => (
              <div className="theme-frame__row" role="row" key={project.name}>
                <strong role="cell">{project.name}</strong>
                <span role="cell">{project.status}</span>
                <span role="cell">{project.updated}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
