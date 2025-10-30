#!/bin/bash

# Sentinel Day 1 - Complete Setup (No local Node/PostgreSQL needed!)
# This script creates all files needed to run via Docker only

echo "🚀 Creating Sentinel project..."

# Root files
cat > docker-compose.yml << 'DOCKER'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: support
      POSTGRES_PASSWORD: support123
      POSTGRES_DB: support_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U support"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  api:
    build:
      context: ./api
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://support:support123@postgres:5432/support_db
      PORT: 3001
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./api/src:/app/src

volumes:
  postgres_data:
DOCKER

cat > README.md << 'README'
# Sentinel - Support Dashboard

## Quick Start (No Node/PostgreSQL install needed!)

### 1. Start everything with Docker
```bash
docker-compose up --build
```

Wait ~30 seconds for services to start.

### 2. Seed database (in new terminal)
```bash
docker-compose exec api node /app/seed.js
```

### 3. Test API
```bash
curl http://localhost:3001/health
```

You should see: `{"status":"ok","timestamp":"...","database":"connected"}`

### 4. Get Customer ID
The seed script will print a Customer UUID. Use it to test:
```bash
curl http://localhost:3001/api/customer/<UUID>
```

## Services Running
- **API**: http://localhost:3001
- **PostgreSQL**: localhost:5432 (user: support, pass: support123, db: support_db)
- **Redis**: localhost:6379

## Logs
```bash
# All services
docker-compose logs -f

# Just API
docker-compose logs -f api

# Just database
docker-compose logs -f postgres
```

## Stop Services
```bash
docker-compose down
```

## Reset Database
```bash
docker-compose down -v
docker-compose up --build
docker-compose exec api node /app/seed.js
```
README

cat > .gitignore << 'IGNORE'
node_modules/
dist/
.env
*.log
.DS_Store
postgres_data/
IGNORE

# API files
mkdir -p api/src

cat > api/package.json << 'PACKAGE'
{
  "name": "sentinel-api",
  "version": "1.0.0",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "pg": "^8.11.3"
  },
  "devDependencies": {
    "@types/express": "^4.17.20",
    "@types/cors": "^2.8.15",
    "@types/node": "^20.9.0",
    "@types/pg": "^8.10.7",
    "typescript": "^5.2.2",
    "tsx": "^4.6.2"
  }
}
PACKAGE

cat > api/tsconfig.json << 'TSCONFIG'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
TSCONFIG

cat > api/Dockerfile << 'DOCKERFILE'
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Copy seed script to root
COPY seed.js /app/seed.js

EXPOSE 3001

CMD ["npm", "run", "dev"]
DOCKERFILE

cat > api/src/db.ts << 'DB'
import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://support:support123@localhost:5432/support_db'
});

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('Query executed', { text: text.substring(0, 50), duration, rows: res.rowCount });
  return res;
}
DB

cat > api/src/index.ts << 'INDEX'
import express from 'express';
import cors from 'cors';
import { pool } from './db';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

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
INDEX

cat > api/seed.js << 'SEED'
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
SEED

# Database schema
mkdir -p scripts

cat > scripts/init.sql << 'SQL'
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  last4 VARCHAR(4) NOT NULL,
  network VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  card_id UUID REFERENCES cards(id),
  merchant VARCHAR(255) NOT NULL,
  amount_cents BIGINT NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  mcc VARCHAR(4),
  device_id VARCHAR(100),
  country VARCHAR(2) DEFAULT 'IN',
  city VARCHAR(100),
  ts TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_customer_ts ON transactions(customer_id, ts DESC);

CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  suspect_txn_id UUID REFERENCES transactions(id),
  risk_score INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'OPEN',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  txn_id UUID REFERENCES transactions(id),
  type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'OPEN',
  reason_code VARCHAR(10),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE case_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id),
  actor VARCHAR(100) NOT NULL,
  action VARCHAR(100) NOT NULL,
  payload JSONB,
  ts TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO customers (id, name, email, phone) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Rajesh Kumar', 'rajesh.k@example.com', '+919876543210');

INSERT INTO cards (customer_id, last4, network) VALUES
('550e8400-e29b-41d4-a716-446655440000', '4532', 'VISA');

SELECT 'Database ready!' AS status;
SQL

echo ""
echo "✅ All files created!"
echo ""
echo "📁 Your structure:"
echo "sentinel/"
echo "├── docker-compose.yml"
echo "├── README.md"
echo "├── api/"
echo "│   ├── Dockerfile"
echo "│   ├── package.json"
echo "│   ├── seed.js"
echo "│   └── src/"
echo "│       ├── index.ts"
echo "│       └── db.ts"
echo "└── scripts/"
echo "    └── init.sql"
echo ""
echo "🚀 Next: docker-compose up --build"