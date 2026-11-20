// The security event log: which actions are recorded, and that no secret or email address ever is
import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../prismaClient.js';
import { createSessionCookie } from './mocks/firebase.js';
import {
  FirebaseIdentityError,
  sendPasswordResetEmail,
  sendVerificationEmail,
  signInWithPassword,
  signUpWithPassword,
} from '../../src/services/firebase-identity.js';
import { SESSION_COOKIE, admin, citizen, logInAs } from './helpers/auth.js';
import { csrfCredentials, postForm } from './helpers/browser.js';
import { NEIGHBORHOOD_ID, OTHER_REPORT_ID, REPORT_ID } from './helpers/ids.js';

jest.mock('../../src/services/firebase-identity.js', () => ({
  ...jest.requireActual('../../src/services/firebase-identity.js'),
  signInWithPassword: jest.fn(),
  signUpWithPassword: jest.fn(),
  sendVerificationEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  setDisplayName: jest.fn(),
}));

const PASSWORD = 'correct horse battery';
const EMAIL = 'bob@example.com';
let lines;

function events() {
  return lines.map((line) => JSON.parse(line)).filter((entry) => entry.type === 'security');
}

function eventsNamed(name) {
  return events().filter((entry) => entry.event === name);
}

beforeEach(() => {
  lines = [];
  jest.spyOn(console, 'info').mockImplementation((line) => lines.push(line));
});

afterEach(() => {
  const everything = lines.join('\n');
  expect(everything).not.toContain(PASSWORD);
  expect(everything).not.toContain(EMAIL);
  expect(everything).not.toContain('test-session');
  expect(everything).not.toMatch(/csrf-token|_csrf/);
});

describe('logins', () => {
  it('records a successful login with the Firebase ID and IP address', async () => {
    signInWithPassword.mockResolvedValue({ idToken: 'id-token', uid: 'uid-bob' });
    createSessionCookie.mockResolvedValue('session-cookie');

    await postForm('/api/login', { email: EMAIL, password: PASSWORD }, { headers: { 'X-Forwarded-For': '198.51.100.7' } });

    expect(eventsNamed('login.succeeded')).toEqual([
      expect.objectContaining({ firebaseUid: 'uid-bob', ip: '198.51.100.7', path: '/api/login' }),
    ]);
  });

  it('records a failed login with its reason, but not the email address that was tried', async () => {
    signInWithPassword.mockRejectedValue(new FirebaseIdentityError('INVALID_LOGIN_CREDENTIALS'));

    await postForm('/api/login', { email: EMAIL, password: PASSWORD });

    expect(eventsNamed('login.failed')).toEqual([expect.objectContaining({ reason: 'INVALID_LOGIN_CREDENTIALS' })]);
  });

  it('records a logout', async () => {
    logInAs(citizen);

    await postForm('/api/logout', {}, { sessionCookie: SESSION_COOKIE });

    expect(eventsNamed('logout')).toEqual([expect.objectContaining({ firebaseUid: citizen.firebaseUid })]);
  });
});

describe('accounts', () => {
  it('records a new account by its Firebase ID', async () => {
    signUpWithPassword.mockResolvedValue({ idToken: 'id-token', uid: 'uid-new', email: 'new@example.org' });
    sendVerificationEmail.mockResolvedValue();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.role.findUniqueOrThrow.mockResolvedValue({ id: 'role-citizen', title: 'Citizen' });
    prisma.user.create.mockResolvedValue({ id: 'user-new' });

    await postForm('/api/register', {
      name: 'Ada',
      surname: 'Lovelace',
      email: 'new@example.org',
      password: PASSWORD,
      confirm_password: PASSWORD,
    });

    expect(eventsNamed('account.registered')).toEqual([expect.objectContaining({ firebaseUid: 'uid-new' })]);
    expect(lines.join('\n')).not.toContain('new@example.org');
  });

  it('records a password reset request without the address', async () => {
    sendPasswordResetEmail.mockResolvedValue();

    await postForm('/api/reset-password', { email: EMAIL });

    expect(eventsNamed('password_reset.requested')).toHaveLength(1);
  });
});

