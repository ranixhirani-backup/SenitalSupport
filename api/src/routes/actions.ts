import { Router } from "express";
import { pool } from "../db";

const router = Router();

/**
 * POST /api/action/open-dispute
 * Request: { txnId, reasonCode, confirm }
 * Response: { caseId, status: "OPEN" }
 */
router.post("/open-dispute", async (req, res) => {
  try {
    const { txnId, reasonCode, confirm } = req.body;

    // Basic validations
    if (!txnId || !reasonCode) {
      return res.status(400).json({ error: "Missing txnId or reasonCode" });
    }

    if (!confirm) {
      return res.status(400).json({
        error: "Dispute must be confirmed before opening",
      });
    }

    // Check if the transaction exists
    const txnCheck = await pool.query(
      `SELECT id, customer_id, amount_cents, merchant 
       FROM transactions 
       WHERE id = $1`,
      [txnId]
    );

    if (txnCheck.rowCount === 0) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    const txn = txnCheck.rows[0];

    // Insert into cases table
    const caseResult = await pool.query(
      `INSERT INTO cases (customer_id, txn_id, type, status, reason_code, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING id`,
      [txn.customer_id, txn.id, "DISPUTE", "OPEN", reasonCode]
    );

    const caseId = caseResult.rows[0].id;

    // Log the event (without payload_json)
    await pool.query(
      `INSERT INTO case_events (case_id, ts, actor, action)
       VALUES ($1, NOW(), $2, $3)`,
      [caseId, "SYSTEM", "OPEN_DISPUTE"]
    );

    res.json({ caseId, status: "OPEN" });
  } catch (error) {
    console.error("Error opening dispute:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
