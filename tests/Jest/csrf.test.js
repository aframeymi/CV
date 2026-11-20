// Cross-site request forgery: a form posted without the token from one of this site's pages is refused
import fs from 'fs';
import path from 'path';
import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../prismaClient.js';
import { signInWithPassword } from '../../src/services/firebase-identity.js';
import { SESSION_COOKIE, citizen, logInAs } from './helpers/auth.js';
import { csrfCredentials, postForm } from './helpers/csrf.js';
import { NEIGHBORHOOD_ID, REPORT_ID } from './helpers/ids.js';

jest.mock('../../src/services/firebase-identity.js', () => ({
  ...jest.requireActual('../../src/services/firebase-identity.js'),
  signInWithPassword: jest.fn(),
}));

const UPLOAD_DIRECTORY = path.join(process.cwd(), 'public', 'uploads');
const credentials = { email: 'bob@example.com', password: 'correct horse' };
const ownReport = { id: REPORT_ID, authorId: citizen.id, title: 'Mine', description: 'text' };

function forgedPost(url, form = {}, cookies = [SESSION_COOKIE]) {
  return request(app).post(url).set('Cookie', cookies).type('form').send(form);
}

beforeEach(() => {
  logInAs(citizen);
  prisma.report.findUnique.mockResolvedValue(ownReport);
});

describe('a form posted without a valid token', () => {
  it.each([
    ['/api/login', credentials],
    ['/api/register', { email: 'new@example.org', password: 'long enough password' }],
    ['/api/reset-password', { email: 'bob@example.com' }],
    ['/api/logout', {}],
    [`/track/${REPORT_ID}/edit`, { title: 'Changed', description: 'by another site' }],
    [`/track/${REPORT_ID}/delete`, {}],
  ])('is refused at %s', async (url, form) => {
    const response = await forgedPost(url, form);

    expect(response.status).toBe(403);
    expect(response.text).toContain('This form has expired');
  });

  it('never reaches the handler', async () => {
    await forgedPost(`/track/${REPORT_ID}/delete`);
    await forgedPost('/api/login', credentials, []);

    expect(prisma.report.findUnique).not.toHaveBeenCalled();
    expect(prisma.report.delete).not.toHaveBeenCalled();
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it('is refused when the token is missing but the cookie is there', async () => {
    const { cookies } = await csrfCredentials(SESSION_COOKIE);

    const response = await forgedPost(`/track/${REPORT_ID}/delete`, {}, cookies);

    expect(response.status).toBe(403);
  });

  it('is refused when the token is there but the cookie is missing', async () => {
    const { token } = await csrfCredentials(SESSION_COOKIE);

    const response = await forgedPost(`/track/${REPORT_ID}/delete`, { _csrf: token });

    expect(response.status).toBe(403);
  });

  it('is refused when the token was issued to a different session', async () => {
    const { token, cookies } = await csrfCredentials();

    const response = await forgedPost(`/track/${REPORT_ID}/delete`, { _csrf: token }, [SESSION_COOKIE, ...cookies]);

    expect(response.status).toBe(403);
  });

  it('is refused when sent as multipart to a route that does not read multipart forms', async () => {
    const { token, cookies } = await csrfCredentials(SESSION_COOKIE);

    const response = await request(app)
      .post(`/track/${REPORT_ID}/delete`)
      .set('Cookie', [SESSION_COOKIE, ...cookies.slice(1)])
      .field('_csrf', token);

    expect(response.status).toBe(403);
    expect(prisma.report.delete).not.toHaveBeenCalled();
  });
});

describe('the report form, which is multipart', () => {
  beforeEach(() => {
    prisma.neighborhood.findUnique.mockResolvedValue({ id: NEIGHBORHOOD_ID });
    prisma.report.create.mockResolvedValue({ id: REPORT_ID });
  });

  function submitReport(cookies, token) {
    const call = request(app)
      .post('/submit-report')
      .set('Cookie', cookies)
      .field('title', 'Broken light')
      .field('description', 'Out since Monday')
      .field('neighborhoodId', NEIGHBORHOOD_ID);
    return token ? call.field('_csrf', token) : call;
  }

  it('is refused without a token, and stores nothing', async () => {
    const filesBefore = fs.readdirSync(UPLOAD_DIRECTORY);

    const response = await submitReport([SESSION_COOKIE]).attach('image', Buffer.from([0x89, 0x50, 0x4e, 0x47]), 'a.png');

    expect(response.status).toBe(403);
    expect(prisma.report.create).not.toHaveBeenCalled();
    expect(fs.readdirSync(UPLOAD_DIRECTORY)).toEqual(filesBefore);
  });

  it('is accepted with the token from the page', async () => {
    const { token, cookies } = await csrfCredentials(SESSION_COOKIE);

    const response = await submitReport(cookies, token);

    expect(response.status).toBe(302);
    expect(prisma.report.create).toHaveBeenCalled();
  });
});

describe('a form posted with the token from the page', () => {
  it('is accepted', async () => {
    const response = await postForm(`/track/${REPORT_ID}/delete`, {}, { sessionCookie: SESSION_COOKIE });

    expect(response.status).toBe(302);
    expect(prisma.report.delete).toHaveBeenCalled();
  });
});

describe('the CSRF cookie', () => {
  function csrfCookieFrom(response) {
    return response.headers['set-cookie'].find((cookie) => cookie.startsWith('csrf-token='));
  }

  it('is HttpOnly and SameSite=Strict, so scripts and other sites cannot use it', async () => {
    const cookie = csrfCookieFrom(await request(app).get('/sign_in'));

    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Strict/);
    expect(cookie).toMatch(/Path=\//);
  });

  it('is Secure over HTTPS, but not on plain HTTP, so local development still works', async () => {
    const overHttps = csrfCookieFrom(await request(app).get('/sign_in').set('X-Forwarded-Proto', 'https'));
    const overHttp = csrfCookieFrom(await request(app).get('/sign_in'));

    expect(overHttps).toMatch(/Secure/);
    expect(overHttp).not.toMatch(/Secure/);
  });
});

describe('starting without a CSRF secret', () => {
  const configuredSecret = process.env.CSRF_SECRET;

  afterEach(() => {
    process.env.CSRF_SECRET = configuredSecret;
  });

  it.each([
    ['missing', undefined],
    ['too short', 'short'],
  ])('fails at once when the secret is %s, instead of running unprotected', (label, value) => {
    if (value === undefined) {
      delete process.env.CSRF_SECRET;
    } else {
      process.env.CSRF_SECRET = value;
    }

    jest.isolateModules(() => {
      expect(() => jest.requireActual('../../src/middleware/csrf-protection.js')).toThrow(/CSRF_SECRET/);
    });
  });
});
