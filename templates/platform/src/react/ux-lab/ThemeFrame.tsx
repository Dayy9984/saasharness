import type { CSSProperties } from 'react';
import themes from './theme-catalog.json';

type Theme = (typeof themes)[number];

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
        <span className="theme-frame__brand">PRODUCT</span>
        <div className="theme-frame__top-actions" aria-hidden="true">
          <span className="theme-frame__search">Search</span>
          <span className="theme-frame__avatar" />
        </div>
      </header>
      <div className="theme-frame__body">
        <aside className="theme-frame__rail" aria-hidden="true">
          <span className="is-active" />
          <span />
          <span />
          <span />
        </aside>
        <div className="theme-frame__content">
          <header className="theme-frame__pagehead">
            <div className="theme-frame__copy">
              <p className="theme-frame__kicker">WORKSPACE</p>
              <h2>Primary product value</h2>
              <p>The IA and content stay fixed. Only practical component treatment, density, surfaces, controls, and motion intent change.</p>
            </div>
            <div className="theme-frame__actions" aria-hidden="true">
              <span className="is-primary">PRIMARY ACTION</span>
              <span>SECONDARY</span>
            </div>
          </header>
          <section className="theme-frame__metrics" aria-hidden="true">
            <article><small>ACTIVATION</small><strong>72%</strong><span>+8.4%</span></article>
            <article><small>ACTIVE USERS</small><strong>1,248</strong><span>today</span></article>
            <article><small>RESPONSE</small><strong>184 ms</strong><span>p75</span></article>
          </section>
          <section className="theme-frame__workspace" aria-hidden="true">
            <article className="theme-frame__list">
              <header><strong>Recent activity</strong><span>View all</span></header>
              <div className="theme-frame__row"><i /><span /><b /></div>
              <div className="theme-frame__row"><i /><span /><b /></div>
              <div className="theme-frame__row"><i /><span /><b /></div>
            </article>
            <article className="theme-frame__summary">
              <small>NEXT STEP</small>
              <strong>Complete the first-value flow</strong>
              <p>One clear action, one recovery path, no decorative detour.</p>
              <span>CONTINUE</span>
            </article>
          </section>
        </div>
      </div>
    </section>
  );
}
