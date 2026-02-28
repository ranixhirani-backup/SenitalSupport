import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface Alert {
  id: string;
  riskScore: number;
  status: string;
  createdAt: string;
  customer: { id: string; name: string; email: string };
  transaction: { id: string; merchant: string; amount: number; timestamp: string } | null;
}

interface Pagination {
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
}

export default function Alerts() {
   const navigate = useNavigate();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    async function fetchAlerts() {
      try {
        setLoading(true);
        const res = await fetch(`http://localhost:3001/api/alerts?status=OPEN&limit=10&offset=${page * 10}`);
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const data = await res.json();
        setAlerts(data.items);
        setPagination(data.pagination);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }

    fetchAlerts();
  }, [page]);

  if (loading) return <p>Loading alerts...</p>;
  if (error) return <p>Error loading alerts: {error}</p>;
  if (!alerts.length) return <p>No open alerts found.</p>;

  return (
    <div style={{ padding: "1rem", maxWidth: 1200 }}>
      <h1>Alerts Queue</h1>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
        <thead>
          <tr style={{ background: "#f3f3f3", textAlign: "left", color: "#333" }}>
            <th style={{ padding: "8px" }}>Risk</th>
            <th style={{ padding: "8px" }}>Customer</th>
            <th style={{ padding: "8px" }}>Merchant</th>
            <th style={{ padding: "8px" }}>Amount</th>
            <th style={{ padding: "8px" }}>Created At</th>
            <th style={{ padding: "8px" }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {alerts.map((alert) => (
            <tr key={alert.id} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: "8px", fontWeight: 600, color: alert.riskScore > 70 ? "red" : "#eee" }}>
                {alert.riskScore}
              </td>
              <td style={{ padding: "8px" }}>{alert.customer.name}</td>
              <td style={{ padding: "8px" }}>{alert.transaction?.merchant || "—"}</td>
              <td style={{ padding: "8px" }}>
                {alert.transaction ? `₹${alert.transaction.amount.toFixed(2)}` : "—"}
              </td>
              <td style={{ padding: "8px" }}>
                {new Date(alert.createdAt).toLocaleString()}
              </td>
              <td style={{ padding: "8px" }}>
                <button
  onClick={async () => {
    const res = await fetch("http://localhost:3001/api/triage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alertId: alert.id }),
    });
    const data = await res.json();
    if (data.runId) {
      navigate(`/triage/${data.runId}`);
    }
  }}
>
  Open Triage
</button>

              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {pagination && (
        <div style={{ marginTop: "1rem", display: "flex", justifyContent: "space-between" }}>
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            style={{ padding: "0.5rem 1rem" }}
          >
            Prev
          </button>
          <span>
            Page {page + 1} of {Math.ceil(pagination.total / pagination.limit)}
          </span>
          <button
            disabled={!pagination.hasMore}
            onClick={() => setPage((p) => p + 1)}
            style={{ padding: "0.5rem 1rem" }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
