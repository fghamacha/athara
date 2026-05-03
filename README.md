# أثارة — Athara

> **أثارة** (ʾathāra) — traces, heritage, what is passed down.

Athara is a self-hosted family tree application built for Arabic/Islamic genealogies. It lets you record persons, marriages, and parent-child relationships, then explore the family visually through two tree views.

## Features

- **Person management** — name, gender, profession, birth/death dates (year-only or full date), birth place, biography, profile photo
- **Relationships** — parent-child links and marriages with start/end dates and end reason
- **Attachments** — documents and photos per person stored in MinIO
- **Classic tree view** — hierarchical layout with couple nodes, multi-generation chains, and in-law positioning
- **Force-directed tree view** — D3 force simulation for free-form exploration
- **Islamic-friendly** — no cross symbol; ◆ denotes death dates

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite, D3.js |
| Backend | FastAPI + asyncpg |
| Database | PostgreSQL |
| Object storage | MinIO (S3-compatible) |
| Runtime | Docker Compose |

## Getting started

```bash
# Copy and fill in environment variables
cp .env.example .env

# Start all services
docker compose up --build

# The app is available at http://localhost:5173
# The API is available at http://localhost:8000
```

## Development

```bash
# Frontend only (hot reload)
cd services/web && npm install && npm run dev

# API only
cd services/api && pip install -r requirements.txt && uvicorn main:app --reload

# Run database migrations
cd services/api && python migrate.py
```

## Project structure

```
athara/
├── docker-compose.yml
├── services/
│   ├── api/              # FastAPI backend
│   │   ├── main.py
│   │   ├── routers/      # persons, relationships, marriages, attachments
│   │   ├── schemas/
│   │   ├── migrations/
│   │   └── database.py
│   └── web/              # React frontend
│       └── src/
│           ├── pages/    # PersonListPage, PersonDetailPage, PersonFormPage, FamilyTreePage
│           ├── components/
│           └── api/      # API client
└── infra/
```
