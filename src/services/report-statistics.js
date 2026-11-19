import prisma from '../../prismaClient.js';

const BUSIEST_NEIGHBORHOOD_LIMIT = 5;
const TOP_REPORTER_LIMIT = 5;
const UNKNOWN = '(unknown)';

// Totals only, safe to show to anyone: no names, emails, or other personal data
export async function getPublicReportStatistics() {
  const [countsByStatus, busiestNeighborhoods] = await Promise.all([
    countReportsByStatus(),
    findBusiestNeighborhoods(),
  ]);
  return { countsByStatus, busiestNeighborhoods };
}

// Contains names and emails, so it must only ever be served to administrators
export function findTopReporters() {
  return prisma.user.findMany({
    select: { firstName: true, lastName: true, email: true, _count: { select: { reports: true } } },
    orderBy: { reports: { _count: 'desc' } },
    take: TOP_REPORTER_LIMIT,
  });
}

async function countReportsByStatus() {
  const groups = await prisma.report.groupBy({
    by: ['status'],
    _count: { _all: true },
    orderBy: { status: 'asc' },
  });
  return groups.map((group) => ({ status: group.status, count: group._count._all }));
}

async function findBusiestNeighborhoods() {
  const groups = await prisma.report.groupBy({
    by: ['neighborhoodId'],
    _count: { neighborhoodId: true },
    orderBy: { _count: { neighborhoodId: 'desc' } },
    take: BUSIEST_NEIGHBORHOOD_LIMIT,
  });
  const neighborhoods = await prisma.neighborhood.findMany({
    where: { id: { in: groups.map((group) => group.neighborhoodId) } },
    include: { city: true },
  });
  const neighborhoodsById = new Map(neighborhoods.map((neighborhood) => [neighborhood.id, neighborhood]));

  return groups.map((group) => {
    const neighborhood = neighborhoodsById.get(group.neighborhoodId);
    return {
      neighborhood: neighborhood?.name ?? UNKNOWN,
      city: neighborhood?.city?.name ?? UNKNOWN,
      count: group._count.neighborhoodId,
    };
  });
}
