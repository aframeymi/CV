// Prisma database client and bcrypt for hashing passwords
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

// Create the database client
const prisma = new PrismaClient();

// Fills the database with demo data (run with `npm run prisma:seed`)
async function main() {

// Delete all existing data first (children before parents, to respect relations)
  await prisma.statusChange.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.report.deleteMany();
  await prisma.user.deleteMany();
  await prisma.neighborhood.deleteMany();
  await prisma.city.deleteMany();
  await prisma.category.deleteMany();
  await prisma.role.deleteMany();

// Create the two roles
  const [adminRole, citizenRole] = await Promise.all([
    prisma.role.create({ data: { title: 'Admin', description: 'Platform administrator' } }),
    prisma.role.create({ data: { title: 'Citizen', description: 'Regular user' } }),
  ]);

// Create a city with three neighborhoods
  const berlin = await prisma.city.create({ data: { name: 'Berlin', code: 'BE' } });
  const [mitte, kreuzberg, neukolln] = await Promise.all([
    prisma.neighborhood.create({ data: { name: 'Mitte', cityId: berlin.id } }),
    prisma.neighborhood.create({ data: { name: 'Kreuzberg', cityId: berlin.id } }),
    prisma.neighborhood.create({ data: { name: 'Neukölln', cityId: berlin.id } }),
  ]);

// Create the report categories
  const [lighting, roads, sanitation, graffiti] = await Promise.all([
    prisma.category.create({ data: { name: 'Lighting' } }),
    prisma.category.create({ data: { name: 'Roads' } }),
    prisma.category.create({ data: { name: 'Sanitation' } }),
    prisma.category.create({ data: { name: 'Graffiti' } }),
  ]);

// Hash the demo passwords
  const [alicePw, bobPw, caraPw] = await Promise.all([
    bcrypt.hash('AlicePass123!', 10),
    bcrypt.hash('BobPass123!', 10),
    bcrypt.hash('CaraPass123!', 10),
  ]);

// Create three demo users: Alice (Admin), Bob and Cara (Citizens)
  const alice = await prisma.user.create({
    data: {
      firstName: 'Alice',
      lastName: 'Anderson',
      phone: '+4915111111111',
      email: 'alice@example.com',
      passwordHash: alicePw,
      roleId: adminRole.id,
    },
  });

  const bob = await prisma.user.create({
    data: {
      firstName: 'Bob',
      lastName: 'Brown',
      phone: '+4915222222222',
      email: 'bob@example.com',
      passwordHash: bobPw,
      roleId: citizenRole.id,
    },
  });

  const cara = await prisma.user.create({
    data: {
      firstName: 'Cara',
      lastName: 'Clark',
      phone: '+4915333333333',
      email: 'cara@example.com',
      passwordHash: caraPw,
      roleId: citizenRole.id,
    },
  });

// Lists used to pick random values for the demo reports
  const users = [alice, bob, cara];
  const neighborhoods = [mitte, kreuzberg, neukolln];
  const categories = [lighting, roads, sanitation, graffiti];

// Create three hand-written sample reports
  await prisma.report.create({
    data: {
      title: 'Broken streetlight',
      description: 'Streetlight in Mitte is flickering.',
      imageUrl: '/uploads/streetlight-1.jpg',
      status: 'OPEN',
      authorId: alice.id,
      neighborhoodId: mitte.id,
      categories: { connect: [{ id: lighting.id }] },
    },
  });

  await prisma.report.create({
    data: {
      title: 'Pothole on main road',
      description: 'Deep pothole near the market.',
      status: 'IN_PROGRESS',
      authorId: alice.id,
      neighborhoodId: kreuzberg.id,
      categories: { connect: [{ id: roads.id }] },
    },
  });

  await prisma.report.create({
    data: {
      title: 'Overflowing trash bin',
      description: 'Trash bins need emptying.',
      imageUrl: '/uploads/trash-park.jpg',
      status: 'OPEN',
      authorId: bob.id,
      neighborhoodId: neukolln.id,
      categories: { connect: [{ id: sanitation.id }] },
    },
  });

// Create 1000 random reports (random user, neighborhood, category, status) for performance testing
  console.log('Creating 1000 demo reports for performance testing...');
  for (let i = 0; i < 1000; i++) {
    const randomUser = users[Math.floor(Math.random() * users.length)];
    const randomNeighborhood = neighborhoods[Math.floor(Math.random() * neighborhoods.length)];
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    const statuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED'];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

    await prisma.report.create({
      data: {
        title: `Seed report ${i}`,
        description: `Demo entry generated automatically #${i}`,
        authorId: randomUser.id,
        neighborhoodId: randomNeighborhood.id,
        status: randomStatus,
        categories: { connect: [{ id: randomCategory.id }] },
      },
    });
  }

  console.log('✅ Seed completed: roles, cities, neighborhoods, categories, users, and 1000 reports.');
}

// Run the seed: log errors and exit with failure, always close the database connection
main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
