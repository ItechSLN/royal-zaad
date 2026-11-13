/**
 * Product detail archetypes.
 *
 * A jar of honey and a linen abaya do not sell the same way: one is bought on
 * provenance and harvest, the other on fit and fabric. Each archetype supplies
 * its own option groups, spec sheet, tabs and assurances so the SF-03 layout
 * stays constant while the substance changes with the category.
 */
import {
  Coffee,
  FlaskConical,
  Leaf,
  type LucideIcon,
  Ruler,
  ShieldCheck,
  Sparkles,
  Truck,
  Undo2,
  WashingMachine,
} from "lucide-react";

export type OptionDef = { label: string; extra?: string };
export type OptionGroup = { head: string; options: OptionDef[]; swatches?: boolean };

export type ProductTemplate = {
  key: "pantry" | "coffee" | "apparel" | "beauty";
  /** Small caps line above the title. */
  eyebrow: string;
  /** What a unit of this product is called in stock copy. */
  unit: string;
  optionGroups: OptionGroup[];
  /** Tab labels; "Reviews" is appended by the page. */
  tabs: string[];
  /** Body copy per tab label. */
  panels: Record<string, string>;
  specs: [string, string][];
  assurances: { icon: LucideIcon; title: string; note: string }[];
  /** Gold callout under the buy button. */
  promo?: string;
  /** Rendered as an extra panel under the spec sheet. */
  sizeGuide?: { headers: string[]; rows: string[][] };
  /** Small feature chips shown under the short description. */
  chips: { icon: LucideIcon; label: string }[];
};

const SHIPPING_PANEL =
  "Dispatched from Riyadh within one working day. Express delivery across the GCC in 1–3 days, wider Middle East in 3–5. Returns accepted within 30 days in original condition — we arrange free pickup and refund to the original payment method or as store credit.";

const PANTRY: ProductTemplate = {
  key: "pantry",
  eyebrow: "SINGLE ORIGIN",
  unit: "jars",
  optionGroups: [
    { head: "WEIGHT", options: [{ label: "250 g", extra: "$88" }, { label: "500 g", extra: "$148" }, { label: "1 kg", extra: "$276" }] },
    { head: "TYPE", options: [{ label: "Raw & Unfiltered" }, { label: "Creamed" }, { label: "Comb in Jar", extra: "+$24" }] },
    { head: "GIFT WRAP", options: [{ label: "None" }, { label: "Signature Box", extra: "+$18" }, { label: "Box + Card", extra: "+$26" }] },
  ],
  tabs: ["Description", "Origin & Harvest", "Nutrition", "Shipping & Returns"],
  panels: {
    Description:
      "Harvested once a year from wild Sidr trees, rested in cedar and filled by hand. Every jar carries the name of its valley, its farm and its harvest week.",
    "Origin & Harvest":
      "Wild Sidr groves in the Hadhramaut valley, worked by six families across a single four-week window each November. Nothing is heated, nothing is filtered beyond a coarse mesh, and the comb is pressed cold within 48 hours of collection.",
    Nutrition:
      "Per 20 g serving: 61 kcal · 16.4 g carbohydrate of which 16.1 g sugars · 0.1 g protein · trace fat. No added sugars, no glucose syrup, no pasteurisation. Not suitable for infants under 12 months.",
    "Shipping & Returns": SHIPPING_PANEL,
  },
  specs: [
    ["Origin", "Hadhramaut valley, Yemen"],
    ["Harvest", "November 2025"],
    ["Net weight", "500 g"],
    ["Batch", "SDR-25-114"],
    ["Texture", "Dense, slow to crystallise"],
    ["Storage", "Cool, dry, away from direct light"],
  ],
  assurances: [
    { icon: Truck, title: "Express delivery — Thu, 19 Feb", note: "Order within 4 h 12 min · free above $100" },
    { icon: Undo2, title: "30-day returns", note: "Free pickup, refund to original payment or store credit" },
    { icon: FlaskConical, title: "Batch SDR-25-114 verified", note: "Lab certificate available on request" },
  ],
  promo: "Buy 2 jars, get a 350 g jar free — applied automatically at checkout.",
  chips: [
    { icon: Leaf, label: "Raw & unpasteurised" },
    { icon: FlaskConical, label: "Lab-tested batch" },
    { icon: ShieldCheck, label: "Single-estate traceable" },
  ],
};

