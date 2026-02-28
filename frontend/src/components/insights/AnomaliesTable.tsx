interface Anomaly {
  id: string;
  merchant: string;
  amount: number;
  timestamp: string;
  note: string;
}

export default function AnomaliesTable({ anomalies }: { anomalies: Anomaly[] }) {
  if (!anomalies.length) return <p>No anomalies detected.</p>;

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th>Time</th>
          <th>Merchant</th>
          <th>Amount</th>
          <th>Note</th>
        </tr>
      </thead>
      <tbody>
        {anomalies.map((a) => (
          <tr key={a.id}>
            <td>{new Date(a.timestamp).toLocaleString()}</td>
            <td>{a.merchant}</td>
            <td>{a.amount.toFixed(2)} ₹</td>
            <td>{a.note}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
