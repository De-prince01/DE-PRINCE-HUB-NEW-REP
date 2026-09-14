-- DE-PRINCE DIGITAL HUB — Database Schema
-- PostgreSQL 15
-- Phase 1: Core tables

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE user_role AS ENUM (
  'super_admin', 'business_owner', 'admin', 'manager', 'staff',
  'printing_operator', 'graphic_designer', 'web_developer',
  'academic_service_worker', 'technician', 'delivery_person',
  'partner_freelancer', 'customer'
);

CREATE TYPE order_status AS ENUM (
  'pending', 'payment_pending', 'paid', 'received', 'assigned',
  'in_progress', 'waiting_for_customer', 'revision_requested',
  'quality_check', 'completed', 'ready_for_pickup',
  'out_for_delivery', 'delivered', 'cancelled', 'refunded'
);

CREATE TYPE payment_status AS ENUM (
  'pending', 'processing', 'completed', 'failed', 'refunded'
);

CREATE TYPE payment_method AS ENUM (
  'cash', 'transfer', 'card', 'online', 'wallet'
);

CREATE TYPE computer_status AS ENUM (
  'available', 'in_use', 'reserved', 'maintenance', 'offline'
);

CREATE TYPE delivery_type AS ENUM (
  'pickup', 'local_delivery', 'custom_delivery'
);

CREATE TYPE notification_type AS ENUM (
  'order_received', 'payment_confirmed', 'worker_assigned',
  'work_started', 'revision_requested', 'work_completed',
  'file_ready', 'ready_for_pickup', 'delivery_started',
  'order_delivered', 'wallet_credit', 'wallet_debit',
  'system'
);

-- ============================================================
-- USERS & AUTH
-- ============================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role user_role NOT NULL DEFAULT 'customer',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  avatar_url VARCHAR(500),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active) WHERE deleted_at IS NULL;

-- ============================================================
-- BRANCHES (Multi-branch ready)
-- ============================================================
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SERVICE CATEGORIES
-- ============================================================
CREATE TABLE service_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(200) UNIQUE NOT NULL,
  description TEXT,
  icon VARCHAR(100),
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  revenue_stream VARCHAR(60),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SERVICES
-- ============================================================
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES service_categories(id),
  name VARCHAR(300) NOT NULL,
  slug VARCHAR(300) UNIQUE NOT NULL,
  icon VARCHAR(100),
  image_url VARCHAR(500),
  description TEXT,
  short_description VARCHAR(500),
  price_type VARCHAR(20) DEFAULT 'fixed',
  base_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  price_unit VARCHAR(50) DEFAULT 'fixed',
  quotation_required BOOLEAN NOT NULL DEFAULT false,
  minimum_price NUMERIC(12,2),
  maximum_price NUMERIC(12,2),
  estimated_processing_time VARCHAR(100),
  estimated_duration VARCHAR(100),
  requirements JSONB,
  required_documents JSONB,
  requires_file_upload BOOLEAN NOT NULL DEFAULT false,
  requires_description BOOLEAN NOT NULL DEFAULT true,
  requires_physical_presence BOOLEAN NOT NULL DEFAULT false,
  requires_biometric BOOLEAN NOT NULL DEFAULT false,
  requires_photograph BOOLEAN NOT NULL DEFAULT false,
  requires_signature BOOLEAN NOT NULL DEFAULT false,
  requires_appointment BOOLEAN NOT NULL DEFAULT false,
  requires_staff BOOLEAN NOT NULL DEFAULT false,
  requires_worker BOOLEAN NOT NULL DEFAULT false,
  delivery_available BOOLEAN NOT NULL DEFAULT false,
  pickup_available BOOLEAN NOT NULL DEFAULT false,
  payment_required BOOLEAN NOT NULL DEFAULT true,
  commission_type VARCHAR(20) DEFAULT 'percentage',
  commission_value NUMERIC(10,2) DEFAULT 20.00,
  branch_availability JSONB,
  service_instructions TEXT,
  faq JSONB,
  official_provider VARCHAR(200),
  official_provider_url VARCHAR(500),
  official_fee NUMERIC(12,2),
  deprince_fee NUMERIC(12,2),
  last_verified_date TIMESTAMPTZ,
  verification_status VARCHAR(30) DEFAULT 'not_verified',
  is_seasonal BOOLEAN NOT NULL DEFAULT false,
  season_months JSONB,
  season_label VARCHAR(200),
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_services_category ON services(category_id);
CREATE INDEX idx_services_active ON services(is_active);

