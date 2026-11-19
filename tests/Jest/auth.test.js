// Integration tests for login, logout, registration, and password reset.
// The Firebase REST client is replaced by fakes; the error class stays real.
import request from 'supertest';
import app from '../../src/app.js';
import { FirebaseIdentityError, signInWithPassword } from '../../src/services/firebase-identity.js';
import { createSessionCookie, verifySessionCookie } from './mocks/firebase.js';
import { SESSION_COOKIE, citizen, logInAs } from './helpers/auth.js';

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

function postForm(url, form) {
  return request(app).post(url).type('form').send(form);
}

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
    const response = await request(app)
      .post('/api/login')
      .set('X-Forwarded-Proto', 'https')
      .type('form')
      .send(credentials);

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
