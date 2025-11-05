# Sentinel — Support Dashboard

## Quick Start (No Node/PostgreSQL install needed!)

### 1. Start everything with Docker

```bash
docker-compose up --build
```

Wait ~30 seconds for services and seed to finish.

### 2. Test API

```bash
curl http://localhost:3001/health
```

Expected response:

```json
{"status":"ok","timestamp":"...","database":"connected"}
```

### 3. Use Customer ID

The seed script prints a Customer UUID. Use it:

```bash
curl http://localhost:3001/api/customer/<UUID>
```

## Services Running

- API: http://localhost:3001 — Express + TypeScript
- PostgreSQL: localhost:5432 — user: support, pass: support123, db: support_db
- Redis: localhost:6379 — Queue + rate limiting

## Logs

```bash
# Tail all services
docker compose logs -f

# Tail just API
docker compose logs -f api
```

## Overview

This repository is a full-stack internal support dashboard that:

- Ingests and displays customer transactions
- Generates insights
- Runs multi-step triage (freeze card / open dispute / contact user)
- Runs locally via Docker Compose with deterministic fallbacks and observability hooks.

## Architecture & Services

- Postgres (15-alpine) — primary data store
- Redis (7-alpine) — background queue + rate-limiting
- API (Node.js + TypeScript + Express) — backend service
- Frontend (React + TypeScript + Vite) — dashboard UI

Everything is orchestrated via `docker-compose.yml`.

## File Map (High-Level)

- `docker-compose.yml`
- `api/`
  - `Dockerfile`
  - `src/`
  - `src/routes/`
  - `seed.js`
- `frontend/`
  - `Dockerfile`
  - `src/`
  - `src/pages/`
  - `src/components/`
- `scripts/`
  - `init.sql`
- `fixtures/`

## Environment Configuration

### Backend (api/.env)

```
DATABASE_URL=
REDIS_URL=
PORT=3001
API_KEY=
```

### Frontend (frontend/.env)

```ini
VITE_API_URL=http://localhost:3001
```

## Useful API Endpoints

- Health check — `GET /health`
- Metrics — `GET /metrics`
- Ingest transactions — `POST /api/ingest/transactions`
- Customer transactions — `GET /api/customer/:id/transactions`
- Start triage — `POST /api/triage`
- Stream triage (SSE) — `GET /api/triage/:runId/stream`
- Freeze card — `POST /api/action/freeze-card`
- Open dispute — `POST /api/action/open-dispute`

## Troubleshooting

### API container exited?

```bash
docker compose logs api --tail=200
```

### Frontend cannot load data?

- Ensure requests call `/api/...` if the backend routes are mounted under `/api`.
- Ensure CORS is enabled in the API server.

### SSE event stream not working?

- Check the browser console for CORS issues.

### Tailwind CSS missing?

Ensure your global CSS contains the Tailwind directives:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

## Developer Tips

View live API logs:

```bash
docker compose logs -f api
```

Open a shell inside the API container:

```bash
docker compose run --rm api sh
```

Re-run the seed:

```bash
docker compose exec api node /app/seed.js
```

---

