// Integration tests for the public statistics endpoint and the admin analytics data.
import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../prismaClient.js';
import { SESSION_COOKIE, admin, logInAs } from './helpers/auth.js';

const PERSONAL_FIELDS = /email|firstName|lastName|phone|author/i;

function fakeStatisticsData() {
  prisma.report.groupBy.mockImplementation(async ({ by }) =>
    by[0] === 'status'
      ? [
          { status: 'OPEN', _count: { _all: 4 } },
          { status: 'RESOLVED', _count: { _all: 2 } },
        ]
      : [
          { neighborhoodId: 'n1', _count: { neighborhoodId: 5 } },
          { neighborhoodId: 'n2', _count: { neighborhoodId: 1 } },
        ]
  );
  prisma.neighborhood.findMany.mockResolvedValue([
    { id: 'n1', name: 'Mitte', city: { name: 'Berlin' } },
    { id: 'n2', name: 'Kreuzberg', city: { name: 'Berlin' } },
  ]);
  prisma.user.findMany.mockResolvedValue([
    { firstName: 'Bob', lastName: 'Brown', email: 'bob@example.com', _count: { reports: 5 } },
  ]);
  prisma.$queryRawUnsafe.mockResolvedValue([{ city: 'Berlin', status: 'OPEN', count: 4 }]);
}

beforeEach(fakeStatisticsData);

describe('GET /admin/analytics', () => {
  it('gives admins the top reporters as well as the public totals', async () => {
    logInAs(admin);

    const response = await request(app).get('/admin/analytics').set('Cookie', SESSION_COOKIE);

    expect(response.body.topReporters[0].email).toBe('bob@example.com');
    expect(response.body.countsByStatus).toEqual([
      { status: 'OPEN', count: 4 },
      { status: 'RESOLVED', count: 2 },
    ]);
  });
});

describe('GET /api/stats', () => {
  it('is available without logging in', async () => {
    const response = await request(app).get('/api/stats');

    expect(response.status).toBe(200);
  });

  it('returns report counts by status and the busiest neighborhoods', async () => {
    const response = await request(app).get('/api/stats');

    expect(response.body).toEqual({
      countsByStatus: [
        { status: 'OPEN', count: 4 },
        { status: 'RESOLVED', count: 2 },
      ],
      busiestNeighborhoods: [
        { neighborhood: 'Mitte', city: 'Berlin', count: 5 },
        { neighborhood: 'Kreuzberg', city: 'Berlin', count: 1 },
      ],
    });
  });

  it('contains no personal data', async () => {
    const response = await request(app).get('/api/stats');

    expect(response.text).not.toMatch(PERSONAL_FIELDS);
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it('looks up all neighborhood names in a single query', async () => {
    await request(app).get('/api/stats');

    expect(prisma.neighborhood.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.neighborhood.findUnique).not.toHaveBeenCalled();
  });
});

describe('GET /graph', () => {
  it('loads its chart data from the public endpoint, not an admin route', async () => {
    const response = await request(app).get('/graph');

    expect(response.text).toContain("fetch('/api/stats')");
    expect(response.text).not.toContain('/admin/');
  });
});
