import type { CSSProperties, ReactNode } from 'react';
import themes from '../theme-catalog.json';

export function PrototypeShell({ themeId, children }: { themeId: string; children: ReactNode }) {
  const theme = themes.find((candidate) => candidate.id === themeId) ?? themes[0];
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
  } as CSSProperties;
  return (
    <section className="prototype-shell" data-theme-id={theme.id} style={style}>
      {children}
    </section>
  );
}
