/** Admin showcase data shaped exactly like the API responses, so the console
 *  renders the AD-01 / AD-19 designs before the backend is wired up. */
import type { DashboardSummary } from "@/services/dashboard.service";
import type { ReportsSummary } from "@/services/report.service";

const month = (offset: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() - offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return d.toISOString().slice(0, 10);
};

export const SHOWCASE_DASHBOARD: DashboardSummary = {
  totalCustomers: 9431,
  totalOrders: 3912,
  totalRevenue: 482100.5,
  totalProducts: 1046,
  revenueByMonth: [
    { month: month(5), total: 58200 },
    { month: month(4), total: 64180 },
    { month: month(3), total: 61040 },
    { month: month(2), total: 78620 },
    { month: month(1), total: 92140 },
    { month: month(0), total: 87920 },
  ],
  topSellingProducts: [
    { productId: "sp-sidr-honey", name: "Sidr Mountain Honey", category: "Honey", stock: 42, quantitySold: 318, revenue: 47064 },
    { productId: "sp-khawlani-roast", name: "Khawlani Reserve Roast", category: "Coffee", stock: 60, quantitySold: 264, revenue: 16368 },
    { productId: "sp-amber-elixir", name: "Amber Hair Elixir", category: "Hair Oil", stock: 18, quantitySold: 241, revenue: 18798 },
    { productId: "sp-medjool-dates", name: "Medjool Date Selection", category: "Nuts", stock: 80, quantitySold: 187, revenue: 8602 },
    { productId: "sp-linen-abaya", name: "Hand-Loomed Linen Abaya", category: "Clothing", stock: 8, quantitySold: 152, revenue: 63840 },
  ],
  outOfStockProducts: [
    { productId: "sp-oud-soap", name: "Oud & Honey Body Soap", sku: "SOP-OUD-150" },
    { productId: "sp-cashmere-scarf", name: "Cashmere Desert Scarf", sku: "ATL-SCF-SND" },
  ],
  recentOrders: [
    { id: "o1", orderNumber: "AM-2026-04871", customerName: "Noor Al Amin", total: 230, status: "PROCESSING" },
    { id: "o2", orderNumber: "AM-2026-04870", customerName: "Yousef Al Harbi", total: 420, status: "SHIPPED" },
    { id: "o3", orderNumber: "AM-2026-04869", customerName: "Sara Mahmoud", total: 318.4, status: "DELIVERED" },
    { id: "o4", orderNumber: "AM-2026-04868", customerName: "Khalid Al Rashid", total: 146, status: "PENDING" },
    { id: "o5", orderNumber: "AM-2026-04867", customerName: "Aisha Nasser", total: 512, status: "DELIVERED" },
  ],
};

export const SHOWCASE_REPORTS: ReportsSummary = {
  ordersByStatus: [
    { status: "PENDING", count: 42 },
    { status: "PROCESSING", count: 118 },
    { status: "SHIPPED", count: 204 },
    { status: "DELIVERED", count: 1842 },
    { status: "CANCELLED", count: 17 },
    { status: "REFUNDED", count: 23 },
  ],
  revenueByCategory: [
    { category: "Honey", revenue: 168700 },
    { category: "Coffee", revenue: 120500 },
    { category: "Clothing", revenue: 96400 },
    { category: "Nuts", revenue: 57850 },
    { category: "Hair Oil", revenue: 38560 },
  ],
  salesOverTime: Array.from({ length: 30 }, (_, i) => {
    const base = [1820, 2140, 1960, 2480, 3120, 2760, 2380][i % 7];
    return { date: day(29 - i), revenue: base + (i % 5) * 180, orders: 8 + (i % 6) };
  }),
};

/* ───────────────────────── Operations & finance showcase ───────────────────────── */

