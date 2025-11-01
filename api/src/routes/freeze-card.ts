import { Router } from 'express';
import { pool } from '../db'; // adjust if your db file path differs

const router = Router();

// POST /api/action/freeze-card
router.post('/freeze-card', async (req, res) => {
  try {
    const { card_id } = req.body;

    if (!card_id) {
      return res.status(400).json({ message: 'card_id is required' });
    }

    // Update card status to 'FROZEN'
    await pool.query(
      'UPDATE cards SET status = $1 WHERE id = $2',
      ['FROZEN', card_id]
    );

    return res.json({
      status: 'FROZEN',
      message: `Card ${card_id} has been frozen.`,
    });
  } catch (err) {
    console.error('Error freezing card:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

export default router;
