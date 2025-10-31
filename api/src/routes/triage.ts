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
      `SELECT id, status FROM alerts WHERE id = $1`,
      [alertId]
    );

    if (alertCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    if (alertCheck.rows[0].status !== 'OPEN') {
      return res.status(400).json({ error: 'Alert already processed' });
    }

    const runId = randomUUID();

    // Create a triage run record (if you have a table for it)
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

export default router;