export const WAREHOUSES = [
  { code: "WH-A", name: "Riyadh · Warehouse A", city: "Riyadh", units: 42180, capacity: 54000, utilisation: 78, pickAccuracy: "99.4%", staff: 34, status: "Operational" as const },
  { code: "WH-B", name: "Jeddah · Warehouse B", city: "Jeddah", units: 21440, capacity: 30000, utilisation: 71, pickAccuracy: "98.9%", staff: 22, status: "Operational" as const },
  { code: "WH-C", name: "Dammam · Warehouse C", city: "Dammam", units: 12360, capacity: 18000, utilisation: 69, pickAccuracy: "99.1%", staff: 15, status: "Operational" as const },
  { code: "WH-D", name: "Dubai · Warehouse D", city: "Dubai", units: 8140, capacity: 12000, utilisation: 68, pickAccuracy: "98.4%", staff: 11, status: "Maintenance" as const },
];

export const TRANSFERS = [
  { id: "TRF-0912", from: "Riyadh A", to: "Jeddah B", units: 640, eta: "21 Feb", status: "In transit" as const },
  { id: "TRF-0911", from: "Jeddah B", to: "Dammam C", units: 180, eta: "20 Feb", status: "In transit" as const },
  { id: "TRF-0908", from: "Riyadh A", to: "Dubai D", units: 320, eta: "19 Feb", status: "Late" as const },
  { id: "TRF-0904", from: "Dammam C", to: "Riyadh A", units: 96, eta: "18 Feb", status: "Received" as const },
];

export const PURCHASE_ORDERS = [
  { po: "PO-2418", supplier: "Al Nahda Foods", expected: "24 Feb 2026", units: 1200, total: "$48,600.00", status: "Overdue" as const },
  { po: "PO-2417", supplier: "Khawlani Estates", expected: "26 Feb 2026", units: 800, total: "$32,400.00", status: "Approved" as const },
  { po: "PO-2416", supplier: "Hadhramaut Apiaries", expected: "02 Mar 2026", units: 2400, total: "$96,800.00", status: "Awaiting approval" as const },
  { po: "PO-2415", supplier: "Ta'if Botanicals", expected: "05 Mar 2026", units: 640, total: "$21,150.00", status: "Approved" as const },
  { po: "PO-2414", supplier: "Coastal Looms", expected: "12 Mar 2026", units: 320, total: "$54,900.00", status: "Draft" as const },
  { po: "PO-2411", supplier: "Jazan Groves", expected: "16 Feb 2026", units: 980, total: "$18,240.00", status: "Received" as const },
];

export const DELIVERY_BOARD = [
  { stage: "Awaiting dispatch", count: 86, tone: "neutral" as const },
  { stage: "Dispatched", count: 1284, tone: "info" as const },
  { stage: "Out for delivery", count: 412, tone: "warning" as const },
  { stage: "Delivered", count: 1842, tone: "success" as const },
  { stage: "Failed / returned", count: 23, tone: "danger" as const },
];

export const SHIPMENTS = [
  { awb: "4471 9930 2214", order: "AM-2026-04871", carrier: "Aramex", city: "Riyadh", eta: "Today 16:00–19:00", status: "Out for delivery" as const },
  { awb: "4471 9930 2208", order: "AM-2026-04870", carrier: "SMSA", city: "Jeddah", eta: "Tomorrow", status: "In transit" as const },
  { awb: "4471 9930 2190", order: "AM-2026-04869", carrier: "Aramex", city: "Dammam", eta: "Delivered 08:41", status: "Delivered" as const },
  { awb: "4471 9930 2184", order: "AM-2026-04866", carrier: "DHL", city: "Dubai", eta: "Attempt 2 of 3", status: "Failed" as const },
];