-- ============================================================
-- CUSTOMER PROFILES
-- ============================================================
CREATE TABLE customer_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id),
  company_name VARCHAR(200),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- WORKER PROFILES
-- ============================================================
CREATE TABLE worker_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id),
  specialties TEXT[],
  bio TEXT,
  commission_rate NUMERIC(5,2) DEFAULT 20.00,
  total_earnings NUMERIC(12,2) DEFAULT 0,
  total_jobs INT DEFAULT 0,
  average_rating NUMERIC(3,2) DEFAULT 0,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(30) UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES users(id),
  worker_id UUID REFERENCES users(id),
  branch_id UUID REFERENCES branches(id),
  status order_status NOT NULL DEFAULT 'pending',
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(12,2) DEFAULT 0,
  tax NUMERIC(12,2) DEFAULT 0,
  discount NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  delivery_type delivery_type DEFAULT 'pickup',
  delivery_address TEXT,
  deadline TIMESTAMPTZ,
  customer_notes TEXT,
  internal_notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_worker ON orders(worker_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_orders_created ON orders(created_at DESC);

-- ============================================================
-- ORDER ITEMS
-- ============================================================
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id),
  service_name VARCHAR(300) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL,
  total_price NUMERIC(12,2) NOT NULL,
  custom_options JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);

-- ============================================================
-- ORDER STATUS HISTORY
-- ============================================================
CREATE TABLE order_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status order_status,
  to_status order_status NOT NULL,
  changed_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_history_order ON order_status_history(order_id);

-- ============================================================
-- ORDER MESSAGES
-- ============================================================
CREATE TABLE order_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id),
  message TEXT NOT NULL,
  file_url VARCHAR(500),
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_messages_order ON order_messages(order_id);

-- ============================================================
-- FILES
-- ============================================================
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  original_name VARCHAR(500) NOT NULL,
  stored_name VARCHAR(500) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size BIGINT NOT NULL,
  file_path VARCHAR(1000) NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT false,
  download_count INT DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_files_order ON files(order_id);
CREATE INDEX idx_files_uploader ON files(uploaded_by);

-- ============================================================
-- WALLETS
-- ============================================================
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id),
  balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  bank_code VARCHAR(10),
  account_number VARCHAR(20),
  account_name VARCHAR(255),
  account_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID NOT NULL REFERENCES wallets(id),
  type VARCHAR(50) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  reference VARCHAR(100) UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wallet_tx_wallet ON wallet_transactions(wallet_id);

-- ============================================================
-- TRANSACTIONS
-- ============================================================
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference VARCHAR(100) UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  order_id UUID REFERENCES orders(id),
  type VARCHAR(50) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  payment_method payment_method,
  gateway VARCHAR(50),
  gateway_reference VARCHAR(200),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_order ON transactions(order_id);
CREATE INDEX idx_transactions_reference ON transactions(reference);

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES transactions(id),
  order_id UUID REFERENCES orders(id),
  amount NUMERIC(12,2) NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  payment_method payment_method NOT NULL,
  gateway VARCHAR(50),
  gateway_response JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_payments_order ON payments(order_id);

-- ============================================================
-- COMMISSIONS
-- ============================================================
CREATE TABLE commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id),
  worker_id UUID NOT NULL REFERENCES users(id),
  total_amount NUMERIC(12,2) NOT NULL,
  commission_amount NUMERIC(12,2) NOT NULL,
  worker_amount NUMERIC(12,2) NOT NULL,
  commission_rate NUMERIC(5,2) NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_commissions_worker ON commissions(worker_id);
CREATE INDEX idx_commissions_order ON commissions(order_id);

-- ============================================================
-- COMPUTERS (Cyber Café)
-- ============================================================
CREATE TABLE computers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id),
  name VARCHAR(50) NOT NULL,
  hourly_rate NUMERIC(10,2) NOT NULL DEFAULT 300,
  status computer_status NOT NULL DEFAULT 'available',
  specs TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- COMPUTER SESSIONS
-- ============================================================
CREATE TABLE computer_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  computer_id UUID NOT NULL REFERENCES computers(id),
  customer_id UUID REFERENCES users(id),
  customer_name VARCHAR(200),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_minutes INT DEFAULT 0,
  hourly_rate NUMERIC(10,2) NOT NULL,
  total_amount NUMERIC(10,2) DEFAULT 0,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_computer ON computer_sessions(computer_id);
