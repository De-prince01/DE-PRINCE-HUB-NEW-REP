# Deploy Checklist — DE-PRINCE DIGITAL HUB (online test)

Everything local is done and committed. The machine I built on currently has NO
outbound internet, so these final steps are done from any internet-connected
machine. The repo is `main` branch, audit-clean: **no secrets, no DB, no
node_modules** in git (verified).

Current commit: `91192e8`

---

## Step 1 — Push the repo to GitHub (~2 min)

1. Get the project onto the internet-connected machine (copy the
   `de-prince` folder, a committed zip of it, or a USB drive — the exact
   content is in `.git/`, 1.13 MB + working copy).
2. If git isn't installed there: `winget install Git.Git`
3. Log into GitHub (or create a free account): https://github.com
4. Create a **Private** repo named exactly `de-prince`
   (New repository → name `de-prince` → Private → Create repository).
   Do NOT tick "Add a README" (the repo already has one).
5. In the `de-prince` folder, run:

```bash
git remote add origin https://github.com/YOUR_USERNAME/de-prince.git
git branch -M main
git push -u origin main
```

6. Verify: https://github.com/YOUR_USERNAME/de-prince shows the code.

---

## Step 2 — Deploy to Render (~5 min, free tier)

1. Sign up / log in at https://render.com (GitHub login allowed).
2. Top-right → **New** → **Blueprint**.
3. Connect GitHub and pick the `de-prince` repo.
4. It will load `render.yaml`, which provisions **3 resources** in one go:

   | Resource      | Name         | Type       |
   |---------------|--------------|------------|
   | PostgreSQL    | deprince-db  | Free       |
   | Backend API   | deprince-api | Free (Docker) |
   | Frontend      | deprince-web | Free (Node)  |

5. Click **Apply** / **Deploy Blueprint**. First deploy takes ~5–10 min
   (pip + npm installs). On first boot the backend **automatically**:
   - runs `alembic upgrade head` (creates all ~40 tables)
   - seeds admin user, wallets, services, branches, and **all 132 banks**
   - starts uvicorn on port `10000`

   Login after deploy: `admin@deprince.com` / `admin123`

---

## Step 3 — Point URLs at the real deployed addresses (~2 min)

Free tier service names = hostnames: `deprince-api.onrender.com` and
`deprince-web.onrender.com`. If Render renamed them (name collision), read the
actual URLs from each service's **Info** tab.

Edit on the Render dashboard (not in the repo):

- **deprince-api → Environment:**
  - `ALLOWED_HOSTS` = `["*.onrender.com"]`  (already set; tighten later)
  - `CORS_ORIGINS` = `["https://deprince-web.onrender.com"]` (set the real web URL)
- **deprince-web → Environment:** (then **Redeploy**)
  - `NEXT_PUBLIC_SITE_URL` = `https://deprince-web.onrender.com`
  - `NEXT_PUBLIC_API_URL`  = `https://deprince-api.onrender.com/api/v1`

---

## Step 4 — Verify (2 min)

- Open `https://deprince-web.onrender.com` → register/login → wallet page should
  list **132 Nigerian banks**, verify a bank account, fund wallet (mock = auto),
  and withdraw.
- Admin: `https://deprince-web.onrender.com/admin/withdrawals` approves/pays.
- API docs: `https://deprince-api.onrender.com/docs`

---

## Going live later (not needed for the test)

- **Payments**: set `PAYSTACK_SECRET_KEY` (+ public) on the API service →
  bank-list refresh and name-enquiry switch from mock to live Paystack.
- **SMTP**: set `SMTP_HOST/USER/PASSWORD/EMAIL_FROM` for password/reset emails.
- **Secrets**: Render already generated fresh `SECRET_KEY`/`JWT_SECRET_KEY`
  (values are unique per service).
- **Domain**: replace onrender URLs with a custom domain in both services +
  `ALLOWED_HOSTS`/`CORS_ORIGINS`.
- **DB backups**: Render Postgres → Database → backups.

## Local reference

- Dev: `uvicorn app.main:app` (backend) + `npm run dev` (frontend).
- Seed: `python -m app.utils.seed`. SQLite data lives in `backend/data/` (git-ignored).
- Deploy entrypoint: `backend/start.sh` — migrations + seed + uvicorn.