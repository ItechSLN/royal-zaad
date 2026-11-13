/**
 * The Royal Zaad product catalogue — the same twelve products the admin
 * Products screen and the storefront were designed around.
 *
 * `categorySlug` targets a sub-category from the seeded tree so the storefront
 * navigation resolves; `parentSlug` is what the storefront rails filter on.
 */
export type SeedProduct = {
  slug: string;
  name: string;
  sku: string;
  barcode: string;
  shortDescription: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  costPrice: number;
  categorySlug: string;
  brandSlug?: string;
  isFeatured: boolean;
  isActive: boolean;
  image: string;
  onHand: number;
  reserved: number;
  reorderAt: number;
  warehouseCode: string;
};

const photo = (id: string) =>
  `https://images.unsplash.com/photo-${id}?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080`;

export const CATALOGUE: SeedProduct[] = [
  {
    slug: 'sidr-mountain-honey',
    name: 'Sidr Mountain Honey',
    sku: 'HON-SDR-500',
    barcode: '6281000450127',
    shortDescription: '500 g · Raw & unfiltered',
    description:
      'Harvested once a year from wild Sidr trees in the Hadhramaut valley. Dense, caramel-dark, faintly medicinal and slow to crystallise — the most prized honey in the peninsula.',
    price: 148,
    compareAtPrice: 185,
    costPrice: 89.1,
    categorySlug: 'honey-syrups-sidr-wild-honey',
    brandSlug: 'hadhramaut-apiaries',
    isFeatured: true,
    isActive: true,
    image: photo('1587049352851-8d4e89133924'),
    onHand: 842,
    reserved: 6,
    reorderAt: 120,
    warehouseCode: 'WH-A',
  },
  {
    slug: 'khawlani-reserve-roast',
    name: 'Khawlani Reserve Roast',
    sku: 'COF-KHW-250',
    barcode: '6281000450134',
    shortDescription: '250 g · Medium · Whole bean',
    description:
      'Grown on terraces above 1,800 m in the Khawlani highlands, dried on raised beds and roasted in 12 kg batches the week you order.',
    price: 62,
    compareAtPrice: 74,
    costPrice: 38.4,
    categorySlug: 'coffee-tea-whole-bean',
    brandSlug: 'khawlani-estates',
    isFeatured: true,
    isActive: true,
    image: photo('1559056199-641a0ac8b55e'),
    onHand: 604,
    reserved: 4,
    reorderAt: 90,
    warehouseCode: 'WH-A',
  },
  {
    slug: 'amber-hair-elixir',
    name: 'Amber Hair Elixir',
    sku: 'HAR-AMB-100',
    barcode: '6281000450141',
    shortDescription: '100 ml · Argan & black seed',
    description:
      "A weightless oil of cold-pressed argan, black seed and Ta'if rose, blended in 200-bottle batches and rested for six weeks before filling.",
    price: 78,
    compareAtPrice: 92,
    costPrice: 41,
    categorySlug: 'beauty-care-hair-oils-elixirs',
    brandSlug: 'royal-zaad-reserve',
    isFeatured: true,
    isActive: true,
    image: photo('1643123158326-a17b8a06c45f'),
    onHand: 184,
    reserved: 2,
    reorderAt: 200,
    warehouseCode: 'WH-B',
  },
  {
    slug: 'hand-loomed-linen-abaya',
    name: 'Hand-Loomed Linen Abaya',
    sku: 'ATL-ABY-M',
    barcode: '6281000450158',
    shortDescription: 'Size M · Obsidian',
    description:
      'Cut from hand-loomed Belgian linen in our Riyadh atelier, with a dropped shoulder, a concealed placket and side seams finished by hand. Made in runs of forty.',
    price: 420,
    costPrice: 232,
    categorySlug: 'apparel-abayas-kaftans',
    brandSlug: 'coastal-looms',
    isFeatured: true,
    isActive: true,
    image: photo('1767766277273-a53443ab8639'),
    onHand: 86,
    reserved: 1,
    reorderAt: 30,
    warehouseCode: 'WH-D',
  },
  {
    slug: 'medjool-date-selection',
    name: 'Medjool Date Selection',
    sku: 'NUT-MDJ-750',
    barcode: '6281000450165',
    shortDescription: '750 g · Jumbo grade',
    description:
      'Jumbo-grade Medjool from the oases of Al-Ahsa, sorted by hand and packed within a week of picking.',
    price: 46,
    costPrice: 24.6,
    categorySlug: 'dates-preserves-medjool-barhi',
    brandSlug: 'royal-zaad-reserve',
    isFeatured: false,
    isActive: true,
    image: photo('1681143436095-e4b261e4f40a'),
    onHand: 1180,
    reserved: 12,
    reorderAt: 150,
    warehouseCode: 'WH-A',
  },
  {
    slug: 'rose-argan-serum',
    name: 'Rose & Argan Serum',
    sku: 'HAR-ROS-050',
    barcode: '6281000450172',
    shortDescription: '50 ml · Overnight repair',
    description:
      "An overnight serum of Ta'if rose and cold-pressed argan, pressed in small batches and bottled in amber glass.",
    price: 92,
    costPrice: 48.9,
    categorySlug: 'beauty-care-hair-oils-elixirs',
    brandSlug: 'royal-zaad-reserve',
    isFeatured: false,
    isActive: true,
    image: photo('1608248543803-ba4f8c70ae0b'),
    onHand: 312,
    reserved: 3,
    reorderAt: 80,
    warehouseCode: 'WH-B',
  },
  {
    slug: 'oud-honey-body-soap',
    name: 'Oud & Honey Body Soap',
    sku: 'SOP-OUD-150',
    barcode: '6281000450189',
    shortDescription: '150 g · Cold-process',
    description:
      'Cold-processed with Sidr honey and a whisper of oud, cured for six weeks on cedar racks.',
    price: 32,
    costPrice: 14.2,
    categorySlug: 'beauty-care-body-bath',
    brandSlug: 'royal-zaad-reserve',
    isFeatured: false,
    isActive: true,
    image: photo('1607006555645-92af39cf8a77'),
    onHand: 0,
    reserved: 0,
    reorderAt: 120,
    warehouseCode: 'WH-C',
  },
  {
    slug: 'cashmere-desert-scarf',
    name: 'Cashmere Desert Scarf',
    sku: 'ATL-SCF-SND',
    barcode: '6281000450196',
    shortDescription: 'Sand · 200×70 cm',
    description:
      'Two-ply cashmere woven on a hand loom, finished with a hand-rolled hem. Light enough for summer evenings.',
    price: 260,
    costPrice: 148,
    categorySlug: 'apparel-scarves-shawls',
    brandSlug: 'coastal-looms',
    isFeatured: false,
    isActive: true,
    image: photo('1705205765155-3d1a2d0b4b59'),
    onHand: 0,
    reserved: 0,
    reorderAt: 25,
    warehouseCode: 'WH-D',
  },
  {
    slug: 'ajwa-madinah-dates-gift-tin',
    name: 'Ajwa Madinah Dates · 1kg Gift Tin',
    sku: 'AM-DT-1001',
    barcode: '6281000450127'.replace('127', '202'),
    shortDescription: '1 kg · Gift tin',
    description:
      'Ajwa from the groves of Madinah, presented in a lithographed tin with a hand-numbered seal.',
    price: 48,
    costPrice: 29.1,
    categorySlug: 'dates-preserves-ajwa-premium',
    brandSlug: 'royal-zaad-reserve',
    isFeatured: true,
    isActive: true,
    image: photo('1609501676725-7186f017a4b7'),
    onHand: 842,
    reserved: 8,
    reorderAt: 150,
    warehouseCode: 'WH-A',
  },
  {
    slug: 'sargol-saffron-threads',
    name: 'Sargol Saffron Threads',
    sku: 'SPC-SAF-005',
    barcode: '6281000450219',
    shortDescription: '5 g · All-red sargol',
    description:
      'All-red sargol threads, hand-picked at dawn and cured the same morning. Two threads are enough for a pot of rice.',
    price: 68,
    costPrice: 32.8,
    categorySlug: 'dates-preserves-date-syrups-spreads',
    brandSlug: 'royal-zaad-reserve',
    isFeatured: false,
    isActive: true,
    image: photo('1596040033229-a9821ebd058d'),
    onHand: 96,
    reserved: 2,
    reorderAt: 100,
    warehouseCode: 'WH-A',
  },
  {
    slug: 'signature-gift-box-large',
    name: 'Signature Gift Box · Large',
    sku: 'GFT-BOX-LRG',
    barcode: '6281000450226',
    shortDescription: 'Large · Fits six jars',
    description:
      'Our large presentation box in ribbed board with a gold-blocked seal, fitted for up to six jars.',
    price: 18,
    costPrice: 8.4,
    categorySlug: 'gift-sets-hampers',
    brandSlug: 'royal-zaad-reserve',
    isFeatured: false,
    isActive: true,
    image: photo('1634283715079-d91bbed0ece0'),
    onHand: 2140,
    reserved: 20,
    reorderAt: 300,
    warehouseCode: 'WH-A',
  },
  {
    slug: 'royal-pistachio-selection',
    name: 'Royal Pistachio Selection',
    sku: 'NUT-PST-400',
    barcode: '6281000450233',
    shortDescription: '400 g · Roasted & salted',
    description:
      'Long-grain pistachios roasted in their shells and salted with Red Sea flake.',
    price: 42,
    costPrice: 21.3,
    categorySlug: 'nuts-seeds-pistachios-almonds',
    brandSlug: 'royal-zaad-reserve',
    isFeatured: false,
    isActive: false,
    image: photo('1772986754551-64576d9c579c'),
    onHand: 0,
    reserved: 0,
    reorderAt: 90,
    warehouseCode: 'WH-A',
  },
];
