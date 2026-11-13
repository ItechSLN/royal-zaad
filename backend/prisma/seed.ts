/**
 * Seeds the operations, finance and marketing tables with the Royal Zaad
 * reference data the admin screens were designed against.
 *
 * Idempotent: every row is upserted on its natural key, so running it twice
 * leaves the database in the same state.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { CATALOGUE } from './catalogue';

// Created by the marketplace_foundation migration.
const PLATFORM_SHOP_ID = 'shop_platform';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const days = (n: number) => new Date(Date.now() + n * 86_400_000);

async function seedWarehouses() {
  const rows = [
    { code: 'WH-A', name: 'Riyadh · Warehouse A', city: 'Riyadh', capacity: 54000, isDefault: true },
    { code: 'WH-B', name: 'Jeddah · Warehouse B', city: 'Jeddah', capacity: 30000, isDefault: false },
    { code: 'WH-C', name: 'Dammam · Warehouse C', city: 'Dammam', capacity: 18000, isDefault: false },
    { code: 'WH-D', name: 'Dubai · Warehouse D', city: 'Dubai', capacity: 12000, isDefault: false },
  ];

  for (const row of rows) {
    await prisma.warehouse.upsert({
      where: { code: row.code },
      update: row,
      create: row,
    });
  }

  const [a, b, c] = await Promise.all([
    prisma.warehouse.findUnique({ where: { code: 'WH-A' } }),
    prisma.warehouse.findUnique({ where: { code: 'WH-B' } }),
    prisma.warehouse.findUnique({ where: { code: 'WH-C' } }),
  ]);

  const transfers = [
    { reference: 'TR-4021', fromId: a!.id, toId: b!.id, units: 420, status: 'IN_TRANSIT' as const },
    { reference: 'TR-4019', fromId: a!.id, toId: c!.id, units: 260, status: 'RECEIVED' as const },
    { reference: 'TR-4014', fromId: b!.id, toId: c!.id, units: 460, status: 'LATE' as const },
  ];

  for (const t of transfers) {
    await prisma.stockTransfer.upsert({
      where: { reference: t.reference },
      update: t,
      create: t,
    });
  }

  return { a: a!, b: b!, c: c! };
}

/** The two-level catalogue tree the AD-06 and storefront navigation expect. */
async function seedCatalogue() {
  const brands = [
    { name: 'Royal Zaad Reserve', slug: 'royal-zaad-reserve', description: 'The house label — single-estate provisions.' },
    { name: 'Hadhramaut Apiaries', slug: 'hadhramaut-apiaries', description: 'Wild Sidr honey from the Yemeni highlands.' },
    { name: 'Khawlani Estates', slug: 'khawlani-estates', description: 'Terraced coffee above 1,800 m.' },
    { name: 'Coastal Looms', slug: 'coastal-looms', description: 'Hand-loomed linen and cashmere.' },
  ];

  for (const b of brands) {
    await prisma.brand.upsert({ where: { slug: b.slug }, update: b, create: b });
  }

  // Artwork for the storefront category tiles, from the design's photography set.
  const artwork: Record<string, string> = {
    'dates-preserves':
      'https://images.unsplash.com/photo-1681143436095-e4b261e4f40a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    'honey-syrups':
      'https://images.unsplash.com/photo-1587049352851-8d4e89133924?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    'coffee-tea':
      'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    'nuts-seeds':
      'https://images.unsplash.com/photo-1772986754551-64576d9c579c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    apparel:
      'https://images.unsplash.com/photo-1767766277273-a53443ab8639?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    'beauty-care':
      'https://images.unsplash.com/photo-1643123158326-a17b8a06c45f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    'gift-sets':
      'https://images.unsplash.com/photo-1634283715079-d91bbed0ece0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  };

  const tree: [string, string, string[]][] = [
    ['Dates & Preserves', 'dates-preserves', ['Ajwa & Premium', 'Medjool & Barhi', 'Date Syrups & Spreads', 'Stuffed & Coated', 'Seasonal · Ramadan', 'Bulk & Wholesale']],
    ['Honey & Syrups', 'honey-syrups', ['Sidr & Wild Honey', 'Comb & Raw', 'Infused & Creamed', 'Molasses & Syrups']],
    ['Coffee & Tea', 'coffee-tea', ['Whole Bean', 'Ground & Turkish', 'Loose Leaf Tea', 'Brewing Equipment']],
    ['Nuts & Seeds', 'nuts-seeds', ['Pistachios & Almonds', 'Roasted & Salted', 'Mixes & Trail', 'Seeds & Kernels']],
    ['Apparel', 'apparel', ['Abayas & Kaftans', 'Scarves & Shawls', 'Thobes', 'Accessories']],
    ['Beauty & Care', 'beauty-care', ['Hair Oils & Elixirs', 'Body & Bath', 'Oud & Fragrance', "Men's Grooming"]],
    ['Gift Sets', 'gift-sets', ['Hampers', 'Corporate Gifting', 'Occasion Boxes']],
  ];

  const slugify = (v: string) =>
    v
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

  for (const [index, [name, slug, children]] of tree.entries()) {
    const parent = await prisma.category.upsert({
      where: { slug },
      update: { name, sortOrder: index + 1, imageUrl: artwork[slug] ?? null },
      create: {
        name,
        slug,
        sortOrder: index + 1,
        imageUrl: artwork[slug] ?? null,
      },
    });

    for (const [childIndex, childName] of children.entries()) {
      const childSlug = `${slug}-${slugify(childName)}`;
      const data = {
        name: childName,
        slug: childSlug,
        parentId: parent.id,
        sortOrder: childIndex + 1,
      };

      await prisma.category.upsert({
        where: { slug: childSlug },
        update: data,
        create: data,
      });
    }
  }
}

/** The twelve products the admin catalogue and the storefront share. */
async function seedProducts() {
  const [categories, brands, warehouses] = await Promise.all([
    prisma.category.findMany({ select: { id: true, slug: true } }),
    prisma.brand.findMany({ select: { id: true, slug: true } }),
    prisma.warehouse.findMany({ select: { id: true, code: true } }),
  ]);

  const categoryId = new Map(categories.map((c) => [c.slug, c.id]));
  const brandId = new Map(brands.map((b) => [b.slug, b.id]));
  const warehouseId = new Map(warehouses.map((w) => [w.code, w.id]));

  for (const item of CATALOGUE) {
    const category = categoryId.get(item.categorySlug);
    if (!category) {
      console.warn(`skipping ${item.slug}: category ${item.categorySlug} missing`);
      continue;
    }

    const fields = {
      name: item.name,
      sku: item.sku,
      barcode: item.barcode,
      shortDescription: item.shortDescription,
      description: item.description,
      price: item.price,
      compareAtPrice: item.compareAtPrice ?? null,
      costPrice: item.costPrice,
      isActive: item.isActive,
      isFeatured: item.isFeatured,
      categoryId: category,
      brandId: item.brandSlug ? (brandId.get(item.brandSlug) ?? null) : null,
      // The reference catalogue is the platform's own shop.
      shopId: PLATFORM_SHOP_ID,
    };

    // Match on slug or SKU: a row seeded earlier under a different slug still
    // owns the SKU (slug is unique; SKU is unique within the shop).
    const existing = await prisma.product.findFirst({
      where: {
        OR: [{ slug: item.slug }, { shopId: PLATFORM_SHOP_ID, sku: item.sku }],
      },
      select: { id: true },
    });

    const product = existing
      ? await prisma.product.update({
          where: { id: existing.id },
          data: { ...fields, slug: item.slug },
        })
      : await prisma.product.create({ data: { ...fields, slug: item.slug } });

    // One primary image per product — replaced rather than appended.
    await prisma.productImage.deleteMany({ where: { productId: product.id } });
    await prisma.productImage.create({
      data: {
        productId: product.id,
        url: item.image,
        publicId: item.slug,
        sortOrder: 0,
        isPrimary: true,
      },
    });

    const stock = {
      quantity: item.onHand,
      reserved: item.reserved,
      reorderAt: item.reorderAt,
      warehouseId: warehouseId.get(item.warehouseCode) ?? null,
    };

    await prisma.inventory.upsert({
      where: { productId: product.id },
      update: stock,
      create: { ...stock, productId: product.id },
    });
  }
}

async function seedSuppliers() {
  const rows = [
    { name: 'Hadhramaut Apiaries', category: 'Honey', country: 'Yemen', leadTimeDays: 18, onTimeRate: 94.2, ytdSpend: 1_620_000, rating: 4.9 },
    { name: 'Khawlani Estates', category: 'Coffee', country: 'Yemen', leadTimeDays: 21, onTimeRate: 91.4, ytdSpend: 1_180_000, rating: 4.7 },
    { name: 'Al Nahda Foods', category: 'Nuts & Dates', country: 'Saudi Arabia', leadTimeDays: 9, onTimeRate: 97.8, ytdSpend: 980_000, rating: 4.8 },
    { name: 'Coastal Looms', category: 'Atelier', country: 'UAE', leadTimeDays: 24, onTimeRate: 88.1, ytdSpend: 640_000, rating: 4.4, status: 'ON_HOLD' as const },
    { name: "Ta'if Botanicals", category: 'Hair & Body', country: 'Saudi Arabia', leadTimeDays: 12, onTimeRate: 95.6, ytdSpend: 400_000, rating: 4.6 },
  ];

  const created: Record<string, string> = {};
  for (const row of rows) {
    const existing = await prisma.supplier.findFirst({ where: { name: row.name } });
    const supplier = existing
      ? await prisma.supplier.update({ where: { id: existing.id }, data: row })
      : await prisma.supplier.create({ data: row });
    created[row.name] = supplier.id;
  }

  return created;
}

async function seedPurchaseOrders(
  suppliers: Record<string, string>,
  warehouseId: string,
) {
  const rows = [
    { number: 'PO-2418', supplier: 'Al Nahda Foods', units: 1200, total: 48_600, status: 'OVERDUE' as const, expectedAt: days(-6) },
    { number: 'PO-2417', supplier: 'Khawlani Estates', units: 800, total: 32_400, status: 'APPROVED' as const, expectedAt: days(4) },
    { number: 'PO-2416', supplier: 'Hadhramaut Apiaries', units: 2400, total: 96_800, status: 'AWAITING_APPROVAL' as const, expectedAt: days(11) },
    { number: 'PO-2415', supplier: 'Coastal Looms', units: 300, total: 54_200, status: 'DRAFT' as const, expectedAt: days(18) },
    { number: 'PO-2414', supplier: "Ta'if Botanicals", units: 900, total: 21_850, status: 'RECEIVED' as const, expectedAt: days(-14) },
  ];

  for (const row of rows) {
    const data = {
      number: row.number,
      supplierId: suppliers[row.supplier],
      warehouseId,
      units: row.units,
      total: row.total,
      status: row.status,
      expectedAt: row.expectedAt,
    };

    await prisma.purchaseOrder.upsert({
      where: { number: row.number },
      update: data,
      create: data,
    });
  }
}

async function seedMarketing() {
  const campaigns = [
    { name: 'Ramadan Gifting Preview', channel: 'EMAIL' as const, sent: 184_200, openRate: 44.1, revenue: 126_400, status: 'LIVE' as const, audience: 'All subscribers' },
    { name: 'Winter Harvest Launch', channel: 'EMAIL' as const, sent: 212_800, openRate: 41.6, revenue: 98_200, status: 'COMPLETED' as const, audience: 'All subscribers' },
    { name: 'Abandoned Basket · 4h', channel: 'PUSH' as const, sent: 42_110, openRate: 38.9, revenue: 54_900, status: 'LIVE' as const, alwaysOn: true, audience: 'Abandoned basket' },
    { name: 'Gold Tier Early Access', channel: 'SMS' as const, sent: 28_480, openRate: 52.4, revenue: 113_300, status: 'SCHEDULED' as const, audience: 'Gold tier' },
  ];

  for (const c of campaigns) {
    const existing = await prisma.campaign.findFirst({ where: { name: c.name } });
    if (existing) await prisma.campaign.update({ where: { id: existing.id }, data: c });
    else await prisma.campaign.create({ data: c });
  }

  const posts = [
    { title: 'The Sidr Harvest, Season 2026', slug: 'sidr-harvest-2026', author: 'Mariam Zayed', category: 'Journal', views: 18_420, status: 'PUBLISHED' as const, publishAt: days(-3) },
    { title: 'How to Read a Roast Date', slug: 'how-to-read-a-roast-date', author: 'Omar Benali', category: 'Guides', views: 12_180, status: 'PUBLISHED' as const, publishAt: days(-9) },
    { title: 'Inside the Riyadh Atelier', slug: 'inside-the-riyadh-atelier', author: 'Mariam Zayed', category: 'Maison', views: 9_640, status: 'PUBLISHED' as const, publishAt: days(-18) },
    { title: 'Eid Gifting Edit', slug: 'eid-gifting-edit', author: 'Nadia Farouk', category: 'Journal', views: 0, status: 'SCHEDULED' as const, publishAt: days(12) },
  ];

  for (const p of posts) {
    await prisma.cmsPost.upsert({ where: { slug: p.slug }, update: p, create: p });
  }
}

async function seedFinance(customerId?: string) {
  const rates = [
    { jurisdiction: 'UAE · Federal Tax Authority', countryCode: 'AE', registration: 'TRN 100428391600003', rate: 5 },
    { jurisdiction: 'KSA · ZATCA', countryCode: 'SA', registration: 'VAT 311094820100003', rate: 15 },
    { jurisdiction: 'Qatar · General Tax Authority', countryCode: 'QA', registration: 'TIN 5540118240', rate: 0 },
  ];

  for (const r of rates) {
    const existing = await prisma.taxRate.findFirst({
      where: { jurisdiction: r.jurisdiction },
    });
    if (existing) await prisma.taxRate.update({ where: { id: existing.id }, data: r });
    else await prisma.taxRate.create({ data: r });
  }

  const filings = [
    { period: 'Q1 2026', jurisdiction: 'KSA · ZATCA', outputTax: 142_900, inputTax: 41_800, netPayable: 101_100, dueAt: days(60), status: 'DRAFT' as const },
    { period: 'Q1 2026', jurisdiction: 'UAE · FTA', outputTax: 186_400, inputTax: 52_100, netPayable: 134_300, dueAt: days(68), status: 'DRAFT' as const },
    { period: 'Q4 2025', jurisdiction: 'KSA · ZATCA', outputTax: 208_600, inputTax: 61_400, netPayable: 147_200, dueAt: days(-32), status: 'FILED' as const },
  ];

  for (const f of filings) {
    await prisma.taxFiling.upsert({
      where: { period_jurisdiction: { period: f.period, jurisdiction: f.jurisdiction } },
      update: f,
      create: f,
    });
  }

  if (!customerId) return;

  const invoices = [
    { number: 'INV-2026-04871', amount: 230, balance: 0, status: 'PAID' as const, dueAt: days(32) },
    { number: 'INV-2026-04862', amount: 48_600, balance: 48_600, status: 'OPEN' as const, dueAt: days(27) },
    { number: 'INV-2026-04840', amount: 420, balance: 420, status: 'OPEN' as const, dueAt: days(19) },
    { number: 'INV-2026-04788', amount: 512, balance: 512, status: 'OVERDUE' as const, dueAt: days(-9) },
  ];

  for (const inv of invoices) {
    const data = { ...inv, customerId, terms: 'net30' };
    await prisma.invoice.upsert({
      where: { number: inv.number },
      update: data,
      create: data,
    });
  }
}

async function seedAlerts() {
  const rules = [
    { name: 'Stock below reorder point', category: 'Inventory', severity: 'WARNING' as const, channels: 'email,push', threshold: 'available <= reorderAt' },
    { name: 'Payment gateway failure', category: 'Payments', severity: 'CRITICAL' as const, channels: 'email,sms,webhook', threshold: 'any failure' },
    { name: 'Delivery attempt failed', category: 'Delivery', severity: 'WARNING' as const, channels: 'email', threshold: 'attempts >= 2' },
    { name: 'Daily payout settled', category: 'Finance', severity: 'SUCCESS' as const, channels: 'email', threshold: 'on settlement' },
  ];

  for (const r of rules) {
    const existing = await prisma.alertRule.findFirst({ where: { name: r.name } });
    if (existing) await prisma.alertRule.update({ where: { id: existing.id }, data: r });
    else await prisma.alertRule.create({ data: r });
  }

  if ((await prisma.notification.count()) > 0) return;

  await prisma.notification.createMany({
    data: [
      { title: 'Oud & Honey Body Soap is out of stock', body: 'Dammam C reached zero on-hand with 14 open orders allocated.', severity: 'CRITICAL', meta: 'Inventory · 3h ago' },
      { title: 'PO-2418 is past its expected date', body: 'Al Nahda Foods was due six days ago. 1,200 units outstanding.', severity: 'WARNING', meta: 'Purchasing · 6h ago' },
      { title: 'SMS gateway degraded', body: 'Twilio reports elevated latency on the +966 route.', severity: 'WARNING', meta: 'System · 8h ago' },
      { title: 'Daily payout settled', body: '$1.28M settled to the primary account.', severity: 'SUCCESS', meta: 'Finance · 1d ago', unread: false },
    ],
  });
}

async function seedAudit() {
  if ((await prisma.auditEvent.count()) > 0) return;

  await prisma.auditEvent.createMany({
    data: [
      { actor: 'layla.h@royalzaad.com', action: 'product.update', entity: 'Product', entityId: 'sidr-mountain-honey', meta: 'price 148.00 → 152.00', ip: '10.0.4.12' },
      { actor: 'omar.b@royalzaad.com', action: 'order.refund', entity: 'Order', entityId: 'AM-2026-04861', meta: 'refunded $78.00', ip: '10.0.4.31' },
      { actor: 'yusuf.r@royalzaad.com', action: 'inventory.adjust', entity: 'Inventory', entityId: 'HON-SDR-500', meta: 'count correction +6', ip: '10.0.9.4' },
      { actor: 'system', action: 'user.login.failed', entity: 'User', entityId: 'unknown', meta: '3 attempts', ip: '203.0.113.44' },
    ],
  });
}

async function main() {
  await seedCatalogue();
  const { a } = await seedWarehouses();

  // Existing stock rows predate warehouses — anchor them to the default site.
  await prisma.inventory.updateMany({
    where: { warehouseId: null },
    data: { warehouseId: a.id },
  });

  await seedProducts();

  const suppliers = await seedSuppliers();
  await seedPurchaseOrders(suppliers, a.id);
  await seedMarketing();

  const customer = await prisma.customer.findFirst();
  await seedFinance(customer?.id);
  await seedAlerts();
  await seedAudit();

  const counts = {
    brands: await prisma.brand.count(),
    categories: await prisma.category.count(),
    products: await prisma.product.count(),
    stockRecords: await prisma.inventory.count(),
    warehouses: await prisma.warehouse.count(),
    transfers: await prisma.stockTransfer.count(),
    suppliers: await prisma.supplier.count(),
    purchaseOrders: await prisma.purchaseOrder.count(),
    campaigns: await prisma.campaign.count(),
    posts: await prisma.cmsPost.count(),
    taxRates: await prisma.taxRate.count(),
    taxFilings: await prisma.taxFiling.count(),
    invoices: await prisma.invoice.count(),
    alertRules: await prisma.alertRule.count(),
    notifications: await prisma.notification.count(),
    auditEvents: await prisma.auditEvent.count(),
  };

  console.table(counts);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
