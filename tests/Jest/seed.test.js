// Unit tests for the seed scripts, using a fake Prisma client defined here.
import { shouldSeedDemoData, DEMO_FLAG } from '../../prisma/seeds/demo-seeding-policy.js';
import { seedReferenceData } from '../../prisma/seeds/reference-data.js';
import { seedDemoData, DEMO_EMAIL_DOMAIN } from '../../prisma/seeds/demo-data.js';

const CITIZEN_ROLE_ID = 'role-citizen';

// Has no deleteMany on reference models, so any deletion attempt fails the test
function fakePrismaForReferenceData() {
  let nextId = 0;
  const upsert = () => jest.fn(async ({ create }) => ({ id: `id-${nextId++}`, ...create }));
  return {
    role: { upsert: upsert() },
    city: { upsert: upsert() },
    neighborhood: { upsert: upsert() },
    category: { upsert: upsert() },
  };
}

function fakePrismaForDemoData() {
  let nextId = 0;
  return {
    role: {
      findUniqueOrThrow: jest.fn(async ({ where }) => ({ id: `role-${where.title.toLowerCase()}`, ...where })),
    },
    user: {
      deleteMany: jest.fn(),
      create: jest.fn(async ({ data }) => ({ id: `user-${nextId++}`, ...data })),
    },
    report: { deleteMany: jest.fn(), create: jest.fn() },
  };
}

const referenceData = {
  neighborhoods: [{ id: 'n1' }, { id: 'n2' }],
  categories: [{ id: 'c1' }],
};

describe('shouldSeedDemoData', () => {
  it('skips demo data unless the flag is given', () => {
    expect(shouldSeedDemoData([], {})).toBe(false);
  });

  it('seeds demo data when the flag is given', () => {
    expect(shouldSeedDemoData([DEMO_FLAG], {})).toBe(true);
  });

  it('refuses demo data in production', () => {
    expect(() => shouldSeedDemoData([DEMO_FLAG], { NODE_ENV: 'production' })).toThrow(/production/);
  });

  it('still allows reference data in production', () => {
    expect(shouldSeedDemoData([], { NODE_ENV: 'production' })).toBe(false);
  });
});

describe('seedReferenceData', () => {
  it('only adds missing rows and never overwrites existing ones', async () => {
    const prisma = fakePrismaForReferenceData();

    await seedReferenceData(prisma);

    const allUpserts = [prisma.role, prisma.city, prisma.neighborhood, prisma.category]
      .flatMap((model) => model.upsert.mock.calls);
    expect(allUpserts.length).toBeGreaterThan(0);
    allUpserts.forEach(([query]) => expect(query.update).toEqual({}));
  });

  it('returns the neighborhoods and categories for the demo data to use', async () => {
    const result = await seedReferenceData(fakePrismaForReferenceData());

    expect(result.neighborhoods.map((n) => n.name)).toEqual(['Mitte', 'Kreuzberg', 'Neukölln']);
    expect(result.categories).toHaveLength(4);
  });
});

describe('seedDemoData', () => {
  it('deletes only demo users and their reports', async () => {
    const prisma = fakePrismaForDemoData();

    await seedDemoData(prisma, referenceData);

    const isDemoUser = { email: { endsWith: DEMO_EMAIL_DOMAIN } };
    expect(prisma.report.deleteMany).toHaveBeenCalledWith({ where: { author: isDemoUser } });
    expect(prisma.user.deleteMany).toHaveBeenCalledWith({ where: isDemoUser });
  });

  it('creates every demo user as a citizen, never an admin', async () => {
    const prisma = fakePrismaForDemoData();

    await seedDemoData(prisma, referenceData);

    const createdUsers = prisma.user.create.mock.calls.map(([query]) => query.data);
    expect(createdUsers).toHaveLength(3);
    createdUsers.forEach((user) => {
      expect(user.roleId).toBe(CITIZEN_ROLE_ID);
      expect(user.email.endsWith(DEMO_EMAIL_DOMAIN)).toBe(true);
    });
  });

  it('creates the sample reports plus 1000 generated ones', async () => {
    const prisma = fakePrismaForDemoData();

    await seedDemoData(prisma, referenceData);

    expect(prisma.report.create).toHaveBeenCalledTimes(1003);
  });
});
