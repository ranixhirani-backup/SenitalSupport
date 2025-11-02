interface Category {
  name: string;
  totalAmount: number;
  count: number;
}

export default function CategorySpendTable({ categories }: { categories: Category[] }) {
  if (!categories.length) return <p>No category data available.</p>;

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th>Category</th>
          <th>Transactions</th>
          <th>Total Spent (₹)</th>
        </tr>
      </thead>
      <tbody>
        {categories.map((c) => (
          <tr key={c.name}>
            <td>{c.name}</td>
            <td>{c.count}</td>
            <td>{c.totalAmount.toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
