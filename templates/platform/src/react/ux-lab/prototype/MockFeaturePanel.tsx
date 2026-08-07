import { useMemo, useState } from 'react';

export interface MockFeatureState {
  state: string;
  title: string;
  message: string;
}

interface WorkItem {
  id: number;
  name: string;
  status: 'Active' | 'Review' | 'Draft';
  owner: string;
  updated: string;
}

const initialItems: WorkItem[] = [
  { id: 1, name: 'Customer onboarding', status: 'Active', owner: 'You', updated: 'Today' },
  { id: 2, name: 'Billing recovery', status: 'Review', owner: 'Jin', updated: 'Yesterday' },
  { id: 3, name: 'Account settings', status: 'Draft', owner: 'Mina', updated: '3 days ago' },
];

function StatusPanel({ fixture, onAction }: { fixture: MockFeatureState; onAction: (message: string) => void }) {
  if (fixture.state === 'loading') {
    return (
      <div className="product-state" aria-busy="true" aria-label="Loading work items">
        <div className="product-skeleton product-skeleton--title" />
        <div className="product-skeleton" />
        <div className="product-skeleton" />
        <div className="product-skeleton" />
      </div>
    );
  }

  const actions: Record<string, { label: string; feedback: string }> = {
    empty: { label: 'Create the first item', feedback: 'The create flow would open here.' },
    error: { label: 'Retry', feedback: 'Retry requested. Existing work remains preserved.' },
    permission: { label: 'Request access', feedback: 'Access request sent to the workspace owner.' },
    'paid-limit': { label: 'Compare plans', feedback: 'Plan comparison would open with the current limit explained.' },
    delayed: { label: 'View activity', feedback: 'Background activity and cancellation controls would open here.' },
  };
  const action = actions[fixture.state] ?? actions.empty;

  return (
    <div className="product-state" data-state={fixture.state}>
      <h3>{fixture.title}</h3>
      <p>{fixture.message}</p>
      {fixture.state === 'delayed' && (
        <div className="product-progress" role="progressbar" aria-label="Background work progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={64}>
          <span style={{ width: '64%' }} />
        </div>
      )}
      <button type="button" onClick={() => onAction(action.feedback)}>{action.label}</button>
    </div>
  );
}

export function MockFeaturePanel({ fixture }: { fixture: MockFeatureState }) {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState(initialItems);
  const [selectedId, setSelectedId] = useState<number | null>(initialItems[0].id);
  const [notice, setNotice] = useState('');
  const filteredItems = useMemo(
    () => items.filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase())),
    [items, query],
  );
  const selected = items.find((item) => item.id === selectedId) ?? null;

  const createItem = () => {
    const nextId = Math.max(...items.map((item) => item.id), 0) + 1;
    const next: WorkItem = { id: nextId, name: `Untitled item ${nextId}`, status: 'Draft', owner: 'You', updated: 'Now' };
    setItems((current) => [next, ...current]);
    setSelectedId(nextId);
    setNotice('A draft item was created and selected.');
  };

  return (
    <div className="product-app" data-state={fixture.state}>
      <header className="product-topbar">
        <a className="product-brand" href="/__ux/prototype" aria-label="Product prototype home">Workspace</a>
        <label className="product-global-search">
          <span className="sr-only">Search the workspace</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" />
        </label>
        <button type="button" className="product-account" aria-label="Open account menu">J</button>
      </header>

      <div className="product-layout">
        <nav className="product-nav" aria-label="Product navigation">
          <a className="is-active" href="#__work">Work</a>
          <a href="#__activity">Activity</a>
          <a href="#__billing">Billing</a>
          <a href="#__settings">Settings</a>
          <a href="#__help">Help</a>
        </nav>

        <main className="product-main" id="__work">
          <header className="product-page-header">
            <div>
              <h2>{fixture.title}</h2>
              <p>{fixture.message}</p>
            </div>
            <button type="button" className="product-primary-action" onClick={createItem}>Create item</button>
          </header>

          <div className="product-toolbar">
            <label>
              <span className="sr-only">Filter items</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter items" />
            </label>
            <button type="button" onClick={() => setQuery('')}>Clear</button>
          </div>

          {fixture.state === 'ready' ? (
            <div className="product-content-grid">
              <section className="product-table" aria-label="Work items">
                <div className="product-table__head" role="row">
                  <span>Item</span><span>Status</span><span>Owner</span><span>Updated</span>
                </div>
                {filteredItems.length > 0 ? filteredItems.map((item) => (
                  <button
                    type="button"
                    className={item.id === selectedId ? 'product-row is-selected' : 'product-row'}
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                  >
                    <strong>{item.name}</strong>
                    <span><i data-status={item.status.toLowerCase()} />{item.status}</span>
                    <span>{item.owner}</span>
                    <span>{item.updated}</span>
                  </button>
                )) : (
                  <div className="product-inline-empty">
                    <strong>No matching items</strong>
                    <p>Clear the search or create a new item.</p>
                  </div>
                )}
              </section>

              <aside className="product-inspector" aria-label="Selected item details">
                {selected ? (
                  <>
                    <h3>{selected.name}</h3>
                    <dl>
                      <div><dt>Status</dt><dd>{selected.status}</dd></div>
                      <div><dt>Owner</dt><dd>{selected.owner}</dd></div>
                      <div><dt>Updated</dt><dd>{selected.updated}</dd></div>
                    </dl>
                    <button type="button" onClick={() => setNotice('The selected item would open in its full task flow.')}>Open item</button>
                  </>
                ) : <p>Select an item to inspect it.</p>}
              </aside>
            </div>
          ) : (
            <StatusPanel fixture={fixture} onAction={setNotice} />
          )}
          <p className="product-notice" role="status" aria-live="polite">{notice}</p>
        </main>
      </div>
    </div>
  );
}