export const SUPPLIERS = [
  { name: "Hadhramaut Apiaries", category: "Honey", country: "Yemen", leadTime: "18 days", onTime: "94.2%", openPos: 3, ytd: "$1.62M", rating: "4.9", status: "Active" as const },
  { name: "Khawlani Estates", category: "Coffee", country: "Saudi Arabia", leadTime: "12 days", onTime: "96.8%", openPos: 2, ytd: "$1.18M", rating: "4.8", status: "Active" as const },
  { name: "Al Nahda Foods", category: "Nuts & Dates", country: "Saudi Arabia", leadTime: "9 days", onTime: "88.1%", openPos: 4, ytd: "$860K", rating: "4.2", status: "Review" as const },
  { name: "Coastal Looms", category: "Atelier", country: "UAE", leadTime: "26 days", onTime: "91.4%", openPos: 1, ytd: "$742K", rating: "4.6", status: "Active" as const },
  { name: "Ta'if Botanicals", category: "Hair & Body", country: "Saudi Arabia", leadTime: "14 days", onTime: "97.2%", openPos: 2, ytd: "$418K", rating: "4.9", status: "Active" as const },
];

export const CAMPAIGNS = [
  { name: "Ramadan Gifting Preview", channel: "Email", sent: "184,200", openRate: "44.1%", revenue: "$126,400", status: "Live" as const, schedule: "Runs to 28 Feb" },
  { name: "Winter Harvest Launch", channel: "Email", sent: "212,800", openRate: "41.6%", revenue: "$98,200", status: "Completed" as const, schedule: "Ended 12 Feb" },
  { name: "Abandoned Basket · 4h", channel: "Push", sent: "42,110", openRate: "38.9%", revenue: "$54,900", status: "Live" as const, schedule: "Always on" },
  { name: "Gold Tier Early Access", channel: "SMS", sent: "9,840", openRate: "62.4%", revenue: "$71,300", status: "Live" as const, schedule: "Always on" },
  { name: "Back in Stock · Sidr", channel: "Push", sent: "18,640", openRate: "51.2%", revenue: "$42,000", status: "Scheduled" as const, schedule: "Starts 22 Feb" },
];

export const CMS_POSTS = [
  { title: "The Sidr Harvest, Season 2026", author: "Mariam Zayed", category: "Journal", published: "17 Feb 2026", views: "18,420", status: "Published" as const },
  { title: "How to Read a Roast Date", author: "Omar Benali", category: "Guides", published: "11 Feb 2026", views: "12,180", status: "Published" as const },
  { title: "Inside the Riyadh Atelier", author: "Mariam Zayed", category: "Maison", published: "02 Feb 2026", views: "9,640", status: "Published" as const },
  { title: "Ramadan Table Settings", author: "Layla Al Hashimi", category: "Journal", published: "—", views: "—", status: "Draft" as const },
  { title: "Caring for Hand-Loomed Linen", author: "Nadia Farouk", category: "Guides", published: "—", views: "—", status: "Scheduled" as const },
];

export const INVOICES = [
  { number: "INV-2026-04871", customer: "Noor Al Amin", issued: "17 Feb 2026", due: "19 Mar 2026", amount: "$230.00", balance: "$0.00", status: "Paid" as const },
  { number: "INV-2026-04862", customer: "Gulf Retail Group", issued: "12 Feb 2026", due: "14 Mar 2026", amount: "$48,600.00", balance: "$48,600.00", status: "Open" as const },
  { number: "INV-2026-04840", customer: "Yousef Al Harbi", issued: "04 Feb 2026", due: "06 Mar 2026", amount: "$420.00", balance: "$420.00", status: "Open" as const },
  { number: "INV-2026-04801", customer: "Aisha Nasser", issued: "22 Jan 2026", due: "21 Feb 2026", amount: "$512.00", balance: "$512.00", status: "Overdue" as const },
  { number: "INV-2026-04788", customer: "Sara Mahmoud", issued: "14 Jan 2026", due: "13 Feb 2026", amount: "$318.40", balance: "$0.00", status: "Paid" as const },
];

