// Example users and reports for local development and demos. Never run against production.
// Demo users have no Firebase account, so they can never log in.

// example.com is reserved for documentation, so no real person can own these addresses
export const DEMO_EMAIL_DOMAIN = '@example.com';

const DEMO_USERS = [
  { firstName: 'Alice', lastName: 'Anderson', phone: '+4915111111111', email: 'alice@example.com' },
  { firstName: 'Bob', lastName: 'Brown', phone: '+4915222222222', email: 'bob@example.com' },
  { firstName: 'Cara', lastName: 'Clark', phone: '+4915333333333', email: 'cara@example.com' },
];

const SAMPLE_REPORTS = [
  { title: 'Broken streetlight', description: 'Streetlight in Mitte is flickering.', status: 'OPEN' },
  { title: 'Pothole on main road', description: 'Deep pothole near the market.', status: 'IN_PROGRESS' },
  { title: 'Overflowing trash bin', description: 'Trash bins need emptying.', status: 'OPEN' },
];

// Enough reports to make the track and graph pages show realistic load
const GENERATED_REPORT_COUNT = 1000;
const STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED'];

export async function seedDemoData(prisma, { neighborhoods, categories }) {
  await removeDemoData(prisma);
  const users = await createDemoUsers(prisma);
  const pickAuthorAndPlace = () => ({
    authorId: pickRandom(users).id,
    neighborhoodId: pickRandom(neighborhoods).id,
    categories: { connect: [{ id: pickRandom(categories).id }] },
  });

  for (const report of SAMPLE_REPORTS) {
    await prisma.report.create({ data: { ...report, ...pickAuthorAndPlace() } });
  }
  for (let number = 1; number <= GENERATED_REPORT_COUNT; number++) {
    await prisma.report.create({
      data: {
        title: `Seed report ${number}`,
        description: `Demo entry generated automatically #${number}`,
        status: pickRandom(STATUSES),
        ...pickAuthorAndPlace(),
      },
    });
  }
}

// Removes only demo users and their reports, so real accounts survive a re-seed
async function removeDemoData(prisma) {
  const isDemoUser = { email: { endsWith: DEMO_EMAIL_DOMAIN } };
  await prisma.report.deleteMany({ where: { author: isDemoUser } });
  await prisma.user.deleteMany({ where: isDemoUser });
}

// Demo users are citizens only. Seeding an admin would let anyone who registers that address take the role.
async function createDemoUsers(prisma) {
  const citizenRole = await prisma.role.findUniqueOrThrow({ where: { title: 'Citizen' } });
  const users = [];
  for (const demoUser of DEMO_USERS) {
    users.push(
      await prisma.user.create({
        data: { ...demoUser, roleId: citizenRole.id },
      })
    );
  }
  return users;
}

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}
