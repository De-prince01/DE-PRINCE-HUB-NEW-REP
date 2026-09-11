# DE-PRINCE DIGITAL HUB — Development Progress

**Status:** Working vertical slice (backend verified + frontend pages compiling).
Everything below reflects what is **actually implemented and tested**, not aspirational features.

---

## What works today (verified)

### Backend (FastAPI) — fully smoke-tested end-to-end
- Health check, service catalogue endpoint.
- Auth: register, login, `/auth/me` (JWT access token).
- Orders: create (`DP-...` number), list, detail, order messages, status transitions.
- Wallet: get balance, fund (mock provider credits balance), transaction history.
- Payments: create payment intent, verify (POST) → flips order to `paid`.
- Notifications: list.
- Admin: stats, orders list + status update, workers list, computers list + status patch.
- 31 tables created on SQLite via `Base.metadata.create_all` (models verified import + instantiate).
- Seed script creates: `admin@deprince.com` / `admin123`, 1 branch, 4 computers, 6 categories, 34 services.
- Server runs with `uvicorn app.main:app` on `http://127.0.0.1:8000`.

### Six new modules — backend verified end-to-end (smoke-tested)
- **Cyber Café / computers rental**: list available, customer book/rental flow,
  "my sessions", stop session, pay from wallet (admin start/stop too).
- **Printing**: create print job, optional file upload, per-user job list, staff
  queue, status transitions (pending → printing → completed / cancelled).
  **Pricing + billing (verified):** per-page-per-copy rates `{"bw": 50, "color": 150}`,
  `BINDING_FEE = 500`, `LAMINATION_FEE = 200`; amount computed on create
  (`total_amount`); `POST /printing/jobs/{id}/pay` debits the wallet (only after a
  job is `completed`), records a `printing` Transaction + WalletTransaction, marks
  job `is_paid`, and rejects double-pay (smoke-verified ALL PASS: BW 5p×2 = ₦500,
  color 3p + lamination = ₦650, wallet 5000→4500).
- **POS**: sellable catalogue (`/pos/services`, `/pos/inventory`), register
  checkout → creates a `DP-...` order + payment, decrements stock.
- **Inventory**: add item, list, low-stock alert, stock-in / stock-out with
  movement history.
- **Worker / partner marketplace**: apply as worker (role + specialties + commission
  rate), `/workers/marketplace` directory filterable by specialty, my profile.
- **Finance**: record expenses, commissions auto-calculated per completed order,
  settle commission → credits worker wallet + wallet transaction + earnings.
  Worker self-service: `GET /finance/commissions/mine` returns a worker's own
  commissions and wallet balance.
- All routers wired in `app/api/v1/api.py`; new schemas in `app/schemas/cafe.py`.

### Database layer (dialect-portable)
- Models now use generic SQLAlchemy `Uuid` / `JSON` types (no hard-coded
  `postgresql.JSONB` / `ARRAY` / `UUID`), so **both SQLite (local dev) and
  PostgreSQL (production)** are supported by the same schema.
- Dev/testing uses SQLite (no Docker/Postgres needed). Production uses
  PostgreSQL via `DATABASE_URL` + `001_init.sql` / Alembic.
- Environment `pydantic-settings` v2 with list-field parsing
  (JSON-array and comma-separated both accepted).

### Frontend (Next.js 14 + TypeScript)
- `npm install` completes (154 packages).
- `npx tsc --noEmit` passes with **zero type errors**.
- Pages verified to compile and serve HTTP 200 in dev:
  `/` (landing), `/login`, `/register`, `/dashboard`, `/services`, `/orders`.
- Implemented pages: landing, login, register, dashboard home, services,
  orders list + detail, wallet, profile, notifications, messages, admin
  (overview, orders, computers, workers).
- **New pages for the six modules** (all compile with `tsc --noEmit`, zero errors):
  - `/computers` — list available, book, live session, end session, pay.
  - `/printing` — submit print job (with file upload), staff print queue + status;
    shows the computed price per job and a wallet **Pay** button for the customer
    once a job is completed (plus a Paid badge) — mirrors `/computers` billing.
  - `/admin/pos` — counter register: pick products, cart, checkout.
  - `/admin/inventory` — add item, list, low-stock toggle, stock in/out.
  - `/admin/finance` — record expense, commission list + settle to wallet.
  - `/workers` — browse available workers (filter by specialty) + apply as worker,
    and (for registered workers) view their own earnings: wallet balance, paid-out
    total, and each commission, via new `GET /finance/commissions/mine` endpoint
    (worker self-service; verified end-to-end — worker sees ₦1,600 payout + balance).
- Dashboard nav updated for all six routes (customer + admin).
- Customer dashboard now has quick-access cards to Order Services, Rent a Computer,
  Printing, and the Worker Marketplace.
- **Admin workflows added:**
  - `/admin` (overview) now shows six-module KPIs (revenue, profit, expenses,
    total/pending/completed orders), operational quick links, low-stock alert,
    pending commissions, and recent orders.
  - `/admin/orders` now supports worker assignment + commission generation per
    order (via `/workers/orders/{id}/assign` and `/finance/orders/{id}/commission`),
    alongside status updates.
- **End-to-end chain smoke-verified (ALL PASS):** POS sale → assign worker →
  create commission (20% commission / 80% worker on a ₦2,000 order → ₦400 / ₦1,600) →
  pay commission → worker wallet credited ₦1,600; duplicate commission and
  double-payout both correctly rejected.
- API client + `next.config.js` rewrite to `http://localhost:8000/api/v1`.
- UI: Tailwind + custom shadcn-style components; toasts via `react-hot-toast`.

### Receipts + QR codes (built, verified ALL PASS)
- `GET /receipts/orders/{order_id}` (owner or admin/staff) persists a `Receipt` row
  idempotently (same `receipt_number` on re-fetch), returns business/type/receipt
  number, a scannable `qr_payload` (`DPR:ORDER:<no>:<total>`), order + customer,
  items, and totals. `GET /receipts/transactions/{reference}` covers wallet receipts.
- Access control verified: owner can fetch, other customers get 403, admins can fetch.
- Frontend: vendored a self-contained MIT pure-JS QR encoder (`qrcode-generator`, no
  npm install needed since the registry was unreachable) with a module `.d.ts`, a
  reusable `QrCode` component, and a `ReceiptDialog` on the order-detail page showing
  the business header, items, totals, QR code, and a Print button. `tsc --noEmit` clean.
