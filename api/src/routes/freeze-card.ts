import { Router } from 'express';
import { pool } from '../db';

const router = Router();

// Temporary in-memory OTP store (use Redis in prod)
const otpStore: Record<string, { otp: string; expiresAt: number }> = {};

// Generate random 6-digit OTP
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /api/action/freeze-card/request-otp
router.post('/freeze-card/request-otp', async (req, res) => {
  try {
    const { card_id } = req.body;
    if (!card_id) {
      return res.status(400).json({ message: 'card_id is required' });
    }

    const otp = generateOtp();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    otpStore[card_id] = { otp, expiresAt };

    return res.json({
      otp, // For internal use only — sent directly to frontend
      expiresIn: 300,
      message: 'OTP generated successfully.',
    });
  } catch (err) {
    console.error('Error generating OTP:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

// POST /api/action/freeze-card/confirm
router.post('/freeze-card/confirm', async (req, res) => {
  try {
    const { card_id, otp } = req.body;

    if (!card_id || !otp) {
      return res.status(400).json({ message: 'card_id and otp are required' });
    }

    const record = otpStore[card_id];

    if (!record) {
      return res.status(400).json({ message: 'No OTP generated for this card' });
    }

    if (Date.now() > record.expiresAt) {
      delete otpStore[card_id];
      return res.status(400).json({ message: 'OTP expired' });
    }

    if (record.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // ✅ OTP verified → Freeze the card
    await pool.query('UPDATE cards SET status = $1 WHERE id = $2', [
      'FROZEN',
      card_id,
    ]);

    delete otpStore[card_id];

    return res.json({
      status: 'FROZEN',
      message: `Card has been frozen.`,
    });
  } catch (err) {
    console.error('Error freezing card:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

export default router;
