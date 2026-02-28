import { Router } from "express";
import { pool } from "../db";

const router = Router();

// GET /api/kb/search?q=
router.get("/search", async (req, res) => {
  try {
    const q = (req.query.q as string)?.trim();

    if (!q) {
      return res.status(400).json({ error: "Missing query parameter 'q'" });
    }

    const result = await pool.query(
      `
      SELECT id, title, anchor, content_text
      FROM kb_docs
      WHERE title ILIKE $1 OR content_text ILIKE $1
      ORDER BY created_at DESC
      LIMIT 10
      `,
      [`%${q}%`]
    );

    res.json({
      results: result.rows.map((row) => ({
        type: "kb_doc",
        ...row,
      })),
    });
  } catch (error) {
    console.error("Error searching KB:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
