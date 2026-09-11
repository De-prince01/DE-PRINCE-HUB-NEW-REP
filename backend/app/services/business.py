"""Business-model helpers: the configurable revenue-stream catalogue (spec §60)."""
REVENUE_STREAMS = [
    {"code": "service_fees", "name": "Service fees", "kind": "category",
     "description": "Fees charged for services rendered at the counter or online."},
    {"code": "printing", "name": "Printing", "kind": "mixed",
     "description": "Printing, binding and lamination jobs (both catalogue orders and ad-hoc print jobs)."},
    {"code": "computer_sessions", "name": "Computer sessions", "kind": "dedicated",
     "description": "Cyber caf\u00e9 computer rental by time."},
    {"code": "graphic_design", "name": "Graphic design", "kind": "category",
     "description": "Logos, flyers, posters and design work sold as services."},
    {"code": "web_development", "name": "Web development", "kind": "category",
     "description": "Websites and web apps built as services."},
    {"code": "website_maintenance", "name": "Website maintenance", "kind": "category",
     "description": "Ongoing website upkeep sold as a configurable service."},
    {"code": "hosting_management", "name": "Hosting management", "kind": "category",
     "description": "Hosting setup and management sold as a service."},
    {"code": "business_registration", "name": "Business registration assistance", "kind": "category",
     "description": "CAC and business registration help (official-fee split supported)."},
    {"code": "document_processing", "name": "Document processing", "kind": "category",
     "description": "Typing, formatting, scanning and document services."},
    {"code": "delivery", "name": "Delivery", "kind": "dedicated",
     "description": "Delivery fees collected on dispatched orders."},
    {"code": "worker_commissions", "name": "Worker commissions", "kind": "dedicated",
     "description": "DE-PRINCE's margin taken from completed worker jobs (commission_amount)."},
    {"code": "training", "name": "Training / courses", "kind": "category",
     "description": "Courses and training sessions sold as services."},
    {"code": "business_advertising", "name": "Business advertising", "kind": "category",
     "description": "Advertising packages sold as services."},
    {"code": "subscriptions", "name": "Subscription services", "kind": "dedicated",
     "description": "Recurring subscription payments (wallet debits on renewal)."},
    {"code": "corporate_contracts", "name": "Corporate contracts", "kind": "category",
     "description": "Bespoke contracts sold as configurable services."},
    {"code": "digital_documents", "name": "Digital document services", "kind": "category",
     "description": "e-document services sold as configurable services."},
    {"code": "consultation", "name": "Consultation", "kind": "category",
     "description": "Advisory and consultation services."},
    {"code": "equipment_sales", "name": "Equipment / consumable sales", "kind": "category",
     "description": "Hardware and consumables sold via POS/catalogue orders."},
    {"code": "referral_partnerships", "name": "Referral partnerships", "kind": "dedicated",
     "description": "Referral rewards credited out of the referral programme."},
    {"code": "other_configurable", "name": "Other configurable services", "kind": "category",
     "description": "Any new revenue stream added by an admin via a new service category."},
]

STREAM_CODES = {s["code"] for s in REVENUE_STREAMS}


def validate_stream_code(code: str) -> bool:
    return code is None or code in STREAM_CODES