// What visitors see when something goes wrong, and what the server log records
import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../prismaClient.js';

const INTERNAL_DETAILS = /at .+\.js|SyntaxError|node_modules|src[\\/]/;

let logged;

beforeEach(() => {
  logged = [];
  jest.spyOn(console, 'error').mockImplementation((line) => logged.push(line));
});

describe('a page that does not exist', () => {
  it('shows a 404 page', async () => {
    const response = await request(app).get('/no-such-page');

    expect(response.status).toBe(404);
    expect(response.text).toContain('Page not found.');
    expect(response.text).toContain('class="navbar"');
  });
});

describe('an unexpected error', () => {
  beforeEach(() => {
    prisma.report.findMany.mockRejectedValue(new Error('connection to db.internal:5432 refused'));
    prisma.report.count.mockResolvedValue(1);
  });

  it('shows a general message with an error ID, and no details', async () => {
    const response = await request(app).get('/track');

    expect(response.status).toBe(500);
    expect(response.text).toContain('Something went wrong. Please try again later.');
    expect(response.text).toMatch(/error ID <strong>[0-9a-f]{8}<\/strong>/);
    expect(response.text).not.toContain('db.internal');
    expect(response.text).not.toMatch(INTERNAL_DETAILS);
  });

  it('logs the details under the same error ID', async () => {
    const response = await request(app).get('/track');

    const [, errorId] = response.text.match(/error ID <strong>([0-9a-f]{8})<\/strong>/);
    const entry = JSON.parse(logged[0]);
    expect(entry).toMatchObject({ type: 'error', errorId, method: 'GET', path: '/track' });
    expect(entry.error).toContain('db.internal:5432 refused');
  });

  it('gives every error its own ID', async () => {
    const first = await request(app).get('/track');
    const second = await request(app).get('/track');

    const idOf = (response) => response.text.match(/error ID <strong>([0-9a-f]{8})/)[1];
    expect(idOf(first)).not.toBe(idOf(second));
  });

  it('keeps each log entry on one line, so a value cannot fake another entry', async () => {
    prisma.report.findMany.mockRejectedValue(new Error('first line\n{"type":"error","errorId":"forged"}'));

    await request(app).get('/track');

    expect(logged).toHaveLength(1);
    expect(logged[0]).not.toContain('\n');
    expect(JSON.parse(logged[0]).errorId).not.toBe('forged');
  });

  it('applies to the statistics used by the graph page too', async () => {
    prisma.report.groupBy.mockRejectedValue(new Error('timeout'));

    const response = await request(app).get('/api/stats');

    expect(response.status).toBe(500);
    expect(response.text).not.toContain('timeout');
  });
});

describe('a malformed request', () => {
  it('answers broken JSON with 400 and no stack trace', async () => {
    const response = await request(app).post('/api/login').set('Content-Type', 'application/json').send('{"broken');

    expect(response.status).toBe(400);
    expect(response.text).toContain('The request could not be read.');
    expect(response.text).not.toMatch(INTERNAL_DETAILS);
    expect(logged).toEqual([]);
  });

  it('answers an oversized form with 413', async () => {
    const response = await request(app)
      .post('/api/login')
      .type('form')
      .send({ email: 'a'.repeat(200 * 1024) });

    expect(response.status).toBe(413);
    expect(response.text).toContain('The request is too large.');
    expect(response.text).not.toMatch(INTERNAL_DETAILS);
  });
});
