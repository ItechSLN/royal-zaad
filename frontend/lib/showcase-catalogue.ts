/** Rich catalogue rows carrying every attribute the AD-02 / AD-03 designs show. */

export type OrderRow = {
  id: string;
  number: string;
  guest: boolean;
  placed: string;
  placedTime: string;
  customer: string;
  email: string;
  initials: string;
  channel: "Web" | "App" | "POS" | "Marketplace";
  items: number;
  payment: string;
  paymentState: "Paid" | "Pending" | "Refunded" | "Failed";
  total: string;
  fulfilment: string;
  status: "Pending" | "Processing" | "Ready to ship" | "Shipped" | "Delivered" | "Cancelled" | "Refunded";
};

const ORDER_SEED: [string, string, string, string, OrderRow["channel"], number, string, OrderRow["paymentState"], string, string, OrderRow["status"], boolean][] = [
  ["AM-2026-04871", "17 Feb", "09:42", "Noor Al Amin", "Web", 3, "Visa ••42", "Paid", "230.00", "Riyadh A · picked", "Processing", true],
  ["AM-2026-04870", "17 Feb", "08:11", "Yousef Al Harbi", "App", 1, "Apple Pay", "Paid", "420.00", "Jeddah B · packed", "Shipped", false],
  ["AM-2026-04869", "16 Feb", "19:04", "Sara Mahmoud", "Web", 5, "COD", "Pending", "318.40", "Riyadh A · delivered", "Delivered", false],
  ["AM-2026-04868", "16 Feb", "15:37", "Khalid Al Rashid", "POS", 2, "Mada ••18", "Paid", "146.00", "Dammam C · awaiting", "Pending", false],
  ["AM-2026-04867", "16 Feb", "11:22", "Aisha Nasser", "Web", 4, "Visa ••77", "Paid", "512.00", "Riyadh A · delivered", "Delivered", false],
  ["AM-2026-04866", "15 Feb", "17:58", "Faisal Al Nuaimi", "Marketplace", 1, "Visa ••09", "Refunded", "92.00", "—", "Cancelled", false],
  ["AM-2026-04865", "15 Feb", "14:03", "Layla Al Hashimi", "Web", 6, "Amex ••31", "Paid", "684.00", "Riyadh A · picked", "Ready to ship", false],
  ["AM-2026-04864", "15 Feb", "10:48", "Omar Benali", "App", 2, "Apple Pay", "Paid", "158.00", "Jeddah B · shipped", "Shipped", false],
  ["AM-2026-04863", "14 Feb", "20:15", "Nadia Farouk", "Web", 3, "Mada ••64", "Paid", "276.00", "Riyadh A · delivered", "Delivered", false],
  ["AM-2026-04862", "14 Feb", "16:29", "Gulf Retail Group", "Marketplace", 24, "Bank transfer", "Pending", "4,860.00", "Riyadh A · processing", "Processing", false],
  ["AM-2026-04861", "14 Feb", "09:07", "Hassan Toure", "Web", 1, "Visa ••55", "Refunded", "78.00", "Returned", "Refunded", false],
  ["AM-2026-04860", "13 Feb", "18:44", "Mariam Zayed", "App", 2, "Apple Pay", "Paid", "184.00", "Dubai D · delivered", "Delivered", false],
];

export const ADMIN_ORDER_ROWS: OrderRow[] = ORDER_SEED.map(
  ([number, placed, placedTime, customer, channel, items, payment, paymentState, total, fulfilment, status, guest], i) => ({
    id: `ord-${i + 1}`,
    number,
    guest,
    placed,
    placedTime,
    customer,
    email: `${customer.toLowerCase().replace(/[^a-z]+/g, ".")}@royalzaad.com`,
    initials: customer.split(" ").map((p) => p[0]).slice(0, 2).join(""),
    channel,
    items,
    payment,
    paymentState,
    total,
    fulfilment,
    status,
  })
);

export const ORDER_TABS = [
  { label: "All orders", count: "4,871" },
  { label: "Pending", count: 132 },
  { label: "Processing", count: 218 },
  { label: "Ready to ship", count: 74 },
  { label: "Shipped", count: 96 },
  { label: "Delivered", count: "4,102" },
  { label: "Cancelled", count: 61 },
  { label: "Refunded", count: 42 },
];

export type ProductRow = {
  id: string;
  name: string;
  sku: string;
  cost: string;
  image: string;
  category: string;
  variants: number;
  price: string;
  onHand: number;
  capacity: number;
  sales30d: number;
  status: "Active" | "Draft" | "Low stock" | "Out of stock" | "Unpublished" | "Archived";
  updated: string;
};

