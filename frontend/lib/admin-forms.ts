/** Field schemas for every admin create/edit dialog. */
import type { FieldDef } from "@/components/admin/form/Fields";
import { ADMIN_PRODUCT_ROWS } from "@/lib/showcase-catalogue";

const PRODUCT_OPTIONS = ADMIN_PRODUCT_ROWS.map((p) => ({
  value: p.id,
  label: `${p.name} · ${p.sku}`,
}));

const WAREHOUSE_OPTIONS = [
  { value: "Riyadh A", label: "Riyadh · Warehouse A" },
  { value: "Jeddah B", label: "Jeddah · Warehouse B" },
  { value: "Dammam C", label: "Dammam · Warehouse C" },
  { value: "Dubai D", label: "Dubai · Warehouse D" },
];

const STATUS = [
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
];

export const CATEGORY_FIELDS: FieldDef[] = [
  { name: "name", label: "CATEGORY NAME", placeholder: "Dates & Preserves" },
  { name: "slug", label: "URL SLUG", placeholder: "dates-preserves" },
  {
    name: "parent",
    label: "PARENT",
    type: "select",
    placeholder: "— Top level —",
    help: "Optional · nesting is limited to two levels",
    options: [
      { value: "dates", label: "Dates & Preserves" },
      { value: "honey", label: "Honey & Syrups" },
      { value: "coffee", label: "Coffee & Tea" },
      { value: "apparel", label: "Apparel" },
    ],
  },
  { name: "sort", label: "SORT ORDER", type: "number", placeholder: "1", help: "Optional" },
  { name: "description", label: "DESCRIPTION", type: "textarea", help: "Optional", placeholder: "Shown on the category landing page." },
  {
    name: "imageUrl",
    label: "CATEGORY IMAGE",
    type: "image",
    full: true,
    help: "Optional · shown on the storefront category tiles. Paste a URL or upload a file.",
  },
  { name: "inNav", label: "Show in main navigation", type: "toggle", help: "Appears in the storefront mega-menu", full: true },
  { name: "featured", label: "Feature on homepage", type: "toggle", help: "Pinned to the seasonal rail", full: true },
];

export const BRAND_FIELDS: FieldDef[] = [
  { name: "name", label: "BRAND NAME", placeholder: "Hadhramaut Apiaries" },
  { name: "slug", label: "URL SLUG", placeholder: "hadhramaut-apiaries" },
  { name: "description", label: "DESCRIPTION", type: "textarea", help: "Optional" },
];

export const WAREHOUSE_FIELDS: FieldDef[] = [
  { name: "name", label: "FACILITY NAME", placeholder: "Riyadh · Warehouse A" },
  { name: "code", label: "CODE", placeholder: "WH-A" },
  { name: "city", label: "CITY", placeholder: "Riyadh" },
  { name: "capacity", label: "CAPACITY (UNITS)", type: "number", placeholder: "54000" },
  { name: "manager", label: "SITE MANAGER", placeholder: "Yusuf Rahman", help: "Optional" },
  {
    name: "status",
    label: "STATUS",
    type: "select",
    options: [
      { value: "operational", label: "Operational" },
      { value: "maintenance", label: "Maintenance" },
      { value: "closed", label: "Closed" },
    ],
  },
  { name: "address", label: "ADDRESS", type: "textarea", help: "Optional" },
  { name: "isDefault", label: "Default fulfilment site", type: "toggle", help: "New orders allocate here first", full: true },
];

export const SUPPLIER_FIELDS: FieldDef[] = [
  { name: "name", label: "SUPPLIER NAME", placeholder: "Hadhramaut Apiaries" },
  { name: "category", label: "CATEGORY", type: "select", options: [
    { value: "honey", label: "Honey" },
    { value: "coffee", label: "Coffee" },
    { value: "nuts", label: "Nuts & Dates" },
    { value: "atelier", label: "Atelier" },
    { value: "beauty", label: "Hair & Body" },
  ]},
  { name: "country", label: "COUNTRY", placeholder: "Yemen" },
  { name: "leadTime", label: "LEAD TIME", type: "number", suffix: "days", placeholder: "18" },
  { name: "contact", label: "CONTACT NAME", placeholder: "Salim Bin Awad", help: "Optional" },
  { name: "email", label: "EMAIL", placeholder: "orders@supplier.com", help: "Optional" },
  { name: "terms", label: "PAYMENT TERMS", type: "select", help: "Optional", options: [
    { value: "net30", label: "Net 30" },
    { value: "net60", label: "Net 60" },
    { value: "prepaid", label: "Prepaid" },
  ]},
  { name: "status", label: "STATUS", type: "select", help: "Optional · defaults to Active", options: [
    { value: "active", label: "Active" },
    { value: "on_hold", label: "On hold" },
    { value: "inactive", label: "Inactive" },
  ]},
  { name: "notes", label: "NOTES", type: "textarea", help: "Optional" },
];

