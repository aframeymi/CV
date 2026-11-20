// Integration tests: real Express app and real EJS views, with fake Firebase and Prisma.
import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../prismaClient.js';
import { SESSION_COOKIE, admin, citizen, logInAs } from './helpers/auth.js';
import { NEIGHBORHOOD_ID, OTHER_REPORT_ID, REPORT_ID } from './helpers/ids.js';
import { postForm } from './helpers/csrf.js';

const validForm = { title: 'Broken light', description: 'Out since Monday', neighborhoodId: NEIGHBORHOOD_ID };
const ownReport = { id: REPORT_ID, authorId: citizen.id, title: 'Mine', description: 'text' };
const othersReport = { id: OTHER_REPORT_ID, authorId: 'someone-else', title: 'Theirs', description: 'text' };

function submitReport(form) {
  return postForm('/submit-report', form, { sessionCookie: SESSION_COOKIE });
}

function deleteReport(id) {
  return postForm(`/track/${id}/delete`, {}, { sessionCookie: SESSION_COOKIE });
}

describe('POST /submit-report', () => {
  beforeEach(() => {
    logInAs(citizen);
    prisma.neighborhood.findUnique.mockResolvedValue({ id: NEIGHBORHOOD_ID });
    prisma.report.create.mockResolvedValue({ id: REPORT_ID });
  });

  it('asks a visitor who is not logged in to log in', async () => {
    const response = await postForm('/submit-report', validForm);

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

  it('refuses a neighborhood ID in the wrong format without asking the database', async () => {
    const response = await submitReport({ ...validForm, neighborhoodId: "' OR 1=1 --" });

    expect(response.status).toBe(422);
    expect(prisma.neighborhood.findUnique).not.toHaveBeenCalled();
  });

  it('refuses a title longer than 120 characters', async () => {
    const response = await submitReport({ ...validForm, title: 'a'.repeat(121) });

    expect(response.status).toBe(422);
    expect(response.text).toBe('The title can be at most 120 characters.');
    expect(prisma.report.create).not.toHaveBeenCalled();
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
      data: expect.objectContaining({ reportId: REPORT_ID, to: 'OPEN' }),
    });
  });
});

describe('GET /track', () => {
  beforeEach(() => {
    prisma.report.findMany.mockResolvedValue([]);
    prisma.report.count.mockResolvedValue(0);
  });

  it('escapes HTML in report content', async () => {
    prisma.report.findMany.mockResolvedValue([
      { id: REPORT_ID, title: '<script>alert(1)</script>', description: 'text' },
    ]);

    const response = await request(app).get('/track');

    expect(response.status).toBe(200);
    expect(response.text).not.toContain('<script>alert(1)</script>');
    expect(response.text).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('shows the uploaded photo of a report, and a placeholder for reports without one', async () => {
    prisma.report.findMany.mockResolvedValue([
      { id: REPORT_ID, title: 'With photo', description: 'text', imageUrl: '/uploads/photo-id.jpg' },
      { id: OTHER_REPORT_ID, title: 'Without photo', description: 'text', imageUrl: null },
    ]);

    const response = await request(app).get('/track');

    expect(response.text).toContain('src="/uploads/photo-id.jpg"');
    expect(response.text).toContain('src="/seo-report.png"');
  });

  it('loads 20 reports at a time, and only the fields the page shows', async () => {
    prisma.report.count.mockResolvedValue(45);

    await request(app).get('/track?page=2');

    expect(prisma.report.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: { id: true, title: true, description: true, imageUrl: true },
        skip: 20,
        take: 20,
      })
    );
  });

  it('starts at the first page and links to the next one', async () => {
    prisma.report.count.mockResolvedValue(45);

    const response = await request(app).get('/track');

    expect(prisma.report.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0 }));
    expect(response.text).toContain('Page 1 of 3');
    expect(response.text).toContain('href="/track?page=2"');
    expect(response.text).not.toContain('Newer reports');
  });

  it('links back from the last page, but not further', async () => {
    prisma.report.count.mockResolvedValue(45);

    const response = await request(app).get('/track?page=3');

    expect(response.text).toContain('href="/track?page=2"');
    expect(response.text).not.toContain('Older reports');
  });

  it('shows an empty first page when there are no reports', async () => {
    const response = await request(app).get('/track');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Page 1 of 1');
  });

  it.each(['0', '-1', 'abc', '1.5'])('returns 404 for the page number %p', async (page) => {
    const response = await request(app).get(`/track?page=${page}`);

    expect(response.status).toBe(404);
    expect(prisma.report.findMany).not.toHaveBeenCalled();
  });

  it('returns 404 for a page after the last one', async () => {
    prisma.report.count.mockResolvedValue(45);

    const response = await request(app).get('/track?page=4');

    expect(response.status).toBe(404);
  });
});

describe('POST /track/:id/delete', () => {
  it('asks a visitor who is not logged in to log in', async () => {
    const response = await postForm(`/track/${REPORT_ID}/delete`);

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

    const response = await deleteReport(REPORT_ID);

    expect(response.status).toBe(404);
  });

  it('returns 404 for a malformed report ID without asking the database', async () => {
    logInAs(citizen);

    const response = await deleteReport('not-a-report-id');

    expect(response.status).toBe(404);
    expect(prisma.report.findUnique).not.toHaveBeenCalled();
  });
});

describe('editing a report', () => {
  const editForm = { title: 'New title', description: 'New text' };

  function openEditForm(id, { loggedIn = true } = {}) {
    const call = request(app).get(`/track/${id}/edit`);
    return loggedIn ? call.set('Cookie', SESSION_COOKIE) : call;
  }

  function saveEdit(id, { loggedIn = true, form = editForm } = {}) {
    return postForm(`/track/${id}/edit`, form, { sessionCookie: loggedIn ? SESSION_COOKIE : undefined });
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

  it('refuses an empty title', async () => {
    logInAs(citizen);
    prisma.report.findUnique.mockResolvedValue(ownReport);

    const response = await saveEdit(ownReport.id, { form: { ...editForm, title: '' } });

    expect(response.status).toBe(422);
    expect(prisma.report.update).not.toHaveBeenCalled();
  });

  it('changes only the title and description, whatever else the form sends', async () => {
    logInAs(citizen);
    prisma.report.findUnique.mockResolvedValue(ownReport);

    await saveEdit(ownReport.id, { form: { ...editForm, status: 'RESOLVED', authorId: 'someone-else' } });

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

    const response = await saveEdit(REPORT_ID);

    expect(response.status).toBe(404);
    expect(prisma.report.update).not.toHaveBeenCalled();
  });
});
