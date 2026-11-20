// Every page keeps its scripts and styles in files, so the Content Security Policy can forbid inline code.
// A page that brings back an inline script, style attribute, or event handler attribute fails here.
import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../prismaClient.js';
import { SESSION_COOKIE, citizen, logInAs } from './helpers/auth.js';
import { REPORT_ID } from './helpers/ids.js';

const INLINE_SCRIPT = /<script(?![^>]*\bsrc=)(?![^>]*type="application\/json")[^>]*>/i;
const STYLE_ATTRIBUTE = /\sstyle=/i;
const EVENT_HANDLER_ATTRIBUTE = /\son[a-z]+=/i;
const JAVASCRIPT_URL = /javascript:/i;
const EXTERNAL_SCRIPT = /<script[^>]*\bsrc="https?:/i;

const pages = [
  ['/', {}],
  ['/sign_in', {}],
  ['/sign_up', {}],
  ['/graph', {}],
  ['/report', {}],
  ['/track', {}],
  ['/profile', { loggedIn: true }],
  [`/track/${REPORT_ID}/edit`, { loggedIn: true }],
];

beforeEach(() => {
  logInAs(citizen);
  prisma.city.findMany.mockResolvedValue([{ id: 'c1', name: 'Berlin', neighborhoods: [] }]);
  prisma.report.findMany.mockResolvedValue([{ id: REPORT_ID, title: 'Light', description: 'Out', imageUrl: null }]);
  prisma.report.count.mockResolvedValue(1);
  prisma.report.findUnique.mockResolvedValue({ id: REPORT_ID, authorId: citizen.id, title: 'Light', description: 'Out' });
});

describe.each(pages)('%s', (url, { loggedIn = false }) => {
  let html;

  beforeEach(async () => {
    const call = request(app).get(url);
    const response = await (loggedIn ? call.set('Cookie', SESSION_COOKIE) : call);
    expect(response.status).toBe(200);
    html = response.text;
  });

  it('has no inline scripts', () => {
    expect(html).not.toMatch(INLINE_SCRIPT);
  });

  it('has no style attributes', () => {
    expect(html).not.toMatch(STYLE_ATTRIBUTE);
  });

  it('has no event handler attributes or javascript: links', () => {
    expect(html).not.toMatch(EVENT_HANDLER_ATTRIBUTE);
    expect(html).not.toMatch(JAVASCRIPT_URL);
  });

  it('loads no scripts from other sites', () => {
    expect(html).not.toMatch(EXTERNAL_SCRIPT);
  });
});

describe('GET /vendor/chart.umd.js', () => {
  it('serves Chart.js from the installed package', async () => {
    const response = await request(app).get('/vendor/chart.umd.js');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/javascript/);
    expect(response.text).toContain('Chart');
  });
});
