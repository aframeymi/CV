// Integration tests: real Express app and real EJS views, with fake Firebase and Prisma.
import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../prismaClient.js';
import { SESSION_COOKIE, logInAs } from './helpers/auth.js';

const citizen = { id: 'user-1', email: 'bob@example.com', role: { title: 'Citizen' } };
const admin = { id: 'user-2', email: 'alice@example.com', role: { title: 'Admin' } };
const validForm = { title: 'Broken light', description: 'Out since Monday', neighborhoodId: 'n1' };

function submitReport(form) {
  return request(app).post('/submit-report').set('Cookie', SESSION_COOKIE).type('form').send(form);
}

function deleteReport(id) {
  return request(app).post(`/track/${id}/delete`).set('Cookie', SESSION_COOKIE);
}

describe('POST /submit-report', () => {
  beforeEach(() => {
    logInAs(citizen.email);
    prisma.user.findUnique.mockResolvedValue(citizen);
    prisma.neighborhood.findUnique.mockResolvedValue({ id: 'n1' });
    prisma.report.create.mockResolvedValue({ id: 'report-1' });
  });

  it('rejects a visitor who is not logged in', async () => {
    const response = await request(app).post('/submit-report').type('form').send(validForm);

    expect(response.status).toBe(403);
    expect(prisma.report.create).not.toHaveBeenCalled();
  });

  it.each(['title', 'description', 'neighborhoodId'])('requires %s', async (field) => {
    const response = await submitReport({ ...validForm, [field]: '' });

    expect(response.status).toBe(422);
    expect(prisma.report.create).not.toHaveBeenCalled();
  });

  it('rejects a user with no profile in the database', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const response = await submitReport(validForm);

    expect(response.status).toBe(403);
  });

  it('rejects an unknown neighborhood', async () => {
    prisma.neighborhood.findUnique.mockResolvedValue(null);

    const response = await submitReport(validForm);

    expect(response.status).toBe(422);
  });

  it('saves the report for the logged-in user with its first status entry', async () => {
    const response = await submitReport(validForm);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/track');
    expect(prisma.report.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ title: 'Broken light', authorId: citizen.id, status: 'OPEN' }),
    });
    expect(prisma.statusChange.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ reportId: 'report-1', to: 'OPEN' }),
    });
  });
});

describe('GET /track', () => {
  it('escapes HTML in report content', async () => {
    prisma.report.findMany.mockResolvedValue([
      { id: 'report-1', title: '<script>alert(1)</script>', description: 'text' },
    ]);

    const response = await request(app).get('/track');

    expect(response.status).toBe(200);
    expect(response.text).not.toContain('<script>alert(1)</script>');
    expect(response.text).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });
});

describe('POST /track/:id/delete', () => {
  const ownReport = { id: 'report-1', authorId: citizen.id };
  const othersReport = { id: 'report-2', authorId: 'someone-else' };

  it('rejects a visitor who is not logged in', async () => {
    const response = await request(app).post('/track/report-1/delete');

    expect(response.status).toBe(403);
    expect(prisma.report.delete).not.toHaveBeenCalled();
  });

  it('lets the author delete their own report', async () => {
    logInAs(citizen.email);
    prisma.user.findUnique.mockResolvedValue(citizen);
    prisma.report.findUnique.mockResolvedValue(ownReport);

    const response = await deleteReport(ownReport.id);

    expect(response.status).toBe(302);
    expect(prisma.report.delete).toHaveBeenCalledWith({ where: { id: ownReport.id } });
  });

  it('lets an admin delete any report', async () => {
    logInAs(admin.email);
    prisma.user.findUnique.mockResolvedValue(admin);
    prisma.report.findUnique.mockResolvedValue(othersReport);

    const response = await deleteReport(othersReport.id);

    expect(response.status).toBe(302);
    expect(prisma.report.delete).toHaveBeenCalledWith({ where: { id: othersReport.id } });
  });

  it('stops a citizen deleting a report by another user', async () => {
    logInAs(citizen.email);
    prisma.user.findUnique.mockResolvedValue(citizen);
    prisma.report.findUnique.mockResolvedValue(othersReport);

    const response = await deleteReport(othersReport.id);

    expect(response.status).toBe(403);
    expect(prisma.report.delete).not.toHaveBeenCalled();
  });

  it('returns 404 for a report that does not exist', async () => {
    logInAs(citizen.email);
    prisma.user.findUnique.mockResolvedValue(citizen);
    prisma.report.findUnique.mockResolvedValue(null);

    const response = await deleteReport('missing');

    expect(response.status).toBe(404);
  });
});
