# Customer Support Ticket System with SLA Monitoring

A full-stack ticket management system with real-time SLA monitoring, pessimistic locking, audit trails, and materialized view dashboards.

## Stack
- **Backend**: Node.js + Express + TypeScript
- **Frontend**: React + Vite + TypeScript + TailwindCSS
- **Database**: PostgreSQL (Neon.tech or any Postgres)

## Features
- 🎫 Full ticket CRUD with pagination and filtering
- 🔐 Session-based auth with role-based access (admin / manager / agent)
- ⚡ Pessimistic locking (`FOR UPDATE SKIP LOCKED`) — prevents race conditions on ticket claims
- 📊 Materialized view dashboard — 10× faster than live aggregations
- ⏰ SLA escalator cron job — auto-escalates critical tickets unresponded after 4h
- 📋 Full audit trail via PostgreSQL trigger — every change recorded
- 🗃️ 10,000 seed tickets across 5 agents for realistic load testing

## Quick Start

### 1. Database (Neon.tech)
1. Create a free project at https://neon.tech
2. Copy the connection string

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env — set DATABASE_URL, SESSION_SECRET

npm install
npm run migrate    # Run SQL migrations
npm run seed       # Load 10k test tickets
npm run dev        # Start on :3000
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev        # Start on :5173
```

### 4. Login

| Role    | Email                  | Password    |
|---------|------------------------|-------------|
| Admin   | admin@example.com      | password123 |
| Manager | manager@example.com    | password123 |
| Agent   | alice@example.com      | password123 |

## Architecture Highlights

### Pessimistic Locking
Ticket claims use `SELECT ... FOR UPDATE SKIP LOCKED` inside a transaction. Concurrent agents attempting to claim the same ticket — only one succeeds, the other gets a 409 immediately (no deadlocks).

### SLA Escalation
`node-cron` fires every 5 minutes. Any `critical` ticket with no response after 4 hours is automatically escalated to `priority = 'escalated'` and logged in the audit trail.

### Materialized View
`dashboard_metrics` is a PostgreSQL materialized view refreshed every 5 minutes. Provides O(1) dashboard reads regardless of ticket volume.

### Audit Trigger
A `AFTER INSERT OR UPDATE OR DELETE` trigger on the `tickets` table automatically writes every change to `audit_logs`, capturing old and new JSONB snapshots.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/login | Login |
| POST | /api/auth/logout | Logout |
| GET | /api/auth/me | Current user |
| GET | /api/tickets | List tickets (paginated, filterable) |
| GET | /api/tickets/:id | Get ticket |
| POST | /api/tickets | Create ticket |
| PATCH | /api/tickets/:id | Update ticket |
| POST | /api/tickets/:id/claim | Atomically claim ticket |
| DELETE | /api/tickets/:id | Delete ticket (admin) |
| GET | /api/tickets/:id/audit | Audit trail |
| GET | /api/dashboard | Metrics + SLA risk |
| GET | /api/dashboard/sla | SLA report by priority |
| GET | /api/agents | Agent list with workload |

## Production Notes
- Set `NODE_ENV=production` and `cookie.secure=true` behind HTTPS
- Use `pg-session-store` for session persistence across restarts
- Add `UNIQUE INDEX` on materialized view for `CONCURRENTLY` refresh
- Set `SESSION_SECRET` to a long random string (32+ chars)
