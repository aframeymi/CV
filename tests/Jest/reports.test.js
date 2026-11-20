// Integration tests: real Express app and real EJS views, with fake Firebase and Prisma.
import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../prismaClient.js';
import { SESSION_COOKIE, admin, citizen, logInAs } from './helpers/auth.js';

const validForm = { title: 'Broken light', description: 'Out since Monday', neighborhoodId: 'n1' };
const ownReport = { id: 'report-1', authorId: citizen.id, title: 'Mine', description: 'text' };
const othersReport = { id: 'report-2', authorId: 'someone-else', title: 'Theirs', description: 'text' };

function submitReport(form) {
  return request(app).post('/submit-report').set('Cookie', SESSION_COOKIE).type('form').send(form);
}

function deleteReport(id) {
  return request(app).post(`/track/${id}/delete`).set('Cookie', SESSION_COOKIE);
}

describe('POST /submit-report', () => {
  beforeEach(() => {
    logInAs(citizen);
    prisma.neighborhood.findUnique.mockResolvedValue({ id: 'n1' });
    prisma.report.create.mockResolvedValue({ id: 'report-1' });
  });

  it('asks a visitor who is not logged in to log in', async () => {
    const response = await request(app).post('/submit-report').type('form').send(validForm);

    expect(response.status).toBe(401);
    expect(prisma.report.create).not.toHaveBeenCalled();
  });

  it('refuses a user whose email is not verified', async () => {
    logInAs(citizen, { emailVerified: false });

    const response = await submitReport(validForm);

    expect(response.status).toBe(403);
    expect(prisma.report.create).not.toHaveBeenCalled();
  });

  it.each(['title', 'description', 'neighborhoodId'])('requires %s', async (field) => {
    const response = await submitReport({ ...validForm, [field]: '' });

    expect(response.status).toBe(422);
    expect(prisma.report.create).not.toHaveBeenCalled();
  });

  it('creates a missing profile, then saves the report for it', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.role.findUniqueOrThrow.mockResolvedValue({ id: 'role-citizen', title: 'Citizen' });
    prisma.user.create.mockResolvedValue(citizen);

    const response = await submitReport(validForm);

    expect(response.status).toBe(302);
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ firebaseUid: citizen.firebaseUid }) })
    );
    expect(prisma.report.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ authorId: citizen.id }),
    });
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

  it('shows the uploaded photo of a report, and a placeholder for reports without one', async () => {
    prisma.report.findMany.mockResolvedValue([
      { id: 'report-1', title: 'With photo', description: 'text', imageUrl: '/uploads/photo-id.jpg' },
      { id: 'report-2', title: 'Without photo', description: 'text', imageUrl: null },
    ]);

    const response = await request(app).get('/track');

    expect(response.text).toContain('src="/uploads/photo-id.jpg"');
    expect(response.text).toContain('src="/seo-report.png"');
  });
});

describe('POST /track/:id/delete', () => {
  it('asks a visitor who is not logged in to log in', async () => {
    const response = await request(app).post('/track/report-1/delete');

    expect(response.status).toBe(401);
    expect(prisma.report.delete).not.toHaveBeenCalled();
  });

  it('lets the author delete their own report', async () => {
    logInAs(citizen);
    prisma.report.findUnique.mockResolvedValue(ownReport);

    const response = await deleteReport(ownReport.id);

    expect(response.status).toBe(302);
    expect(prisma.report.delete).toHaveBeenCalledWith({ where: { id: ownReport.id } });
  });

  it('lets an admin delete any report', async () => {
    logInAs(admin);
    prisma.report.findUnique.mockResolvedValue(othersReport);

    const response = await deleteReport(othersReport.id);

    expect(response.status).toBe(302);
    expect(prisma.report.delete).toHaveBeenCalledWith({ where: { id: othersReport.id } });
  });

  it('stops a citizen deleting a report by another user', async () => {
    logInAs(citizen);
    prisma.report.findUnique.mockResolvedValue(othersReport);

    const response = await deleteReport(othersReport.id);

    expect(response.status).toBe(403);
    expect(prisma.report.delete).not.toHaveBeenCalled();
  });

  it('returns 404 for a report that does not exist', async () => {
    logInAs(citizen);
    prisma.report.findUnique.mockResolvedValue(null);

    const response = await deleteReport('missing');

    expect(response.status).toBe(404);
  });
});

describe('editing a report', () => {
  const editForm = { title: 'New title', description: 'New text' };

  function openEditForm(id, { loggedIn = true } = {}) {
    const call = request(app).get(`/track/${id}/edit`);
    return loggedIn ? call.set('Cookie', SESSION_COOKIE) : call;
  }

  function saveEdit(id, { loggedIn = true } = {}) {
    const call = request(app).post(`/track/${id}/edit`).type('form').send(editForm);
    return loggedIn ? call.set('Cookie', SESSION_COOKIE) : call;
  }

  it('asks a visitor who is not logged in to log in before opening the form', async () => {
    prisma.report.findUnique.mockResolvedValue(ownReport);

    const response = await openEditForm(ownReport.id, { loggedIn: false });

    expect(response.status).toBe(401);
  });

  it('asks a visitor who is not logged in to log in before saving', async () => {
    prisma.report.findUnique.mockResolvedValue(ownReport);

    const response = await saveEdit(ownReport.id, { loggedIn: false });

    expect(response.status).toBe(401);
    expect(prisma.report.update).not.toHaveBeenCalled();
  });

  it('shows the form to the author', async () => {
    logInAs(citizen);
    prisma.report.findUnique.mockResolvedValue(ownReport);

    const response = await openEditForm(ownReport.id);

    expect(response.status).toBe(200);
    expect(response.text).toContain('Mine');
  });

  it('saves changes made by the author', async () => {
    logInAs(citizen);
    prisma.report.findUnique.mockResolvedValue(ownReport);

    const response = await saveEdit(ownReport.id);

    expect(response.status).toBe(302);
    expect(prisma.report.update).toHaveBeenCalledWith({
      where: { id: ownReport.id },
      data: { title: 'New title', description: 'New text' },
    });
  });

  it('lets an admin edit any report', async () => {
    logInAs(admin);
    prisma.report.findUnique.mockResolvedValue(othersReport);

    const response = await saveEdit(othersReport.id);

    expect(response.status).toBe(302);
    expect(prisma.report.update).toHaveBeenCalled();
  });

  it('hides the form from a citizen who is not the author', async () => {
    logInAs(citizen);
    prisma.report.findUnique.mockResolvedValue(othersReport);

    const response = await openEditForm(othersReport.id);

    expect(response.status).toBe(403);
    expect(response.text).not.toContain('Theirs');
  });

  it('stops a citizen saving changes to a report by another user', async () => {
    logInAs(citizen);
    prisma.report.findUnique.mockResolvedValue(othersReport);

    const response = await saveEdit(othersReport.id);

    expect(response.status).toBe(403);
    expect(prisma.report.update).not.toHaveBeenCalled();
  });

  it('returns 404 for a report that does not exist', async () => {
    logInAs(citizen);
    prisma.report.findUnique.mockResolvedValue(null);

    const response = await saveEdit('missing');

    expect(response.status).toBe(404);
    expect(prisma.report.update).not.toHaveBeenCalled();
  });
});
