import { useState } from 'react';

export function AdminPage() {
  const [userId, setUserId] = useState('');
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function lookup() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/users/' + encodeURIComponent(userId));
      const body = await response.json() as { error?: string };
      if (!response.ok) setError(body.error ?? 'Request failed');
      else setResult(body);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell">
      <p className="eyebrow">Admin and support console scaffold</p>
      <h1>User timeline</h1>
      <p>Inspect identity, orders, entitlements, credits, and audit history through one support surface.</p>
      <label>
        User ID
        <input value={userId} onChange={(event) => setUserId(event.target.value)} />
      </label>
      <button type="button" disabled={!userId || loading} onClick={lookup}>
        {loading ? 'Looking up…' : 'Look up user'}
      </button>
      {error && <p role="alert">{error}</p>}
      {result !== null && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </main>
  );
}
