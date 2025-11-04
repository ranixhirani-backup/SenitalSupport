import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function FreezeCard() {
  const { cardId } = useParams();
  const navigate = useNavigate();
  const [otp, setOtp] = useState(Array(6).fill(""));
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const hasRequestedOtp = useRef(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Request OTP once
  useEffect(() => {
    if (!cardId || hasRequestedOtp.current) return;
    hasRequestedOtp.current = true;

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
    if (!cardId) return;

    const otpValue = otp.join("");
    if (otpValue.length !== 6) {
      setStatus("❌ Please enter all 6 digits");
      return;
    }

    try {
      const res = await fetch(
        "http://localhost:3001/api/action/freeze-card/confirm",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ card_id: cardId, otp: otpValue }),
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

  // Handle OTP input navigation
  const handleChange = (value: string, index: number) => {
    const sanitized = value.replace(/\D/, ""); // only digits
    const newOtp = [...otp];
    newOtp[index] = sanitized;
    setOtp(newOtp);

    if (sanitized && index < otp.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

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
      <p>Card ID: {cardId}</p>

      <form onSubmit={handleSubmit} style={{ marginTop: "20px" }}>
        <div style={{ display: "flex", gap: "10px" }}>
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(e.target.value, i)}
              onKeyDown={(e) => handleKeyDown(e, i)}
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