/** Supplier, warehouse and product options are filled in from live data by the page. */
export const PURCHASE_ORDER_FIELDS: FieldDef[] = [
  { name: "supplier", label: "SUPPLIER", type: "select", options: [] },
  { name: "warehouse", label: "DELIVER TO", type: "select", help: "Optional", options: [] },
  { name: "product", label: "PRODUCT", type: "select", full: true, help: "Optional · the line booked into stock when the PO is received", options: [] },
  { name: "units", label: "UNITS", type: "number", placeholder: "1200" },
  { name: "unitCost", label: "UNIT COST", type: "money", help: "Optional · with a product, the total is units × unit cost", placeholder: "40.50" },
  { name: "total", label: "ORDER TOTAL", type: "money", help: "Optional · used when no product is picked", placeholder: "48600.00" },
  { name: "expected", label: "EXPECTED DATE", type: "date", help: "Optional" },
  { name: "reference", label: "SUPPLIER REFERENCE", placeholder: "SUP-INV-2418", help: "Optional" },
  { name: "notes", label: "NOTES", type: "textarea", help: "Optional" },
];

export const CAMPAIGN_FIELDS: FieldDef[] = [
  { name: "name", label: "CAMPAIGN NAME", placeholder: "Ramadan Gifting Preview" },
  { name: "channel", label: "CHANNEL", type: "select", options: [
    { value: "email", label: "Email" },
    { value: "push", label: "Push" },
    { value: "sms", label: "SMS" },
  ]},
  { name: "audience", label: "AUDIENCE", type: "select", options: [
    { value: "all", label: "All subscribers" },
    { value: "gold", label: "Gold tier" },
    { value: "lapsed", label: "Lapsed 90 days" },
    { value: "cart", label: "Abandoned basket" },
  ]},
  { name: "status", label: "STATUS", type: "select", options: [
    { value: "DRAFT", label: "Draft" },
    { value: "SCHEDULED", label: "Scheduled" },
    { value: "LIVE", label: "Live" },
    { value: "COMPLETED", label: "Completed" },
  ]},
  { name: "sendAt", label: "SEND AT", type: "date", help: "Optional · leave blank for always-on campaigns" },
  { name: "subject", label: "SUBJECT LINE", placeholder: "The Ramadan table, set.", full: true },
  { name: "preview", label: "PREVIEW TEXT", type: "textarea", help: "Optional" },
  { name: "alwaysOn", label: "Always on", type: "toggle", help: "Runs continuously rather than a single send", full: true },
];

export const CMS_FIELDS: FieldDef[] = [
  { name: "title", label: "POST TITLE", placeholder: "The Sidr Harvest, Season 2026", full: true },
  { name: "slug", label: "URL SLUG", placeholder: "sidr-harvest-2026", help: "Optional · generated from the title" },
  { name: "author", label: "AUTHOR", placeholder: "Author name", help: "Optional" },
  { name: "category", label: "CATEGORY", type: "select", help: "Optional", options: [
    { value: "Journal", label: "Journal" },
    { value: "Guides", label: "Guides" },
    { value: "Maison", label: "Maison" },
  ]},
  { name: "status", label: "STATUS", type: "select", options: [
    { value: "DRAFT", label: "Draft" },
    { value: "SCHEDULED", label: "Scheduled" },
    { value: "PUBLISHED", label: "Published" },
  ]},
  { name: "publishAt", label: "PUBLISH DATE", type: "date", help: "Optional" },
  { name: "excerpt", label: "EXCERPT", type: "textarea", help: "Optional" },
  { name: "body", label: "BODY", type: "textarea", placeholder: "Write the post…" },
  { name: "shoppable", label: "Shoppable post", type: "toggle", help: "Attach products to the article", full: true },
];

