// Integration tests for login, logout, registration, and password reset.
// The Firebase REST client is replaced by fakes; the error class stays real.
import request from 'supertest';
import app from '../../src/app.js';
import {
  FirebaseIdentityError,
  sendPasswordResetEmail,
  sendVerificationEmail,
  setDisplayName,
  signInWithPassword,
  signUpWithPassword,
} from '../../src/services/firebase-identity.js';
import prisma from '../../prismaClient.js';
import { createSessionCookie, revokeRefreshTokens, verifySessionCookie } from './mocks/firebase.js';
import { SESSION_COOKIE, citizen, logInAs } from './helpers/auth.js';
import { postForm } from './helpers/csrf.js';

jest.mock('../../src/services/firebase-identity.js', () => {
  const actual = jest.requireActual('../../src/services/firebase-identity.js');
  return {
    ...actual,
    signInWithPassword: jest.fn(),
    signUpWithPassword: jest.fn(),
    sendVerificationEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
    setDisplayName: jest.fn(),
  };
});

const ONE_DAY_SECONDS = 24 * 60 * 60;
const credentials = { email: 'bob@example.com', password: 'correct horse' };


function sessionCookieFrom(response) {
  return (response.headers['set-cookie'] ?? []).find((cookie) => cookie.startsWith('session='));
}

