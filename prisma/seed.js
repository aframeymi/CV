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
  const berlin = await prisma.city.create({ data: { name: 'Berlin', code: 'BE' } });
  const [mitte, kreuzberg, neukolln] = await Promise.all([
    prisma.neighborhood.create({ data: { name: 'Mitte', cityId: berlin.id } }),
    prisma.neighborhood.create({ data: { name: 'Kreuzberg', cityId: berlin.id } }),
    prisma.neighborhood.create({ data: { name: 'Neukölln', cityId: berlin.id } }),
  ]);

  // Optional categories (use later if needed)
  const [lighting, roads, sanitation, graffiti] = await Promise.all([
    prisma.category.create({ data: { name: 'Lighting' } }),
    prisma.category.create({ data: { name: 'Roads' } }),
    prisma.category.create({ data: { name: 'Sanitation' } }),
    prisma.category.create({ data: { name: 'Graffiti' } }),
  ]);

  // Users
  const [alicePw, bobPw, caraPw] = await Promise.all([
    bcrypt.hash('AlicePass123!', 10),
    bcrypt.hash('BobPass123!', 10),
    bcrypt.hash('CaraPass123!', 10),
  ]);

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

  // Reports with varied statuses and neighborhoods
  const r1 = await prisma.report.create({
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

  const r2 = await prisma.report.create({
    data: {
      title: 'Pothole on main road',
      description: 'Deep pothole near the market.',
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
      description: 'Trash bins need emptying.',
      imageUrl: '/uploads/trash-park.jpg',
      status: 'OPEN',
      authorId: bob.id,
      neighborhoodId: neukolln.id,
      categories: { connect: [{ id: sanitation.id }] },
    },
  });

  const r4 = await prisma.report.create({
    data: {
      title: 'Graffiti on library wall',
      description: 'Large graffiti on the side wall.',
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
      description: 'One swing chain is broken.',
      imageUrl: '/uploads/playground-swing.jpg',
      status: 'OPEN',
      authorId: cara.id,
      neighborhoodId: kreuzberg.id,
      categories: { connect: [{ id: lighting.id }] }, // just an example
    },
  });

  // Optional: example attachments and status changes for r1
  await prisma.attachment.create({
    data: {
      reportId: r1.id,
      url: '/uploads/streetlight-close.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 240000,
    },
  });
  await prisma.statusChange.create({
    data: {
      reportId: r1.id,
      from: 'OPEN',
      to: 'OPEN',
      changedBy: alice.email,
    },
  });

  console.log('Seed completed: roles, city, neighborhoods, categories, users, reports.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
