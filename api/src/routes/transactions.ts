import { Router } from 'express';
import { pool } from '../db';
import { randomUUID } from 'crypto';

const router = Router();

router.post('/ingest/transactions', async (req, res) => {
  const client = await pool.connect();
  try {
    const { transactions } = req.body;

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ error: 'No transactions provided' });
    }

    const requestId = randomUUID();

    await client.query('BEGIN');

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

      await client.query(
        `INSERT INTO transactions 
          (customer_id, card_id, merchant, amount_cents, currency, mcc, device_id, country, city, ts)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [customer_id, card_id, merchant, amount_cents, currency, mcc, device_id, country, city, ts]
      );
    }

    await client.query('COMMIT');

    res.json({
      accepted: true,
      count: transactions.length,
      requestId
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



// GET /api/customer/:id/transactions
// Query params: limit, offset, from, to
router.get('/customer/:id/transactions', async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const from = req.query.from as string; // ISO date string
    const to = req.query.to as string;

    // Build query with optional date filters
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

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM transactions WHERE customer_id = $1';
    const countParams: any[] = [id];
    let countParamIndex = 2;

    if (from) {
      countQuery += ` AND ts >= $${countParamIndex}`;
      countParams.push(from);
      countParamIndex++;
    }

    if (to) {
      countQuery += ` AND ts <= $${countParamIndex}`;
      countParams.push(to);
    }

    const countResult = await pool.query(countQuery, countParams);
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