// src/pages/Dashboard.tsx
import { useFetch } from '../hooks/useFetch';

type Summary = {
  alertsInQueue: number;
  disputesOpened: number;
  avgTriageLatencyMs: number | null;
  timestamp: string;
};

export default function Dashboard() {
  const { data, loading, error } = useFetch<Summary>(`http://localhost:3001/api/dashboard/summary`);

  if (loading) return <p>Loading dashboard...</p>;
  if (error) return <p>Error loading dashboard: {error}</p>;
  if (!data) return <p>No data</p>;

  return (
    <div style={{ padding: '1rem', maxWidth: 900 }}>
      <h1>Dashboard</h1>

      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        <div style={{ flex: 1, border: '1px solid #ddd', padding: '1rem', borderRadius: 6 }}>
          <h3>Alerts in Queue</h3>
          <p style={{ fontSize: 28, margin: '0.5rem 0' }}>{data.alertsInQueue}</p>
          <small>Open alerts system-wide</small>
        </div>

        <div style={{ flex: 1, border: '1px solid #ddd', padding: '1rem', borderRadius: 6 }}>
          <h3>Disputes Opened</h3>
          <p style={{ fontSize: 28, margin: '0.5rem 0' }}>{data.disputesOpened}</p>
          <small>Open dispute cases (system-wide)</small>
        </div>

        <div style={{ flex: 1, border: '1px solid #ddd', padding: '1rem', borderRadius: 6 }}>
          <h3>Avg Triage Latency</h3>
          <p style={{ fontSize: 22, margin: '0.5rem 0' }}>
            {data.avgTriageLatencyMs !== null ? `${data.avgTriageLatencyMs} ms` : '—'}
          </p>
          <small>Average time (ms) for triage runs (finished)</small>
        </div>
      </div>

      <div style={{ marginTop: '1rem', color: '#666' }}>
        <small>Last updated: {new Date(data.timestamp).toLocaleString()}</small>
      </div>
    </div>
  );
}
