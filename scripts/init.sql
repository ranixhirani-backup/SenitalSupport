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

CREATE TABLE kb_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  anchor TEXT UNIQUE,
  content_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE triage_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID REFERENCES alerts(id),
  status VARCHAR(20) DEFAULT 'RUNNING',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  summary JSONB
);


INSERT INTO customers (id, name, email, phone) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Rajesh Kumar', 'rajesh.k@example.com', '+919876543210');

INSERT INTO cards (customer_id, last4, network) VALUES
('550e8400-e29b-41d4-a716-446655440000', '4532', 'VISA');

INSERT INTO kb_docs (title, anchor, content_text) VALUES
('Dispute Handling Policy', 'policy-dispute-handling',
 'Disputes must be opened only after confirming with the customer.'),
('High-Risk MCC Codes', 'kb-high-risk-mcc',
 'MCC codes 4829, 6012, and 7995 are considered high risk.'),
('Triage Workflow Overview', 'kb-triage-overview',
 'The triage system helps analysts investigate suspicious transactions.'),
('Transaction Limits', 'kb-txn-limits',
 'Customers with KYC level BASIC are limited to $2000 per day.');

SELECT 'Database ready!' AS status;