describe('refused requests', () => {
  it('records a visitor who is not logged in', async () => {
    await request(app).get('/profile');

    expect(eventsNamed('access.denied')).toEqual([
      expect.objectContaining({ reason: 'not_logged_in', path: '/profile', method: 'GET' }),
    ]);
  });

  it('records a user whose email is not verified', async () => {
    logInAs(citizen, { emailVerified: false });

    await request(app).get('/profile').set('Cookie', SESSION_COOKIE);

    expect(eventsNamed('access.denied')).toEqual([
      expect.objectContaining({ reason: 'email_not_verified', firebaseUid: citizen.firebaseUid }),
    ]);
  });

  it('records a citizen trying an admin page', async () => {
    logInAs(citizen);

    await request(app).get('/admin/analytics').set('Cookie', SESSION_COOKIE);

    expect(eventsNamed('access.denied')).toEqual([
      expect.objectContaining({ reason: 'not_admin', userId: citizen.id }),
    ]);
  });

  it('records a citizen trying to change a report by someone else', async () => {
    logInAs(citizen);
    prisma.report.findUnique.mockResolvedValue({ id: OTHER_REPORT_ID, authorId: 'someone-else' });

    await postForm(`/track/${OTHER_REPORT_ID}/delete`, {}, { sessionCookie: SESSION_COOKIE });

    expect(eventsNamed('access.denied')).toEqual([
      expect.objectContaining({ reason: 'not_report_author', reportId: OTHER_REPORT_ID, userId: citizen.id }),
    ]);
  });

  it('records a form without a valid CSRF token', async () => {
    await request(app).post('/api/login').type('form').send({ email: EMAIL, password: PASSWORD });

    expect(eventsNamed('csrf.rejected')).toEqual([expect.objectContaining({ path: '/api/login' })]);
  });

  it('records a client reaching a rate limit', async () => {
    sendPasswordResetEmail.mockResolvedValue();
    const headers = { 'X-Forwarded-For': '203.0.113.9' };

    for (let attempt = 0; attempt < 6; attempt += 1) {
      await postForm('/api/reset-password', { email: EMAIL }, { headers });
    }

    expect(eventsNamed('rate_limit.reached')).toEqual([
      expect.objectContaining({ limit: 'password_reset', ip: '203.0.113.9' }),
    ]);
  });

  it('records an upload that is not an allowed image', async () => {
    logInAs(citizen);
    prisma.neighborhood.findUnique.mockResolvedValue({ id: NEIGHBORHOOD_ID });

    const { token, cookies } = await csrfCredentials(SESSION_COOKIE);
    await request(app)
      .post('/submit-report')
      .set('Cookie', cookies)
      .field('_csrf', token)
      .field('title', 'Light')
      .field('description', 'Out')
      .field('neighborhoodId', NEIGHBORHOOD_ID)
      .attach('image', Buffer.from('<html></html>'), 'page.png');

    expect(eventsNamed('upload.rejected')).toEqual([expect.objectContaining({ reason: 'unsupported_type' })]);
  });
});

describe('changes to reports', () => {
  it('records a new report', async () => {
    logInAs(citizen);
    prisma.neighborhood.findUnique.mockResolvedValue({ id: NEIGHBORHOOD_ID });
    prisma.report.create.mockResolvedValue({ id: REPORT_ID });

    await postForm(
      '/submit-report',
      { title: 'Light', description: 'Out', neighborhoodId: NEIGHBORHOOD_ID },
      { sessionCookie: SESSION_COOKIE }
    );

    expect(eventsNamed('report.created')).toEqual([
      expect.objectContaining({ reportId: REPORT_ID, userId: citizen.id }),
    ]);
  });

  it('records an author editing their own report', async () => {
    logInAs(citizen);
    prisma.report.findUnique.mockResolvedValue({ id: REPORT_ID, authorId: citizen.id });

    await postForm(`/track/${REPORT_ID}/edit`, { title: 'New', description: 'Text' }, { sessionCookie: SESSION_COOKIE });

    expect(eventsNamed('report.updated')).toEqual([
      expect.objectContaining({ reportId: REPORT_ID, userId: citizen.id, byAdminForAuthor: false }),
    ]);
  });

  it('records an admin deleting a report by someone else', async () => {
    logInAs(admin);
    prisma.report.findUnique.mockResolvedValue({ id: REPORT_ID, authorId: citizen.id });

    await postForm(`/track/${REPORT_ID}/delete`, {}, { sessionCookie: SESSION_COOKIE });

    expect(eventsNamed('report.deleted')).toEqual([
      expect.objectContaining({ reportId: REPORT_ID, userId: admin.id, authorId: citizen.id, byAdminForAuthor: true }),
    ]);
  });
});
