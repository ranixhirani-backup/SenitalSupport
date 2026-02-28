interface Merchant {
  merchant: string;
  totalAmount: number;
  count: number;
}

export default function MerchantMixTable({ merchants }: { merchants: Merchant[] }) {
  if (!merchants.length) return <p>No merchant data available.</p>;

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th>Merchant</th>
          <th>Transactions</th>
          <th>Total Spent (₹)</th>
        </tr>
      </thead>
      <tbody>
        {merchants.map((m) => (
          <tr key={m.merchant}>
            <td>{m.merchant}</td>
            <td>{m.count}</td>
            <td>{m.totalAmount.toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