export const RETURNS = [
  { rma: "RMA-2026-0188", customer: "Noor Al Amin", order: "AM-2026-04188", item: "Cashmere Desert Scarf", reason: "Colour not as expected", refund: "$260.00", stage: "Awaiting inspection" as const },
  { rma: "RMA-2026-0184", customer: "Khalid Al Rashid", order: "AM-2026-04120", item: "Oud & Honey Body Soap", reason: "Damaged in transit", refund: "$32.00", stage: "Approved" as const },
  { rma: "RMA-2026-0179", customer: "Sara Mahmoud", order: "AM-2026-04066", item: "Amber Hair Elixir", reason: "Changed mind", refund: "$78.00", stage: "Refunded" as const },
  { rma: "RMA-2026-0171", customer: "Aisha Nasser", order: "AM-2025-03994", item: "Khawlani Reserve Roast", reason: "Wrong grind", refund: "$62.00", stage: "Rejected" as const },
];

export const TAX_FILINGS = [
  { period: "Q1 2026", jurisdiction: "KSA · ZATCA", output: "$142,900", input: "$41,800", net: "$101,100", due: "30 Apr 2026", status: "Draft" as const },
  { period: "Q1 2026", jurisdiction: "UAE · FTA", output: "$186,400", input: "$52,100", net: "$134,300", due: "28 Apr 2026", status: "Draft" as const },
  { period: "Q4 2025", jurisdiction: "KSA · ZATCA", output: "$171,200", input: "$48,900", net: "$122,300", due: "31 Jan 2026", status: "Filed" as const },
  { period: "Q4 2025", jurisdiction: "UAE · FTA", output: "$164,800", input: "$46,200", net: "$118,600", due: "28 Jan 2026", status: "Filed" as const },
  { period: "Q4 2025", jurisdiction: "Qatar · GTA", output: "$48,200", input: "$14,600", net: "$33,600", due: "30 Jan 2026", status: "Filed" as const },
];

export const NOTIFICATIONS = [
  { title: "Payment gateway declined 14 consecutive charges", body: "Network Emirates returned code 05 on all Visa attempts between 09:12 and 09:24. Failover to the secondary acquirer has been triggered.", time: "09:24", meta: "Payments · auto-escalated to on-call", severity: "critical" as const, unread: true },
  { title: "Sidr Mountain Honey is out of stock", body: "Storefront listing switched to back-order. 42 open orders are awaiting allocation from Warehouse A.", time: "08:47", meta: "Inventory · rule “Stock below safety level”", severity: "critical" as const, unread: true },
  { title: "Purchase order PO-2418 is 6 days overdue", body: "Al Nahda Foods has not confirmed the shipment. Expected receipt was 18 February 2026.", time: "08:02", meta: "Purchasing · supplier SLA breach", severity: "warning" as const, unread: true },
  { title: "Nightly ledger reconciliation completed", body: "4,182 transactions matched against the general ledger with no variance.", time: "06:00", meta: "Finance · scheduled job", severity: "success" as const, unread: false },
  { title: "Ramadan Gifting campaign has gone live", body: "Landing page, 3 email flows and 12 promoted products are now published to the storefront.", time: "Yesterday", meta: "Marketing · published by Mariam Zayed", severity: "info" as const, unread: false },
];

