# ZetaSentry: Intelligence-Driven Support Hub

A premium, localized full-stack ticket ecosystem featuring database-native intelligence: automatic outbreak detection, dynamic urgency prioritization, agent expertise matching, and real-time co-pilot suggestions.

Built by **Taha Nawab** 💻

---

## ⚡ Architecture & Tech Stack
- **Frontend**: React + Vite + TypeScript + TailwindCSS (styled with glassmorphic dark-sentry theme)
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL (Neon.tech or standard Postgres)
- **Workflow**: `node-cron` orchestrators + native PostgreSQL PL/pgSQL triggers

---

## 🚀 Key Features

### 1. Database-Native Intelligence Engine
- **🧬 Ticket DNA (Similar search)**: Utilizes PostgreSQL English word stem dictionaries (`to_tsvector`) and GIN indices to find active and resolved sibling tickets instantly.
- **🚨 Outbreak Incident Alerts**: Materialized view filters that group ticket cluster vectors created within 48 hours to flag system anomalies before they spike.
- **📈 Dynamic Urgency Queue**: Utilizes a logarithmic time-decay urgency score:
  $$\text{Urgency} = \text{BasePriorityWeight} \times \ln(\text{HoursOpen} + 1)$$
- **🎯 Agent Expertise Radar**: Automatically profiles agents by mapping top resolved ticket keywords and average resolution times.

### 2. High-Performance Base Engine
- **🔐 Concurrency Protection**: Atomic claiming transactions protected by pessimistic row-level locks (`SELECT ... FOR UPDATE SKIP LOCKED`).
- **📊 Materialized Dashboard View**: Speeds up dashboard stats by caching results in a materialized view (`dashboard_metrics`) refreshed by cron.
- **⏰ SLA Escalation**: Background cron workers that auto-escalate critical tickets unresponded after 4 hours to `priority = 'escalated'`.
- **📋 Transaction Audit Trigger**: `AFTER UPDATE` triggers that guarantee security auditing, writing data diffs directly to the `audit_logs` table.

---

## ⚙️ Quick Start

### 1. Database Setup
Ensure you run migrations to build the tables, triggers, and intelligence engines:
```bash
cd backend
cp .env.example .env
# Set DATABASE_URL and SESSION_SECRET in .env

npm install
npm run migrate    # Execute all database migrations
npm run seed       # Seed 10,000 localized tickets & agent profiles
npm run dev        # Launch backend api on http://localhost:3000
```

### 2. Frontend Setup
```bash
cd frontend
cp .env.example .env
npm install
npm run dev        # Launch Vite development server on http://localhost:5173
```

---

## 🔑 Localization & Test Credentials

The database seeding is pre-configured with localized Pakistani support team accounts:

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@pakmail.com` | `password123` |
| **Manager** | `manager@pakmail.com` | `password123` |
| **Agent** | `ahmed@pakmail.com` | `password123` |

---

## 🔌 API Documentation (Intelligence Layer)

| Method | Path | Description |
|---|---|---|
| **GET** | `/api/intelligence/similar/:id` | Get active tickets sharing the same DNA signature |
| **GET** | `/api/intelligence/outbreaks` | Get active ticket clusters matching similar problems |
| **GET** | `/api/intelligence/dynamic-priority` | Get priority queue sorted by logarithmic decay |
| **GET** | `/api/intelligence/expertise` | Get agent list with speeds and matching skill tags |
| **GET** | `/api/intelligence/suggest-agent/:id` | Get suggested agents ranked by skill matches |
| **GET** | `/api/intelligence/resolution/:id` | Get resolution ideas based on matching resolved tickets |
