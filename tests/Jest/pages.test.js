// Integration tests: real Express app and real EJS views, with fake Firebase and Prisma.
import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../prismaClient.js';
import { SESSION_COOKIE, citizen, logInAs, rejectToken } from './helpers/auth.js';
import { verifySessionCookie } from './mocks/firebase.js';

describe('public pages', () => {
  it.each(['/', '/sign_in', '/sign_up', '/graph'])('renders %s without login', async (url) => {
    const response = await request(app).get(url);

    expect(response.status).toBe(200);
    expect(response.type).toBe('text/html');
  });

  it('returns 404 for an unknown page', async () => {
    const response = await request(app).get('/does-not-exist');

    expect(response.status).toBe(404);
  });

  it('lists the cities on the report form', async () => {
    prisma.city.findMany.mockResolvedValue([{ id: 'c1', name: 'Berlin', neighborhoods: [] }]);

    const response = await request(app).get('/report');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Berlin');
  });

  it('cannot be made to end its inline script by a city name', async () => {
    const name = '</script><script>alert(1)</script>';
    prisma.city.findMany.mockResolvedValue([{ id: 'c1', name, neighborhoods: [] }]);

    const response = await request(app).get('/report');

    expect(response.text).not.toContain('</script><script>alert(1)');
    expect(response.text).toContain('\\u003c/script>\\u003cscript>alert(1)\\u003c/script>');
  });
});

describe('GET /profile', () => {
  it('asks a visitor with no cookie to log in', async () => {
    const response = await request(app).get('/profile');

    expect(response.status).toBe(401);
  });

  it('asks a visitor with an invalid token to log in', async () => {
    rejectToken();

    const response = await request(app).get('/profile').set('Cookie', SESSION_COOKIE);

    expect(response.status).toBe(401);
  });

  it('refuses a user whose email is not verified', async () => {
    logInAs(citizen, { emailVerified: false });

    const response = await request(app).get('/profile').set('Cookie', SESSION_COOKIE);

    expect(response.status).toBe(403);
    expect(response.body.error).toMatch(/verify your email/);
  });

  it('shows the page to a logged-in, verified user', async () => {
    logInAs(citizen);

    const response = await request(app).get('/profile').set('Cookie', SESSION_COOKIE);

    expect(response.status).toBe(200);
    expect(response.text).toContain(citizen.email);
  });
});

describe('static files', () => {
  it('are served without checking the session', async () => {
    const response = await request(app).get('/style.css').set('Cookie', SESSION_COOKIE);

    expect(response.status).toBe(200);
    expect(verifySessionCookie).not.toHaveBeenCalled();
  });
});
