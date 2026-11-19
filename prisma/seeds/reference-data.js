// Data every environment needs, including production: the report form cannot work without cities.
// Seeding only adds what is missing and never deletes, so it is safe to run more than once.

const ROLES = [
  { title: 'Admin', description: 'Platform administrator' },
  { title: 'Citizen', description: 'Regular user' },
];

const CITIES = [
  { name: 'Berlin', code: 'BE', neighborhoodNames: ['Mitte', 'Kreuzberg', 'Neukölln'] },
];

const CATEGORY_NAMES = ['Lighting', 'Roads', 'Sanitation', 'Graffiti'];

const KEEP_EXISTING = {};

export async function seedReferenceData(prisma) {
  await seedRoles(prisma);
  const neighborhoods = await seedCitiesWithNeighborhoods(prisma);
  const categories = await seedCategories(prisma);
  return { neighborhoods, categories };
}

async function seedRoles(prisma) {
  for (const role of ROLES) {
    await prisma.role.upsert({ where: { title: role.title }, update: KEEP_EXISTING, create: role });
  }
}

async function seedCitiesWithNeighborhoods(prisma) {
  const neighborhoods = [];
  for (const { neighborhoodNames, ...city } of CITIES) {
    const savedCity = await prisma.city.upsert({
      where: { name: city.name },
      update: KEEP_EXISTING,
      create: city,
    });
    for (const name of neighborhoodNames) {
      neighborhoods.push(await seedNeighborhood(prisma, savedCity.id, name));
    }
  }
  return neighborhoods;
}

function seedNeighborhood(prisma, cityId, name) {
  return prisma.neighborhood.upsert({
    where: { cityId_name: { cityId, name } },
    update: KEEP_EXISTING,
    create: { cityId, name },
  });
}

async function seedCategories(prisma) {
  const categories = [];
  for (const name of CATEGORY_NAMES) {
    categories.push(
      await prisma.category.upsert({ where: { name }, update: KEEP_EXISTING, create: { name } })
    );
  }
  return categories;
}
