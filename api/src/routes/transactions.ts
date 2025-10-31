import { Router } from 'express';
import { pool } from '../db';
import { randomUUID } from 'crypto';

const router = Router();

type TransactionInput = {
  customer_id: string;
  card_id: string;
  merchant: string;
  amount_cents: number;
  currency?: string;
  mcc: string;
  device_id: string;
  country?: string;
  city: string;
  ts: string;
};


// Helper: calculate risk score
const calculateRiskScore = async (client: any, txn: TransactionInput) => {
  let risk = 0;
  // 1️⃣ Amount deviation (0.4)
  const avgResult = await client.query(
    `SELECT AVG(amount_cents) AS avg_amt FROM transactions WHERE customer_id = $1`,
    [txn.customer_id]
  );
  const avg = avgResult.rows[0].avg_amt || 0;
  if (avg && Math.abs(txn.amount_cents - avg) / avg > 0.5) risk += 0.4;

  // 2️⃣ Unusual location (0.3)
  const locResult = await client.query(
    `SELECT COUNT(*) FROM transactions WHERE customer_id = $1 AND city = $2`,
    [txn.customer_id, txn.city]
  );
  if (parseInt(locResult.rows[0].count) === 0) risk += 0.3;

  // 3️⃣ Unusual device (0.2)
  const devResult = await client.query(
    `SELECT COUNT(*) FROM transactions WHERE customer_id = $1 AND device_id = $2`,
    [txn.customer_id, txn.device_id]
  );
  if (parseInt(devResult.rows[0].count) === 0) risk += 0.2;

  // 4️⃣ Risky MCC (0.3)
  const riskyMCC = ['7995', '4829', '6051', '6540']; // gambling, crypto, etc.
  if (riskyMCC.includes(txn.mcc)) risk += 0.3;

  // 5️⃣ Too many txns in short time (0.2)
  const burst = await client.query(
    `SELECT COUNT(*) FROM transactions 
     WHERE customer_id = $1 AND ts >= NOW() - INTERVAL '1 minute'`,
    [txn.customer_id]
  );
  if (parseInt(burst.rows[0].count) > 5) risk += 0.2;

  return Math.min(risk, 1.0);
};

//POST /api/ingest/transactions
router.post('/ingest/transactions', async (req, res) => {
  const client = await pool.connect();
  try {
    const { transactions } = req.body;
    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ error: 'No transactions provided' });
    }

    const requestId = randomUUID();
    await client.query('BEGIN');

    let createdAlerts: any[] = [];

    for (const txn of transactions) {
      const {
        customer_id,
        card_id,
        merchant,
        amount_cents,
        currency = 'INR',
        mcc,
        device_id,
        country = 'IN',
        city,
        ts
      } = txn;

      // Insert transaction and return ID
      const result = await client.query(
        `INSERT INTO transactions 
          (customer_id, card_id, merchant, amount_cents, currency, mcc, device_id, country, city, ts)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         RETURNING id`,
        [customer_id, card_id, merchant, amount_cents, currency, mcc, device_id, country, city, ts]
      );

      const txnId = result.rows[0].id;

      // Compute risk
      const riskScore = await calculateRiskScore(client, txn);

      // If risky → create alert
      if (riskScore > 0.7) {
        const alertId = randomUUID();
        await client.query(
          `INSERT INTO alerts (id, customer_id, suspect_txn_id, risk_score, status, created_at)
           VALUES ($1, $2, $3, $4, 'OPEN', NOW())`,
          [alertId, customer_id, txnId, riskScore]
        );

        createdAlerts.push({ alertId, txnId, riskScore });
      }
    }

    await client.query('COMMIT');

    res.json({
      accepted: true,
      count: transactions.length,
      requestId,
      alertsGenerated: createdAlerts.length,
      alerts: createdAlerts
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error ingesting transactions:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error)
    });
  } finally {
    client.release();
  }
});

// 📄 GET /api/customer/:id/transactions
router.get('/customer/:id/transactions', async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const from = req.query.from as string;
    const to = req.query.to as string;

    // Build query
    let query = `
      SELECT 
        t.id,
        t.merchant,
        t.amount_cents,
        t.currency,
        t.mcc,
        t.device_id,
        t.city,
        t.country,
        t.ts,
        c.last4,
        c.network
      FROM transactions t
      LEFT JOIN cards c ON t.card_id = c.id
      WHERE t.customer_id = $1
    `;

    const params: any[] = [id];
    let paramIndex = 2;

    if (from) {
      query += ` AND t.ts >= $${paramIndex}`;
      params.push(from);
      paramIndex++;
    }

    if (to) {
      query += ` AND t.ts <= $${paramIndex}`;
      params.push(to);
      paramIndex++;
    }

    query += ` ORDER BY t.ts DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM transactions WHERE customer_id = $1`,
      [id]
    );
    const total = parseInt(countResult.rows[0].count);

    res.json({
      items: result.rows,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total
      }
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;