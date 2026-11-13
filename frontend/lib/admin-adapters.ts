/**
 * Translation layer between the API and the admin screens.
 *
 * `from*` maps a persisted row onto the shape a screen already renders, so
 * wiring a page to live data does not mean rewriting its markup. `to*` maps the
 * modal form values back onto the DTO the endpoint expects — the form field
 * names were written for the design, and do not always match the column names.
 */

/* ── shared formatting ── */

const TITLES: Record<string, string> = {
  OPERATIONAL: "Operational",
  MAINTENANCE: "Maintenance",
  CLOSED: "Closed",
  DRAFT: "Draft",
  IN_TRANSIT: "In transit",
  RECEIVED: "Received",
  LATE: "Late",
  ACTIVE: "Active",
  ON_HOLD: "On hold",
  INACTIVE: "Inactive",
  AWAITING_APPROVAL: "Awaiting approval",
  APPROVED: "Approved",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
  AWAITING_DISPATCH: "Awaiting dispatch",
  DISPATCHED: "Dispatched",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  FAILED: "Failed",
  AWAITING_INSPECTION: "Awaiting inspection",
  REJECTED: "Rejected",
  REFUNDED: "Refunded",
  OPEN: "Open",
  PAID: "Paid",
  VOID: "Void",
  FILED: "Filed",
  SCHEDULED: "Scheduled",
  LIVE: "Live",
  COMPLETED: "Completed",
  PUBLISHED: "Published",
  EMAIL: "Email",
  PUSH: "Push",
  SMS: "SMS",
};

export const title = (value?: string | null) =>
  value ? (TITLES[value] ?? value) : "—";

