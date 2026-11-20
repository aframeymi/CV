// Integration tests for the access rules of the admin routes.
import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../prismaClient.js';
import { SESSION_COOKIE, admin, citizen, logInAs } from './helpers/auth.js';

const ADMIN_ROUTES = ['/admin/report-stats', '/admin/analytics'];

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
  prisma.$queryRaw.mockResolvedValue([{ city: 'Berlin', status: 'OPEN', count: 4 }]);
}

beforeEach(fakeStatisticsData);

describe.each(ADMIN_ROUTES)('GET %s', (route) => {
  it('asks a visitor who is not logged in to log in', async () => {
    const response = await request(app).get(route);

    expect(response.status).toBe(401);
  });

  it('refuses a citizen', async () => {
    logInAs(citizen);

    const response = await request(app).get(route).set('Cookie', SESSION_COOKIE);

    expect(response.status).toBe(403);
    expect(response.text).not.toContain('bob@example.com');
  });

  it('answers an admin', async () => {
    logInAs(admin);

    const response = await request(app).get(route).set('Cookie', SESSION_COOKIE);

    expect(response.status).toBe(200);
  });
});
