import { Router } from 'express';
import { pool } from '../db';

const router = Router();

// GET /api/insights/:id/summary
router.get('/insights/:id/summary', async (req, res) => {
  try {
    const { id } = req.params;
    const days = parseInt(req.query.days as string) || 90;

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    // Top merchants
    const merchantsResult = await pool.query(
      `SELECT 
        merchant,
        COUNT(*) as count,
        SUM(amount_cents) as total_cents
      FROM transactions
      WHERE customer_id = $1 AND ts >= $2
      GROUP BY merchant
      ORDER BY count DESC
      LIMIT 10`,
      [id, fromDate.toISOString()]
    );

    // Category breakdown (simplified by MCC ranges)
    const categoriesResult = await pool.query(
      `SELECT 
        CASE 
          WHEN mcc BETWEEN '5000' AND '5599' THEN 'Transportation'
          WHEN mcc BETWEEN '5600' AND '5699' THEN 'Clothing'
          WHEN mcc BETWEEN '5700' AND '5799' THEN 'Home & Garden'
          WHEN mcc BETWEEN '5800' AND '5999' THEN 'Restaurants'
          WHEN mcc BETWEEN '7000' AND '7999' THEN 'Services'
          ELSE 'Other'
        END as category,
        COUNT(*) as count,
        SUM(amount_cents) as total_cents
      FROM transactions
      WHERE customer_id = $1 AND ts >= $2
      GROUP BY category
      ORDER BY total_cents DESC`,
      [id, fromDate.toISOString()]
    );

    // Monthly trend (last 6 months)
    const trendResult = await pool.query(
      `SELECT 
        TO_CHAR(ts, 'YYYY-MM') as month,
        COUNT(*) as transaction_count,
        SUM(amount_cents) as total_cents,
        AVG(amount_cents) as avg_cents
      FROM transactions
      WHERE customer_id = $1 AND ts >= $2
      GROUP BY month
      ORDER BY month DESC
      LIMIT 6`,
      [id, fromDate.toISOString()]
    );

    // Anomalies (transactions > 2x average)
    const avgResult = await pool.query(
      `SELECT AVG(amount_cents) as avg FROM transactions WHERE customer_id = $1`,
      [id]
    );
    const avgAmount = parseFloat(avgResult.rows[0].avg) || 0;
    const threshold = Math.floor(avgAmount * 2);

    const anomaliesResult = await pool.query(
      `SELECT 
        id,
        merchant,
        amount_cents,
        ts
      FROM transactions
      WHERE customer_id = $1 AND ts >= $2 AND amount_cents > $3
      ORDER BY ts DESC
      LIMIT 10`,
      [id, fromDate.toISOString(), threshold]
    );

    // Device changes (flag if recent device change)
    const devicesResult = await pool.query(
      `SELECT 
        device_id,
        COUNT(*) as count,
        MAX(ts) as last_used
      FROM transactions
      WHERE customer_id = $1 AND ts >= $2
      GROUP BY device_id
      ORDER BY last_used DESC`,
      [id, fromDate.toISOString()]
    );

    res.json({
      period: `${days} days`,
      topMerchants: merchantsResult.rows.map(r => ({
        merchant: r.merchant,
        count: parseInt(r.count),
        totalAmount: parseInt(r.total_cents) / 100
      })),
      categories: categoriesResult.rows.map(r => ({
        name: r.category,
        count: parseInt(r.count),
        totalAmount: parseInt(r.total_cents) / 100,
        percentage: 0 // Will calculate on frontend
      })),
      monthlyTrend: trendResult.rows.map(r => ({
        month: r.month,
        transactionCount: parseInt(r.transaction_count),
        totalAmount: parseInt(r.total_cents) / 100,
        avgAmount: parseFloat(r.avg_cents) / 100
      })),
      anomalies: anomaliesResult.rows.map(r => ({
        id: r.id,
        merchant: r.merchant,
        amount: parseInt(r.amount_cents) / 100,
        timestamp: r.ts,
        note: `${((parseInt(r.amount_cents) / avgAmount) * 100).toFixed(0)}% above average`
      })),
      devices: devicesResult.rows.map(r => ({
        deviceId: r.device_id,
        count: parseInt(r.count),
        lastUsed: r.last_used
      })),
      stats: {
        avgTransactionAmount: avgAmount / 100,
        anomalyThreshold: threshold / 100
      }
    });

  } catch (error) {
    console.error('Error fetching insights:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;