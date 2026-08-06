import type { CSSProperties } from 'react';
import themes from './theme-catalog.json';

type Theme = (typeof themes)[number];

const blocks = [
  [0, 1], [1, 1], [2, 1], [2, 0],
  [4, 0], [4, 1], [5, 1], [5, 2],
  [1, 3], [2, 3], [2, 4], [3, 4],
];

function BlockField() {
  return (
    <div className="theme-block-field" aria-hidden="true">
      {blocks.map(([x, y], index) => (
        <span key={`${x}-${y}-${index}`} style={{ gridColumn: x + 1, gridRow: y + 1 }} />
      ))}
    </div>
  );
}

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
  } as CSSProperties;

  return (
    <section
      className={`theme-frame theme-frame--${theme.id} ${compact ? 'theme-frame--compact' : ''}`}
      data-theme-system={theme.id}
      style={style}
      aria-label={`${theme.name} design preview`}
    >
      <header className="theme-frame__header">
        <span className="theme-frame__brand">PRODUCT</span>
        <span className="theme-frame__status">DESIGN ONLY</span>
      </header>
      <div className="theme-frame__body">
        <aside className="theme-frame__rail" aria-hidden="true">
          <span className="is-active" />
          <span />
          <span />
        </aside>
        <div className="theme-frame__content">
          <div className="theme-frame__copy">
            <p className="theme-frame__kicker">CANONICAL SCREEN</p>
            <h2>Primary product promise</h2>
            <p>Neutral labels keep all fifteen candidates comparable. No real mock data is used in this phase.</p>
            <div className="theme-frame__actions" aria-hidden="true">
              <span>PRIMARY ACTION</span>
              <span>SECONDARY</span>
            </div>
          </div>
          <BlockField />
        </div>
      </div>
    </section>
  );
}
