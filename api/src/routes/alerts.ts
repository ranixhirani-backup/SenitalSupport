import { Router } from 'express';
import { pool } from '../db';

const router = Router();

// GET /api/alerts
// Query params: status, limit, offset
router.get('/alerts', async (req, res) => {
  try {
    const status = (req.query.status as string) || 'OPEN';
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const query = `
      SELECT 
        a.id,
        a.risk_score,
        a.status,
        a.created_at,
        c.id AS customer_id,
        c.name AS customer_name,
        c.email AS customer_email,
        t.id AS transaction_id,
        t.merchant,
        t.amount_cents,
        t.ts AS transaction_ts
      FROM alerts a
      JOIN customers c ON a.customer_id = c.id
      LEFT JOIN transactions t ON a.suspect_txn_id = t.id
      WHERE a.status = $1
      ORDER BY a.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [status, limit, offset]);

    // Get total count
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM alerts WHERE status = $1',
      [status]
    );
    const total = parseInt(countResult.rows[0].count);

    res.json({
      items: result.rows.map(row => ({
        id: row.id,
        riskScore: row.risk_score,
        status: row.status,
        createdAt: row.created_at,
        customer: {
          id: row.customer_id,
          name: row.customer_name,
          email: row.customer_email
        },
        transaction: row.transaction_id
          ? {
              id: row.transaction_id,
              merchant: row.merchant,
              amount: parseInt(row.amount_cents) / 100,
              timestamp: row.transaction_ts
            }
          : null
      })),
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total
      }
    });

  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