/** Customer and order options are filled in from live data by the page. */
export const INVOICE_FIELDS: FieldDef[] = [
  { name: "customerId", label: "CUSTOMER", type: "select", options: [] },
  { name: "orderId", label: "ORDER", type: "select", help: "Optional · one invoice per order", options: [] },
  { name: "issued", label: "ISSUE DATE", type: "date", help: "Optional · defaults to today" },
  { name: "due", label: "DUE DATE", type: "date" },
  { name: "amount", label: "AMOUNT", type: "money", placeholder: "48600.00" },
  { name: "terms", label: "TERMS", type: "select", help: "Optional", options: [
    { value: "net30", label: "Net 30" },
    { value: "net60", label: "Net 60" },
    { value: "due", label: "Due on receipt" },
  ]},
  { name: "notes", label: "NOTES", type: "textarea", help: "Optional" },
];

export const TAX_RATE_FIELDS: FieldDef[] = [
  { name: "jurisdiction", label: "JURISDICTION", placeholder: "KSA · ZATCA" },
  { name: "countryCode", label: "SHIP-TO COUNTRY", placeholder: "SA", help: "2-letter code — checkout applies this rate to orders shipped there" },
  { name: "registration", label: "REGISTRATION NUMBER", placeholder: "VAT 311094820100003", help: "Optional" },
  { name: "rate", label: "RATE", type: "number", suffix: "%", placeholder: "15" },
  { name: "appliesTo", label: "APPLIES TO", type: "select", options: [
    { value: "all", label: "All products" },
    { value: "goods", label: "Physical goods" },
    { value: "digital", label: "Digital goods" },
  ]},
];

export const TAX_FILING_FIELDS: FieldDef[] = [
  { name: "period", label: "PERIOD", placeholder: "Q2 2026" },
  { name: "jurisdiction", label: "JURISDICTION", placeholder: "KSA · ZATCA" },
  { name: "outputTax", label: "OUTPUT TAX", type: "money", placeholder: "142900.00", help: "Optional · tax collected on sales" },
  { name: "inputTax", label: "INPUT TAX", type: "money", placeholder: "41800.00", help: "Optional · reclaimable on purchases" },
  { name: "due", label: "DUE DATE", type: "date" },
];

export const ALERT_RULE_FIELDS: FieldDef[] = [
  { name: "name", label: "RULE NAME", placeholder: "Stock below safety level", full: true },
  { name: "category", label: "CATEGORY", type: "select", options: [
    { value: "inventory", label: "Inventory" },
    { value: "payments", label: "Payments" },
    { value: "orders", label: "Orders" },
    { value: "purchasing", label: "Purchasing" },
    { value: "security", label: "Security" },
  ]},
  { name: "severity", label: "SEVERITY", type: "select", options: [
    { value: "critical", label: "Critical" },
    { value: "warning", label: "Warning" },
    { value: "info", label: "Info" },
  ]},
  { name: "condition", label: "CONDITION", placeholder: "on hand < 14 days cover", full: true },
  { name: "channels", label: "NOTIFY VIA", type: "select", options: [
    { value: "email", label: "Email" },
    { value: "sms", label: "SMS" },
    { value: "push", label: "Push" },
    { value: "webhook", label: "Webhook" },
  ]},
  { name: "recipients", label: "RECIPIENTS", placeholder: "ops@royalzaad.com", help: "Optional" },
  { name: "muted", label: "Start muted", type: "toggle", help: "Create the rule without sending alerts yet", full: true },
];

export const ROLE_FIELDS: FieldDef[] = [
  { name: "name", label: "ROLE NAME", placeholder: "Finance analyst" },
  { name: "description", label: "DESCRIPTION", type: "textarea", help: "Optional", placeholder: "Invoices, tax and reports" },
];

