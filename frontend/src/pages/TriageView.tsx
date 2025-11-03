import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

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
  const { runId } = useParams<{ runId: string }>();
  const [triage, setTriage] = useState<TriageDetails | null>(null);
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sseStatus, setSseStatus] = useState<string>("connecting");

  useEffect(() => {
    if (!runId) {
      setError("No run ID provided");
      setLoading(false);
      return;
    }

    console.log("Fetching triage details for runId:", runId);

    // Fetch static triage details
    fetch(`http://localhost:3001/api/triage/${runId}/details`)
      .then((res) => {
        console.log("Details response status:", res.status);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        console.log("Triage details received:", data);
        setTriage(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch triage details:", err);
        setError(`Failed to load triage details: ${err.message}`);
        setLoading(false);
      });

    // Start SSE connection
    console.log("Starting SSE connection to:", `http://localhost:3001/api/triage/${runId}/stream`);
    const eventSource = new EventSource(
      `http://localhost:3001/api/triage/${runId}/stream`
    );

    eventSource.onopen = () => {
      console.log("SSE connection opened");
      setSseStatus("connected");
    };

    eventSource.onmessage = (e) => {
      console.log("SSE message received:", e.data);
      try {
        const data = JSON.parse(e.data);
        setEvents((prev) => [
          ...prev,
          { 
            timestamp: new Date().toLocaleTimeString(), 
            message: data.message,
            status: data.status
          },
        ]);
        
        // If triage completed, close connection
        if (data.status === "COMPLETED") {
          console.log("Triage completed, closing SSE");
          eventSource.close();
          setSseStatus("completed");
        }
      } catch (err) {
        console.warn("Malformed SSE event:", e.data, err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE connection error:", err);
      setSseStatus("error");
      eventSource.close();
    };

    return () => {
      console.log("Cleaning up SSE connection");
      eventSource.close();
    };
  }, [runId]);

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-400">Loading triage details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-900/20 border border-red-500 rounded p-4">
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 text-gray-100">
      <div>
        <h1 className="text-2xl font-semibold">Triage Run</h1>
        <p className="text-sm text-gray-400 mt-1">Run ID: {runId || "Unknown"}</p>
      </div>

      <Card title={`Live Updates (SSE) - ${sseStatus}`}>
        <div className="bg-gray-800 rounded p-3 h-48 overflow-y-auto text-sm text-gray-200 font-mono">
          {events.length === 0 ? (
            <div className="text-gray-500">
              {sseStatus === "connecting" && "Connecting to event stream..."}
              {sseStatus === "connected" && "Waiting for updates..."}
              {sseStatus === "error" && "Connection error - check console"}
            </div>
          ) : (
            events.map((e, i) => (
              <div key={i} className="mb-1">
                <span className="text-gray-400">[{e.timestamp}]</span>{" "}
                <span className={e.status === "COMPLETED" ? "text-green-400" : ""}>
                  {e.message}
                </span>
              </div>
            ))
          )}
        </div>
      </Card>

      {triage && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card title="Risk Score">
              <div className="text-3xl font-bold text-red-500">
                {triage.risk_score ?? "—"}
              </div>
            </Card>

            <Card title="Status">
              <div className="text-lg">
                <span className={`px-2 py-1 rounded ${
                  triage.status === "COMPLETED" ? "bg-green-600" : "bg-yellow-600"
                }`}>
                  {triage.status ?? "—"}
                </span>
              </div>
            </Card>
          </div>

          <Card title="Transaction Details">
            <div className="space-y-2">
              <div>
                <span className="text-gray-400">Customer:</span>{" "}
                <span className="font-medium">{triage.customer_name ?? "—"}</span>
              </div>
              <div>
                <span className="text-gray-400">Merchant:</span>{" "}
                <span className="font-medium">{triage.merchant ?? "—"}</span>
              </div>
              <div>
                <span className="text-gray-400">Amount:</span>{" "}
                <span className="font-medium">
                  {triage.amount_cents 
                    ? `₹${(triage.amount_cents / 100).toFixed(2)}`
                    : "—"}
                </span>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-800 rounded-2xl p-4 shadow">
      <h2 className="text-gray-300 font-medium mb-2">{title}</h2>
      {children}
    </div>
  );
}