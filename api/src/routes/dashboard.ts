// src/routes/dashboard.ts
import { Router } from 'express';
import { pool } from '../db';

const router = Router();

/**
 * GET /api/dashboard/summary
 * Response:
 * {
 *   alertsInQueue: number,
 *   disputesOpened: number,
 *   avgTriageLatencyMs: number | null,
 *   timestamp: string
 * }
 */
router.get('/dashboard/summary', async (req, res) => {
  try {
    // 1. alerts in queue (OPEN)
    const alertsRes = await pool.query(
      `SELECT COUNT(*) AS cnt FROM alerts WHERE status = 'OPEN'`
    );
    const alertsInQueue = parseInt(alertsRes.rows[0].cnt, 10) || 0;

    // 2. disputes opened (cases of type DISPUTE and status OPEN)
    const disputesRes = await pool.query(
      `SELECT COUNT(*) AS cnt FROM cases WHERE type = 'DISPUTE' AND status = 'OPEN'`
    );
    const disputesOpened = parseInt(disputesRes.rows[0].cnt, 10) || 0;

    // 3. avg triage latency (ms) from triage_runs (only finished runs)
    // if triage_runs table does not exist yet, we return null safely
    let avgTriageLatencyMs: number | null = null;
    try {
      const latencyRes = await pool.query(
        `SELECT AVG(latency_ms) AS avg_latency FROM triage_runs WHERE ended_at IS NOT NULL`
      );
      const avgVal = latencyRes.rows[0]?.avg_latency;
      avgTriageLatencyMs = avgVal !== null && avgVal !== undefined
        ? Math.round(parseFloat(avgVal))
        : null;
    } catch (err) {
      // If triage_runs table not present or query fails, continue with null
      console.warn('Unable to read triage_runs.avg latency:', err instanceof Error ? err.message : err);
      avgTriageLatencyMs = null;
    }

    res.json({
      alertsInQueue,
      disputesOpened,
      avgTriageLatencyMs,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

export default router;
