interface Transaction {
  id: string;
  merchant: string;
  amount_cents: number;
  currency: string;
  ts: string;
  city: string;
  country: string;
  last4?: string;
  network?: string;
}

export default function TransactionTimeline({ transactions }: { transactions: Transaction[] }) {
  if (!transactions.length) return <p>No transactions found.</p>;

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th>Time</th>
          <th>Merchant</th>
          <th>Amount</th>
          <th>City</th>
          <th>Card</th>
        </tr>
      </thead>
      <tbody>
        {transactions.map((txn) => (
          <tr key={txn.id}>
            <td>{new Date(txn.ts).toLocaleString()}</td>
            <td>{txn.merchant}</td>
            <td>{(txn.amount_cents / 100).toFixed(2)} {txn.currency}</td>
            <td>{txn.city}</td>
            <td>{txn.network || "N/A"} ••••{txn.last4 || "----"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
