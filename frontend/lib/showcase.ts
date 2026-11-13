/**
 * Design showcase content, lifted from the SF-01 Homepage frame in the .pen file.
 *
 * The storefront falls back to this whenever the API returns nothing, so the
 * pages read as designed before the backend is wired up. Once real records
 * exist they take precedence — see `orShowcase` below.
 */

export type ShowcaseProduct = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  shortDescription: string;
  price: string;
  compareAtPrice: string | null;
  isActive: boolean;
  isFeatured: boolean;
  tag: string;
  rating: string;
  category: { id: string; name: string; slug: string };
  images: { id: string; url: string; publicId: string; sortOrder: number; isPrimary: boolean }[];
  inventory: { quantity: number; reserved: number };
};

const img = (url: string) => [
  { id: url.slice(-12), url, publicId: url.slice(-12), sortOrder: 0, isPrimary: true },
];

export const HERO_IMAGE =
  "https://images.unsplash.com/photo-1654515722385-c684c5331c04?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1600";

export const SHOWCASE_CATEGORIES = [
  {
    id: "sc-honey",
    name: "Honey",
    slug: "honey",
    count: 18,
    image:
      "https://images.unsplash.com/photo-1679941573547-c59aae6f1f58?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  },
  {
    id: "sc-coffee",
    name: "Coffee",
    slug: "coffee",
    count: 24,
    image:
      "https://images.unsplash.com/photo-1597816792530-f6d57bd2bf9e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  },
  {
    id: "sc-nuts",
    name: "Nuts",
    slug: "nuts",
    count: 16,
    image:
      "https://images.unsplash.com/photo-1772986754551-64576d9c579c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  },
  {
    id: "sc-clothing",
    name: "Clothing",
    slug: "clothing",
    count: 42,
    image:
      "https://images.unsplash.com/photo-1767766277273-a53443ab8639?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  },
  {
    id: "sc-hair-oil",
    name: "Hair Oil",
    slug: "hair-oil",
    count: 9,
    image:
      "https://images.unsplash.com/photo-1643123158326-a17b8a06c45f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  },
  {
    id: "sc-body-soap",
    name: "Body Soap",
    slug: "body-soap",
    count: 12,
    image:
      "https://images.unsplash.com/photo-1607006555645-92af39cf8a77?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  },
];

const cat = (slug: string) => {
  const c = SHOWCASE_CATEGORIES.find((x) => x.slug === slug)!;
  return { id: c.id, name: c.name, slug: c.slug };
};

export const SHOWCASE_BEST_SELLERS: ShowcaseProduct[] = [
  {
    id: "sp-sidr-honey",
    name: "Sidr Mountain Honey",
    slug: "sidr-mountain-honey",
    sku: "HON-SDR-500",
    shortDescription: "500 g · Raw & unfiltered",
    price: "148.00",
    compareAtPrice: "185.00",
    isActive: true,
    isFeatured: true,
    tag: "BEST SELLER",
    rating: "4.9 (218)",
    category: cat("honey"),
    images: img(
      "https://images.unsplash.com/photo-1587049352846-4a222e784d38?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"
    ),
    inventory: { quantity: 42, reserved: 0 },
  },
  {
    id: "sp-khawlani-roast",
    name: "Khawlani Reserve Roast",
    slug: "khawlani-reserve-roast",
    sku: "COF-KHW-250",
    shortDescription: "250 g · Medium · Whole bean",
    price: "62.00",
    compareAtPrice: "74.00",
    isActive: true,
    isFeatured: true,
    tag: "NEW",
    rating: "4.8 (96)",
    category: cat("coffee"),
    images: img(
      "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"
    ),
    inventory: { quantity: 60, reserved: 0 },
  },
  {
    id: "sp-amber-elixir",
    name: "Amber Hair Elixir",
    slug: "amber-hair-elixir",
    sku: "HAR-AMB-100",
    shortDescription: "100 ml · Argan & black seed",
    price: "78.00",
    compareAtPrice: "92.00",
    isActive: true,
    isFeatured: true,
    tag: "BEST SELLER",
    rating: "4.9 (211)",
    category: cat("hair-oil"),
    images: img(
      "https://images.unsplash.com/photo-1643123158326-a17b8a06c45f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"
    ),
    inventory: { quantity: 24, reserved: 0 },
  },
  {
    id: "sp-linen-abaya",
    name: "Hand-Loomed Linen Abaya",
    slug: "hand-loomed-linen-abaya",
    sku: "ATL-ABY-M",
    shortDescription: "Size M · Obsidian",
    price: "420.00",
    compareAtPrice: null,
    isActive: true,
    isFeatured: true,
    tag: "EXCLUSIVE",
    rating: "5.0 (37)",
    category: cat("clothing"),
    images: img(
      "https://images.unsplash.com/photo-1767766277273-a53443ab8639?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"
    ),
    inventory: { quantity: 8, reserved: 0 },
  },
];

export const SHOWCASE_NEW_ARRIVALS: ShowcaseProduct[] = [
  {
    id: "sp-medjool-dates",
    name: "Medjool Date Selection",
    slug: "medjool-date-selection",
    sku: "NUT-MDJ-750",
    shortDescription: "750 g · Jumbo grade",
    price: "46.00",
    compareAtPrice: null,
    isActive: true,
    isFeatured: false,
    tag: "NEW",
    rating: "4.9 (204)",
    category: cat("nuts"),
    images: img(
      "https://images.unsplash.com/photo-1681143436095-e4b261e4f40a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"
    ),
    inventory: { quantity: 80, reserved: 0 },
  },
  {
    id: "sp-rose-argan",
    name: "Rose & Argan Serum",
    slug: "rose-argan-serum",
    sku: "HAR-ROS-050",
    shortDescription: "50 ml · Overnight repair",
    price: "92.00",
    compareAtPrice: null,
    isActive: true,
    isFeatured: false,
    tag: "NEW",
    rating: "4.8 (63)",
    category: cat("hair-oil"),
    images: img(
      "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"
    ),
    inventory: { quantity: 31, reserved: 0 },
  },
  {
    id: "sp-oud-soap",
    name: "Oud & Honey Body Soap",
    slug: "oud-honey-body-soap",
    sku: "SOP-OUD-150",
    shortDescription: "150 g · Cold-process",
    price: "32.00",
    compareAtPrice: null,
    isActive: true,
    isFeatured: false,
    tag: "NEW",
    rating: "4.8 (89)",
    category: cat("body-soap"),
    images: img(
      "https://images.unsplash.com/photo-1607006555645-92af39cf8a77?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"
    ),
    inventory: { quantity: 54, reserved: 0 },
  },
  {
    id: "sp-cashmere-scarf",
    name: "Cashmere Desert Scarf",
    slug: "cashmere-desert-scarf",
    sku: "ATL-SCF-SND",
    shortDescription: "Sand · 200×70 cm",
    price: "260.00",
    compareAtPrice: null,
    isActive: true,
    isFeatured: false,
    tag: "EXCLUSIVE",
    rating: "5.0 (28)",
    category: cat("clothing"),
    images: img(
      "https://images.unsplash.com/photo-1705205765155-3d1a2d0b4b59?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"
    ),
    inventory: { quantity: 12, reserved: 0 },
  },
];

export const SHOWCASE_PRODUCTS: ShowcaseProduct[] = [
  ...SHOWCASE_BEST_SELLERS,
  ...SHOWCASE_NEW_ARRIVALS,
];

export const SHOWCASE_ON_SALE = SHOWCASE_PRODUCTS.filter((p) => p.compareAtPrice);

export const SHOWCASE_OFFERS = [
  {
    badge: "BUY 2 GET 1",
    title: "Honey Trio Offer",
    copy: "Buy any two jars of honey and receive a third 350 g jar complimentary.",
    cta: "CLAIM OFFER",
    href: "/products?search=honey",
    image:
      "https://images.unsplash.com/photo-1717438658234-e06a8adc1fe9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  },
  {
    badge: "25% OFF",
    title: "Coffee Week",
    copy: "Every single-origin roast at 25% off with code ARABICA25.",
    cta: "SHOP COFFEE",
    href: "/products?search=coffee",
    image:
      "https://images.unsplash.com/photo-1666710047225-663ce5905dbe?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  },
  {
    badge: "FREE SHIPPING",
    title: "Above $100",
    copy: "Complimentary express delivery on every order above $100. No code needed.",
    cta: "START SHOPPING",
    href: "/products",
    image:
      "https://images.unsplash.com/photo-1634283715079-d91bbed0ece0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  },
];

export const SHOWCASE_BUNDLES = [
  {
    save: "SAVE $45",
    title: "The Breakfast Ritual",
    contents:
      "Sidr Mountain Honey 500 g  ·  Khawlani Reserve Roast 250 g  ·  Royal Pistachio Selection 400 g",
    price: "$219.00",
    compare: "$264.00",
    image:
      "https://images.unsplash.com/photo-1784043437491-1bce35b56136?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  },
  {
    save: "SAVE $45",
    title: "The Hair & Body Ritual",
    contents: "Amber Hair Elixir 100 ml  ·  Rose & Argan Serum 50 ml  ·  Oud & Honey Body Soap ×2",
    price: "$189.00",
    compare: "$234.00",
    image:
      "https://images.unsplash.com/photo-1615454782501-10141e907c75?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  },
];

export const BRAND_STORY = {
  eyebrow: "Our story",
  title: "Three generations\nof patient harvest.",
  body:
    "Royal Zaad began in 1974 with a single apiary in the Asir highlands. Today we work with forty-one family producers across the peninsula — every jar traceable to its hive, every roast to its terrace, every thread to its loom.\n\nWe do not chase volume. We wait for the season to be right.",
  image:
    "https://images.unsplash.com/photo-1773991188331-5a62224146f6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
};

export const INGREDIENT_PILLARS = [
  {
    title: "Single Origin",
    note: "Every batch carries the name of its valley, its farm and its harvest week.",
  },
  {
    title: "Lab Verified",
    note: "Independent testing for purity, moisture, pesticide residue and authenticity.",
  },
  {
    title: "Hand Finished",
    note: "Filled, sealed and wrapped by hand in our Riyadh atelier — never automated.",
  },
  {
    title: "Considered Packaging",
    note: "Amber glass, cotton cord and FSC board. Fully recyclable, zero plastic.",
  },
];

export const SPOTLIGHT = {
  eyebrow: "Product of the season",
  title: "Sidr Mountain Honey",
  rating: "4.9  ·  218 verified reviews",
  body:
    "Harvested once a year from wild Sidr trees in the Hadhramaut valley. Dense, caramel-dark and slow to crystallise — the most prized honey in the peninsula.",
  specs: [
    { label: "ORIGIN", value: "Hadhramaut" },
    { label: "HARVEST", value: "Nov 2025" },
    { label: "NET WEIGHT", value: "500 g" },
    { label: "BATCH", value: "SDR-25-114" },
  ],
  price: "$148.00",
  compare: "$185.00",
  href: "/products/sp-sidr-honey",
  image:
    "https://images.unsplash.com/photo-1685052388326-b6383ec2d524?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
};

export const SHOWCASE_REVIEWS = [
  {
    id: "sr-1",
    rating: 5,
    content:
      "The Sidr is genuinely the finest I have tasted outside of a private estate. The packaging alone is worth the price.",
    customer: { id: "sc-1", firstName: "Layla", lastName: "Alaoui" },
    product: { id: "sp-sidr-honey", name: "Sidr Mountain Honey" },
  },
  {
    id: "sr-2",
    rating: 5,
    content:
      "Khawlani beans arrived four days after roasting. Bright, structured and nothing like supermarket coffee.",
    customer: { id: "sc-2", firstName: "Omar", lastName: "Benali" },
    product: { id: "sp-khawlani-roast", name: "Khawlani Reserve Roast" },
  },
  {
    id: "sr-3",
    rating: 5,
    content:
      "The linen abaya is cut beautifully and the weight is perfect for the season. I have ordered a second.",
    customer: { id: "sc-3", firstName: "Nadia", lastName: "Farouk" },
    product: { id: "sp-linen-abaya", name: "Hand-Loomed Linen Abaya" },
  },
];

export const SOCIAL_TILES = [
  "https://images.unsplash.com/photo-1679941456925-28aee4de7d7d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
  "https://images.unsplash.com/photo-1628304433275-417f6c87d62b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
  "https://images.unsplash.com/photo-1637087040720-281e2fbea375?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
  "https://images.unsplash.com/photo-1705205765155-3d1a2d0b4b59?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
  "https://images.unsplash.com/photo-1681143436095-e4b261e4f40a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
  "https://images.unsplash.com/photo-1600973785836-d7e9d4f24bba?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
];

/** Prefer real API records; fall back to the design content while the backend is empty. */
export function orShowcase<T>(live: T[] | undefined | null, fallback: T[]): T[] {
  return live && live.length > 0 ? live : fallback;
}
