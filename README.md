# DE-PRINCE DIGITAL HUB

**Everything Digital. One Platform.**

A complete digital-service marketplace and cyber café management platform.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS, Tailwind/shadcn-style UI |
| Backend | FastAPI, Python 3.14, Pydantic v2, SQLAlchemy 2, Alembic |
| Database | PostgreSQL 16 (prod) / SQLite (local dev via SQLAlchemy) |
| Auth | JWT (access + refresh tokens), bcrypt |
| File Storage | Local (S3-compatible ready) |
| Payments | Paystack/Flutterwave abstraction layer (mock gateway in dev) |
| Infrastructure | Docker, Docker Compose |

## Quick Start

### Option A — Local dev (no Docker, SQLite)

Requires Python 3.14 and Node 18+.

```bash
# Backend
cd backend
python -m venv .venv
# On Windows: .venv\Scripts\activate
pip install -r requirements.txt
# Copy backend/.env.example -> backend/.env with the SQLite DATABASE_URL lines active
uvicorn app.main:app --reload --port 8000

# Seed data (admin@deprince.com / admin123)
python -m app.utils.seed

# Frontend (in a second terminal)
cd frontend
npm install
npm run dev   # -> http://localhost:3000
```

### Option B — Docker Compose (PostgreSQL)

```bash
cp .env.example .env
docker-compose up -d

# Run migrations
docker-compose exec backend alembic upgrade head

# Seed data
docker-compose exec backend python -m app.utils.seed
```

### Access

- Frontend: http://localhost:3000
- Backend API docs: http://localhost:8000/docs
- Admin: http://localhost:3000/dashboard (use super admin credentials)

## Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@deprince.com | admin123 |

## Project Structure

```
de-prince/
├── backend/              # FastAPI Python backend
│   ├── app/
│   │   ├── core/         # Config, security, dependencies
│   │   ├── models/       # SQLAlchemy models
│   │   ├── schemas/      # Pydantic schemas
│   │   ├── api/v1/       # API routes
│   │   │   └── endpoints/
│   │   ├── services/     # Business logic
│   │   └── utils/        # Helpers, seeds
│   ├── alembic/          # Database migrations
│   └── uploads/          # File uploads (local)
├── frontend/             # Next.js frontend
│   └── src/
│       ├── app/          # Next.js App Router pages
│       ├── components/   # React components
│       ├── lib/          # Utilities, API client
│       ├── hooks/        # Custom React hooks
│       └── types/        # TypeScript types
├── database/             # SQL scripts
├── docker-compose.yml
└── .env.example
```

## License

Proprietary — De-Prince Digital Hub