const IMG = (id: string) =>
  `https://images.unsplash.com/photo-${id}?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200`;

export const ADMIN_PRODUCT_ROWS: ProductRow[] = [
  { id: "sp-sidr-honey", name: "Sidr Mountain Honey · 500g", sku: "HON-SDR-500", cost: "$89.10", image: IMG("1587049352846-4a222e784d38"), category: "Honey & Syrups", variants: 4, price: "$148.00", onHand: 842, capacity: 1200, sales30d: 312, status: "Active", updated: "2h ago" },
  { id: "sp-khawlani-roast", name: "Khawlani Reserve Roast · 250g", sku: "COF-KHW-250", cost: "$38.40", image: IMG("1559056199-641a0ac8b55e"), category: "Coffee & Tea", variants: 6, price: "$62.00", onHand: 604, capacity: 900, sales30d: 264, status: "Active", updated: "5h ago" },
  { id: "sp-amber-elixir", name: "Amber Hair Elixir · 100ml", sku: "HAR-AMB-100", cost: "$41.00", image: IMG("1643123158326-a17b8a06c45f"), category: "Beauty & Care", variants: 2, price: "$78.00", onHand: 184, capacity: 600, sales30d: 241, status: "Low stock", updated: "1d ago" },
  { id: "sp-linen-abaya", name: "Hand-Loomed Linen Abaya", sku: "ATL-ABY-M", cost: "$232.00", image: IMG("1767766277273-a53443ab8639"), category: "Apparel", variants: 8, price: "$420.00", onHand: 86, capacity: 300, sales30d: 152, status: "Active", updated: "1d ago" },
  { id: "sp-medjool-dates", name: "Medjool Date Selection · 750g", sku: "NUT-MDJ-750", cost: "$24.60", image: IMG("1681143436095-e4b261e4f40a"), category: "Dates & Preserves", variants: 5, price: "$46.00", onHand: 1180, capacity: 1500, sales30d: 187, status: "Active", updated: "2d ago" },
  { id: "sp-rose-argan", name: "Rose & Argan Serum · 50ml", sku: "HAR-ROS-050", cost: "$48.90", image: IMG("1608248543803-ba4f8c70ae0b"), category: "Beauty & Care", variants: 2, price: "$92.00", onHand: 312, capacity: 500, sales30d: 96, status: "Active", updated: "3d ago" },
  { id: "sp-oud-soap", name: "Oud & Honey Body Soap · 150g", sku: "SOP-OUD-150", cost: "$14.20", image: IMG("1607006555645-92af39cf8a77"), category: "Beauty & Care", variants: 3, price: "$32.00", onHand: 0, capacity: 800, sales30d: 74, status: "Out of stock", updated: "4d ago" },
  { id: "sp-cashmere-scarf", name: "Cashmere Desert Scarf", sku: "ATL-SCF-SND", cost: "$148.00", image: IMG("1705205765155-3d1a2d0b4b59"), category: "Apparel", variants: 4, price: "$260.00", onHand: 0, capacity: 200, sales30d: 28, status: "Out of stock", updated: "5d ago" },
  { id: "sp-ajwa-tin", name: "Ajwa Madinah Dates · 1kg Gift Tin", sku: "AM-DT-1001", cost: "$29.10", image: IMG("1609501676725-7186f017a4b7"), category: "Dates & Preserves", variants: 6, price: "$48.00", onHand: 842, capacity: 1200, sales30d: 312, status: "Active", updated: "2h ago" },
  { id: "sp-saffron", name: "Sargol Saffron Threads · 5g", sku: "SPC-SAF-005", cost: "$32.80", image: IMG("1600973785836-d7e9d4f24bba"), category: "Dates & Preserves", variants: 2, price: "$68.00", onHand: 96, capacity: 400, sales30d: 58, status: "Low stock", updated: "6d ago" },
  { id: "sp-gift-box", name: "Signature Gift Box · Large", sku: "GFT-BOX-LRG", cost: "$8.40", image: IMG("1634283715079-d91bbed0ece0"), category: "Gift Sets", variants: 3, price: "$18.00", onHand: 2140, capacity: 3000, sales30d: 486, status: "Active", updated: "1w ago" },
  { id: "sp-pistachio", name: "Royal Pistachio Selection · 400g", sku: "NUT-PST-400", cost: "$21.30", image: IMG("1772986754551-64576d9c579c"), category: "Nuts & Seeds", variants: 3, price: "$42.00", onHand: 0, capacity: 900, sales30d: 0, status: "Draft", updated: "2w ago" },
];

