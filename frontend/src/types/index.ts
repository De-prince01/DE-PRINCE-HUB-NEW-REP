export type Role =
  | "super_admin"
  | "business_owner"
  | "admin"
  | "manager"
  | "staff"
  | "printing_operator"
  | "graphic_designer"
  | "web_developer"
  | "academic_service_worker"
  | "technician"
  | "delivery_person"
  | "partner_freelancer"
  | "customer";

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  role: Role;
  is_active: boolean;
  is_verified: boolean;
  avatar_url?: string | null;
  last_login_at?: string | null;
  created_at: string;
}

export interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  display_order: number;
  is_active: boolean;
}

export interface Service {
  id: string;
  category_id: string;
  category_name?: string | null;
  name: string;
  slug: string;
  icon?: string | null;
  image_url?: string | null;
  description?: string | null;
  short_description?: string | null;

  price_type: string;
  base_price: number;
  price_unit: string;
  quotation_required: boolean;
  minimum_price?: number | null;
  maximum_price?: number | null;
  estimated_processing_time?: string | null;
  estimated_duration?: string | null;

  promotional_price?: number | null;
  processing_fee?: number | null;
  no_record_price?: number | null;
  price_notice?: string | null;
  bookable?: boolean;

  requirements?: string[] | null;
  required_documents?: string[] | null;
  requires_file_upload: boolean;
  requires_description: boolean;
  requires_physical_presence: boolean;
  requires_biometric: boolean;
  requires_photograph: boolean;
  requires_signature: boolean;
  requires_appointment: boolean;
  requires_staff: boolean;
  requires_worker: boolean;

  delivery_available: boolean;
  pickup_available: boolean;
  payment_required: boolean;

  commission_type: string;
  commission_value: number;

  branch_availability?: string[] | null;
  service_instructions?: string | null;
  faq?: any[] | null;

  official_provider?: string | null;
  official_provider_url?: string | null;
  official_fee?: number | null;
  deprince_fee?: number | null;
  last_verified_date?: string | null;
  verification_status: string;

  is_seasonal?: boolean;
  season_months?: number[] | null;
  season_label?: string | null;