export const USER_FIELDS: FieldDef[] = [
  { name: "firstName", label: "FIRST NAME", placeholder: "Noor" },
  { name: "lastName", label: "LAST NAME", placeholder: "Al Amin" },
  { name: "email", label: "EMAIL", placeholder: "noor@royalzaad.com", full: true },
  { name: "role", label: "ROLE", type: "select", options: [
    { value: "owner", label: "Owner" },
    { value: "admin", label: "Administrator" },
    { value: "merch", label: "Merchandiser" },
    { value: "warehouse", label: "Warehouse lead" },
    { value: "finance", label: "Finance analyst" },
    { value: "support", label: "Support agent" },
    { value: "auditor", label: "Auditor (read-only)" },
  ]},
  { name: "department", label: "DEPARTMENT", placeholder: "Commerce", help: "Optional" },
  { name: "password", label: "TEMPORARY PASSWORD", placeholder: "Minimum 6 characters", full: true },
  { name: "isActive", label: "Account active", type: "toggle", help: "Inactive accounts cannot sign in", full: true },
];

export const CUSTOMER_FIELDS: FieldDef[] = [
  { name: "firstName", label: "FIRST NAME", placeholder: "Noor" },
  { name: "lastName", label: "LAST NAME", placeholder: "Al Amin" },
  { name: "email", label: "EMAIL", placeholder: "noor@example.com" },
  { name: "phone", label: "PHONE", placeholder: "+966 55 214 8890", help: "Optional" },
  { name: "tier", label: "TIER", type: "select", help: "Optional", options: [
    { value: "STANDARD", label: "Standard" },
    { value: "GOLD", label: "Gold" },
    { value: "PLATINUM", label: "Platinum" },
  ]},
  { name: "notes", label: "NOTES", type: "textarea", help: "Optional" },
];

export const COUPON_FIELDS: FieldDef[] = [
  { name: "code", label: "COUPON CODE", placeholder: "WELCOME20" },
  { name: "discountType", label: "DISCOUNT TYPE", type: "select", options: [
    { value: "PERCENTAGE", label: "Percentage" },
    { value: "FIXED_AMOUNT", label: "Fixed amount" },
  ]},
  { name: "discountValue", label: "VALUE", type: "number", placeholder: "20" },
  { name: "minimumPurchase", label: "MINIMUM PURCHASE", type: "money", help: "Optional" },
  { name: "usageLimit", label: "USAGE LIMIT", type: "number", help: "Optional · blank for unlimited" },
  { name: "startsAt", label: "STARTS", type: "date" },
  { name: "expiresAt", label: "EXPIRES", type: "date", help: "Optional" },
  { name: "description", label: "DESCRIPTION", type: "textarea", help: "Optional" },
  { name: "isActive", label: "Active", type: "toggle", help: "Redeemable at checkout", full: true },
];

export const PROMOTION_FIELDS: FieldDef[] = [
  { name: "name", label: "PROMOTION NAME", placeholder: "Ramadan Gifting" },
  { name: "discountType", label: "DISCOUNT TYPE", type: "select", options: [
    { value: "PERCENTAGE", label: "Percentage" },
    { value: "FIXED_AMOUNT", label: "Fixed amount" },
  ]},
  { name: "discountValue", label: "VALUE", type: "number", placeholder: "20" },
  { name: "scope", label: "APPLIES TO", type: "select", options: [
    { value: "all", label: "Entire catalogue" },
    { value: "category", label: "Selected categories" },
    { value: "products", label: "Selected products" },
  ]},
  { name: "startsAt", label: "STARTS", type: "date" },
  { name: "endsAt", label: "ENDS", type: "date" },
  { name: "description", label: "DESCRIPTION", type: "textarea", help: "Optional" },
  { name: "isActive", label: "Live", type: "toggle", help: "Lowers prices at checkout between the start and end dates", full: true },
];

export const INVENTORY_ADJUST_FIELDS: FieldDef[] = [
  { name: "product", label: "PRODUCT", type: "select", options: PRODUCT_OPTIONS, full: true },
  { name: "warehouse", label: "WAREHOUSE", type: "select", options: WAREHOUSE_OPTIONS },
  { name: "reason", label: "REASON", type: "select", options: [
    { value: "count", label: "Stock count correction" },
    { value: "damage", label: "Damage / write-off" },
    { value: "receipt", label: "Goods received" },
    { value: "transfer", label: "Transfer out" },
  ]},
  { name: "quantity", label: "NEW ON-HAND", type: "number", placeholder: "842" },
  { name: "reserved", label: "RESERVED", type: "number", placeholder: "6" },
  { name: "reorderAt", label: "REORDER AT", type: "number", placeholder: "20" },
  { name: "note", label: "NOTE", type: "textarea", help: "Optional" },
];

