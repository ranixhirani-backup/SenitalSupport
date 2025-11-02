import express from 'express';
import cors from 'cors';
import { pool } from './db';
import transactionRoutes from './routes/transactions';
import insightRoutes from './routes/insights';
import alertRoutes from './routes/alerts';
import triageRoutes from './routes/triage';
import actionRoutes from './routes/actions';
import searchRoutes from './routes/search';
import freezeCardRoutes from './routes/freeze-card';
import dashboardRoutes from './routes/dashboard';
const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api', transactionRoutes);
app.use('/api', insightRoutes);
app.use('/api', alertRoutes);
app.use('/api', triageRoutes);
app.use('/api/action', actionRoutes);
app.use('/api/kb', searchRoutes);
app.use('/api/action', freezeCardRoutes);
app.use('/api', dashboardRoutes);
// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get customer by ID
app.get('/api/customer/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, name, email, phone, created_at FROM customers WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get customer's cards
app.get('/api/customer/:id/cards', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, last4, network, status FROM cards WHERE customer_id = $1',
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

app.listen(port, () => {
  console.log(`🚀 API running on http://localhost:${port}`);
  console.log(`📊 Health: http://localhost:${port}/health`);
});