CREATE INDEX idx_sessions_active ON computer_sessions(ended_at) WHERE ended_at IS NULL;

-- ============================================================
-- PRINT JOBS
-- ============================================================
CREATE TABLE print_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id),
  file_id UUID REFERENCES files(id),
  file_name VARCHAR(500) NOT NULL,
  total_pages INT NOT NULL DEFAULT 1,
  copies INT NOT NULL DEFAULT 1,
  color_mode VARCHAR(20) DEFAULT 'bw',
  paper_size VARCHAR(20) DEFAULT 'A4',
  binding_type VARCHAR(30),
  lamination BOOLEAN DEFAULT false,
  status VARCHAR(30) DEFAULT 'pending',
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ============================================================
-- DELIVERIES
-- ============================================================
CREATE TABLE delivery_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  estimated_time VARCHAR(100),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id),
  delivery_zone_id UUID REFERENCES delivery_zones(id),
  delivery_person_id UUID REFERENCES users(id),
  delivery_type delivery_type NOT NULL,
  address TEXT,
  fee NUMERIC(10,2) DEFAULT 0,
  status VARCHAR(30) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ============================================================
-- APPOINTMENTS
-- ============================================================
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_number VARCHAR(40) UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES users(id),
  service_id UUID REFERENCES services(id),
  branch_id UUID REFERENCES branches(id),
  staff_id UUID REFERENCES users(id),
  date TIMESTAMPTZ NOT NULL,
  time TIME NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 30,
  status VARCHAR(30) NOT NULL DEFAULT 'requested',
  requirements JSONB,
  notes TEXT,
  payment_required BOOLEAN NOT NULL DEFAULT false,
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_appointments_customer ON appointments(customer_id);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_date ON appointments(date);

CREATE TABLE appointment_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  day_of_week INT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_slots_branch ON appointment_slots(branch_id);

-- ============================================================
-- QUOTATIONS
-- ============================================================
CREATE TABLE quotation_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_number VARCHAR(30) UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES users(id),
  service_id UUID NOT NULL REFERENCES services(id),
  description TEXT,
  requirements JSONB,
  files JSONB,
  deadline TIMESTAMPTZ,
  budget NUMERIC(10,2),
  status VARCHAR(30) NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_qreq_customer ON quotation_requests(customer_id);
CREATE INDEX idx_qreq_status ON quotation_requests(status);

CREATE TABLE quotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quotation_number VARCHAR(30) UNIQUE NOT NULL,
  request_id UUID NOT NULL REFERENCES quotation_requests(id),
  created_by UUID NOT NULL REFERENCES users(id),
  note TEXT,
  discount NUMERIC(10,2) DEFAULT 0,
  delivery_fee NUMERIC(10,2) DEFAULT 0,
  tax NUMERIC(10,2) DEFAULT 0,
  valid_until TIMESTAMPTZ,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  subtotal NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_quotes_request ON quotations(request_id);

CREATE TABLE quotation_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  title VARCHAR(300) NOT NULL,
  description TEXT,
  quantity INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL
);
CREATE INDEX idx_qitems_quote ON quotation_items(quotation_id);

-- ============================================================
-- INVENTORY
-- ============================================================
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  category VARCHAR(100),
  sku VARCHAR(100) UNIQUE,
  quantity INT NOT NULL DEFAULT 0,
  unit VARCHAR(50) DEFAULT 'piece',
  purchase_price NUMERIC(10,2) DEFAULT 0,
  selling_price NUMERIC(10,2) DEFAULT 0,
  low_stock_threshold INT DEFAULT 10,
  supplier VARCHAR(200),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE inventory_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_id UUID NOT NULL REFERENCES inventory(id),
  type VARCHAR(20) NOT NULL,
  quantity INT NOT NULL,
  reference VARCHAR(200),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- EXPENSES
-- ============================================================
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  reference VARCHAR(200),
  receipt_url VARCHAR(500),
  created_by UUID NOT NULL REFERENCES users(id),
  branch_id UUID REFERENCES branches(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  type notification_type NOT NULL DEFAULT 'system',
  title VARCHAR(300) NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- ============================================================
-- RATINGS & REVIEWS
-- ============================================================
CREATE TABLE ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id),
  customer_id UUID NOT NULL REFERENCES users(id),
  worker_id UUID NOT NULL REFERENCES users(id),
  score INT NOT NULL CHECK (score >= 1 AND score <= 5),
  review TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ratings_worker ON ratings(worker_id);