export const AUDIT_EVENTS = [
  { time: "09:41:07", actor: "Omar Benali", role: "Administrator", action: "role.permission.granted", detail: "Elevated “Finance analyst” to include refunds", object: "Role · Finance analyst", source: "10.4.18.22 · Dubai office", result: "Success" as const, id: "evt_9f3a71c4" },
  { time: "09:24:52", actor: "system", role: "Automation", action: "payment.gateway.failover", detail: "Switched acquirer after 14 consecutive declines", object: "Gateway · Network Emirates", source: "internal scheduler", result: "Success" as const, id: "evt_9f3a6b02" },
  { time: "09:12:38", actor: "unknown", role: "—", action: "auth.login.failed", detail: "4th failed attempt · account locked for 15 min", object: "Account · salma.k@royalzaad.com", source: "185.203.44.9 · unrecognised", result: "Blocked" as const, id: "evt_9f3a5d81" },
  { time: "08:47:15", actor: "Nadia Farouk", role: "Merchandiser", action: "product.stock.updated", detail: "On-hand set to 0 · listing moved to back-order", object: "Product · Sidr Honey 500g", source: "10.4.18.61 · Riyadh office", result: "Success" as const, id: "evt_9f3a4417" },
  { time: "07:58:22", actor: "Yusuf Rahman", role: "Warehouse lead", action: "inventory.transfer.created", detail: "640 units moved Riyadh A → Jeddah B", object: "Transfer · TRF-0912", source: "10.9.3.14 · Warehouse A", result: "Success" as const, id: "evt_9f3a10ba" },
  { time: "06:00:00", actor: "system", role: "Automation", action: "audit.integrity.verified", detail: "Hash chain verified across 41,208 records", object: "Ledger · audit-2026-02", source: "internal scheduler", result: "Success" as const, id: "evt_9f39a002" },
];

/* ───────────────────────── Catalogue & people showcase ───────────────────────── */

export const ADMIN_PRODUCTS = [
  { id: "sp-sidr-honey", name: "Sidr Mountain Honey", sku: "HON-SDR-500", price: "148.00", isActive: true, category: { id: "sc-honey", name: "Honey" } },
  { id: "sp-khawlani-roast", name: "Khawlani Reserve Roast", sku: "COF-KHW-250", price: "62.00", isActive: true, category: { id: "sc-coffee", name: "Coffee" } },
  { id: "sp-amber-elixir", name: "Amber Hair Elixir", sku: "HAR-AMB-100", price: "78.00", isActive: true, category: { id: "sc-hair-oil", name: "Hair Oil" } },
  { id: "sp-linen-abaya", name: "Hand-Loomed Linen Abaya", sku: "ATL-ABY-M", price: "420.00", isActive: true, category: { id: "sc-clothing", name: "Clothing" } },
  { id: "sp-medjool-dates", name: "Medjool Date Selection", sku: "NUT-MDJ-750", price: "46.00", isActive: true, category: { id: "sc-nuts", name: "Nuts" } },
  { id: "sp-rose-argan", name: "Rose & Argan Serum", sku: "HAR-ROS-050", price: "92.00", isActive: true, category: { id: "sc-hair-oil", name: "Hair Oil" } },
  { id: "sp-oud-soap", name: "Oud & Honey Body Soap", sku: "SOP-OUD-150", price: "32.00", isActive: false, category: { id: "sc-body-soap", name: "Body Soap" } },
  { id: "sp-cashmere-scarf", name: "Cashmere Desert Scarf", sku: "ATL-SCF-SND", price: "260.00", isActive: false, category: { id: "sc-clothing", name: "Clothing" } },
];

export const ADMIN_CATEGORIES = [
  { id: "sc-honey", name: "Honey", slug: "honey", description: "Single-origin harvests, raw and unfiltered" },
  { id: "sc-coffee", name: "Coffee", slug: "coffee", description: "Shade-grown beans roasted to order" },
  { id: "sc-nuts", name: "Nuts", slug: "nuts", description: "Dates, pistachios and almonds by the grade" },
  { id: "sc-clothing", name: "Clothing", slug: "clothing", description: "Hand-loomed linen and cashmere" },
  { id: "sc-hair-oil", name: "Hair Oil", slug: "hair-oil", description: "Cold-pressed botanical treatments" },
  { id: "sc-body-soap", name: "Body Soap", slug: "body-soap", description: "Cold-process bars in small batches" },
];