- **QR verification (built, verified):** `GET /receipts/verify/{receipt_number}` is a
  public endpoint that returns `{valid, business, receipt_number, order_number, total}`
  for genuine receipts and `{valid: False}` for unknown numbers. Scanning the QR on the
  receipt now opens the public `/verify` page (`/verify?n=<number>`), and the dialog
  also links "Verify online". `smoke_verify.py` ALL PASS (public check, no auth,
  order+total verified, bogus number rejected).
- Smoke-tested ALL PASS (`smoke_receipts.py`).

### Finance report + worker payouts UI (built, verified)
- `GET /finance/report` (admin) aggregates revenue, expenses, commissions paid/unpaid,
  worker payouts, workers paid, and net profit from live records.
- `/admin/finance` now shows a "Report & Worker Payouts" card consuming the endpoint
  (revenue / expenses / commissions / payouts / net profit / workers paid).
  `tsc --noEmit` clean; smoke-tested (`smoke_receipts.py` asserts report keys + revenue).

### Identity-services (NIN / BVN / SNIN) — honest provider abstraction (built, verified)
- `app/services/identity.py`: clean `IdentityProvider` interface with
  `DevelopmentMockIdentityProvider` (deterministic: even-last-digit → verified) and a
  real `SmeNgProvider` that only activates when `SME_NIN_SECRET`/`SME_BVN_SECRET` are
  configured (mirrors the payments-provider pattern; no fake production data).
- `POST /identity/verify` (admin) + `GET /identity/records` (admin, audit trail) persist
  to `IdentityServiceRecord` (with dev-only base64 on the `data_encrypted` column).
- Verified ALL PASS (`smoke_identity.py`): mock verify true/false, records persisted,
  customer denied 403, invalid `id_type` → 422.
- The `identity_service_records` table already exists in the live SQLite DB (schema).
- **Admin UI:** `/admin/identity` (added to admin nav + overview quick link) provides a
  verify form (NIN/BVN/SNIN, optional customer + name), a result panel (verified /
  masked ID / provider / name / DOB), and the verification-records audit list.
  `tsc --noEmit` clean; `/admin/identity` serves HTTP 200.

### Alembic migration fix (built)
- `0001_initial.py` was missing `revision`/`down_revision`, so `alembic upgrade` failed
  ("Could not determine revision id"). Added the required revision headers.
