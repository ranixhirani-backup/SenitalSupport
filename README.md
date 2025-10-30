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