const COFFEE: ProductTemplate = {
  key: "coffee",
  eyebrow: "ROASTED TO ORDER",
  unit: "bags",
  optionGroups: [
    { head: "BAG SIZE", options: [{ label: "250 g", extra: "$62" }, { label: "500 g", extra: "$116" }, { label: "1 kg", extra: "$218" }] },
    { head: "GRIND", options: [{ label: "Whole bean" }, { label: "Espresso" }, { label: "Filter" }, { label: "Turkish" }] },
    { head: "SUBSCRIPTION", options: [{ label: "One-off" }, { label: "Every 2 weeks", extra: "−10%" }, { label: "Monthly", extra: "−8%" }] },
  ],
  tabs: ["Description", "Origin & Roast", "Brew Guide", "Shipping & Returns"],
  panels: {
    Description:
      "Grown on terraces above 1,800 m in the Khawlani highlands, dried on raised beds and roasted in 12 kg batches the week you order. Structured, bright and unmistakably Yemeni.",
    "Origin & Roast":
      "Varietal Udaini and Dawairi, natural process, 18 days on raised beds. Roasted medium — first crack developed, no second — to hold the fruit without losing body. Roast date is printed on every bag; we never ship coffee older than ten days.",
    "Brew Guide":
      "Filter: 60 g/L, 94 °C, 3:00 total. Espresso: 18 g in, 38 g out, 27 s. Turkish: fine grind, one heaped spoon per cup, brought to the rise three times. Rest the bag 5–7 days after roast before espresso.",
    "Shipping & Returns": SHIPPING_PANEL,
  },
  specs: [
    ["Origin", "Khawlani highlands, Yemen"],
    ["Altitude", "1,800–2,200 m"],
    ["Process", "Natural, 18 days raised bed"],
    ["Varietal", "Udaini · Dawairi"],
    ["Roast level", "Medium"],
    ["Cupping notes", "Dried apricot, cocoa, cardamom"],
  ],
  assurances: [
    { icon: Coffee, title: "Roasted within 48 h of dispatch", note: "Roast date printed on every bag" },
    { icon: Truck, title: "Express delivery — Thu, 19 Feb", note: "Free above $100 · degassing valve fitted" },
    { icon: Undo2, title: "30-day returns", note: "Unopened bags, free pickup" },
  ],
  promo: "Subscribe and save 10% on every delivery — pause or cancel any time.",
  chips: [
    { icon: Coffee, label: "Roasted to order" },
    { icon: Leaf, label: "Naturally processed" },
    { icon: ShieldCheck, label: "Direct trade" },
  ],
};

const APPAREL: ProductTemplate = {
  key: "apparel",
  eyebrow: "ATELIER MADE",
  unit: "pieces",
  optionGroups: [
    { head: "SIZE", options: [{ label: "XS" }, { label: "S" }, { label: "M" }, { label: "L" }, { label: "XL" }] },
    { head: "COLOUR", options: [{ label: "Sand" }, { label: "Bone" }, { label: "Ink" }, { label: "Olive" }] },
    { head: "LENGTH", options: [{ label: "Regular · 142 cm" }, { label: "Tall · 150 cm", extra: "+$20" }] },
  ],
  tabs: ["Description", "Fabric & Care", "Size & Fit", "Shipping & Returns"],
  panels: {
    Description:
      "Cut from hand-loomed Belgian linen in our Riyadh atelier, with a dropped shoulder, a concealed placket and side seams finished by hand. Made in runs of forty.",
    "Fabric & Care":
      "100% hand-loomed linen, 210 gsm, pre-washed for softness and stability. Machine wash cold on a gentle cycle with like colours, or dry clean. Do not tumble dry — line dry in shade and press on medium while slightly damp. Expect a soft slub and gentle relaxing of the weave over the first few wears.",
    "Size & Fit":
      "The model is 174 cm and wears a size S. The cut is relaxed through the body with a dropped shoulder; if you are between sizes or prefer a closer line, size down. Sleeves finish at the wrist bone; the regular length falls to the ankle on 165–172 cm.",
    "Shipping & Returns": SHIPPING_PANEL,
  },
  specs: [
    ["Composition", "100% hand-loomed linen"],
    ["Weight", "210 gsm"],
    ["Fit", "Relaxed, dropped shoulder"],
    ["Length", "142 cm (regular)"],
    ["Made in", "Riyadh atelier"],
    ["Care", "Cold gentle wash or dry clean"],
  ],
  assurances: [
    { icon: Ruler, title: "Free size exchange", note: "One exchange per order, collected from your door" },
    { icon: WashingMachine, title: "Pre-washed and stabilised", note: "Under 2% shrinkage after first wash" },
    { icon: Truck, title: "Express delivery — Thu, 19 Feb", note: "Order within 4 h 12 min · free above $100" },
  ],
  promo: "Complimentary hemming and alterations at the Riyadh atelier.",
  sizeGuide: {
    headers: ["Size", "Bust", "Waist", "Hip", "Length"],
    rows: [
      ["XS", "82 cm", "64 cm", "90 cm", "138 cm"],
      ["S", "88 cm", "70 cm", "96 cm", "140 cm"],
      ["M", "94 cm", "76 cm", "102 cm", "142 cm"],
      ["L", "100 cm", "82 cm", "108 cm", "144 cm"],
      ["XL", "108 cm", "90 cm", "116 cm", "146 cm"],
    ],
  },
  chips: [
    { icon: Sparkles, label: "Made in runs of 40" },
    { icon: Ruler, label: "Free size exchange" },
    { icon: Leaf, label: "Natural fibre" },
  ],
};

