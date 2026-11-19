// Integration tests for image uploads, with fake Firebase and Prisma.
import request from 'supertest';
import app from '../../src/app.js';

describe('removed routes', () => {
  it('no longer accepts uploads from anyone at /api/upload', async () => {
    const response = await request(app)
      .post('/api/upload')
      .attach('image', Buffer.from('<script>alert(1)</script>'), 'page.html');

    expect(response.status).toBe(404);
  });

  it.each([
    ['GET', '/api/reports'],
    ['POST', '/api/reports'],
  ])('no longer serves %s %s, which could never succeed', async (method, url) => {
    const response = await request(app)[method.toLowerCase()](url);

    expect(response.status).toBe(404);
  });
});
