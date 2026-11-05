// Integration tests: real Express app and real EJS views, with fake Firebase and Prisma.
import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../prismaClient.js';
import { SESSION_COOKIE, logInAs, rejectToken } from './helpers/auth.js';

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
});

describe('GET /profile', () => {
  it('rejects a visitor with no cookie', async () => {
    const response = await request(app).get('/profile');

    expect(response.status).toBe(403);
  });

  it('rejects an invalid token', async () => {
    rejectToken();
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const response = await request(app).get('/profile').set('Cookie', SESSION_COOKIE);

    expect(response.status).toBe(403);
  });

  it('shows the page to a logged-in user', async () => {
    logInAs('bob@example.com');

    const response = await request(app).get('/profile').set('Cookie', SESSION_COOKIE);

    expect(response.status).toBe(200);
    expect(response.text).toContain('bob@example.com');
  });
});