-- ============================================================
-- RECEIPTS
-- ============================================================
CREATE TABLE receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receipt_number VARCHAR(50) UNIQUE NOT NULL,
  order_id UUID REFERENCES orders(id),
  transaction_id UUID REFERENCES transactions(id),
  customer_id UUID NOT NULL REFERENCES users(id),
  subtotal NUMERIC(12,2) NOT NULL,
  tax NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) NOT NULL,
  payment_method payment_method,
  qr_data TEXT,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);

-- ============================================================
-- IDENTITY SERVICE RECORDS (Restricted)
-- ============================================================
CREATE TABLE identity_service_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id),
  customer_id UUID NOT NULL REFERENCES users(id),
  service_type VARCHAR(100) NOT NULL,
  provider VARCHAR(100),
  data_encrypted BYTEA,
  access_log JSONB DEFAULT '[]',
  retention_days INT DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

-- ============================================================
-- SETTINGS
-- ============================================================
CREATE TABLE settings (
  key VARCHAR(200) PRIMARY KEY,
  value JSONB NOT NULL,
  category VARCHAR(100) DEFAULT 'general',
  description TEXT,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- COMMISSION RULES
-- ============================================================
CREATE TABLE commission_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_category_id UUID REFERENCES service_categories(id),
  worker_id UUID REFERENCES users(id),
  rule_type VARCHAR(20) NOT NULL DEFAULT 'percentage',
  value NUMERIC(10,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(300) NOT NULL,
  slug VARCHAR(300) UNIQUE NOT NULL,
  service_id UUID REFERENCES services(id),
  icon VARCHAR(100),
  description TEXT,
  billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly',  -- monthly | quarterly | yearly
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_number VARCHAR(30) UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES users(id),
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly',
  status VARCHAR(20) NOT NULL DEFAULT 'active',          -- active | paused | cancelled | expired
  service_status VARCHAR(30) NOT NULL DEFAULT 'active',  -- active | provisioning | paused | suspended | expired | cancelled
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_billing_date TIMESTAMPTZ NOT NULL,
  last_billed_at TIMESTAMPTZ,
  auto_renew BOOLEAN NOT NULL DEFAULT true,
  renewal_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_sub_customer ON subscriptions(customer_id);
CREATE INDEX idx_sub_plan ON subscriptions(plan_id);
CREATE INDEX idx_sub_status ON subscriptions(status);

CREATE TABLE subscription_renewals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  cycle_start TIMESTAMPTZ NOT NULL,
  cycle_end TIMESTAMPTZ NOT NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  payment_method VARCHAR(30),
  transaction_ref VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_subrenewal_sub ON subscription_renewals(subscription_id);

-- ============================================================
-- REFERRALS
-- ============================================================
CREATE TABLE referral_program (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  is_active BOOLEAN NOT NULL DEFAULT false,
  reward_type VARCHAR(20) NOT NULL DEFAULT 'fixed',   -- percentage | fixed
  reward_value NUMERIC(10,2) NOT NULL DEFAULT 200,
  minimum_order_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  maximum_reward NUMERIC(10,2),
  eligible_service_ids JSONB NOT NULL DEFAULT '[]',
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE referral_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id),
  code VARCHAR(40) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE referral_signups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID NOT NULL REFERENCES users(id),
  referred_user_id UUID NOT NULL UNIQUE REFERENCES users(id),
  code VARCHAR(40) NOT NULL,
  referred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ref_signups_referrer ON referral_signups(referrer_id);

CREATE TABLE referral_rewards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID NOT NULL REFERENCES users(id),
  referred_user_id UUID NOT NULL REFERENCES users(id),
  order_id UUID NOT NULL UNIQUE REFERENCES orders(id),
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  reward_type VARCHAR(20) NOT NULL DEFAULT 'fixed',
  status VARCHAR(20) NOT NULL DEFAULT 'earned',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ref_rewards_referrer ON referral_rewards(referrer_id);

-- ============================================================
-- CUSTOMER SUPPORT
-- ============================================================
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number VARCHAR(30) NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES users(id),
  order_id UUID REFERENCES orders(id),
  subject VARCHAR(200) NOT NULL,
  category VARCHAR(30) NOT NULL DEFAULT 'general',
  priority VARCHAR(10) NOT NULL DEFAULT 'medium',
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  description TEXT NOT NULL,
  is_escalated BOOLEAN NOT NULL DEFAULT FALSE,
  escalation_reason TEXT,
  refund_decision VARCHAR(10),
  refund_amount NUMERIC(10,2),
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_support_customer ON support_tickets(customer_id);
CREATE INDEX idx_support_status ON support_tickets(status);
CREATE INDEX idx_support_order ON support_tickets(order_id);

CREATE TABLE support_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id),
  sender_id UUID NOT NULL REFERENCES users(id),
  sender_role VARCHAR(10) NOT NULL DEFAULT 'customer',
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_support_msgs_ticket ON support_messages(ticket_id);

CREATE TABLE support_faqs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question VARCHAR(300) NOT NULL,
  answer TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'general',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PRIVACY (Phase 59)
-- ============================================================
CREATE TABLE data_purposes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purpose_code VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  data_collected JSONB DEFAULT '[]',
  retention_days INTEGER NOT NULL DEFAULT 30,
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE data_consents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  purpose_code VARCHAR(100) NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, purpose_code)
);

