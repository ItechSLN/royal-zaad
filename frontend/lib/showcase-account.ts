/** Account-area content lifted from SF-13 … SF-19. */

export const ACCOUNT_PROFILE = {
  name: "Noor Al Amin",
  email: "noor@royalzaad.com",
  phone: "+966 55 214 8890",
  memberSince: "2021",
  stats: [
    { label: "TIER", value: "Gold" },
    { label: "POINTS", value: "2,180" },
    { label: "STORE CREDIT", value: "$48.00" },
    { label: "ORDERS", value: "14" },
  ],
};

export const ACCOUNT_KPIS = [
  { label: "Active orders", value: "2", note: "1 out for delivery" },
  { label: "Lifetime spend", value: "$4,812.00", note: "Avg. order $343.71" },
  { label: "Zaad points", value: "2,180", note: "320 expire 31 Mar" },
  { label: "Open returns", value: "1", note: "Awaiting pickup" },
];

export type AccountOrder = {
  number: string;
  placed: string;
  items: number;
  total: string;
  status: "Delivered" | "Out for delivery" | "Processing" | "Cancelled";
};

export const ACCOUNT_ORDERS: AccountOrder[] = [
  { number: "AM-2026-04871", placed: "17 Feb 2026", items: 3, total: "$230.00", status: "Out for delivery" },
  { number: "AM-2026-04520", placed: "02 Feb 2026", items: 1, total: "$420.00", status: "Delivered" },
  { number: "AM-2026-04188", placed: "14 Jan 2026", items: 5, total: "$318.40", status: "Delivered" },
  { number: "AM-2025-03994", placed: "28 Dec 2025", items: 2, total: "$140.00", status: "Delivered" },
];

export const REWARDS = {
  points: "2,180",
  toNext: "820 points to Platinum tier — free same-day delivery and private harvest previews.",
  rows: [
    { label: "Available", value: "2,180 pts" },
    { label: "Pending (posts 03 Mar)", value: "460 pts" },
    { label: "Expiring 31 Mar", value: "320 pts" },
    { label: "Redeemed lifetime", value: "5,940 pts" },
  ],
};

export const ACCOUNT_COUPONS = [
  { code: "WELCOME20", detail: "20% off · max $30 · min order $50", expiry: "Expires 28 Feb" },
  { code: "GOLD10", detail: "10% Gold-tier discount · unlimited use", expiry: "No expiry" },
  { code: "BIRTHDAY25", detail: "$25 off your birthday order", expiry: "Valid 04 – 11 Mar" },
];

export const ACCOUNT_ADDRESSES = [
  {
    label: "HOME · DEFAULT",
    name: "Noor Al Amin",
    lines: ["Villa 22, Al Nakheel District", "King Fahd Road", "Riyadh 12381, Saudi Arabia"],
    phone: "+966 55 214 8890",
    isDefault: true,
  },
  {
    label: "OFFICE",
    name: "Noor Al Amin",
    lines: ["Royal Zaad Trading Co.", "Olaya Tower, 14th floor", "Riyadh 11564, Saudi Arabia"],
    phone: "+966 11 244 0110",
    isDefault: false,
  },
];

export const ACCOUNT_RETURNS = [
  {
    id: "RET-2026-0188",
    order: "AM-2026-04188",
    product: "Cashmere Desert Scarf",
    reason: "Colour not as expected",
    status: "Awaiting pickup",
    tone: "warning" as const,
    refund: "$260.00",
    opened: "19 Feb 2026",
  },
  {
    id: "RET-2025-0142",
    order: "AM-2025-03994",
    product: "Oud & Honey Body Soap",
    reason: "Damaged in transit",
    status: "Refunded",
    tone: "success" as const,
    refund: "$32.00",
    opened: "04 Jan 2026",
  },
];

export const ACCOUNT_REVIEWS = [
  {
    id: "ar-1",
    product: "Sidr Mountain Honey",
    rating: 5,
    title: "Finest I have tasted",
    content:
      "The Sidr is genuinely the finest I have tasted outside of a private estate. The packaging alone is worth the price.",
    date: "20 Feb 2026",
    status: "Published",
  },
  {
    id: "ar-2",
    product: "Khawlani Reserve Roast",
    rating: 5,
    title: "Four days after roasting",
    content: "Bright, structured and nothing like supermarket coffee. The roast date on the tin is a lovely touch.",
    date: "08 Feb 2026",
    status: "Published",
  },
  {
    id: "ar-3",
    product: "Hand-Loomed Linen Abaya",
    rating: 4,
    title: "Beautiful cut",
    content: "Cut beautifully and the weight is right for the season. Sizing runs slightly long.",
    date: "22 Jan 2026",
    status: "Pending",
  },
];
