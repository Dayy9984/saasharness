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
  } as CSSProperties;
  return <section className="prototype-shell" style={style}>{children}</section>;
}
