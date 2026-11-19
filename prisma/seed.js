// Run with `npm run prisma:seed` for reference data only,
// or `npm run prisma:seed:demo` to add example users and reports on a development database.
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { seedReferenceData } from './seeds/reference-data.js';
import { seedDemoData } from './seeds/demo-data.js';
import { shouldSeedDemoData } from './seeds/demo-seeding-policy.js';

const prisma = new PrismaClient();

async function main() {
  // Decide before touching the database, so a refused run changes nothing
  const includeDemoData = shouldSeedDemoData(process.argv.slice(2), process.env);

  const referenceData = await seedReferenceData(prisma);
  console.log('Reference data ready: roles, cities, neighborhoods, and categories.');

  if (includeDemoData) {
    await seedDemoData(prisma, referenceData);
    console.log('Demo data ready: example users and reports.');
  }
}

main()
  .catch((error) => {
    console.error('Seed failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
