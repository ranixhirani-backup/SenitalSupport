import { useFetch } from '../hooks/useFetch';

type Summary = {
  alertsInQueue: number;
  disputesOpened: number;
  avgTriageLatencyMs: number | null;
  timestamp: string;
};

type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  created_at: string;
};

export default function Dashboard() {
  const { data: summary, loading: summaryLoading, error: summaryError } = useFetch<Summary>(
    `http://localhost:3001/api/dashboard/summary`
  );
  const { data: customers, loading: custLoading, error: custError } = useFetch<Customer[]>(
    `http://localhost:3001/api/customers`
  );

  if (summaryLoading || custLoading)
    return <p style={{ textAlign: 'center', marginTop: '2rem', color: '#ccc' }}>Loading dashboard...</p>;
  if (summaryError || custError)
    return <p style={{ textAlign: 'center', marginTop: '2rem', color: '#ff6b6b' }}>Error loading data.</p>;

  return (
    <div
      style={{
        padding: '2rem',
        fontFamily: 'Inter, sans-serif',
        color: '#f5f5f5',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ width: '100%', maxWidth: '1200px' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 600, marginBottom: '1.5rem', color: '#fff', textAlign: 'center' }}>
          Dashboard
        </h1>

        {/* Summary section */}
        {summary && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '1.5rem',
              marginBottom: '3rem',
              flexWrap: 'wrap',
            }}
          >
            {[
              { label: 'Alerts in Queue', value: summary.alertsInQueue },
              { label: 'Disputes Opened', value: summary.disputesOpened },
              {
                label: 'Avg Triage Latency',
                value: summary.avgTriageLatencyMs !== null ? `${summary.avgTriageLatencyMs} ms` : '—',
              },
            ].map((item, idx) => (
              <div
                key={idx}
                style={{
                  width: '180px',
                  background: '#1b1b1b',
                  border: '1px solid #333',
                  borderRadius: '10px',
                  padding: '1rem',
                  textAlign: 'center',
                }}
              >
                <h3 style={{ fontSize: '0.9rem', fontWeight: 500, color: '#aaa', marginBottom: '0.4rem' }}>
                  {item.label}
                </h3>
                <p style={{ fontSize: '1.5rem', fontWeight: 600, color: '#fff' }}>{item.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Customers section */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 600, marginBottom: '1rem', color: '#fff' }}>
            Customers
          </h2>
          {customers && customers.length > 0 ? (
            <div style={{ overflowX: 'auto', width: '100%', maxWidth: '900px' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.95rem',
                  color: '#f5f5f5',
                  margin: '0 auto',
                }}
              >
                <thead>
                  <tr style={{ borderBottom: '1px solid #444' }}>
                    {['Name', 'Email', 'Phone', 'Joined'].map((header) => (
                      <th
                        key={header}
                        style={{
                          textAlign: 'left',
                          padding: '0.75rem',
                          fontWeight: 500,
                          color: '#bbb',
                        }}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c, i) => (
                    <tr
                      key={c.id}
                      style={{
                        borderBottom: '1px solid #333',
                        background: i % 2 === 0 ? '#111' : '#161616',
                      }}
                    >
                      <td style={{ padding: '0.75rem' }}>{c.name}</td>
                      <td style={{ padding: '0.75rem' }}>{c.email}</td>
                      <td style={{ padding: '0.75rem' }}>{c.phone || '—'}</td>
                      <td style={{ padding: '0.75rem' }}>
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: '#aaa' }}>No customers found.</p>
          )}
        </div>
      </div>
    </div>
  );
}