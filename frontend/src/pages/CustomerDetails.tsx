import { useParams } from "react-router-dom";
import { useFetch } from "../hooks/useFetch";
import TransactionTimeline from "../components/transactions/TransactionTimeline";
import CategorySpendTable from "../components/insights/CategorySpendTable";
import MerchantMixTable from "../components/insights/MerchantMixTable";
import AnomaliesTable from "../components/insights/AnomaliesTable";

interface Transaction {
  id: string;
  merchant: string;
  amount_cents: number;
  currency: string;
  mcc: string;
  device_id: string;
  city: string;
  country: string;
  ts: string;
  status?: string; // optional in case dispute info is missing
}

interface InsightSummary {
  categories: { name: string; totalAmount: number; count: number }[];
  topMerchants: { merchant: string; totalAmount: number; count: number }[];
  anomalies: { id: string; merchant: string; amount: number; note: string; timestamp: string }[];
}

export default function CustomerDetails() {
  const { id } = useParams();
  const transactionsUrl = `http://localhost:3001/api/customer/${id}/transactions?limit=20`;
  const insightsUrl = `http://localhost:3001/api/insights/${id}/summary`;

  const {
    data: transactionsData,
    loading: transactionsLoading,
    error: transactionsError,
  } = useFetch<{ items: Transaction[] }>(transactionsUrl);

  const {
    data: insightsData,
    loading: insightsLoading,
    error: insightsError,
  } = useFetch<InsightSummary>(insightsUrl);

  if (transactionsLoading || insightsLoading) return <p>Loading...</p>;
  if (transactionsError || insightsError) return <p>Error loading data.</p>;

  // ✅ compute KPIs safely
  return (
    <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "2rem" }}>
      <h1>Customer {id}</h1>


      <section>
        <h2>Transaction Timeline</h2>
        <TransactionTimeline transactions={transactionsData?.items || []} />
      </section>

      <section>
        <h2>Category Spend</h2>
        <CategorySpendTable categories={insightsData?.categories || []} />
      </section>

      <section>
        <h2>Merchant Mix</h2>
        <MerchantMixTable merchants={insightsData?.topMerchants || []} />
      </section>

      <section>
        <h2>Anomalies</h2>
        <AnomaliesTable anomalies={insightsData?.anomalies || []} />
      </section>
    </div>
  );
}
