import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function FreezeCard() {
  const { cardId } = useParams();
  const navigate = useNavigate();
  const [otp, setOtp] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const hasRequestedOtp = useRef(false); // Add this ref

  useEffect(() => {
    if (!cardId || hasRequestedOtp.current) return; // Check ref
    hasRequestedOtp.current = true; // Mark as requested

    // Request OTP from backend
    fetch("http://localhost:3001/api/action/freeze-card/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ card_id: cardId }),
    })
      .then((res) => res.json())
      .then((data) => {
        setGeneratedOtp(data.otp);
        alert(`🔐 Your OTP is: ${data.otp}`);
      })
      .catch((err) => {
        console.error(err);
        setStatus("Failed to generate OTP");
      });
  }, [cardId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cardId || !otp) return;

    try {
      const res = await fetch(
        "http://localhost:3001/api/action/freeze-card/confirm",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ card_id: cardId, otp }),
        }
      );

      const data = await res.json();
      if (res.ok) {
        setStatus(`✅ ${data.message}`);
        setTimeout(() => navigate(-1), 2000);
      } else {
        setStatus(`❌ ${data.message}`);
      }
    } catch (err) {
      console.error(err);
      setStatus("Error confirming OTP");
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        color: "white",
      }}
    >
      <h2>Freeze Card Verification</h2>

      <form onSubmit={handleSubmit} style={{ marginTop: "20px" }}>
        <div style={{ display: "flex", gap: "10px" }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <input
              key={i}
              maxLength={1}
              value={otp[i] || ""}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/, "");
                const updated = otp.substring(0, i) + val + otp.substring(i + 1);
                setOtp(updated);
              }}
              style={{
                width: "40px",
                height: "40px",
                fontSize: "18px",
                textAlign: "center",
                borderRadius: "8px",
                border: "1px solid #888",
                background: "#111",
                color: "white",
              }}
            />
          ))}
        </div>

        <button
          type="submit"
          style={{
            marginTop: "20px",
            padding: "10px 20px",
            background: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Verify & Freeze
        </button>
      </form>

      {status && <p style={{ marginTop: "20px" }}>{status}</p>}
    </div>
  );
}