describe('POST /api/login', () => {
  beforeEach(() => {
    signInWithPassword.mockResolvedValue({ idToken: 'fresh-id-token', uid: citizen.firebaseUid });
    createSessionCookie.mockResolvedValue('signed-session-cookie');
  });

  it('exchanges the ID token for a one-day session cookie and redirects home', async () => {
    const response = await postForm('/api/login', credentials);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/');
    expect(signInWithPassword).toHaveBeenCalledWith(credentials.email, credentials.password);
    expect(createSessionCookie).toHaveBeenCalledWith('fresh-id-token', { expiresIn: ONE_DAY_SECONDS * 1000 });
    expect(sessionCookieFrom(response)).toMatch(/^session=signed-session-cookie;/);
  });

  it('marks the cookie HttpOnly, SameSite=Lax, and expiring after one day', async () => {
    const cookie = sessionCookieFrom(await postForm('/api/login', credentials));

    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
    expect(cookie).toMatch(new RegExp(`Max-Age=${ONE_DAY_SECONDS}`));
    expect(cookie).toMatch(/Path=\//);
  });

  it('marks the cookie Secure when the request arrived over HTTPS at the proxy', async () => {
    const response = await postForm('/api/login', credentials, { headers: { 'X-Forwarded-Proto': 'https' } });

    expect(sessionCookieFrom(response)).toMatch(/Secure/);
  });

  it('does not mark the cookie Secure over plain HTTP, so local development still works', async () => {
    const cookie = sessionCookieFrom(await postForm('/api/login', credentials));

    expect(cookie).not.toMatch(/Secure/);
  });

  it.each(['INVALID_LOGIN_CREDENTIALS', 'EMAIL_NOT_FOUND', 'INVALID_PASSWORD', 'USER_DISABLED'])(
    'gives the same 401 message for %s, so it does not reveal which accounts exist',
    async (code) => {
      signInWithPassword.mockRejectedValue(new FirebaseIdentityError(code));

      const response = await postForm('/api/login', credentials);

      expect(response.status).toBe(401);
      expect(response.text).toContain('Incorrect email or password.');
      expect(response.text).not.toContain(code);
      expect(sessionCookieFrom(response)).toBeUndefined();
    }
  );

  it('asks the user to wait when Firebase reports too many attempts', async () => {
    signInWithPassword.mockRejectedValue(new FirebaseIdentityError('TOO_MANY_ATTEMPTS_TRY_LATER'));

    const response = await postForm('/api/login', credentials);

    expect(response.status).toBe(429);
    expect(response.text).toContain('Too many attempts');
  });

  it('refuses a malformed email address before contacting Firebase', async () => {
    const response = await postForm('/api/login', { ...credentials, email: 'not-an-email' });

    expect(response.status).toBe(422);
    expect(response.text).toContain('Please enter a valid email address.');
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it('asks for both fields before contacting Firebase', async () => {
    const response = await postForm('/api/login', { email: credentials.email });

    expect(response.status).toBe(422);
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it('does not show internal details when Firebase cannot be reached', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    signInWithPassword.mockRejectedValue(new Error('getaddrinfo ENOTFOUND identitytoolkit.googleapis.com'));

    const response = await postForm('/api/login', credentials);

    expect(response.status).toBe(500);
    expect(sessionCookieFrom(response)).toBeUndefined();
  });
});

describe('session checks', () => {
  it('verify the session cookie and check that it has not been revoked', async () => {
    logInAs(citizen);

    await request(app).get('/profile').set('Cookie', SESSION_COOKIE);

    expect(verifySessionCookie).toHaveBeenCalledWith('test-session', true);
  });
});

describe('POST /api/logout', () => {
  it('revokes the session at Firebase, so a copied cookie stops working', async () => {
    verifySessionCookie.mockResolvedValue({ sub: citizen.firebaseUid, uid: citizen.firebaseUid });

    const response = await postForm('/api/logout', {}, { sessionCookie: SESSION_COOKIE });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/');
    expect(revokeRefreshTokens).toHaveBeenCalledWith(citizen.firebaseUid);
  });

  it('deletes the session cookie in the browser', async () => {
    verifySessionCookie.mockResolvedValue({ sub: citizen.firebaseUid });

    const response = await postForm('/api/logout', {}, { sessionCookie: SESSION_COOKIE });

    const cookie = sessionCookieFrom(response);
    expect(cookie).toMatch(/^session=;/);
    expect(cookie).toMatch(/Expires=Thu, 01 Jan 1970/);
  });

  it('still clears the cookie when the session is already invalid', async () => {
    verifySessionCookie.mockRejectedValue(new Error('session revoked'));

    const response = await postForm('/api/logout', {}, { sessionCookie: SESSION_COOKIE });

    expect(response.status).toBe(302);
    expect(revokeRefreshTokens).not.toHaveBeenCalled();
    expect(sessionCookieFrom(response)).toMatch(/^session=;/);
  });
});

describe('POST /api/register', () => {
  const form = {
    name: 'Ada',
    surname: 'Lovelace',
    email: 'ada@example.org',
    password: 'analytical engine',
    confirm_password: 'analytical engine',
  };

  beforeEach(() => {
    signUpWithPassword.mockResolvedValue({ idToken: 'new-id-token', uid: 'uid-ada', email: 'ada@example.org' });
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.role.findUniqueOrThrow.mockResolvedValue({ id: 'role-citizen', title: 'Citizen' });
    prisma.user.create.mockImplementation(async ({ data }) => ({ id: 'user-ada', ...data }));
  });

  it('creates the Firebase account, names it, and sends the verification email', async () => {
    const response = await postForm('/api/register', form);

    expect(response.status).toBe(201);
    expect(signUpWithPassword).toHaveBeenCalledWith(form.email, form.password);
    expect(setDisplayName).toHaveBeenCalledWith('uid-ada', 'Ada Lovelace');
    expect(sendVerificationEmail).toHaveBeenCalledWith('new-id-token');
    expect(response.text).toContain('verify');
  });

  it('creates a citizen profile linked to the new Firebase ID, without any password hash', async () => {
    await postForm('/api/register', form);

    const { data } = prisma.user.create.mock.calls[0][0];
    expect(data).toMatchObject({
      firebaseUid: 'uid-ada',
      email: 'ada@example.org',
      firstName: 'Ada',
      lastName: 'Lovelace',
      roleId: 'role-citizen',
    });
    expect(data).not.toHaveProperty('passwordHash');
    expect(data).not.toHaveProperty('phone');
    expect(JSON.stringify(data)).not.toContain(form.password);
  });

  it('does not log the new user in before they verify their email', async () => {
    const response = await postForm('/api/register', form);

    expect(sessionCookieFrom(response)).toBeUndefined();
  });

  it('refuses passwords that do not match, before contacting Firebase', async () => {
    const response = await postForm('/api/register', { ...form, confirm_password: 'something else' });

    expect(response.status).toBe(422);
    expect(response.text).toContain('Passwords do not match');
    expect(signUpWithPassword).not.toHaveBeenCalled();
  });

  it('asks for an email address and password', async () => {
    const response = await postForm('/api/register', { ...form, email: '' });

    expect(response.status).toBe(422);
    expect(signUpWithPassword).not.toHaveBeenCalled();
  });

  it('refuses a password shorter than 12 characters before contacting Firebase', async () => {
    const response = await postForm('/api/register', { ...form, password: 'too short', confirm_password: 'too short' });

    expect(response.status).toBe(422);
    expect(response.text).toContain('at least 12 characters');
    expect(signUpWithPassword).not.toHaveBeenCalled();
  });

  it('asks for a name and surname before contacting Firebase', async () => {
    const response = await postForm('/api/register', { ...form, surname: '' });

    expect(response.status).toBe(422);
    expect(response.text).toContain('Please enter surname.');
    expect(signUpWithPassword).not.toHaveBeenCalled();
  });

  it.each([
    ['EMAIL_EXISTS', 409, 'already exists'],
    ['WEAK_PASSWORD', 422, 'at least 12 characters'],
    ['INVALID_EMAIL', 422, 'valid email address'],
    ['TOO_MANY_ATTEMPTS_TRY_LATER', 429, 'Too many attempts'],
  ])('explains %s on the registration page', async (code, status, message) => {
    signUpWithPassword.mockRejectedValue(new FirebaseIdentityError(code));

    const response = await postForm('/api/register', form);

    expect(response.status).toBe(status);
    expect(response.text).toContain(message);
    expect(response.text).not.toContain(code);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('still finishes registering when setting the display name fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    setDisplayName.mockRejectedValue(new Error('quota exceeded'));

    const response = await postForm('/api/register', form);

    expect(response.status).toBe(201);
    expect(sendVerificationEmail).toHaveBeenCalled();
  });
});

describe('POST /api/reset-password', () => {
  const RESET_NOTICE = 'If an account exists for this address, we sent it a link to reset the password.';

  it('asks Firebase to send the reset email and shows a neutral notice', async () => {
    sendPasswordResetEmail.mockResolvedValue(undefined);

    const response = await postForm('/api/reset-password', { email: 'bob@example.com' });

    expect(response.status).toBe(200);
    expect(sendPasswordResetEmail).toHaveBeenCalledWith('bob@example.com');
    expect(response.text).toContain(RESET_NOTICE);
  });

  it('shows exactly the same notice for an address with no account', async () => {
    sendPasswordResetEmail.mockRejectedValue(new FirebaseIdentityError('EMAIL_NOT_FOUND'));

    const response = await postForm('/api/reset-password', { email: 'nobody@example.com' });

    expect(response.status).toBe(200);
    expect(response.text).toContain(RESET_NOTICE);
    expect(response.text).not.toContain('EMAIL_NOT_FOUND');
  });

  it('asks the user to wait when Firebase reports too many attempts', async () => {
    sendPasswordResetEmail.mockRejectedValue(new FirebaseIdentityError('TOO_MANY_ATTEMPTS_TRY_LATER'));

    const response = await postForm('/api/reset-password', { email: 'bob@example.com' });

    expect(response.status).toBe(429);
  });

  it('asks for an email address', async () => {
    const response = await postForm('/api/reset-password', {});

    expect(response.status).toBe(422);
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });
});

describe('GET /sign_in', () => {
  it('offers a form to reset a forgotten password', async () => {
    const response = await request(app).get('/sign_in');

    expect(response.text).toContain('action="/api/reset-password"');
  });
});
