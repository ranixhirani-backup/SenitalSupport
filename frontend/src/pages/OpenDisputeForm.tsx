import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function OpenDisputeForm() {
  const { txnId } = useParams();
  const navigate = useNavigate();

  const [reasonCode, setReasonCode] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!reasonCode) return setError("Please provide a reason code.");
    if (!confirm) return setError("You must confirm before submitting.");

    setLoading(true);
    try {
      const res = await fetch("http://localhost:3001/api/action/open-dispute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txnId, reasonCode, confirm }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Dispute creation failed");

      // Redirect to a case page (or back to dashboard)
      navigate(`/case/${data.caseId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: "500px", margin: "3rem auto", color: "#fff" }}>
      <h1>Open Dispute</h1>
      <p>Transaction ID: <b>{txnId}</b></p>

      <form onSubmit={handleSubmit} style={{ marginTop: "1rem" }}>
        <label style={{ display: "block", marginBottom: "8px" }}>
          Reason Code:
        </label>
        <input
          value={reasonCode}
          onChange={(e) => setReasonCode(e.target.value)}
          style={{ width: "100%", padding: "8px", marginBottom: "1rem" }}
        />

        <label>
          <input
            type="checkbox"
            checked={confirm}
            onChange={() => setConfirm((c) => !c)}
            style={{ marginRight: "6px" }}
          />
          I confirm to open dispute
        </label>

        {error && <p style={{ color: "red", marginTop: "1rem" }}>{error}</p>}

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: "1.5rem",
            padding: "10px 20px",
            background: "#ff9800",
            border: "none",
            cursor: "pointer",
          }}
        >
          {loading ? "Submitting..." : "Submit Dispute"}
        </button>
      </form>
    </div>
  );
}