CREATE INDEX idx_consents_user ON data_consents(user_id);

CREATE TABLE privacy_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_number VARCHAR(50) UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  request_type VARCHAR(30) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  reason TEXT,
  processed_by UUID REFERENCES users(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX idx_privacy_reqs_user ON privacy_requests(user_id);
CREATE INDEX idx_privacy_reqs_status ON privacy_requests(status);

CREATE TABLE data_access_audits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  target_user_id UUID NOT NULL REFERENCES users(id),
  actor_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id UUID,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_access_audit_target ON data_access_audits(target_user_id);
CREATE INDEX idx_access_audit_created ON data_access_audits(created_at);

-- Hot analytical/revenue query indexes (spec 66)
CREATE INDEX idx_order_items_service ON order_items(service_id);
CREATE INDEX idx_order_items_quantity ON order_items(quantity, total_price);
CREATE INDEX idx_print_jobs_paid ON print_jobs(status, is_paid);
CREATE INDEX idx_sessions_paid ON computer_sessions(is_paid);
CREATE INDEX idx_commissions_paid ON commissions(is_paid);
CREATE INDEX idx_wallet_tx_type ON wallet_transactions(type);
CREATE INDEX idx_deliveries_status ON deliveries(status);
CREATE INDEX idx_access_audit_actor ON data_access_audits(actor_id);
CREATE INDEX idx_privacy_reqs_type ON privacy_requests(request_type, status);
CREATE INDEX idx_expenses_created ON expenses(created_at);

-- ============================================================
-- BANKS (Phase 66: commercial + microfinance catalogue)
-- ============================================================
CREATE TABLE banks (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255),
  longcode VARCHAR(50),
  paystack_id INTEGER,
  gateway VARCHAR(50),
  type VARCHAR(50) NOT NULL DEFAULT 'nuban',
  is_commercial BOOLEAN NOT NULL DEFAULT FALSE,
  is_microfinance BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
  country VARCHAR(10) NOT NULL DEFAULT 'Nigeria',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- WITHDRAWAL REQUESTS (Phase 66: wallet payouts to bank accounts)
-- ============================================================
CREATE TYPE withdrawal_status AS ENUM (
  'pending', 'approved', 'rejected', 'processing', 'completed', 'failed'
);

CREATE TABLE withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference VARCHAR(100) UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  amount NUMERIC(12,2) NOT NULL,
  bank_code VARCHAR(10) NOT NULL,
  account_number VARCHAR(20) NOT NULL,
  account_name VARCHAR(255),
  status withdrawal_status NOT NULL DEFAULT 'pending',
  gateway VARCHAR(50),
  transfer_reference VARCHAR(200),
  admin_note TEXT,
  approved_by UUID REFERENCES users(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_withdrawal_user ON withdrawal_requests(user_id);
CREATE INDEX idx_withdrawal_status ON withdrawal_requests(status);
CREATE INDEX idx_banks_name ON banks(name);
CREATE INDEX idx_banks_active ON banks(is_active);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_computers_updated_at BEFORE UPDATE ON computers FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_data_consents_updated_at BEFORE UPDATE ON data_consents FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
