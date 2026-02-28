import { Router } from 'express';
import { pool } from '../db';
import { randomUUID } from 'crypto';

const router = Router();

// POST /api/triage
router.post('/triage', async (req, res) => {
  const client = await pool.connect();
  try {
    const { alertId } = req.body;
    if (!alertId) {
      return res.status(400).json({ error: 'alertId is required' });
    }

    // Check if alert exists and is OPEN
    const alertCheck = await client.query(
      `SELECT id, status, risk_score, customer_id, suspect_txn_id
       FROM alerts WHERE id = $1`,
      [alertId]
    );

    if (alertCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    const alert = alertCheck.rows[0];
    if (alert.status !== 'OPEN') {
      return res.status(400).json({ error: 'Alert already processed' });
    }

    const runId = randomUUID();

    // Create triage run
    await client.query(
      `INSERT INTO triage_runs (id, alert_id, status, started_at)
       VALUES ($1, $2, 'STARTED', NOW())`,
      [runId, alertId]
    );

    res.json({
      runId,
      alertId,
      status: 'STARTED'
    });

  } catch (error) {
    console.error('Error starting triage:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error)
    });
  } finally {
    client.release();
  }
});

// GET /api/triage/:runId/stream → SSE endpoint
router.get('/triage/:runId/stream', async (req, res) => {
  const { runId } = req.params;

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const steps = [
    'Fetching transaction history…',
    'Checking customer profile…',
    'Analyzing device and location data…',
    'Comparing with previous fraud patterns…',
    'Triage completed ✅'
  ];

  let stepIndex = 0;

  const interval = setInterval(async () => {
    if (stepIndex < steps.length) {
      res.write(`data: ${JSON.stringify({ message: steps[stepIndex] })}\n\n`);
      stepIndex++;
    } else {
      clearInterval(interval);

      // Mark triage as completed
      await pool.query(
        `UPDATE triage_runs SET status = 'COMPLETED', completed_at = NOW() WHERE id = $1`,
        [runId]
      );

      res.write(`data: ${JSON.stringify({ status: 'COMPLETED' })}\n\n`);
      res.end();
    }
  }, 1500);
});

// GET /api/triage/:runId/details
// ...existing code...
router.get('/triage/:runId/details', async (req, res) => {
  const { runId } = req.params;
  const client = await pool.connect();
  let timer: NodeJS.Timeout | null = null;
  let aborted = false;

  // Detect client disconnects (Abort on client close)
  req.on('close', () => {
    aborted = true;
    if (timer) clearTimeout(timer);
  });

  try {
    console.log(`[INFO] Fetching triage details for runId: ${runId}`);

    const query = `
      SELECT 
        tr.id AS run_id,
        tr.status,
        tr.started_at,
        a.id AS alert_id,
        a.risk_score,
        a.status AS alert_status,
        a.created_at AS alert_created_at,
        c.id AS customer_id,
        c.name AS customer_name,
        t.merchant,
        t.amount_cents,
        t.ts AS transaction_ts
      FROM triage_runs tr
      LEFT JOIN alerts a ON tr.alert_id = a.id
      LEFT JOIN customers c ON a.customer_id = c.id
      LEFT JOIN transactions t ON a.suspect_txn_id = t.id
      WHERE tr.id = $1
    `;

    // enforce a DB query timeout (5s)
    const dbQueryPromise = client.query(query, [runId]);
    const timeoutPromise = new Promise((_res, reject) => {
      timer = setTimeout(() => reject(new Error('DB query timeout')), 5000);
    });

    const result = await Promise.race([dbQueryPromise, timeoutPromise]) as any;
    if (timer) { clearTimeout(timer); timer = null; }

    if (aborted) {
      console.warn(`[WARN] Client disconnected while fetching triage details for ${runId}`);
      return; // don't try to write to closed socket
    }

    if (!result || result.rowCount === 0) {
      console.warn(`[WARN] No triage run found for runId: ${runId}`);
      return res.status(404).json({ error: 'Triage run not found' });
    }

    console.log(`[SUCCESS] Returning details for runId: ${runId}`);
    return res.json(result.rows[0]);
  } catch (err) {
    console.error(`[ERROR] Failed fetching triage details for ${runId}`, err);
    if (!res.headersSent) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: err instanceof Error ? err.message : String(err),
      });
    }
    // if headers already sent, just end
    try { res.end(); } catch (_) {}
  } finally {
    client.release();
  }
});


export default router;
