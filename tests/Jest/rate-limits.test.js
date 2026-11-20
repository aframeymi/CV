// Rate limits: one client repeating an action too often is stopped, other clients are not affected
import prisma from '../../prismaClient.js';
import { createSessionCookie } from './mocks/firebase.js';
import {
  FirebaseIdentityError,
  sendPasswordResetEmail,
  signInWithPassword,
  signUpWithPassword,
} from '../../src/services/firebase-identity.js';
import { SESSION_COOKIE, citizen, logInAs } from './helpers/auth.js';
import { postForm } from './helpers/browser.js';
import { NEIGHBORHOOD_ID, REPORT_ID } from './helpers/ids.js';

jest.mock('../../src/services/firebase-identity.js', () => ({
  ...jest.requireActual('../../src/services/firebase-identity.js'),
  signInWithPassword: jest.fn(),
  signUpWithPassword: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
}));

const credentials = { email: 'bob@example.com', password: 'wrong password' };
let addressCount = 0;

// Each test uses its own fixed address, so the limits reached in one test do not affect the next
function sameClient() {
  addressCount += 1;
  return { 'X-Forwarded-For': `192.0.2.${addressCount}` };
}

async function postRepeatedly(times, url, form, options) {
  const responses = [];
  for (let attempt = 0; attempt < times; attempt += 1) {
    responses.push(await postForm(url, form, options));
  }
  return responses;
}

function statuses(responses) {
  return responses.map((response) => response.status);
}

describe('POST /api/login', () => {
  it('stops a client after 10 failed logins within 15 minutes', async () => {
    signInWithPassword.mockRejectedValue(new FirebaseIdentityError('INVALID_LOGIN_CREDENTIALS'));
    const headers = sameClient();

    const responses = await postRepeatedly(11, '/api/login', credentials, { headers });

    expect(statuses(responses.slice(0, 10))).toEqual(Array(10).fill(401));
    expect(responses[10].status).toBe(429);
    expect(responses[10].text).toContain('Too many attempts');
    expect(signInWithPassword).toHaveBeenCalledTimes(10);
  });

  it('does not count successful logins', async () => {
    signInWithPassword.mockResolvedValue({ idToken: 'id-token' });
    createSessionCookie.mockResolvedValue('session-cookie');
    const headers = sameClient();

    const responses = await postRepeatedly(12, '/api/login', credentials, { headers });

    expect(statuses(responses)).toEqual(Array(12).fill(302));
  });

  it('does not stop other clients', async () => {
    signInWithPassword.mockRejectedValue(new FirebaseIdentityError('INVALID_LOGIN_CREDENTIALS'));
    await postRepeatedly(11, '/api/login', credentials, { headers: sameClient() });

    const otherClient = await postForm('/api/login', credentials, { headers: sameClient() });

    expect(otherClient.status).toBe(401);
  });

  it('tells the client how long to wait, in the standard RateLimit headers', async () => {
    signInWithPassword.mockRejectedValue(new FirebaseIdentityError('INVALID_LOGIN_CREDENTIALS'));

    const [last] = (await postRepeatedly(11, '/api/login', credentials, { headers: sameClient() })).slice(-1);

    expect(last.headers['ratelimit-policy']).toMatch(/q=10; w=900/);
    expect(last.headers['retry-after']).toBeDefined();
  });
});

describe('POST /api/register', () => {
  it('stops a client after 5 registrations within an hour', async () => {
    signUpWithPassword.mockRejectedValue(new FirebaseIdentityError('EMAIL_EXISTS'));
    const form = {
      name: 'Ada',
      surname: 'Lovelace',
      email: 'ada@example.org',
      password: 'analytical engine',
      confirm_password: 'analytical engine',
    };

    const responses = await postRepeatedly(6, '/api/register', form, { headers: sameClient() });

    expect(responses[5].status).toBe(429);
    expect(signUpWithPassword).toHaveBeenCalledTimes(5);
  });
});

describe('POST /api/reset-password', () => {
  it('stops a client after 5 reset emails within an hour, so nobody can flood an inbox', async () => {
    const responses = await postRepeatedly(6, '/api/reset-password', { email: 'bob@example.com' }, {
      headers: sameClient(),
    });

    expect(statuses(responses.slice(0, 5))).toEqual(Array(5).fill(200));
    expect(responses[5].status).toBe(429);
    expect(sendPasswordResetEmail).toHaveBeenCalledTimes(5);
  });
});

describe('POST /submit-report', () => {
  it('stops a client after 20 reports within an hour', async () => {
    logInAs(citizen);
    prisma.neighborhood.findUnique.mockResolvedValue({ id: NEIGHBORHOOD_ID });
    prisma.report.create.mockResolvedValue({ id: REPORT_ID });
    const form = { title: 'Broken light', description: 'Out since Monday', neighborhoodId: NEIGHBORHOOD_ID };

    const responses = await postRepeatedly(21, '/submit-report', form, {
      sessionCookie: SESSION_COOKIE,
      headers: sameClient(),
    });

    expect(statuses(responses.slice(0, 20))).toEqual(Array(20).fill(302));
    expect(responses[20].status).toBe(429);
    expect(prisma.report.create).toHaveBeenCalledTimes(20);
  });
});
