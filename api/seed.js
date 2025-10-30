const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://support:support123@postgres:5432/support_db'
});

const merchants = [
  'Amazon India', 'Flipkart', 'Swiggy', 'Zomato', 'Uber India',
  'BookMyShow', 'BigBasket', 'Myntra', 'Nykaa', 'PharmEasy',
  'IRCTC', 'MakeMyTrip', 'Ola Cabs', 'Dominos', 'Starbucks'
];

const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune'];

async function seed() {
  try {
    console.log('🌱 Starting seed...');
    
    const customerResult = await pool.query('SELECT id FROM customers LIMIT 1');
    if (customerResult.rows.length === 0) {
      throw new Error('No customer found!');
    }
    const customerId = customerResult.rows[0].id;
    
    const cardResult = await pool.query('SELECT id FROM cards WHERE customer_id = $1', [customerId]);
    const cardId = cardResult.rows[0].id;
    
    console.log(`📋 Customer ID: ${customerId}`);
    
    // Clear old data
    await pool.query('DELETE FROM alerts');
    await pool.query('DELETE FROM transactions WHERE customer_id = $1', [customerId]);
    
    // Generate transactions
    const startDate = new Date('2024-01-01');
    const endDate = new Date();
    
    console.log('📦 Generating 10,000 transactions...');
    
    for (let i = 0; i < 10000; i++) {
      const randomDate = new Date(
        startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime())
      );
      
      await pool.query(
        `INSERT INTO transactions 
         (customer_id, card_id, merchant, amount_cents, mcc, device_id, city, ts)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          customerId, 
          cardId, 
          merchants[Math.floor(Math.random() * merchants.length)],
          Math.floor(Math.random() * 500000) + 10000,
          String(5000 + Math.floor(Math.random() * 3000)),
          `device_${Math.floor(Math.random() * 5)}`,
          cities[Math.floor(Math.random() * cities.length)],
          randomDate
        ]
      );
      
      if ((i + 1) % 2000 === 0) {
        console.log(`  ✓ ${i + 1} transactions`);
      }
    }
    
    // Create alerts
    const recentTxns = await pool.query(
      'SELECT id FROM transactions ORDER BY ts DESC LIMIT 5'
    );
    
    for (const txn of recentTxns.rows) {
      await pool.query(
        'INSERT INTO alerts (customer_id, suspect_txn_id, risk_score) VALUES ($1, $2, $3)',
        [customerId, txn.id, Math.floor(Math.random() * 100)]
      );
    }
    
    console.log('✅ Seed complete!');
    console.log(`\n🧪 Test: curl http://localhost:3001/api/customer/${customerId}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
