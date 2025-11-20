// prisma/seed.js
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Clean up in dependency order
  await prisma.statusChange.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.report.deleteMany();
  await prisma.user.deleteMany();
  await prisma.neighborhood.deleteMany();
  await prisma.city.deleteMany();
  await prisma.category.deleteMany();
  await prisma.role.deleteMany();

  // Roles
  const [adminRole, citizenRole] = await Promise.all([
    prisma.role.create({ data: { title: 'Admin', description: 'Platform administrator' } }),
    prisma.role.create({ data: { title: 'Citizen', description: 'Regular user' } }),
  ]);

  // City and Neighborhoods
  const berlin = await prisma.city.create({
    data: { name: 'Berlin', code: 'BE' },
  });

  const [neukolln, mitte, kreuzberg] = await Promise.all([
    prisma.neighborhood.create({ data: { name: 'Neukölln', cityId: berlin.id } }),
    prisma.neighborhood.create({ data: { name: 'Mitte', cityId: berlin.id } }),
    prisma.neighborhood.create({ data: { name: 'Kreuzberg', cityId: berlin.id } }),
  ]);

  // Categories
  const [lighting, roads, sanitation, graffiti, playground] = await Promise.all([
    prisma.category.create({ data: { name: 'Lighting' } }),
    prisma.category.create({ data: { name: 'Roads' } }),
    prisma.category.create({ data: { name: 'Sanitation' } }),
    prisma.category.create({ data: { name: 'Graffiti' } }),
    prisma.category.create({ data: { name: 'Playground' } }),
  ]);

  // User passwords
  const [alicePassword, bobPassword, caraPassword] = await Promise.all([
    bcrypt.hash('AlicePass123!', 10),
    bcrypt.hash('BobPass123!', 10),
    bcrypt.hash('CaraPass123!', 10),
  ]);

  // Users (note: firstName, lastName, roleId are required in schema)
  const alice = await prisma.user.create({
    data: {
      firstName: 'Alice',
      lastName: 'Anderson',
      phone: '+4915111111111',
      email: 'alice@example.com',
      passwordHash: alicePassword,
      roleId: adminRole.id,
      firebaseUid: null,
    },
  });

  const bob = await prisma.user.create({
    data: {
      firstName: 'Bob',
      lastName: 'Brown',
      phone: '+4915222222222',
      email: 'bob@example.com',
      passwordHash: bobPassword,
      roleId: citizenRole.id,
      firebaseUid: null,
    },
  });

  const cara = await prisma.user.create({
    data: {
      firstName: 'Cara',
      lastName: 'Clark',
      phone: '+4915333333333',
      email: 'cara@example.com',
      passwordHash: caraPassword,
      roleId: citizenRole.id,
      firebaseUid: null,
    },
  });

  // Reports with required neighborhoodId and category connections
  const r1 = await prisma.report.create({
    data: {
      title: 'Broken streetlight',
      description: 'The streetlight on Main St near the bus stop is flickering and often off at night.',
      imageUrl: '/uploads/streetlight-1.jpg',
      status: 'OPEN',
      authorId: alice.id,
      neighborhoodId: mitte.id,
      categories: { connect: [{ id: lighting.id }] },
      attachments: {
        create: [
          { url: '/uploads/streetlight-closeup.jpg', mimeType: 'image/jpeg', sizeBytes: 245123 },
        ],
      },
    },
    include: { categories: true },
  });

  const r2 = await prisma.report.create({
    data: {
      title: 'Pothole on 3rd Ave',
      description: 'Large pothole causing cyclists to swerve. Needs urgent repair.',
      imageUrl: null,
      status: 'IN_PROGRESS',
      authorId: alice.id,
      neighborhoodId: kreuzberg.id,
      categories: { connect: [{ id: roads.id }] },
    },
  });

  const r3 = await prisma.report.create({
    data: {
      title: 'Overflowing trash bin',
      description: 'Trash bin in the park hasn’t been emptied in days.',
      imageUrl: '/uploads/trash-park.jpg',
      status: 'OPEN',
      authorId: bob.id,
      neighborhoodId: neukolln.id,
      categories: { connect: [{ id: sanitation.id }] },
    },
  });

  const r4 = await prisma.report.create({
    data: {
      title: 'Graffiti on public building',
      description: 'Graffiti on the side wall of the library.',
      imageUrl: null,
      status: 'RESOLVED',
      authorId: bob.id,
      neighborhoodId: mitte.id,
      categories: { connect: [{ id: graffiti.id }] },
      statusChanges: {
        create: [
          { from: 'OPEN', to: 'IN_PROGRESS', changedBy: alice.email },
          { from: 'IN_PROGRESS', to: 'RESOLVED', changedBy: alice.email },
        ],
      },
    },
  });

  const r5 = await prisma.report.create({
    data: {
      title: 'Damaged playground swing',
      description: 'One swing chain is broken; unsafe for kids.',
      imageUrl: '/uploads/playground-swing.jpg',
      status: 'OPEN',
      authorId: cara.id,
      neighborhoodId: kreuzberg.id,
      categories: { connect: [{ id: playground.id }] },
    },
  });

  console.log('Seed completed: roles, city, neighborhoods, categories, users, reports created.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