export const money = (value: unknown, currency = "$") => {
  const n = Number(value ?? 0);
  return `${currency}${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const compactMoney = (value: unknown, currency = "$") => {
  const n = Number(value ?? 0);
  if (n >= 1_000_000) return `${currency}${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${currency}${Math.round(n / 1_000)}K`;
  return `${currency}${n.toFixed(0)}`;
};

export const num = (value: unknown) => Number(value ?? 0).toLocaleString();

export const pct = (value: unknown, fallback = "—") =>
  value === null || value === undefined ? fallback : `${Number(value)}%`;

export const shortDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

export const dayMonth = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
    : "—";

export const relative = (value?: string | null) => {
  if (!value) return "—";
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const dayCount = Math.round(hours / 24);
  if (dayCount < 7) return `${dayCount}d ago`;
  return `${Math.round(dayCount / 7)}w ago`;
};

const clock = (value?: string | null) =>
  value
    ? new Date(value).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "—";

/** Form selects hand back lower-case slugs; the API wants enum members. */
const enumValue = (value: unknown, fallback?: string) => {
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;
  return raw.toUpperCase().replace(/[\s·-]+/g, "_");
};

const optionalNumber = (value: unknown) => {
  const raw = String(value ?? "").replace(/[^0-9.-]/g, "");
  return raw === "" ? undefined : Number(raw);
};

const optionalDate = (value: unknown) => {
  const raw = String(value ?? "").trim();
  if (!raw) return undefined;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
};

const clean = <T extends Record<string, unknown>>(payload: T) =>
  Object.fromEntries(
    Object.entries(payload).filter(([, v]) => v !== undefined && v !== "")
  ) as T;

/* ── warehouses ── */

/** `<input type="date">` wants YYYY-MM-DD. */
export const dateInput = (value?: string | null) =>
  value ? new Date(value).toISOString().slice(0, 10) : "";

export const fromWarehouse = (w: any) => ({
  id: w.id,
  code: w.code,
  name: w.name,
  city: w.city,
  units: w.units ?? 0,
  capacity: w.capacity ?? 0,
  utilisation: w.utilisation ?? 0,
  status: title(w.status),
  statusValue: String(w.status ?? "OPERATIONAL").toLowerCase(),
  manager: w.manager ?? "",
  address: w.address ?? "",
  isDefault: Boolean(w.isDefault),
});

export const toWarehouse = (v: Record<string, unknown>) =>
  clean({
    code: String(v.code ?? ""),
    name: String(v.name ?? ""),
    city: String(v.city ?? ""),
    address: v.address ? String(v.address) : undefined,
    manager: v.manager ? String(v.manager) : undefined,
    capacity: optionalNumber(v.capacity),
    status: enumValue(v.status, "OPERATIONAL"),
    isDefault: Boolean(v.isDefault),
  });

export const fromTransfer = (t: any) => ({
  id: t.id,
  reference: t.reference,
  from: t.from?.name ?? t.from?.city ?? "—",
  to: t.to?.name ?? t.to?.city ?? "—",
  units: t.units ?? 0,
  eta: dayMonth(t.expectedAt),
  status: title(t.status),
  statusValue: String(t.status ?? ""),
});

export const toTransfer = (v: Record<string, unknown>) =>
  clean({
    fromId: String(v.fromId ?? ""),
    toId: String(v.toId ?? ""),
    units: optionalNumber(v.units),
    expectedAt: optionalDate(v.expected),
    note: v.note ? String(v.note) : undefined,
  });

/* ── suppliers ── */

export const fromSupplier = (s: any) => ({
  id: s.id,
  name: s.name,
  category: s.category ?? "—",
  country: s.country ?? "—",
  leadTime: s.leadTimeDays ? `${s.leadTimeDays} days` : "—",
  leadTimeDays: s.leadTimeDays ?? 0,
  onTime: s.onTimeRate ? `${Number(s.onTimeRate)}%` : "—",
  openPos: s._count?.purchaseOrders ?? 0,
  ytd: compactMoney(s.ytdSpend),
  ytdSpend: Number(s.ytdSpend ?? 0),
  rating: s.rating ? String(Number(s.rating)) : "—",
  status: title(s.status),
  statusValue: String(s.status ?? "ACTIVE"),
  contact: s.contactName ?? "",
  email: s.email ?? "",
  terms: s.paymentTerms ?? "",
  notes: s.notes ?? "",
});

export const toSupplier = (v: Record<string, unknown>) =>
  clean({
    name: String(v.name ?? ""),
    category: v.category ? String(v.category) : undefined,
    country: v.country ? String(v.country) : undefined,
    leadTimeDays: optionalNumber(v.leadTime),
    contactName: v.contact ? String(v.contact) : undefined,
    email: v.email ? String(v.email) : undefined,
    paymentTerms: v.terms ? String(v.terms) : undefined,
    status: v.status ? enumValue(v.status) : undefined,
    notes: v.notes ? String(v.notes) : undefined,
  });

/* ── purchase orders ── */

export const fromPurchaseOrder = (p: any) => {
  const line = p.items?.[0];
  return {
    id: p.id,
    po: p.number,
    supplier: p.supplier?.name ?? "—",
    supplierId: p.supplierId ?? "",
    warehouseId: p.warehouseId ?? "",
    expected: shortDate(p.expectedAt),
    expectedAt: dateInput(p.expectedAt),
    units: p.units ?? 0,
    total: money(p.total),
    totalValue: Number(p.total ?? 0),
    lines: (p.items ?? []).length as number,
    product: p.items?.length === 1 ? line.productId : "",
    unitCost: p.items?.length === 1 ? String(Number(line.unitCost)) : "",
    reference: p.reference ?? "",
    notes: p.notes ?? "",
    status: title(p.status),
    statusValue: String(p.status ?? ""),
  };
};

/**
 * The form raises a single-line PO: with a product picked, units and unit
 * cost become the line and the API derives the total from it.
 */
export const toPurchaseOrder = (v: Record<string, unknown>) => {
  const product = v.product ? String(v.product) : "";
  const units = optionalNumber(v.units);
  const unitCost = optionalNumber(v.unitCost);
  return clean({
    supplierId: String(v.supplierId ?? v.supplier ?? ""),
    warehouseId: v.warehouseId
      ? String(v.warehouseId)
      : v.warehouse
        ? String(v.warehouse)
        : undefined,
    expectedAt: optionalDate(v.expected),
    ...(product && units !== undefined
      ? { items: [{ productId: product, quantity: units, unitCost: unitCost ?? 0 }] }
      : { units, total: optionalNumber(v.total) }),
    reference: v.reference ? String(v.reference) : undefined,
    notes: v.notes ? String(v.notes) : undefined,
  });
};

/* ── shipments ── */

export const fromShipment = (s: any) => ({
  id: s.id,
  awb: s.awb,
  order: s.order?.orderNumber ?? "—",
  orderId: s.orderId ?? "",
  carrier: s.carrier,
  service: s.service ?? "",
  city: s.city ?? "—",
  eta: shortDate(s.eta),
  etaValue: dateInput(s.eta),
  dispatchedAt: s.dispatchedAt ?? null,
  deliveredAt: s.deliveredAt ?? null,
  createdAt: s.createdAt ?? null,
  attempts: s.attempts ?? 0,
  instructions: s.instructions ?? "",
  status: title(s.status),
  statusValue: String(s.status ?? "AWAITING_DISPATCH").toLowerCase(),
});

export const toShipment = (v: Record<string, unknown>) =>
  clean({
    awb: String(v.awb ?? ""),
    orderId: String(v.orderId ?? ""),
    carrier: String(v.carrier ?? ""),
    service: v.service ? String(v.service) : undefined,
    status: v.status ? enumValue(v.status) : undefined,
    eta: optionalDate(v.eta),
    instructions: v.instructions ? String(v.instructions) : undefined,
  });

/* ── returns ── */

export const fromReturn = (r: any) => {
  const items: any[] = r.order?.items ?? [];
  const item = r.orderItemId ? items.find((i) => i.id === r.orderItemId) : null;
  return {
    id: r.id,
    rma: r.rmaNumber,
    customer: r.customer
      ? `${r.customer.firstName} ${r.customer.lastName}`
      : "—",
    order: r.order?.orderNumber ?? "—",
    item: item
      ? `${item.product?.name ?? "Item"} × ${item.quantity}`
      : items.length
        ? `Whole order · ${items.length} line(s)`
        : "—",
    reason: r.reason,
    refund: money(r.refundAmount),
    refundValue: Number(r.refundAmount ?? 0),
    refundMethod: r.refundMethod ?? null,
    restock: r.restock ?? null,
    stage: title(r.stage),
    stageValue: String(r.stage ?? ""),
  };
};

export const toReturn = (v: Record<string, unknown>) =>
  clean({
    orderId: String(v.orderId ?? ""),
    orderItemId: v.orderItemId ? String(v.orderItemId) : undefined,
    reason: String(v.reason ?? ""),
    refundAmount: optionalNumber(v.refundAmount),
    note: v.note ? String(v.note) : undefined,
  });

export const toReturnDecision = (v: Record<string, unknown>) => {
  const decision = String(v.decision ?? "approve");
  return clean({
    stage: decision === "reject" ? "REJECTED" : "APPROVED",
    refundMethod:
      v.refundMethod === "credit"
        ? "STORE_CREDIT"
        : v.refundMethod === "none"
          ? "NONE"
          : "ORIGINAL",
    restock:
      v.restock === "writeoff"
        ? "WRITE_OFF"
        : v.restock === "yes"
          ? "SELLABLE"
          : "QUARANTINE",
    refundAmount: optionalNumber(v.refundAmount),
    note: v.note ? String(v.note) : undefined,
  });
};

/* ── invoices ── */

export const fromInvoice = (i: any) => ({
  id: i.id,
  number: i.number,
  customer: i.customer ? `${i.customer.firstName} ${i.customer.lastName}` : "—",
  customerId: i.customerId ?? "",
  orderId: i.orderId ?? "",
  issued: shortDate(i.issuedAt),
  issuedAt: dateInput(i.issuedAt),
  due: shortDate(i.dueAt),
  dueAt: dateInput(i.dueAt),
  amount: money(i.amount),
  amountValue: Number(i.amount ?? 0),
  balance: money(i.balance),
  balanceValue: Number(i.balance ?? 0),
  terms: i.terms ?? "",
  notes: i.notes ?? "",
  status: title(i.status),
  statusValue: String(i.status ?? ""),
});

/** Balance is left to the API: it opens at the amount and tracks payments. */
export const toInvoice = (v: Record<string, unknown>) =>
  clean({
    customerId: String(v.customerId ?? ""),
    orderId: v.orderId ? String(v.orderId) : undefined,
    issuedAt: optionalDate(v.issued),
    dueAt: optionalDate(v.due),
    amount: optionalNumber(v.amount),
    terms: v.terms ? String(v.terms) : undefined,
    notes: v.notes ? String(v.notes) : undefined,
  });

/* ── tax ── */

export const fromTaxFiling = (f: any) => ({
  id: f.id,
  period: f.period,
  jurisdiction: f.jurisdiction,
  output: money(f.outputTax),
  outputValue: Number(f.outputTax ?? 0),
  input: money(f.inputTax),
  inputValue: Number(f.inputTax ?? 0),
  net: money(f.netPayable),
  netValue: Number(f.netPayable ?? 0),
  due: shortDate(f.dueAt),
  dueAt: f.dueAt ?? null,
  status: title(f.status),
});

export const toTaxFiling = (v: Record<string, unknown>) =>
  clean({
    period: String(v.period ?? ""),
    jurisdiction: String(v.jurisdiction ?? ""),
    outputTax: optionalNumber(v.outputTax),
    inputTax: optionalNumber(v.inputTax),
    dueAt: optionalDate(v.due),
  });

export const fromTaxRate = (r: any) => ({
  id: r.id,
  authority: r.jurisdiction,
  number: r.registration ?? "Not registered",
  state: `${Number(r.rate)}% · ${r.countryCode ?? "no country"}${r.isActive ? "" : " · inactive"}`,
  tone: (r.isActive ? "success" : "neutral") as "success" | "neutral",
  isActive: Boolean(r.isActive),
  jurisdiction: r.jurisdiction,
  countryCode: r.countryCode ?? "",
  registration: r.registration ?? "",
  rate: String(Number(r.rate ?? 0)),
  appliesTo: r.appliesTo ?? "all",
});

export const toTaxRate = (v: Record<string, unknown>) =>
  clean({
    jurisdiction: String(v.jurisdiction ?? ""),
    countryCode: v.countryCode ? String(v.countryCode).trim().toUpperCase() : undefined,
    registration: v.registration ? String(v.registration) : undefined,
    rate: optionalNumber(v.rate),
    appliesTo: v.appliesTo ? String(v.appliesTo) : undefined,
  });

/* ── campaigns ── */

export const fromCampaign = (c: any) => ({
  id: c.id,
  name: c.name,
  channel: title(c.channel),
  sent: num(c.sent),
  openRate: c.openRate ? `${Number(c.openRate)}%` : "—",
  revenue: compactMoney(c.revenue),
  status: title(c.status),
  schedule: c.alwaysOn ? "Always on" : c.sendAt ? shortDate(c.sendAt) : "—",
  /** The persisted row, so the edit dialog can prefill every field. */
  raw: c as {
    channel: string;
    audience: string | null;
    subject: string | null;
    preview: string | null;
    sendAt: string | null;
    alwaysOn: boolean;
    status: string;
    sent: number;
    openRate: string | null;
    revenue: string;
  },
});

export const toCampaign = (v: Record<string, unknown>) =>
  clean({
    name: String(v.name ?? ""),
    channel: enumValue(v.channel, "EMAIL"),
    audience: v.audience ? String(v.audience) : undefined,
    subject: v.subject ? String(v.subject) : undefined,
    preview: v.preview ? String(v.preview) : undefined,
    sendAt: optionalDate(v.sendAt),
    alwaysOn: Boolean(v.alwaysOn),
    status: enumValue(v.status),
  });

/* ── cms ── */

export const fromPost = (p: any) => ({
  id: p.id,
  title: p.title,
  author: p.author ?? "—",
  category: p.category ?? "—",
  published: shortDate(p.publishAt),
  views: num(p.views),
  status: title(p.status),
  /** The persisted row, so the edit dialog can prefill every field. */
  raw: p as {
    slug: string;
    author: string | null;
    category: string | null;
    excerpt: string | null;
    body: string | null;
    shoppable: boolean;
    publishAt: string | null;
    status: string;
    views: number;
  },
});

export const toPost = (v: Record<string, unknown>) =>
  clean({
    title: String(v.title ?? ""),
    slug:
      String(v.slug ?? "") ||
      String(v.title ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
    author: v.author ? String(v.author) : undefined,
    category: v.category ? String(v.category) : undefined,
    excerpt: v.excerpt ? String(v.excerpt) : undefined,
    body: v.body ? String(v.body) : undefined,
    shoppable: Boolean(v.shoppable),
    publishAt: optionalDate(v.publishAt),
    status: enumValue(v.status),
  });

/* ── notifications ── */

export const fromNotification = (n: any) => ({
  id: n.id,
  title: n.title,
  body: n.body ?? "",
  severity: String(n.severity ?? "INFO").toLowerCase() as
    | "critical"
    | "warning"
    | "success"
    | "info",
  meta: n.meta ?? "",
  time: relative(n.createdAt),
  unread: Boolean(n.unread),
});

export const toAlertRule = (v: Record<string, unknown>) =>
  clean({
    name: String(v.name ?? ""),
    category: v.category ? String(v.category) : undefined,
    severity: enumValue(v.severity, "INFO"),
    channels: v.channels ? String(v.channels) : undefined,
    threshold: v.threshold ? String(v.threshold) : undefined,
  });

/* ── audit log ── */

export const fromAuditEvent = (e: any) => ({
  id: e.id,
  time: `${shortDate(e.createdAt)} ${clock(e.createdAt)}`,
  actor: e.actor,
  role: "—",
  action: e.action,
  detail: e.meta ?? "—",
  object: e.entityId ? `${e.entity} · ${e.entityId}` : e.entity,
  source: e.ip ?? "—",
  result: (/fail|blocked|denied/i.test(e.action) ? "Blocked" : "Success") as
    | "Success"
    | "Blocked",
});

/* ── categories ── */

export type ApiCategory = {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  parentId?: string | null;
  sortOrder?: number;
  isVisible?: boolean;
  showInNav?: boolean;
  isFeatured?: boolean;
  description?: string | null;
  updatedAt?: string;
  _count?: { products: number; children: number };
  children?: ApiCategory[];
};

export const fromCategory = (c: ApiCategory): any => ({
  id: c.id,
  name: c.name,
  slug: c.slug,
  imageUrl: c.imageUrl ?? null,
  products: c._count?.products ?? 0,
  visibility: c.isVisible === false ? "Hidden" : "Visible",
  sort: c.sortOrder ?? 0,
  updated: relative(c.updatedAt),
  description: c.description ?? "",
  featured: Boolean(c.isFeatured),
  parentId: c.parentId ?? undefined,
  children: c.children?.map(fromCategory),
});

export const toCategory = (v: Record<string, unknown>) =>
  clean({
    name: String(v.name ?? ""),
    slug:
      String(v.slug ?? "") ||
      String(v.name ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
    // null (not undefined) so an edit can move a sub-category back to the top level.
    parentId: v.parent ? String(v.parent) : null,
    imageUrl: typeof v.imageUrl === "string" ? v.imageUrl : undefined,
    sortOrder: optionalNumber(v.sort),
    description: v.description ? String(v.description) : undefined,
    showInNav: v.inNav === undefined ? undefined : Boolean(v.inNav),
    isVisible: v.inNav === undefined ? undefined : Boolean(v.inNav),
    isFeatured: v.featured === undefined ? undefined : Boolean(v.featured),
  });

/* ── products ── */

/** Publication state shown in the catalogue table, derived from stock. */
const productStatus = (p: any) => {
  if (!p.isActive) return "Draft";
  const quantity = p.inventory?.quantity ?? 0;
  const reorderAt = p.inventory?.reorderAt ?? 0;
  const available = quantity - (p.inventory?.reserved ?? 0);
  if (quantity <= 0) return "Out of stock";
  if (reorderAt > 0 && available <= reorderAt) return "Low stock";
  return "Active";
};

export const fromProduct = (p: any) => {
  const quantity = p.inventory?.quantity ?? 0;
  const reorderAt = p.inventory?.reorderAt ?? 0;
  return {
    id: p.id,
    name: p.name,
    sku: p.sku,
    cost: p.costPrice ? money(p.costPrice) : "—",
    image: p.images?.[0]?.url ?? "",
    category: p.category?.name ?? "—",
    brand: p.brand?.name ?? "—",
    // Variants are not modelled on Product yet, so this stays 0 and the table
    // renders a dash rather than an invented count.
    variants: 0,
    price: money(p.price),
    onHand: quantity,
    // No capacity column exists on Product, so headroom is expressed against
    // the reorder threshold — enough to render a meaningful stock meter.
    capacity: Math.max(quantity, reorderAt * 4, 1),
    sales30d: p.sales30d ?? 0,
    status: productStatus(p) as
      | "Active"
      | "Draft"
      | "Low stock"
      | "Out of stock"
      | "Unpublished"
      | "Archived",
    updated: relative(p.updatedAt),
  };
};