export const PRODUCT_TABS = [
  { label: "All products", count: "1,284" },
  { label: "Active", count: "1,046" },
  { label: "Draft", count: 58 },
  { label: "Low stock", count: 37 },
  { label: "Out of stock", count: 12 },
  { label: "Unpublished", count: 94 },
  { label: "Archived", count: 131 },
];

/* ── Category tree for AD-06 ── */
export type CategoryNode = {
  id: string;
  name: string;
  slug: string;
  products: number;
  imageUrl?: string | null;
  visibility?: "Visible" | "Hidden";
  sort?: number;
  updated?: string;
  parentId?: string;
  children?: CategoryNode[];
};

const sub = (
  id: string,
  name: string,
  slug: string,
  products: number,
  sort: number,
  updated: string,
  visibility: "Visible" | "Hidden" = "Visible"
): CategoryNode => ({ id, name, slug, products, sort, updated, visibility });

export const CATEGORY_TREE: CategoryNode[] = [
  {
    id: "cat-dates", name: "Dates & Preserves", slug: "dates-preserves", products: 312,
    children: [
      sub("cat-ajwa", "Ajwa & Premium", "ajwa-premium", 84, 1, "2h ago"),
      sub("cat-medjool", "Medjool & Barhi", "medjool-barhi", 96, 2, "1d ago"),
      sub("cat-syrups", "Date Syrups & Spreads", "date-syrups", 58, 3, "3d ago"),
      sub("cat-stuffed", "Stuffed & Coated", "stuffed-coated", 74, 4, "5d ago"),
      sub("cat-ramadan", "Seasonal · Ramadan", "seasonal-ramadan", 41, 5, "1w ago"),
      sub("cat-bulk", "Bulk & Wholesale", "bulk-wholesale", 19, 6, "3w ago", "Hidden"),
    ],
  },
  {
    id: "cat-honey", name: "Honey & Syrups", slug: "honey-syrups", products: 148,
    children: [
      sub("cat-sidr", "Sidr & Wild Honey", "sidr-wild-honey", 62, 1, "4h ago"),
      sub("cat-comb", "Comb & Raw", "comb-raw", 38, 2, "2d ago"),
      sub("cat-infused", "Infused & Creamed", "infused-creamed", 28, 3, "6d ago"),
      sub("cat-molasses", "Molasses & Syrups", "molasses-syrups", 20, 4, "2w ago"),
    ],
  },
  {
    id: "cat-coffee", name: "Coffee & Tea", slug: "coffee-tea", products: 206,
    children: [
      sub("cat-beans", "Whole Bean", "whole-bean", 74, 1, "1h ago"),
      sub("cat-ground", "Ground & Turkish", "ground-turkish", 52, 2, "1d ago"),
      sub("cat-tea", "Loose Leaf Tea", "loose-leaf-tea", 46, 3, "4d ago"),
      sub("cat-brewkit", "Brewing Equipment", "brewing-equipment", 34, 4, "1w ago"),
    ],
  },
  {
    id: "cat-nuts", name: "Nuts & Seeds", slug: "nuts-seeds", products: 184,
    children: [
      sub("cat-pistachio", "Pistachios & Almonds", "pistachios-almonds", 68, 1, "5h ago"),
      sub("cat-roasted", "Roasted & Salted", "roasted-salted", 54, 2, "2d ago"),
      sub("cat-mixes", "Mixes & Trail", "mixes-trail", 38, 3, "1w ago"),
      sub("cat-seeds", "Seeds & Kernels", "seeds-kernels", 24, 4, "3w ago"),
    ],
  },
  {
    id: "cat-apparel", name: "Apparel", slug: "apparel", products: 242,
    children: [
      sub("cat-abaya", "Abayas & Kaftans", "abayas-kaftans", 86, 1, "3h ago"),
      sub("cat-scarves", "Scarves & Shawls", "scarves-shawls", 64, 2, "1d ago"),
      sub("cat-thobes", "Thobes", "thobes", 52, 3, "5d ago"),
      sub("cat-accessories", "Accessories", "apparel-accessories", 40, 4, "2w ago"),
    ],
  },
  {
    id: "cat-beauty", name: "Beauty & Care", slug: "beauty-care", products: 126,
    children: [
      sub("cat-hair", "Hair Oils & Elixirs", "hair-oils", 44, 1, "6h ago"),
      sub("cat-body", "Body & Bath", "body-bath", 38, 2, "3d ago"),
      sub("cat-fragrance", "Oud & Fragrance", "oud-fragrance", 30, 3, "1w ago"),
      sub("cat-mens", "Men's Grooming", "mens-grooming", 14, 4, "4w ago", "Hidden"),
    ],
  },
  {
    id: "cat-gifts", name: "Gift Sets", slug: "gift-sets", products: 66,
    children: [
      sub("cat-hampers", "Hampers", "hampers", 28, 1, "2d ago"),
      sub("cat-corporate", "Corporate Gifting", "corporate-gifting", 22, 2, "1w ago"),
      sub("cat-occasion", "Occasion Boxes", "occasion-boxes", 16, 3, "2w ago"),
    ],
  },
];