  is_active: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface OrderItem {
  id: string;
  service_id: string;
  service_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  worker_id?: string | null;
  status: string;
  subtotal: number;
  delivery_fee: number;
  tax: number;
  total: number;
  customer_notes?: string | null;
  created_at: string;
  items: OrderItem[];
}

export interface OrderMessage {
  id: string;
  order_id: string;
  sender_id: string;
  message: string;
  file_url?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface DeliveryZone {
  id: string;
  name: string;
  fee: number;
  estimated_time?: string | null;
  is_active: boolean;
}

export interface Delivery {
  id: string;
  order_id: string;
  order_number?: string | null;
  delivery_type: string;
  zone_id?: string | null;
  zone_name?: string | null;
  delivery_person_id?: string | null;
  delivery_person_name?: string | null;
  address?: string | null;
  fee: number;
  status: string;
  notes?: string | null;
  created_at: string;
}

export interface DeliveryCreate {
  order_id: string;
  zone_id?: string | null;
  address?: string | null;
  notes?: string | null;
}

export interface QuotationRequestItem {
  id: string;
  request_number: string;
  customer_id: string;
  service_id: string;
  service_name?: string | null;
  customer_name?: string | null;
  description?: string | null;
  requirements?: string[] | null;
  files?: Array<{ name?: string; url?: string }> | null;
  deadline?: string | null;
  budget?: number | null;
  status: string;
  created_at: string;
}

export interface QuotationItem {
  id: string;
  title: string;
  description?: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Quotation {
  id: string;
  quotation_number: string;
  request_id: string;
  note?: string | null;
  discount: number;
  delivery_fee: number;
  tax: number;
  valid_until?: string | null;
  status: string;
  subtotal: number;
  total: number;
  created_at: string;
  service_name?: string | null;
  order_number?: string | null;
  items: QuotationItem[];
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  billing_cycle: string;
  amount: number;
  is_active: boolean;
}

export interface SubscriptionRenewal {
  id: string;
  subscription_id: string;
  cycle_start: string;
  cycle_end: string;
  amount: number;
  status: string;
  payment_method?: string | null;
  transaction_ref?: string | null;
  created_at: string;
}

export interface Subscription {
  id: string;
  subscription_number: string;
  customer_id: string;
  plan_id: string;
  amount: number;
  billing_cycle: string;
  status: string;
  service_status: string;
  start_date: string;
  next_billing_date: string;
  last_billed_at?: string | null;
  auto_renew: boolean;
  renewal_count: number;
  created_at: string;
  plan_name?: string | null;
  customer_name?: string | null;
  renewals: SubscriptionRenewal[];
}

export interface ReferralProgram {
  id: string;
  is_active: boolean;
  reward_type: string;
  reward_value: number;
  minimum_order_amount: number;
  maximum_reward?: number | null;
  eligible_service_ids: string[];
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ReferralSignup {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  code: string;
  referred_at: string;
  referred_name?: string | null;
}

export interface ReferralReward {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  order_id: string;
  order_number?: string | null;
  amount: number;
  reward_type: string;
  status: string;
  created_at: string;
}

export interface MyReferral {
  code: string;
  signups: number;
  rewards_total: number;
  rewards: ReferralReward[];
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string | null;
}

export interface SupportMessage {
  id: string;
  sender_id: string;
  sender_role: string;
  sender_name?: string | null;
  body: string;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  ticket_number: string;
  customer_id: string;
  customer_name?: string | null;
  order_id?: string | null;
  order_number?: string | null;
  subject: string;
  category: string;
  priority: string;
  status: string;
  description: string;
  is_escalated: boolean;
  escalation_reason?: string | null;
  refund_decision?: string | null;
  refund_amount?: number | null;
  resolved_at?: string | null;
  closed_at?: string | null;
  created_at: string;
  updated_at?: string | null;
  messages: SupportMessage[];
}

export interface DataPurpose {
  id: string;
  purpose_code: string;
  title: string;
  description: string;
  data_collected: string[];
  retention_days: number;
  is_required: boolean;
}

export interface DataConsent {
  purpose_code: string;
  title: string;
  granted: boolean;
  is_required: boolean;
}

export interface PrivacyRequest {
  id: string;
  request_number: string;
  request_type: string;
  status: string;
  reason?: string | null;
  requested_at: string;
  processed_at?: string | null;
}

export interface DataExport {
  user: Record<string, unknown>;
  consents: Array<{ purpose_code: string; granted: boolean }>;
  orders: Array<Record<string, unknown>>;
  messages: Array<Record<string, unknown>>;
  support_tickets: Array<Record<string, unknown>>;
  wallet_transactions: Array<Record<string, unknown>>;
  generated_at: string;
  expires_in_days: number;
}

export interface AccessAuditEntry {
  id: string;
  action: string;
  entity_type?: string | null;
  actor_id?: string | null;
  created_at: string;
}

export interface RevenueStream {
  code: string;
  name: string;
  kind: string;
  description: string;
  revenue: number;
  orders: number;
  categories: number;
  active: boolean;
}

export interface RevenueStreamsReport {
  total_revenue: number;
  stream_count: number;
  streams: RevenueStream[];
  unmapped_category_revenue: number;
  unmapped_categories: number;
  note: string;
}

export interface SeasonalService {
  id: string;
  name: string;
  category: string;
  revenue_stream: string | null;
  is_seasonal: boolean;
  season_label: string | null;
  season_months: number[];
  revenue: number;
}

export interface SeasonalityReport {
  total_active_services: number;
  seasonal_services: number;
  year_round_services: number;
  seasonal_revenue: number;
  year_round_revenue: number;
  share_if_jamb_ends: number;
  year_round_streams: string[];
  seasonal: SeasonalService[];
  year_round_backbone: { category: string; services: number; revenue: number }[];
  note: string;
}

export interface OwnerDashboard {
  counts: {
    services_active: number;
    service_categories: number;
    customers: number;
    staff: number;
    workers_profiles: number;
    orders: number;
    pending_orders: number;
    appointments: number;
    print_jobs: number;
    print_queue: number;
    computers: number;
    active_sessions: number;
    inventory_items: number;
    deliveries: number;
    branches: number;
    notifications: number;
    audit_entries: number;
  };
  money: {
    paid_revenue: number;
    expenses: number;
    profit: number;
    wallet_balances_total: number;
    paid_commissions: number;
  };
  branches: { id: string; name: string; address: string }[];
  settings: Record<string, any>;
  recent_audit: { action: string; entity_type: string | null; created_at: string; ip_address: string | null }[];
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  actor_name: string;
  actor_email: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface AnalyticsOverview {
  range_days: number;
  summary: {
    total_revenue: number;
    revenue_last_30d: number;
    total_expenses: number;
    expenses_last_30d: number;
    profit: number;
    profit_last_30d: number;
    total_orders: number;
    total_customers: number;
  };
  most_profitable_service: Array<{ service: string; orders: number; units: number; revenue: number }>;
  most_ordered_services: Array<{ service: string; orders: number; units: number; revenue: number }>;
  revenue_by_service: Array<{ service: string; revenue: number }>;
  revenue_by_branch: Array<{ branch: string; revenue: number }>;
  revenue_by_payment_method: Array<{ method: string; amount: number }>;
  expenses_by_category: Array<{ category: string; amount: number }>;
  customer_retention: {
    retention_rate: number;
    repeat_customers: number;
    total_customers: number;
    avg_orders_per_customer: number;
  };
  customer_acquisition: Array<{ month: string; new_customers: number }>;
  worker_performance: Array<{ worker: string; jobs: number; commission: number; earned: number }>;
  order_completion_time: {
    completed_orders: number;
    avg_completion_hours: number;
    avg_completion_days: number;
    min_hours?: number;
    max_hours?: number;
  };
  referral_performance: {
    total_signups: number;
    total_rewards: number;
    total_reward_value: number;
    top_referrers: Array<{ referrer: string; signups: number }>;
  };
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any> | null;
  is_read: boolean;
  created_at: string;
}

export interface Worker {
  id: string;
  name: string;
  email: string;
  role: string;
  specialties: string[];
  commission_rate: number;
  total_earnings: number;
  total_jobs: number;
  average_rating: number;
  is_available: boolean;
  is_active: boolean;
}

export interface ReceiptItem {
  service_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Receipt {
  business: string;
  type: string;
  receipt_number: string;
  qr_payload: string;
  order?: {
    id: string;
    order_number: string;
    status: string;
    created_at?: string | null;
    completed_at?: string | null;
    payment_status: string;
    payment_method: string;
    reference?: string | null;
  };
  customer: {
    name: string;
    email?: string | null;
  };
  items?: ReceiptItem[];
  subtotal?: number;
  delivery_fee?: number;
  tax?: number;
  discount?: number;
  total?: number;
  issued_at?: string;
}

export interface FinanceReport {
  revenue: number;
  expenses: number;
  commissions_paid: number;
  commissions_unpaid: number;
  worker_payouts: number;
  net_profit: number;
  workers_paid: number;
}

export interface IdentityVerifyResult {
  verified: boolean;
  provider: string;
  id_type: string;
  masked_id: string;
  full_name?: string | null;
  date_of_birth?: string | null;
  message: string;
  record_id?: string | null;
}

export interface IdentityRecord {
  id: string;
  customer_id: string | null;
  order_id: string | null;
  service_type: string;
  provider: string | null;
  retention_days: number;
  created_at: string;
  expires_at: string | null;
  deleted_at: string | null;
}

export type AppointmentStatus =
  | "requested"
  | "confirmed"
  | "reminder_sent"
  | "checked_in"
  | "in_service"
  | "completed"
  | "missed"
  | "cancelled"
  | "rescheduled";

export interface Appointment {
  id: string;
  appointment_number: string;
  customer_id: string;
  service_id: string | null;
  branch_id: string | null;
  staff_id: string | null;
  date: string;
  time: string;
  duration_minutes: number;
  status: AppointmentStatus;
  requirements?: string[] | null;
  notes?: string | null;
  payment_required: boolean;
  payment_status: string;
  created_at: string;
  service_name?: string | null;
  branch_name?: string | null;
  customer_name?: string | null;
}

export interface AppointmentSlot {
  id: string;
  branch_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  branch_name?: string | null;
}
