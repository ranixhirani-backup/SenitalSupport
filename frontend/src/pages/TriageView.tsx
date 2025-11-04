import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "./TriageView.css";
import { useNavigate } from "react-router-dom";

interface TriageDetails {
  run_id?: string;
  status?: string;
  risk_score?: number;
  customer_name?: string;
  merchant?: string;
  amount_cents?: number;
  alert_status?: string;
}

interface SSEEvent {
  timestamp: string;
  message?: string;
  status?: string;
}

export default function TriageView() {
  const params = useParams();
  const runId = params.runId || params.id;
  const navigate = useNavigate();

  const [triage, setTriage] = useState<TriageDetails | null>(null);
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sseStatus, setSseStatus] = useState<string>("connecting");

  useEffect(() => {
    if (!runId) {
      setError(`No run ID provided. Current URL: ${window.location.pathname}`);
      setLoading(false);
      return;
    }

    // Fetch static triage details
    fetch(`http://localhost:3001/api/triage/${runId}/details`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setTriage(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(`Failed to load triage details: ${err.message}`);
        setLoading(false);
      });

    // Start SSE connection
    const eventSource = new EventSource(
      `http://localhost:3001/api/triage/${runId}/stream`
    );

    eventSource.onopen = () => setSseStatus("connected");
    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setEvents((prev) => [
          ...prev,
          {
            timestamp: new Date().toLocaleTimeString(),
            message: data.message,
            status: data.status,
          },
        ]);
        if (data.status === "COMPLETED") {
          eventSource.close();
          setSseStatus("completed");
        }
      } catch {
        console.warn("Malformed SSE event:", e.data);
      }
    };
    eventSource.onerror = () => {
      setSseStatus("error");
      eventSource.close();
    };

    return () => eventSource.close();
  }, [runId]);

  if (loading)
    return (
      <div className="container">
        <p className="text-muted">Loading triage details...</p>
      </div>
    );

  if (error)
    return (
      <div className="container">
        <div className="error-box">{error}</div>
      </div>
    );

  return (
    <div className="container">
      <div className="header">
        <h1>Triage Run</h1>
        <p className="text-muted">Run ID: {runId || "Unknown"}</p>
      </div>

      <div className="content">
        <div className="left">
          <Card title={`Live Updates (SSE) - ${sseStatus}`}>
            <div className="event-box">
              {events.length === 0 ? (
                <div className="text-muted">
                  {sseStatus === "connecting" && "Connecting to event stream..."}
                  {sseStatus === "connected" && "Waiting for updates..."}
                  {sseStatus === "error" && "Connection error - check console"}
                </div>
              ) : (
                events.map((e, i) => (
                  <div key={i} className="event-line">
                    <span className="timestamp">[{e.timestamp}]</span>{" "}
                    <span
                      className={
                        e.status === "COMPLETED" ? "event-success" : "event-msg"
                      }
                    >
                      {e.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>

          {triage && (
            <>
              <Card title="Status">
                <div
                  className={`status-badge ${
                    triage.status === "COMPLETED" ? "status-done" : "status-pending"
                  }`}
                >
                  {triage.status ?? "—"}
                </div>
              </Card>

              <Card title="Transaction Details">
                <div className="details">
                  <p>
                    <span className="label">Customer:</span>{" "}
                    {triage.customer_name ?? "—"}
                  </p>
                  <p>
                    <span className="label">Merchant:</span>{" "}
                    {triage.merchant ?? "—"}
                  </p>
                  <p>
                    <span className="label">Amount:</span>{" "}
                    {triage.amount_cents
                      ? `₹${(triage.amount_cents / 100).toFixed(2)}`
                      : "—"}
                  </p>
                </div>
              </Card>
            </>
          )}
        </div>

        <div className="right">
          {triage && (
            <>
              <Card title="Risk Score">
                <div className="risk-score">{triage.risk_score ?? "—"}</div>
              </Card>

              <Card title="Actions">
                <div className="actions">
                  <button onClick={() => navigate(`/freeze-card/${triage?.run_id}`)}>🔒 Freeze Card</button>
                  <button onClick={() => handleAction("dispute")}>
                    ⚠️ Open Dispute
                  </button>
                  <button onClick={() => handleAction("contact")}>
                    📞 Contact Customer
                  </button>
                  <button onClick={() => handleAction("false-positive")}>
                    ✓ Mark False Positive
                  </button>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );

  function handleAction(action: string) {
    alert(`Action: ${action}\nThis will be implemented with an API call.`);
  }
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card">
      <h2>{title}</h2>
      {children}
    </div>
  );
}