export const ADMIN_BRANDS = [
  { id: "br-zaad", name: "Royal Zaad", slug: "royal-zaad", description: "The maison label" },
  { id: "br-hadhramaut", name: "Hadhramaut Apiaries", slug: "hadhramaut-apiaries", description: "Wild Sidr honey" },
  { id: "br-khawlani", name: "Khawlani Estates", slug: "khawlani-estates", description: "Terraced coffee" },
  { id: "br-coastal", name: "Coastal Looms", slug: "coastal-looms", description: "Hand-loomed textiles" },
];

export const ADMIN_ORDERS = [
  { id: "o1", orderNumber: "AM-2026-04871", customer: "Noor Al Amin", items: 3, total: "230.00", status: "PROCESSING", payment: "Visa ••42" },
  { id: "o2", orderNumber: "AM-2026-04870", customer: "Yousef Al Harbi", items: 1, total: "420.00", status: "SHIPPED", payment: "Apple Pay" },
  { id: "o3", orderNumber: "AM-2026-04869", customer: "Sara Mahmoud", items: 5, total: "318.40", status: "DELIVERED", payment: "COD" },
  { id: "o4", orderNumber: "AM-2026-04868", customer: "Khalid Al Rashid", items: 2, total: "146.00", status: "PENDING", payment: "Mada ••18" },
  { id: "o5", orderNumber: "AM-2026-04867", customer: "Aisha Nasser", items: 4, total: "512.00", status: "DELIVERED", payment: "Visa ••77" },
  { id: "o6", orderNumber: "AM-2026-04866", customer: "Faisal Al Nuaimi", items: 1, total: "92.00", status: "CANCELLED", payment: "Visa ••09" },
];

export const ADMIN_CUSTOMERS = [
  { id: "c1", firstName: "Noor", lastName: "Al Amin", email: "noor@royalzaad.com", phone: "+966 55 214 8890", orders: 14, spend: "$4,812.00" },
  { id: "c2", firstName: "Yousef", lastName: "Al Harbi", email: "yousef.h@example.com", phone: "+966 55 118 2204", orders: 9, spend: "$3,140.00" },
  { id: "c3", firstName: "Sara", lastName: "Mahmoud", email: "sara.m@example.com", phone: "+966 50 664 7712", orders: 6, spend: "$1,982.40" },
  { id: "c4", firstName: "Khalid", lastName: "Al Rashid", email: "khalid.r@example.com", phone: "+966 53 442 9018", orders: 4, spend: "$864.00" },
  { id: "c5", firstName: "Aisha", lastName: "Nasser", email: "aisha.n@example.com", phone: "+971 50 771 3390", orders: 11, spend: "$5,204.00" },
];

export const ADMIN_INVENTORY = [
  { id: "i1", productId: "sp-sidr-honey", quantity: 42, reserved: 6, reorderAt: 20, warehouse: "Riyadh A", product: { id: "sp-sidr-honey", name: "Sidr Mountain Honey", sku: "HON-SDR-500" } },
  { id: "i2", productId: "sp-khawlani-roast", quantity: 60, reserved: 4, reorderAt: 25, warehouse: "Riyadh A", product: { id: "sp-khawlani-roast", name: "Khawlani Reserve Roast", sku: "COF-KHW-250" } },
  { id: "i3", productId: "sp-amber-elixir", quantity: 18, reserved: 2, reorderAt: 20, warehouse: "Jeddah B", product: { id: "sp-amber-elixir", name: "Amber Hair Elixir", sku: "HAR-AMB-100" } },
  { id: "i4", productId: "sp-linen-abaya", quantity: 8, reserved: 1, reorderAt: 10, warehouse: "Dubai D", product: { id: "sp-linen-abaya", name: "Hand-Loomed Linen Abaya", sku: "ATL-ABY-M" } },
  { id: "i5", productId: "sp-oud-soap", quantity: 0, reserved: 0, reorderAt: 30, warehouse: "Dammam C", product: { id: "sp-oud-soap", name: "Oud & Honey Body Soap", sku: "SOP-OUD-150" } },
  { id: "i6", productId: "sp-cashmere-scarf", quantity: 0, reserved: 0, reorderAt: 8, warehouse: "Dubai D", product: { id: "sp-cashmere-scarf", name: "Cashmere Desert Scarf", sku: "ATL-SCF-SND" } },
];