const BEAUTY: ProductTemplate = {
  key: "beauty",
  eyebrow: "SMALL BATCH",
  unit: "bottles",
  optionGroups: [
    { head: "SIZE", options: [{ label: "50 ml", extra: "$48" }, { label: "100 ml", extra: "$78" }, { label: "200 ml", extra: "$138" }] },
    { head: "SCENT", options: [{ label: "Amber & Oud" }, { label: "Unscented" }, { label: "Rose & Musk" }] },
    { head: "GIFT WRAP", options: [{ label: "None" }, { label: "Signature Box", extra: "+$18" }] },
  ],
  tabs: ["Description", "Ingredients", "How to Use", "Shipping & Returns"],
  panels: {
    Description:
      "A weightless oil of cold-pressed argan, black seed and Ta'if rose, blended in 200-bottle batches and rested for six weeks before filling.",
    Ingredients:
      "Argania Spinosa Kernel Oil, Nigella Sativa Seed Oil, Simmondsia Chinensis (Jojoba) Seed Oil, Rosa Damascena Flower Oil, Tocopherol (Vitamin E), Parfum. Free from silicones, mineral oil, parabens and synthetic colour. Patch test on the inner forearm before first use.",
    "How to Use":
      "Warm three to four drops between the palms and work through mid-lengths and ends on damp hair, or a single drop on dry hair to tame. For a treatment, apply generously to the scalp, leave for 45 minutes to overnight, then shampoo twice. Use two to three times a week.",
    "Shipping & Returns": SHIPPING_PANEL,
  },
  specs: [
    ["Volume", "100 ml"],
    ["Format", "Lightweight oil"],
    ["Key actives", "Argan · Black seed · Ta'if rose"],
    ["Suitable for", "All hair types, colour-treated safe"],
    ["Batch", "AMB-26-042"],
    ["Shelf life", "24 months · 12 months after opening"],
  ],
  assurances: [
    { icon: FlaskConical, title: "Dermatologically tested", note: "Batch AMB-26-042 · report on request" },
    { icon: Leaf, title: "Silicone and paraben free", note: "Cold-pressed oils, no synthetic colour" },
    { icon: Truck, title: "Express delivery — Thu, 19 Feb", note: "Order within 4 h 12 min · free above $100" },
  ],
  promo: "Add any second beauty item and receive a 15 ml travel size free.",
  chips: [
    { icon: Leaf, label: "Cold-pressed oils" },
    { icon: FlaskConical, label: "Dermatologically tested" },
    { icon: Sparkles, label: "Batches of 200" },
  ],
};

export const PRODUCT_TEMPLATES = { pantry: PANTRY, coffee: COFFEE, apparel: APPAREL, beauty: BEAUTY };

const BY_SLUG: Record<string, ProductTemplate> = {
  honey: PANTRY,
  "honey-syrups": PANTRY,
  nuts: PANTRY,
  "nuts-seeds": PANTRY,
  dates: PANTRY,
  "dates-preserves": PANTRY,
  coffee: COFFEE,
  "coffee-tea": COFFEE,
  tea: COFFEE,
  clothing: APPAREL,
  apparel: APPAREL,
  "hair-oil": BEAUTY,
  "body-soap": BEAUTY,
  "beauty-care": BEAUTY,
};

const KEYWORDS: [RegExp, ProductTemplate][] = [
  [/coffee|tea|roast|bean/i, COFFEE],
  [/cloth|apparel|abaya|scarf|linen|wear|atelier|garment/i, APPAREL],
  [/hair|soap|beauty|care|oil|skin|body/i, BEAUTY],
  [/honey|date|nut|seed|preserve|pantry|food/i, PANTRY],
];

/** Resolves the archetype from the product's category, falling back to its name. */
export function templateFor(input: {
  category?: { name?: string; slug?: string } | null;
  name?: string;
}): ProductTemplate {
  const slug = input.category?.slug?.toLowerCase();
  if (slug && BY_SLUG[slug]) return BY_SLUG[slug];

  const haystack = `${input.category?.name ?? ""} ${input.name ?? ""}`;
  for (const [re, template] of KEYWORDS) {
    if (re.test(haystack)) return template;
  }
  return PANTRY;
}
