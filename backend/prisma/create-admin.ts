// prisma/create-admin.ts
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD');

  const role = await prisma.role.upsert({
    where: { name: 'Admin' },
    update: {},
    create: { name: 'Admin', description: 'Full back-office access' },
  });

  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { roleId: role.id },
    create: {
      email: ADMIN_EMAIL,
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 10),
      firstName: 'Admin',
      lastName: 'User',
      roleId: role.id,
    },
  });

  console.log(`Admin ready: ${ADMIN_EMAIL}`);
}

main().finally(() => prisma.$disconnect());

// Run with:
// ADMIN_EMAIL=you@yourdomain.com ADMIN_PASSWORD='<a strong password>' npm run create-admin
