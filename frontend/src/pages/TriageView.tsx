import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

interface TriageDetails {
  risk_score?: number;
  action?: string;
  reasons?: string[];
  plan?: string[];
  tool_calls?: Record<string, any>;
  fallbacks?: Record<string, any>;
}

interface SSEEvent {
  timestamp?: string;
  message: string;
}

export default function TriageView() {
  const { runId } = useParams<{ runId: string }>();
  const [triage, setTriage] = useState<TriageDetails | null>(null);
  const [events, setEvents] = useState<SSEEvent[]>([]);

  useEffect(() => {
    if (!runId) return;

    // Fetch static triage details
    fetch(`http://localhost:3001/api/triage/${runId}/details`)
      .then((res) => (res.ok ? res.json() : null))
      .then(setTriage)
      .catch((err) => console.error("Failed to fetch triage details:", err));

    // Start SSE connection (no fetch() here!)
    const eventSource = new EventSource(`http://localhost:3001/api/triage/${runId}/stream`);

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setEvents((prev) => [
          ...prev,
          { timestamp: new Date().toLocaleTimeString(), ...data },
        ]);
      } catch {
        console.warn("Malformed SSE event:", e.data);
      }
    };

    eventSource.onerror = () => {
      console.warn("SSE connection error, closing...");
      eventSource.close();
    };

    return () => eventSource.close();
  }, [runId]);

  return (
    <div className="p-6 space-y-6 text-gray-100">
      <h1 className="text-2xl font-semibold">Triage Run #{runId}</h1>

      <Card title="Live Updates (SSE)">
        <div className="bg-gray-800 rounded p-3 h-48 overflow-y-auto text-sm text-gray-200">
          {events.length === 0 ? (
            <div>No updates yet...</div>
          ) : (
            events.map((e, i) => (
              <div key={i}>
                <span className="text-gray-400">{e.timestamp}: </span>
                {e.message}
              </div>
            ))
          )}
        </div>
      </Card>

      {triage && (
        <>
          <Card title="Risk Score">
            <div className="text-3xl font-bold text-red-500">
              {triage.risk_score ?? "—"}
            </div>
          </Card>

          <Card title="Recommended Action">
            <div className="text-lg">{triage.action ?? "—"}</div>
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