- Verified `alembic upgrade head` now runs to completion and stamps head (see "Not yet
  built" for the honest live-Postgres caveat).

### Phase 3 — Service Engine (built, verified ALL PASS)
The foundational, admin-editable "service engine" that the master spec (§3) builds on.
- **Widened `Service` model** from a simple catalogue (11 fields) to the full workflow
  definition, all persisted in the live SQLite DB (45 columns):
  - Core/SEO: `icon`, `image_url`, `display_order`, `is_active`.
  - Pricing: `price_type` (`fixed` | `quote` | `range`), `quotation_required`,
    `minimum_price` / `maximum_price`, `estimated_processing_time` (legacy
    `estimated_duration` kept), unit.
  - Requirements: `requirements[]`, `required_documents[]`, and boolean flags for
    file upload, description, **physical presence, biometric, photograph, signature,
    appointment, staff, worker**.
  - Logistics: `delivery_available`, `pickup_available`, `payment_required`.
  - Commission: `commission_type` (`percentage` | `fixed`) + `commission_value`.
  - Official provider: `official_provider`, `official_provider_url`, `official_fee`,
    `deprince_fee`, `last_verified_date`, `verification_status`
    (`not_verified` | `verified` | `needs_review` | `suspended`), `branch_availability`,
    `service_instructions`, `faq`.
- **Admin CRUD endpoints** (`/services`): `POST create`, `PATCH update`, `DELETE`
  (all `require_admin`), plus category `POST`/`PATCH` creation/management. Unique slug
  generation handles duplicates. Lists include `?include_inactive=true` for admin tooling
  while public `/services` (customer) only returns active services.
- **Honest ABAC note:** the new fields are real DB columns (not hardcoded), and the
  service/POS/payment consumers were unchanged. `smoke_service_engine.py` ALL PASS
  (24 checks): admin create with full payload, public visibility, customer 403,
  update (toggle active / price / verification), inactive excluded from public list but
  visible via `include_inactive`, category create + unique-slug, delete, 404-on-unknown.
- **Bug fixed:** `log_action` (audit service) previously failed to JSON-serialize UUID /
  datetime objects in `new_values` (`"Object of type UUID is not JSON serializable"`),
  which surfaced once service audit entries carried a `category_id`. `log_action` now
  sanitizes nested UUID/datetime values, so all audit logging is safe.
- **Schema migration:** live SQLite `services` table ALTERed (+30 columns) and backfilled
  defaults; canonical `database/001_init.sql` `services` table updated to the new columns
  so fresh PostgreSQL / Alembic DBs match.
- **Frontend:** `Service` TS type extended; **new admin page `/admin/services`** (added to
  admin nav + overview quick link) with service list (category filter, requirement/price/
  provider verification badges, activate/deactivate/edit/delete), a full create/edit
  dialog (grouped Core / Pricing / Requirements checkboxes / Logistics / Commission /
  Official provider / Verification), plus a category-creation dialog. `tsc --noEmit`
  clean; `/admin/services` serves HTTP 200.
- **Customer storefront:** `/services` cards and the order modal now surface physical
  presence / biometric / appointment / delivery / quote-required badges, a
  "PHYSICAL PRESENCE REQUIRED" notice for biometric services (with the honest note that
  capture happens via the official process), and official provider / official fee /
  DE-PRINCE fee details. `tsc --noEmit` clean.
- All 8 smoke suites still ALL PASS after the model change (e2e, print, receipts, verify,
  identity, mine, new, service_engine).

### Phase 9 — Appointments (built, verified ALL PASS)
The booking system for services that require an appointment (physical visits, checks,
etc.), per spec §20 statuses.
- **New `appointments` + `appointment_slots` tables** (model `app/models/appointment.py`,
  registered in `app/models/__init__.py`; live SQLite DB migrated; `001_init.sql` updated
  for fresh PostgreSQL DBs; alembic downgrade list updated).
- Appointment fields per spec: `appointment_number` (`APT-...`), customer, service,
  branch, staff (nullable), date, time, duration, `requirements`, notes,
  payment_required / payment_status, and the full status enum
  (`requested → confirmed → reminder_sent → checked_in → in_service → completed`,
  plus `missed`, `cancelled`, `rescheduled`).
- **Endpoints** (`/appointments`):
  - `GET /appointments` — customer sees own, admin/staff sees all (optional status filter).
  - `POST /appointments` — customer books (validates service/branch, parses date/time).
  - `GET /appointments/{id}` — owner or staff only (otherwise 403).
  - `PATCH /appointments/{id}` — owner/staff update/reschedule (customer can move
    time/date, others 403).
  - `PATCH /appointments/{id}/cancel` — owner can cancel unless already completed /
    cancelled / missed; repeats and foreign access rejected.
  - `PATCH /appointments/{id}/status` — `require_admin` state transitions.
  - `GET /appointments/slots/available` (current-user), `POST /appointments/slots`
    (admin) for branch availability windows.
  - Responses carry `service_name` / `branch_name` / `customer_name`.
- `smoke_appointments.py` **ALL PASS (28 checks)**: booking, own-only listing + 403 for
  other customers, admin confirm / check-in transitions, reschedule, validation (bad
  date/status/service → 422/400), slot create + list, cancel / double-cancel / foreign
  cancel guard.
- **Frontend:** `Appointment`/`AppointmentSlot` TS types; **customer `/appointments`**
  page (list w/ status badges + book-appointment dialog: service, date, time, duration,
  notes, cancel); **admin `/admin/appointments`** page (summary counts +
  confirm / check-in / start-service / complete / missed buttons); both added to nav
  (customer + admin) and admin-overview quick link. `tsc --noEmit` clean;
  `/appointments` and `/admin/appointments` serve HTTP 200.
- All 8 prior smoke suites still ALL PASS (no regressions).

### Phase 5 — JAMB / NYSC / CAC official-service workflows (built, verified ALL PASS)
Legitimate assistance catalogue configured exactly to the honest rules in the spec
(no fake JAMB/NYSC/CAC records, no impersonation, no fabricated biometric capture).
- New idempotent seeder `backend/app/utils/seed_official.py` (28 new services →
  62 total) under the existing `online-services` category so the storefront, ordering
  and appointment flows reuse the service engine unchanged.
- Each service carries; `official_provider` + URL, `official_fee`, `deprince_fee`,
  honest `verification_status="not_verified"` (never claims accreditation),
  `service_instructions` stating never-impersonate / never-bypass-CAPTCHA-MFA rules,
  and the physical flags:
  - JAMB/UTME + NYSC registration → `requires_physical_presence`, `requires_biometric`
    `requires_appointment` (BIOMETRIC CAPTURE REQUIRED / VISIT AN APPROVED CENTRE).
  - Deeper CAC business services → `requires_signature` + appointment; printing /
    checking / profile / e-PIN variants set physical/biometric flags off.
- Storefront `/services` modal now adds a **TOTAL CUSTOMER PRICE** line whenever both
  `official_fee` and `deprince_fee` are present (the spec's OFFICIAL / DE-PRINCE /
  TOTAL split) alongside the existing official-provider card.
- `smoke_official.py` **ALL PASS (21 checks)**: all five representative official
  services present publicly; JAMB biometric/physical/appointment flags + fee splits +
  honest verification_status + required docs; NYSC not-impersonating (provider set,
  biometric flag); CAC official fee split + signature requirement; printing intact;
  physical-presence services surfaced to the storefront.

### Phase 12 — Delivery (built, verified ALL PASS)
- **New `/delivery` router** (`app/api/v1/endpoints/delivery.py`, registered in `api.py`)
  reusing the existing `deliveries` + `delivery_zones` tables (added `created_at`
  column via SQLite migration; already present in `001_init.sql`).
  - Zone management (admin): `GET /zones`, `POST /zones`, `PATCH /zones/{id}`.
  - Dispatch: `POST /delivery` (customer on own order — sets `local_delivery` +
    zone fee, or `custom_delivery` + address; rejects duplicate dispatch, foreign
    access, and cancelled/refunded/delivered orders; updates order `delivery_fee`/
    `total`).
  - Assignment (admin): `PATCH /{id}/assign` — only a real `delivery_person`, flips
    `pending → assigned`.
  - Tracking: `PATCH /{id}/status` (`pending → assigned → picked_up →
    out_for_delivery → delivered`, or `cancelled`; terminal states locked). Delivery
    person can only update in-hand statuses (`picked_up`/`out_for_delivery`/
    `delivered`); staff can drive the full flow.
  - List/detail decorate with `order_number`, `zone_name`, `delivery_person_name`;
    customers see only own, runners only their assigned, staff all (status filter).
- `delivery.py` schema file added; `created_at` field + notify helpers
  (`notify_delivery_created`, `notify_delivery_status`) added to notifications service.
- `smoke_delivery.py` **ALL PASS (26 checks)**: zones create/list, customer dispatch,
  zone-fee/order-total wiring, duplicate & foreign-dispatch guards, customer-cannot-
  assign, unassigned-runner 403, admin assign to a real delivery person, runner
  picked_up/out_for_delivery/delivered, runner-cannot-revert-to-pending, invalid-status
  422, terminal-status lock, detail decoration.
- **Frontend:** customer order detail `/orders/[orderNumber]` gets a **Delivery** card
  (request delivery via zone-select or custom address; live status stepper with
  `picked_up`/`out_for_delivery`/`delivered`); **admin `/admin/deliveries`** page
  (summary counts, zone CRUD panel, per-dispatch assign-dropdown + picked up / out /
  delivered / cancel actions, delivery-person list via `/admin/users?role=delivery_person`).
  Added to admin nav + overview quick link. `tsc --noEmit` clean;
  `/admin/deliveries` serves HTTP 200.
- All 20 smoke suites now ALL PASS (no regressions).

### Phase 31 - Referral system (built, verified ALL PASS)
- **New models** (`app/models/referral.py`, registered in `models/__init__.py`):
  `ReferralProgram` (single-row config: is_active, reward_type fixed/percentage,
  reward_value, minimum_order_amount, maximum_reward, eligible_service_ids),
  `ReferralCode` (unique per user, DP-PRINCE-XXXXXX), `ReferralSignup` (unique
  referred user), `ReferralReward` (unique order). Tables created on SQLite via
  `db_migrate_referral.py`; `001_init.sql` updated with DDL + trigger for fresh PG DBs.
- **New `/referrals` router** (`app/api/v1/endpoints/referrals.py`, registered in
  `api.py`):
  - `GET/PUT /program` - single-row program config (admin only; auto-created on first
    read; 403 for customers).
  - `GET /my` - customer's code (created on demand), signup count, reward total +
    history (decorated with referred_name / order_number).
  - `POST /apply` - referee applies a code: invalid 404, self-refer 400, duplicate 400,
    creates signup + notification to referrer.
  - `GET /signups`, `GET /rewards` - staff see all, customers only own.
  - `POST /orders/{order_id}/reward` - staff manual reward, idempotent.
- **Auto-reward hook** in `orders.py` `update_order_status`: when an order moves to
  `paid`/`completed`, `maybe_reward_referral` runs (idempotent per order; requires
  active program, a signup, order total >= minimum, service match against
  eligible_service_ids; computes % or fixed, capped by maximum_reward; credits the
  referrer wallet with `Transaction` (referral_reward) + `WalletTransaction` + reward
  record + notification). Fixed a serialization bug in the status endpoint (order re-
  fetched with eager-loaded items before returning).
- **Frontend:** customer `/referrals` page (shareable code w/ copy, signup + reward
  summary cards, reward history), **admin `/admin/referrals`** page (program settings:
  active toggle, reward type/value, min order, max reward, eligible-service chips +
  rewards + signups lists). Added to both navs (Share2) + admin & customer dashboards.
  `/referrals` and `/admin/referrals` serve HTTP 200 via on-demand dev compile.
- `smoke_referral.py` **ALL PASS (28 checks)**: program configure + activate, code
  generation/masking, self/duplicate/invalid apply guards, customer-configure 403,
  fixed-reward auto-issuance on `paid`, wallet credit, no double reward on `completed`,
  manual-reward idempotency + pending-order refusal, staff rewards/signups lists,
  percentage-switch math. Full 13-suite regression ALL PASS.

### Phase 28 - Quotation system (built, verified ALL PASS)
- **New models** (`app/models/quotation.py`, registered in `models/__init__.py`):
  `QuotationRequest`, `Quotation`, `QuotationItem`; tables created on SQLite via
  `db_migrate_quotation.py` and added to `001_init.sql` (quotation_requests,
  quotations, quotation_items).
- **New `/quotations` router** (`app/api/v1/endpoints/quotations.py`, registered in
  `api.py`):
  - `POST /quotations/requests` - customer requests a quote (auto `QR-` number).
  - `GET /quotations/requests[/{id}]` - list/detail; customers see only own; decorates
    with `service_name`/`customer_name`; foreign detail 403.
  - `PATCH /request/{id}/cancel` - customer cancels an open request.
  - `POST /quotations` - staff-only (`require_roles(*STAFF_ROLES)`) issue a quotation
    with line items; computes subtotal/total (`discount`/`delivery_fee`/`tax`);
    supersedes prior `pending`/`change_requested` quotes; sets request `quoted`.
  - `POST /{id}/accept|reject|change` - customer actions. **Accept** creates an `Order`
    (+ `OrderItem` + `OrderStatusHistory`), sets order total from quote, supersedes the
    previous quote; double-accept rejected; customer-lists own quotations.
- **Frontend:** customer `/quotations` page (request quote dialog; request list + offers
  with accept / request-change / reject and line-item breakdown), **admin
  `/admin/quotations`** page (all requests + issue-quotation dialog with dynamic line
  items, discount/delivery/tax/validity). Added to both navs + admin & customer dashboards.
  `/quotations` and `/admin/quotations` serve HTTP 200 via on-demand dev compile.
- `smoke_quotation.py` **ALL PASS (29 checks)**: register/login, request creation +
  `QR-` numbering, service_name decoration, foreign-detail 403, customer-cannot-create,
  staff quotation with correct subtotal/total, embedded items, request flips to quoted,
  change -> revised `QT-` quotation + previous quote superseded, accept -> order created
  with matching total, double-accept 400, request final accepted.

### Phase 36 - Subscription system (built, verified ALL PASS)
- **Enums added** (`app/models/enums.py`): `BillingCycle` (monthly/quarterly/yearly),
  `SubscriptionStatus` (active/paused/cancelled/expired).
- **New models** (`app/models/subscription.py`, registered in `models/__init__.py`):
  `SubscriptionPlan` (name, slug, optional service link, cycle, amount, is_active),
  `Subscription` (SU- number, customer/plan, cycle, status, service_status, start /
  next_billing / last_billed, auto_renew, renewal_count), `SubscriptionRenewal`
  (cycle window, amount, payment status, wallet transaction_ref). Tables created on
  SQLite via `db_migrate_subscription.py`; `001_init.sql` updated with DDL + triggers
  for fresh PG DBs.
- **New `/subscriptions` router** (`app/api/v1/endpoints/subscriptions.py`, registered
  in `api.py`):
  - `GET /plans` (active plans), `POST /plans` + `PATCH /plans/{id}` (admin-only,
    duplicate-slug rejection, activation toggle).
  - `POST /subscribe` - customer subscribes to an active plan; duplicate active
    subscription to same plan rejected; first renewal recorded as `pending`.
  - `GET /subscriptions[/{id}]` - customer sees own (foreign 403); staff see all with
    optional status filter; outputs decorated with `plan_name`/`customer_name`/renewals.
  - `PATCH /{id}/cancel|pause|resume` - lifecycle transitions with correct guards
    (pause only active, resume only paused, cancel idempotent-reject).
  - `POST /{id}/renew` - renews the current cycle: if `auto_renew` and wallet has
    balance it **debits the wallet**, creates a `Transaction` (subscription_renewal,
    completed, wallet) + `WalletTransaction`, records `completed` renewal and advances
    `next_billing_date`; otherwise records a pending renewal (expires when not
    auto-renew and unpaid). Customers blocked until due; staff may force renewal.
- **Frontend:** customer `/subscriptions` page (plan cards + subscribe; my-subscriptions
  with pause/resume/cancel, billing countdown, renewal history), **admin
  `/admin/subscriptions`** page (plan CRUD/toggle + all-subscriptions with admin
  renewal processing). Added to both navs + admin & customer dashboards.
  `/subscriptions` and `/admin/subscriptions` serve HTTP 200 via on-demand dev compile.
- `smoke_subscription.py` **ALL PASS (29 checks)**: admin plan create + duplicate reject,
  customer-cannot-create, plan listing, subscribe + SU- numbering + plan_name decoration,
  duplicate-subscribe 400, foreign detail 403, customer renew-before-due 400, wallet fund,
  admin force-renew -> renewal_count/next_billing advanced + wallet debit, pause/resume/
  cancel/double-cancel, admin filtered listing.

### Phase 57 - Customer support centre (built, verified ALL PASS)
- **Enums added** (`app/models/enums.py`): `SupportCategory` (general / order_dispute /
  refund_request / escalation), `SupportPriority` (low/medium/high),
  `SupportTicketStatus` (open / in_progress / waiting_customer / resolved / closed),
  `RefundDecision` (approved / denied).
- **New models** (`app/models/support.py`, registered in `models/__init__.py`):
  `SupportTicket` (TK- number, customer, optional order link, subject, category,
  priority, status, description, is_escalated + reason, refund_decision + amount,
  resolved_at / closed_at, created/updated), `SupportMessage` (customer/staff thread
  with sender_role, cascade delete), `FAQ` (question/answer/category/is_active).
  Tables created on SQLite via `db_migrate_support.py`; `001_init.sql` updated with
  DDL + indexes for fresh PG DBs.
- **New `/support` router** (`app/api/v1/endpoints/support.py`, registered in api.py):
  - `GET /faqs` (active only), `POST /faqs` + `PATCH /faqs/{id}` (admin-only).
  - `POST /tickets` - customers (or staff) create tickets; order-linked tickets
    validate ownership (other customer's order 403, missing order 404); auto TK-XXXXXX.
  - `GET /tickets[/{id}]` - customers see own (foreign 403), staff see all with
    optional status filter; outputs decorated with customer_name/order_number/sender
    names via an eager-load helper (no lazy-load errors).
  - `POST /tickets/{id}/messages` - thread replies; staff reply moves to in_progress,
    customer reply on waiting_customer reopens to open, message on closed ticket 400.
  - `PATCH /tickets/{id}/status` - staff any of the 5 spec statuses; customers limited
    to resolved/closed on their own tickets; resolved_at/closed_at stamped.
  - `POST /tickets/{id}/escalate` - owner or staff (double-escalate 400, reason kept).
  - `PATCH /tickets/{id}/refund` - admin refund decision (approved/denied + amount;
    auto-resolves the ticket).
- **Frontend:** customer `/support` page (FAQ list, create-ticket form with
  category/priority/order link, my-tickets list + detail thread with reply, escalate
  and mark-resolved, refund badge), **admin `/admin/support`** page (status filter
  chips, ticket list + detail thread with staff reply, status transition buttons,
  approve/deny refund for refund tickets, FAQ manager). Added to both navs (LifeBuoy) +
  admin & customer dashboards. `/support` and `/admin/support` serve HTTP 200 via
  on-demand dev compile.
- Fixed the referrals page toast import (`toaster` → `showToast` from
  `@/hooks/use-toast`) so it compiles cleanly.
- `smoke_support.py` **ALL PASS (40 checks)**: FAQ create/toggle/list + customer-create
  403, ticket creation with TK- numbering, foreign-order 403 / missing-order 404,
  foreign-ticket 403, message thread with sender roles, staff-reply→in_progress and
  waiting_customer→open reopen, escalate + double-escalate 400, customer status
  restriction, customer resolve + staff close with timestamps, message-on-closed 400,
  refund request + admin approve/deny (customer 403), own/staff lists + status filter,
  detail decoration. Full 14-suite regression ALL PASS.

### Phase 58 - Business Analytics (built, verified ALL PASS)
- **New `/analytics` router** (`app/api/v1/endpoints/analytics.py`, registered in `api.py`):
  - `GET /analytics/overview` (staff-only 403 for customers; `range_days` param
    7-3650, clamped, echoed back) aggregates live records into one response:
  - `summary` - total/30d revenue (from paid/completed/delivered order totals),
    expenses, profit, order count, customer count.
  - `revenue_by_service` + `most_ordered_services` + `most_profitable_service`
    (per-service revenue/orders/units from order items, sorted).
  - `revenue_by_branch` (includes an `Unassigned` bucket for orders without a
    branch) and `revenue_by_payment_method` (from completed Payments). Both
    reconcile exactly against the summary revenue.
  - `expenses_by_category`, `customer_retention` (repeat customers rate + avg
    orders/customer), `customer_acquisition` (last 6 calendar months, Python-side
    grouping), `worker_performance` (from Commission: jobs / commission /
    earned), `order_completion_time` (created_at -> completed_at hours/days, min/
    max), `referral_performance` (signup/reward totals + top referrers).
  - Read-only: no new tables, no migration needed; consistent with the existing
    `r2()` rounding + `_is_staff` guard patterns.
- **Frontend:** admin `/admin/analytics` page (summary cards for revenue/expenses/
  profit/orders with 30d variants; top services + most-profitable service; inline
  bar charts for revenue-by-service / branch / payment method and expenses by
  category; retention %, acquisition months, order completion time, worker
  performance list, referral performance cards). Added to admin nav (BarChart3) +
  admin-overview quick link. `/admin/analytics` serves HTTP 200 via on-demand dev
  compile.
- `smoke_analytics.py` **ALL PASS (32 checks)**: admin overview keys, range_days
  echo + clamp, revenue == sum(revenue_by_service) == sum(revenue_by_branch),
  profit == revenue - expenses, retention range, 6-month acquisition with int
  counts, worker/completion/referral metrics present, customer 403, and a seeded
  delta run (fresh order + expense -> revenue rises by the order total, service
  captured, category recorded, profit falls). Full 15-suite regression ALL PASS.

### Phase 59 - Data privacy centre (built, verified ALL PASS)
- **New models** (`app/models/privacy.py`, registered in `models/__init__.py`):
  - `DataPurpose` - registry of what we collect and why (`purpose_code`,
    title/description, `data_collected[]`, `retention_days`, `is_required`,
    `is_active`); seeded lazily with 6 defaults (3 required: service fulfillment,
    payment, identity verification; 3 optional: support, marketing, analytics).
  - `DataConsent` - per-user per-purpose grant/revoke (unique user+purpose).
  - `PrivacyRequest` - self-service `PRIV-...` data-export / data-deletion requests.
  - `DataAccessAudit` - every sensitive-data access (who accessed whose data).
    Tables created via `db_migrate_privacy.py`; `001_init.sql` updated with DDL +
    indexes + consent `updated_at` trigger for fresh PG DBs.
- **New `/privacy` router** (`app/api/v1/endpoints/privacy.py`, registered in api.py):
  - `GET/POST/PATCH /purposes` - public purpose list (why we ask); admin create +
    retention policy edits (retention_days 7-3650 validated).
  - `GET /consents`, `PUT /consents/{code}` - consent statuses; revoking a required
    purpose 400, optional grant/revoke round-trips recorded to audit.
  - `GET /export` - customer self-service export (own profile, consents, orders,
    order messages, support tickets, wallet transactions) as portable JSON.
  - `POST /requests` (customer, type-validated), `GET /requests` (own or staff-all),
    `POST /requests/{id}/process` (admin approve/deny; approving a deletion
    soft-deletes + deactivates the account so future logins fail).
  - `GET /audit` - customers see accesses to their own data, staff see all.
  - `POST /prune` - admin hard-deletes accounts soft-deleted >30 days earlier
    (the deliberate beyond-retention deletion process) + their identity/consent/
    access rows; `GET /mask?value=` previews the masking rule (keep-last-4).
- **Sensitive-data audit hook:** `identity.py` now logs a `DataAccessAudit` row
  whenever an admin verifies a customer's NIN/BVN/SNIN (masked_id only, never raw).
- **Frontend:** customer `/privacy` page (why-we-ask purposes with required/optional
  badges + consent toggle, data export with JSON preview, deletion request with
  request list, who-accessed-my-data audit list), **admin `/admin/privacy`** page
  (purpose registry with retention stepper, request queue with approve/deny,
  sensitive-data access audit). Added to both navs (Lock) + admin & customer
  dashboards. `/privacy` and `/admin/privacy` serve HTTP 200 via on-demand dev
  compile.
- `smoke_privacy.py` **ALL PASS (36 checks)**: purposes seeded + structure,
  required v optional split, customer consents pre-granted for required, revoke
  required 400 / optional round-trip, unknown purpose 404, export contents,
  mask preview + admin-only guard, identity-verify creates customer-visible audit
  entry, deletion request lifecycle (PRIV number, invalid type 422, customer
  cannot process, admin approve -> account login blocked). Full 16-suite
  regression ALL PASS.

### Phase 60 - Business model / revenue streams (built, verified ALL PASS)
- **Extensible tagging:** `ServiceCategory` gains a `revenue_stream` column
  (migration `db_migrate_business.py` ALTERs SQLite + backfills the seeded
  categories; `001_init.sql` `service_categories` DDL updated). Category
  create/PATCH now accepts `revenue_stream`, so an admin can create a brand-new
  category for a brand-new revenue stream and any paid orders automatically flow
  into the stream report - **no application rewrite required** (the phase's core
  spec rule, proven in the smoke test).
- **Revenue-stream catalogue** (`app/services/business.py`): the spec's 20 streams
  (`service_fees`, printing, computer_sessions, graphic_design, web_development,
  website_maintenance, hosting_management, business_registration,
  document_processing, delivery, worker_commissions, training, business_advertising,
  subscriptions, corporate_contracts, digital_documents, consultation,
  equipment_sales, referral_partnerships, other_configurable).
- **New `/business` router** (`app/api/v1/endpoints/business.py`, registered in
  api.py):
  - `GET /business/revenue-streams` (admin, customer 403) → per-stream `revenue`,
    `orders`, `categories`, `active`, and `total_revenue` (sums of the streams),
    plus `unmapped_category_revenue` / `unmapped_categories`.
  - Category streams computed live from paid-order items grouped by their
    category's `revenue_stream`; dedicated streams from their own tables
    (paid print jobs, paid cafe sessions, delivery fees, paid commissions margin,
    subscription renewals, referral rewards).
- **Frontend:** admin `/admin/business` page (total/active/unmapped cards,
  per-stream revenue bars with order badges, and a category-to-stream tagging
  select). Added to admin nav (Landmark) + admin-overview quick link.
  `/admin/business`, `/admin`, `/admin/analytics` serve HTTP 200 via on-demand
  dev compile.
- `smoke_business.py` **ALL PASS (22 checks)**: 20 spec stream codes present,
  total == sum(streams), worker_commissions/printing captured from live data,
  customer 403, then the proof-of-extensibility flow - admin creates a new
  category tagged `corporate_contracts` + a new service, customer orders it,
  admin marks paid, and `corporate_contracts` revenue/orders rise with zero
  application change; plus category re-tag/clear round-trip and total consistency.
  Full 17-suite regression ALL PASS.

### Phase 61 - Seasonal vs year-round services (built, verified ALL PASS)
- **Spec rule honored:** the platform does NOT depend on only one service. Even if
  the JAMB season ends, customers still use printing, NYSC, CAC, CV, jobs,
  graphics, web development, computer services, business services, training,
  document services, delivery, online applications, etc.
- **Seasonality on the `Service` model:** `is_seasonal` (bool),
  `season_months` (JSON list 1-12), `season_label` (e.g. "JAMB/UTME season
  (Jan-May)"). Migration `db_migrate_seasonality.py` ALTERs services and
  backfills the 10 seeded JAMB/UTME services as seasonal; `001_init.sql` DDL
  updated. Exposed through `ServiceBase`/`ServiceUpdate`/`ServiceOut`; admin can
  flip a service's seasonality via the normal service PATCH - no app rewrite.
- **New resilience report:** `GET /business/seasonality` (admin, customer 403)
  → active/seasonal/year-round service counts, seasonal vs year-round revenue
  (`share_if_jamb_ends` = % of revenue that survives if the whole JAMB season
  ends today), distinct year-round revenue streams, the seasonal service list
  (name/label/months/revenue) and the year-round backbone grouped by category.
- **Public list filter:** `GET /services?seasonal=year_round|seasonal` for
  customer-facing filtering; ServiceOut now carries the seasonality fields.
- **Frontend:** storefront service cards + order dialog show a "Seasonal · "
  warning badge/label; admin services editor gains a Seasonality block
  (toggle, in-season month list, label); the `/admin/business` page gains a
  Seasonality & resilience card (counts, JAMB-ending revenue survival %, seasonal
  list, year-round backbone, stream tags). `/admin/business`, `/services`,
  `/admin/services` serve HTTP 200.
- `smoke_seasonality.py` **ALL PASS (27 checks)**: report shape + counts + JAMB
  backfill, customer 403, public filter correctness, admin creates a brand-new
  seasonal service (persisted on create, reconfigurable via PATCH), customer
  spends on it → seasonal revenue/count rise, and the year-round backbone
  remains broad. Full 18-suite regression ALL PASS.

### Phase 62 - SEO & public service pages (built, verified ALL PASS)
- **Structured URLs (spec 67):** new public API lookup `GET /services/by-slug/{slug}`
  (no auth; 404 for unknown or inactive/draft services, so unpublished services
  are never crawlable). New storefront detail page `(dashboard)/services/[slug]`
  + `client.tsx` - a Next.js server page with `generateMetadata` (title, meta
  description, Open Graph) and `Service` JSON-LD structured data, plus the full
  order flow (quantity, instructions, deadline, file upload) routed from the
  `/services` card grid, which now links each card to its slug URL.
- **Landing page:** `/` gains a `Metadata` export (title, description, keywords,
  Open Graph) and `LocalBusiness` + `OfferCatalog` JSON-LD (printing, computer
  services, web dev, graphic design, JAMB/NYSC/CAC).
- **Site-wide:** root layout metadata template (`%s | De-Prince Digital Hub`),
  `metadataBase`, robots/index defaults. New `app/robots.ts` (crawl rules
  disallowing dashboard/admin/orders/wallet/profile/messages/notifications +
  sitemap pointer) and `app/sitemap.ts` (home, /services, /login, /register,
  /verify).
- Verified live: `/services/apa-formatting`, `/services`, `/robots.txt`,
  `/sitemap.xml`, `/` all HTTP 200; robots.txt + sitemap.xml XML content correct;
  detail page serves `application/ld+json` + page title; home serves
  `LocalBusiness` JSON-LD.
- `smoke_seo.py` **ALL PASS (12 checks)**: unique slugs on public list, by-slug
  200 without auth and matches the list entry, 404 for unknown slug, 404 for an
  inactive/draft service (admin by-id still works), public list excludes
  inactive, seasonal SEO fields ride along. Full 19-suite regression ALL PASS.

### Phase 63 - Owner control / whole-business dashboard (built, verified ALL PASS)
- **Role hierarchy honored (spec 69):** the seeded super-admin already maps to
  owner-level access. New `require_owner` dependency = `super_admin` +
  `business_owner`; owner commands sit on a new `/owner` router.
- **New endpoints (`app/api/v1/endpoints/owner.py`):**
  - `GET /owner/dashboard` - one-stop view of the entire business: counts
    (services, categories, customers, staff, workers, orders, appointments,
    print jobs/queue, computers/sessions, inventory, deliveries, branches,
    notifications, audit entries), money (paid revenue, expenses, profit,
    customer wallet balances held, paid commissions), branches, business
    settings, and recent audit activity.
  - `GET /owner/audit-logs?limit&offset&action` - owner-only audit trail with
    actor names/emails and IPs, paginated, filterable by action.
  - `PATCH /owner/users/{id}/role` - owner-level role management (validated
    against the UserRole enum; cannot change your own role; only a super admin
    can change a super admin).
  - `PATCH /owner/users/{id}/status` - enable/disable accounts (cannot disable
    own account). Both actions are written to the audit trail.
- **Frontend:** `/admin/owner` "Owner HQ" page (visible in nav only to
  owner-level roles): money + counts grid, branches, recent activity, a
  paginated/filterable audit-trail viewer, and staff/account management with
  role dropdowns + enable/disable per account. Routes HTTP 200.
- `smoke_owner.py` **ALL PASS (27 checks)**: dashboard shape + profit
  consistency, owner-only (customer 403, anonymous 401/403), audit pagination +
  action filter + actor resolution, promote a fresh customer to
  `business_owner` who then accesses the dashboard, security guards (no
  self-role-change, invalid role 400, missing user 404, no self-disable),
  disabled users can't log in, re-enable works, role changes are audited and
  cleaned up. Full 21-suite regression ALL PASS.

### Phase 64 - Security & performance hardening (spec 64/66, built, verified ALL PASS)
- **Hot-path query indexes:** `db_migrate_indexes.py` adds 10 indexes to cut
  per-request scans on high-traffic tables:
  `idx_order_items_service`, `idx_order_items_quantity`,
  `idx_print_jobs_paid(status,is_paid)`, `idx_sessions_paid`,
  `idx_commissions_paid`, `idx_wallet_tx_type`, `idx_deliveries_status`,
  `idx_access_audit_actor`, `idx_privacy_reqs_type`, `idx_expenses_created`.
  All verified `CREATED` against the live DB; the identical block is appended to
  the canonical `database/001_init.sql`.
- **Security smoke suite (`smoke_security.py`) ALL PASS (27 checks):** wrong
  password 401 / unknown email 401, tampered JWT rejected, refresh token not
  usable as access, weak password rejected, invalid email rejected, register
  role tamper is ignored (rogue account still `customer` via `/auth/me`),
  authorization matrix (customer 403 on `/admin/stats`, `/owner/dashboard`,
  `/business/revenue-streams`; anonymous 401/403), order-ownership isolation,
  empty-items / zero-quantity / negative-price order validation, SQL-ish login
  and search inputs safely rejected (422/200-empty), no secrets leaked by
  `/admin/settings` or `/owner/dashboard`, file-type upload guard (`.txt`/`.exe`
  400, `.pdf` accepted).
- **Smoke fix:** `smoke_analytics.py` revenue-by-service check was comparing
  `sum(top-10 services)` against total revenue; with accumulated seed data the
  service list grows past ten and top-10 sum < total is expected (not a bug). The
  check now asserts equality when <10 services and `<= total` otherwise.
- Full 21-suite regression ALL PASS (e2e, final, official, print, receipts,
  service_engine, verify, appointments, delivery, identity, quotation,
  subscription, referral, support, analytics, privacy, business, seasonality,
  seo, owner, security).

### Brand kit integration (official assets wired in)
- **Assets added:** official lockup PNG pulled from the provider CDN into
  `public/images/logo-lockup-dark.png`; generated `public/assets/logo-favicon.svg`
  + `public/assets/logo-mark.svg` (gold `#D4A84B` / bright `#F0D382` on charcoal
  `#1A1A1A` / ink `#0B0B0B`) and `public/images/logo-app-icon.png` (180x180).
- **Root layout:** `icons.icon` -> favicon SVG, `icons.apple` -> touch icon PNG.
- **Brand tokens CSS:** `--brand-gold/-bright/-deep`, `--brand-charcoal`,
  `--brand-ink` in `globals.css` plus responsive `.brand img` (56px, 40px on
  small screens).
- **Applied everywhere:** landing header/footer, dashboard sidebar, login and
  register card headers, verify page swapped their Store glyph for the brand
  mark. Routes + assets all HTTP 200.

### Testing note
- Frontend production build (`next build`) is slow in this environment
  (~13 min `npm install`, ~100 s per-page dev compile). Typecheck +
  per-route dev compile are the reliable verification path here.
- **As of Phase 65, `next build` passes cleanly:** 44 routes compiled, types
  clean, static pages generated. The build surfaced real TypeScript bugs
  (unused `showToast()` call signature, missing `Link` import, missing
  `Suspense` boundary on `/verify`) that per-route dev compiles did not catch.
  **As of Phase 66 the build is still clean (47 routes**, including the new
  `/wallet` and `/admin/withdrawals` pages).

### Phase 65 - Deployment hardening (partial — live-server PG validation pending)
- **Secrets rotated:** `backend/.env` now carries strong randomly-generated
  `SECRET_KEY` and `JWT_SECRET_KEY` (64-byte URL-safe tokens). Old dev defaults
  removed.
- **Production env template:** `backend/.env.production.example` documents every
  setting with production values: `DEBUG=false`, Postgres `DATABASE_URL`/`DATABASE_URL_SYNC`
  (asyncpg + psycopg2), `ALLOWED_HOSTS`, `CORS_ORIGINS` for HTTPS, real payment
  key placeholders, SMTP, and identity provider config.
- **Frontend env-driven site URL:** sitemap, robots.txt, and root-layout
  `metadataBase` now read `NEXT_PUBLIC_SITE_URL` (defaults to
  `deprince.example` only if unset). New `frontend/.env.example` documents
  `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_API_URL`, and `NEXT_PUBLIC_APP_NAME`.
- **Type bugs fixed during `next build`:**
  - `showToast()` called as a function instead of `.success()/.error()` in
    `admin/business`, `admin/owner`, `privacy`, and `admin/privacy` pages.
  - `service.category?.name` referenced a non-existent `category` field on the
    `Service` type → added `category_name?: string | null`, enriched server-side
    via `/services/categories` in the slug page.
  - Missing `Link` import in `(dashboard)/services/page.tsx`.
  - `/verify` `useSearchParams()` wrapped in `Suspense` boundary.
- **Postgres drivers installed:** `asyncpg==0.31.0` (0.31.0 has cp314 wheels;
  0.30.0 did not) and `psycopg2-binary` added to `requirements.txt`. Both import
  cleanly; `create_async_engine` and `create_engine` construct OK with the
  `postgresql+` URLs.
- **Alembic offline DDL validated:** `alembic upgrade head --sql` against the
  Postgres dialect produces correct `PostgresqlImpl` DDL (creates
  `alembic_version` table, runs `0001_initial` migration). Live `upgrade head`
  against a running PG instance is the remaining operator step.
- **Still pending (needs real host, not this dev machine):**
  - `docker run postgres:16-alpine` + `alembic upgrade head` against live DB.
  - Full 21-suite smoke with production-like env (`APP_ENV=production`,
    `DEBUG=false`) against a real Postgres instance.
  - Real payment provider keys (`PAYSTACK_SECRET_KEY`, etc.) — app falls back
    to the mock provider when blank.

### Phase 66 - Nigerian bank payments (commercial + microfinance) & wallet withdrawals
- **Bank catalogue (132 banks: 25 commercial + 107 microfinance):** new `Bank`
  model, `GET /banks` public searchable list, `GET /admin/banks` (filter by
  `commercial`/`microfinance`), `POST /admin/banks/refresh` re-seeds from the
  static catalogue and, when `PAYSTACK_SECRET_KEY` is set, also pulls the live
  Paystack NGN bank list so codes always match the transfer gateway (source
  reported as `static` vs `paystack`).
- **Wallet bank account:** `wallets` gained `bank_code`, `account_number`,
  `account_name`, `account_verified`. `POST /wallet/bank/verify` runs name-enquiry
  (Paystack `/bank/resolve` when configured, deterministic mock otherwise);
  `POST /wallet/bank` persists the verified account; `GET /wallet/bank` reads it.
- **Withdrawal flow:** new `WithdrawalRequest` model + `withdrawal_requests`
  table. `POST /wallet/withdraw` (min ₦500, blocks double-pending, holds funds),
  `GET /wallet/withdrawals`, `GET /admin/withdrawals/pending`,
  `GET /admin/withdrawals/summary`, `PATCH /admin/withdrawals/{id}` (approve →
  Paystack transfer + `processing`; reject → refund to wallet with `-REV`
  reversal txn), `POST /admin/withdrawals/{id}/complete` and `/fail` (refunds).
- **Frontend:** wallet page rebuilt with bank-setup card (searchable bank
  dropdown showing all 132 banks + live name-enquiry preview), withdraw form,
  withdrawal history + status badges; new admin **Bank Payouts** page
  (`/admin/withdrawals`) with summary cards, approve/reject actions, admin note,
  mark-failed-with-refund, and bank-list refresh. Admin dashboard quick links
  updated.
- **Build/migrations:** `db_migrate_banks.py` (idempotent DDL + wallet columns),
  Alembic `0002_banking`, `database/001_init.sql` updated (banks table,
  withdrawal_status enum, withdrawal_requests, indexes, wallet columns).
- **Smoke-tested:** new `smoke_banking.py` (26 checks — catalogue, search,
  name-enquiry, save/read bank, fund→withdraw→approve→complete, reject-refund,
  double-pending block, admin summary/filters/refresh) ALL PASS; **full
  regression: all 21 existing suites pass** and `next build` is clean (47 routes).

---

## Not yet built (pending — do NOT claim as done)
- PWA installability, push notifications, offline mode.
- The `asyncpg` PostgreSQL path: drivers are installed and work (`asyncpg` 0.31.0,
  `psycopg2-binary`), alembic offline DDL renders correctly against the PG
  dialect, and both async + sync engines construct with the `postgresql+` URLs.
  The production entrypoint (`start.sh`) runs `alembic upgrade head` automatically
  on boot, and `0001_initial.py` resolves `001_init.sql` against both source-tree
  and container layouts. The only remaining live-server step is provisioning the
  database and setting `DATABASE_URL` in the environment.

---

## Run it locally (SQLite, no Docker)

```bash
cd backend
pip install -r requirements.txt
# ensure backend/.env has the SQLite DATABASE_URL lines active
uvicorn app.main:app --reload --port 8000   # API docs at /docs

# separate terminal
cd frontend
npm install
npm run dev                                  # http://localhost:3000
```

Seed: `python -m app.utils.seed` → login `admin@deprince.com` / `admin123`.

## Deploy online (testing)

### Option A — Render (recommended, free tier)
1. Push repo to GitHub.
2. Render dashboard → **New → Blueprint** → select repo.
3. `render.yaml` provisions PostgreSQL + backend Docker + frontend (Next.js).
4. On first boot, `start.sh` runs `alembic upgrade head` (creates all tables),
   then `python -m app.utils.seed` (admin user, wallets, services, 132 banks).
5. Set exact deployed URLs in `ALLOWED_HOSTS`, `CORS_ORIGINS`,
   `NEXT_PUBLIC_API_URL`, and `NEXT_PUBLIC_SITE_URL` before going live.
6. Payment identity/SMTP left blank → app uses safe mock providers.

### Option B — Railway / Heroku
Backend: deploy from `backend/` directory using `Procfile` → `web: bash start.sh`.
Set `DATABASE_URL` (PostgreSQL add-on). Frontend: deploy from `frontend/` with
`npm run build && npm run start`.

### Option C — Vercel (frontend) + any backend host
`frontend/vercel.json` is pre-configured. Set `NEXT_PUBLIC_API_URL` to the
backend origin during Vercel project creation. Backend needs its own Postgres
add-on and `start.sh` entrypoint (Dockerfile included in `backend/`).
