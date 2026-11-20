// The public list of reports, one page at a time, so a page never loads the whole table.
import prisma from '../../prismaClient.js';

export const REPORTS_PER_PAGE = 20;

// Only what the track page shows: the list is public, so it holds no data about the authors
const LISTED_FIELDS = { id: true, title: true, description: true, imageUrl: true };

// Newest first. The ID breaks ties, so reports created at the same moment keep a fixed order across pages.
const NEWEST_FIRST = [{ createdAt: 'desc' }, { id: 'desc' }];

export async function findReportPage(page) {
  const [reports, reportCount] = await Promise.all([
    prisma.report.findMany({
      select: LISTED_FIELDS,
      orderBy: NEWEST_FIRST,
      skip: (page - 1) * REPORTS_PER_PAGE,
      take: REPORTS_PER_PAGE,
    }),
    prisma.report.count(),
  ]);
  return { reports, pageCount: Math.max(1, Math.ceil(reportCount / REPORTS_PER_PAGE)) };
}
