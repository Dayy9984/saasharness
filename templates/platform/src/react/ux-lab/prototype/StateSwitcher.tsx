export function StateSwitcher<T extends string>({ states, active, onChange }: { states: readonly T[]; active: T; onChange: (state: T) => void }) {
  return (
    <nav className="prototype-state-switcher" aria-label="Mock state selector">
      {states.map((state) => (
        <button key={state} type="button" aria-pressed={active === state} onClick={() => onChange(state)}>{state}</button>
      ))}
    </nav>
  );
}