/** Flattened view — every node in the tree, parents first. */
export const ALL_CATEGORIES: CategoryNode[] = CATEGORY_TREE.flatMap((c) => [
  c,
  ...(c.children ?? []).map((s) => ({ ...s, parentId: c.id })),
]);

/** Retained for callers that want a flat sub-category list. */
export const SUB_CATEGORIES = ALL_CATEGORIES.filter((c) => c.parentId);

/* ── Product editor seed for AD-04 ── */
export const PRODUCT_EDITOR = {
  title: "Ajwa Madinah Dates · 1kg Gift Tin",
  sku: "AM-DT-1001",
  barcode: "6281000450127",
  brand: "Royal Zaad Reserve",
  description:
    "Hand-selected Ajwa dates from the black basalt groves of Madinah, cured slowly to keep their soft, almost fudge-like centre. Each tin is packed within 48 hours of harvest sorting.\n\nPresented in a lacquered keepsake tin with gold arabesque embossing — our most gifted item during Ramadan.",
  price: "180.00",
  compareAt: "210.00",
  cost: "109.20",
  taxClass: "VAT 15% · Standard",
  profit: "70.80 SAR",
  margin: "39.3%",
  marginNote:
    "Margin is 0.9 pts above the Dates & Preserves category average. Bulk cost drops to 96.40 SAR above 500 units.",
  status: "Active",
  publishDate: "12 Jan 2026 · 09:00",
  category: "Dates & Preserves",
  collection: "Ramadan Reserve 2026",
  tags: ["ajwa", "gift", "ramadan", "premium"],
  extraTags: 4,
  weight: "1.15",
  hsCode: "0804.10",
  handle: "ajwa-madinah-1kg",
  seoTitle: "Ajwa Madinah Dates 1kg Gift Tin | Royal Zaad",
  seoUrl: "royalzaad.com › dates-preserves › ajwa-madinah-1kg",
  seoDescription:
    "Hand-selected Ajwa dates from Madinah's black basalt groves, presented in a lacquered keepsake tin. Free delivery over 250 SAR.",
  channels: [
    { name: "Storefront", note: "Visible at royalzaad.com", on: true },
    { name: "Marketplace feeds", note: "Noon, Amazon.sa, Salla", on: true },
    { name: "Retail POS", note: "Riyadh flagship boutique", on: false },
  ],
  toggles: [
    { name: "Track quantity", note: "Deduct stock on each sale", on: true },
    { name: "Continue selling when out", note: "Allow backorders", on: false },
    { name: "Fragile handling", note: "Adds packaging surcharge", on: true },
  ],
  media: [
    IMG("1609501676725-7186f017a4b7"),
    IMG("1681143436095-e4b261e4f40a"),
    IMG("1634283715079-d91bbed0ece0"),
    IMG("1600973785836-d7e9d4f24bba"),
  ],
  variants: [
    { name: "500g · Kraft pouch", sku: "AM-DT-1001-A", price: "98.00", onHand: 412, warehouse: "Riyadh · DC-01", status: "Active" },
    { name: "1kg · Gift tin", sku: "AM-DT-1001-B", price: "180.00", onHand: 842, warehouse: "Riyadh · DC-01", status: "Active" },
    { name: "1kg · Gift tin (gold)", sku: "AM-DT-1001-C", price: "215.00", onHand: 126, warehouse: "Jeddah · DC-02", status: "Active" },
    { name: "2kg · Presentation box", sku: "AM-DT-1001-D", price: "395.00", onHand: 48, warehouse: "Riyadh · DC-01", status: "Active" },
    { name: "5kg · Bulk carton", sku: "AM-DT-1001-E", price: "890.00", onHand: 12, warehouse: "Riyadh · DC-01", status: "Draft" },
    { name: "Sample · 100g", sku: "AM-DT-1001-F", price: "24.00", onHand: 0, warehouse: "—", status: "Archived" },
  ],
};