export const ADMIN_PROMOTIONS = [
  { id: "pr1", name: "Ramadan Gifting", description: "Seasonal gifting edit", discountType: "PERCENTAGE", discountValue: "20", startsAt: "2026-02-01", endsAt: "2026-03-15", isActive: true , products: [{ id: "pr1-p1" }, { id: "pr1-p2" }, { id: "pr1-p3" }, { id: "pr1-p4" }, { id: "pr1-p5" }, { id: "pr1-p6" }, { id: "pr1-p7" }, { id: "pr1-p8" }, { id: "pr1-p9" }, { id: "pr1-p10" }, { id: "pr1-p11" }, { id: "pr1-p12" }] },
  { id: "pr2", name: "Winter Harvest", description: "Honey house launch", discountType: "PERCENTAGE", discountValue: "15", startsAt: "2026-01-05", endsAt: "2026-02-12", isActive: false , products: [{ id: "pr2-p1" }, { id: "pr2-p2" }, { id: "pr2-p3" }, { id: "pr2-p4" }, { id: "pr2-p5" }, { id: "pr2-p6" }, { id: "pr2-p7" }, { id: "pr2-p8" }] },
  { id: "pr3", name: "Coffee Week", description: "Single-origin roasts", discountType: "PERCENTAGE", discountValue: "25", startsAt: "2026-02-18", endsAt: "2026-02-25", isActive: true , products: [{ id: "pr3-p1" }, { id: "pr3-p2" }, { id: "pr3-p3" }, { id: "pr3-p4" }, { id: "pr3-p5" }, { id: "pr3-p6" }] },
  { id: "pr4", name: "Atelier Private View", description: "Gold tier only", discountType: "FIXED_AMOUNT", discountValue: "50", startsAt: "2026-03-01", endsAt: "2026-03-08", isActive: false , products: [{ id: "pr4-p1" }, { id: "pr4-p2" }, { id: "pr4-p3" }] },
];

export const ADMIN_COUPONS = [
  { id: "cp1", code: "WELCOME20", description: "20% off first order", discountType: "PERCENTAGE", discountValue: "20", usageCount: 8942, usageLimit: 20000, isActive: true, expiresAt: "2026-02-28" },
  { id: "cp2", code: "GOLD10", description: "Gold tier standing discount", discountType: "PERCENTAGE", discountValue: "10", usageCount: 4180, usageLimit: null, isActive: true, expiresAt: null },
  { id: "cp3", code: "ARABICA25", description: "Coffee Week promotion", discountType: "PERCENTAGE", discountValue: "25", usageCount: 1902, usageLimit: 5000, isActive: true, expiresAt: "2026-02-25" },
  { id: "cp4", code: "BIRTHDAY25", description: "$25 off birthday order", discountType: "FIXED_AMOUNT", discountValue: "25", usageCount: 640, usageLimit: null, isActive: true, expiresAt: null },
  { id: "cp5", code: "NEWYEAR30", description: "$30 off above $200", discountType: "FIXED_AMOUNT", discountValue: "30", usageCount: 3218, usageLimit: 3218, isActive: false, expiresAt: "2026-01-15" },
];

export const ADMIN_ROLES = [
  { id: "r1", name: "Owner", description: "Unrestricted access to every module" },
  { id: "r2", name: "Administrator", description: "All modules except billing" },
  { id: "r3", name: "Merchandiser", description: "Catalogue, pricing and CMS" },
  { id: "r4", name: "Warehouse lead", description: "Inventory, transfers and delivery" },
  { id: "r5", name: "Finance analyst", description: "Invoices, tax and reports" },
  { id: "r6", name: "Support agent", description: "Orders, returns and customers" },
  { id: "r7", name: "Auditor (read-only)", description: "View and export, no writes" },
];