/** Order options are filled in from live (delivered) orders by the page. */
export const RETURN_FIELDS: FieldDef[] = [
  { name: "orderId", label: "ORDER", type: "select", full: true, options: [] },
  { name: "reason", label: "REASON", placeholder: "Damaged in transit", full: true },
  { name: "refundAmount", label: "REFUND AMOUNT", type: "money", help: "Optional · can be set at inspection", placeholder: "260.00" },
  { name: "note", label: "NOTE", type: "textarea", help: "Optional" },
];

export const RETURN_DECISION_FIELDS: FieldDef[] = [
  { name: "decision", label: "DECISION", type: "select", options: [
    { value: "approve", label: "Approve return" },
    { value: "reject", label: "Reject return" },
  ]},
  { name: "refundMethod", label: "REFUND METHOD", type: "select", options: [
    { value: "original", label: "Original payment method" },
    { value: "credit", label: "Store credit" },
    { value: "none", label: "No refund" },
  ]},
  { name: "refundAmount", label: "REFUND AMOUNT", type: "money", placeholder: "260.00" },
  { name: "restock", label: "RESTOCK", type: "select", options: [
    { value: "yes", label: "Return to sellable stock" },
    { value: "quarantine", label: "Quarantine for inspection" },
    { value: "writeoff", label: "Write off" },
  ]},
  { name: "note", label: "NOTE TO CUSTOMER", type: "textarea", help: "Optional" },
];

/** Order options are filled in from live orders in fulfilment by the page. */
export const SHIPMENT_FIELDS: FieldDef[] = [
  { name: "orderId", label: "ORDER", type: "select", full: true, options: [] },
  { name: "carrier", label: "CARRIER", type: "select", options: [
    { value: "aramex", label: "Aramex" },
    { value: "smsa", label: "SMSA" },
    { value: "dhl", label: "DHL" },
    { value: "naqel", label: "Naqel" },
  ]},
  { name: "service", label: "SERVICE", type: "select", help: "Optional", options: [
    { value: "standard", label: "Standard" },
    { value: "express", label: "Express" },
    { value: "sameday", label: "Same day" },
  ]},
  { name: "awb", label: "AWB / TRACKING", placeholder: "4471 9930 2214" },
  { name: "status", label: "STATUS", type: "select", help: "Optional · moves the order to Shipped / Delivered", options: [
    { value: "awaiting_dispatch", label: "Awaiting dispatch" },
    { value: "dispatched", label: "Dispatched" },
    { value: "in_transit", label: "In transit" },
    { value: "out_for_delivery", label: "Out for delivery" },
    { value: "delivered", label: "Delivered" },
    { value: "failed", label: "Failed attempt" },
  ]},
  { name: "eta", label: "ESTIMATED DELIVERY", type: "date", help: "Optional" },
  { name: "instructions", label: "INSTRUCTIONS", type: "textarea", help: "Optional" },
];

/** Warehouse options are filled in from live sites by the page. */
export const TRANSFER_FIELDS: FieldDef[] = [
  { name: "fromId", label: "FROM", type: "select", options: [] },
  { name: "toId", label: "TO", type: "select", options: [] },
  { name: "units", label: "UNITS", type: "number", placeholder: "120" },
  { name: "expected", label: "EXPECTED ARRIVAL", type: "date", help: "Optional" },
  { name: "note", label: "NOTE", type: "textarea", help: "Optional" },
];

export const REVIEW_REPLY_FIELDS: FieldDef[] = [
  { name: "status", label: "MODERATION", type: "select", options: [
    { value: "approve", label: "Approve and publish" },
    { value: "hold", label: "Hold — keep off the storefront" },
  ]},
  // Public replies and internal notes are not stored by the API yet, so the
  // dialog only offers what is persisted.
];