export const ADMIN_USERS = [
  { id: "u1", firstName: "Layla", lastName: "Al Hashimi", email: "layla.h@royalzaad.com", isActive: true, role: { id: "r1", name: "Owner" } },
  { id: "u2", firstName: "Omar", lastName: "Benali", email: "omar.b@royalzaad.com", isActive: true, role: { id: "r2", name: "Administrator" } },
  { id: "u3", firstName: "Nadia", lastName: "Farouk", email: "nadia.f@royalzaad.com", isActive: true, role: { id: "r3", name: "Merchandiser" } },
  { id: "u4", firstName: "Yusuf", lastName: "Rahman", email: "yusuf.r@royalzaad.com", isActive: true, role: { id: "r4", name: "Warehouse lead" } },
  { id: "u5", firstName: "Salma", lastName: "Kadri", email: "salma.k@royalzaad.com", isActive: true, role: { id: "r5", name: "Finance analyst" } },
  { id: "u6", firstName: "Hassan", lastName: "Toure", email: "hassan.t@royalzaad.com", isActive: true, role: { id: "r6", name: "Support agent" } },
  { id: "u7", firstName: "Mariam", lastName: "Zayed", email: "mariam.z@royalzaad.com", isActive: false, role: { id: "r3", name: "Merchandiser" } },
];

export const ADMIN_REVIEWS = [
  { id: "rv1", productId: "sp-sidr-honey", customerId: "c1", rating: 5, title: "Finest I have tasted", content: "The Sidr is genuinely the finest I have tasted outside of a private estate.", isApproved: false, createdAt: "2026-02-20", customer: { id: "c1", firstName: "Noor", lastName: "Al Amin", email: "noor@royalzaad.com" }, product: { id: "sp-sidr-honey", name: "Sidr Mountain Honey", sku: "HON-SDR-500" } },
  { id: "rv2", productId: "sp-khawlani-roast", customerId: "c2", rating: 5, title: "Four days after roasting", content: "Bright, structured and nothing like supermarket coffee.", isApproved: false, createdAt: "2026-02-18", customer: { id: "c2", firstName: "Yousef", lastName: "Al Harbi", email: "yousef.h@example.com" }, product: { id: "sp-khawlani-roast", name: "Khawlani Reserve Roast", sku: "COF-KHW-250" } },
  { id: "rv3", productId: "sp-linen-abaya", customerId: "c3", rating: 4, title: "Beautiful cut", content: "Cut beautifully and the weight is right for the season. Sizing runs slightly long.", isApproved: true, createdAt: "2026-01-22", customer: { id: "c3", firstName: "Sara", lastName: "Mahmoud", email: "sara.m@example.com" }, product: { id: "sp-linen-abaya", name: "Hand-Loomed Linen Abaya", sku: "ATL-ABY-M" } },
  { id: "rv4", productId: "sp-amber-elixir", customerId: "c5", rating: 5, title: "Worth every riyal", content: "Two weeks in and the difference is obvious. The scent is subtle, never cloying.", isApproved: true, createdAt: "2026-01-14", customer: { id: "c5", firstName: "Aisha", lastName: "Nasser", email: "aisha.n@example.com" }, product: { id: "sp-amber-elixir", name: "Amber Hair Elixir", sku: "HAR-AMB-100" } },
];

export const ADMIN_SETTINGS = [
  { id: "s1", key: "store_name", value: "Royal Zaad" },
  { id: "s2", key: "support_email", value: "care@royalzaad.com" },
  { id: "s3", key: "currency", value: "USD" },
  { id: "s4", key: "low_stock_alert_threshold", value: "20" },
];
