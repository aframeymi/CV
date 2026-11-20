// Integration tests for image uploads, with fake Firebase and Prisma.
// Uploads go to the real public/uploads folder; each test removes what it created.
import fs from 'fs';
import path from 'path';
import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../prismaClient.js';
import { SESSION_COOKIE, citizen, logInAs } from './helpers/auth.js';
import { NEIGHBORHOOD_ID, REPORT_ID } from './helpers/ids.js';
import { csrfCredentials, newVisitorAddress, postForm } from './helpers/browser.js';

const UPLOAD_DIRECTORY = path.join(process.cwd(), 'public', 'uploads');
const FIVE_MB = 5 * 1024 * 1024;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
const WEBP_HEADER = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 ')]);
const validForm = { title: 'Broken light', description: 'Out since Monday', neighborhoodId: NEIGHBORHOOD_ID };

const pngImage = Buffer.concat([PNG_SIGNATURE, Buffer.alloc(64)]);

let filesBefore;

function uploadedFiles() {
  return fs.readdirSync(UPLOAD_DIRECTORY).filter((name) => name !== '.gitkeep');
}

function newFiles() {
  return uploadedFiles().filter((name) => !filesBefore.includes(name));
}

// Sends the report form as a browser does: multipart, with the CSRF token as one of its fields
async function submitWithImages(images, { form = validForm, sessionCookie = SESSION_COOKIE } = {}) {
  const { token, cookies } = await csrfCredentials(sessionCookie);
  const call = request(app)
    .post('/submit-report')
    .set('X-Forwarded-For', newVisitorAddress())
    .set('Cookie', cookies)
    .field('_csrf', token);
  Object.entries(form).forEach(([field, value]) => call.field(field, value));
  images.forEach(({ content, fileName, contentType }) =>
    call.attach('image', content, { filename: fileName, contentType })
  );
  return call;
}

function submitWithImage(content, fileName, contentType, form = validForm) {
  return submitWithImages([{ content, fileName, contentType }], { form });
}

beforeEach(() => {
  filesBefore = uploadedFiles();
  logInAs(citizen);
  prisma.neighborhood.findUnique.mockResolvedValue({ id: NEIGHBORHOOD_ID });
  prisma.report.create.mockResolvedValue({ id: REPORT_ID });
});

afterEach(() => {
  newFiles().forEach((name) => fs.unlinkSync(path.join(UPLOAD_DIRECTORY, name)));
});

describe('removed routes', () => {
  // Only /submit-report reads multipart forms, so anywhere else even a valid token is never seen
  it('no longer accepts uploads from anyone at /api/upload', async () => {
    const { token, cookies } = await csrfCredentials();

    const response = await request(app)
      .post('/api/upload')
      .set('Cookie', cookies)
      .field('_csrf', token)
      .attach('image', Buffer.from('<script>alert(1)</script>'), 'page.html');

    expect(response.status).toBe(403);
    expect(newFiles()).toEqual([]);
  });

  it.each([
    ['GET', () => request(app).get('/api/reports')],
    ['POST', () => postForm('/api/reports')],
  ])('no longer serves %s /api/reports, which could never succeed', async (method, send) => {
    const response = await send();

    expect(response.status).toBe(404);
  });
});

describe('POST /submit-report with an image', () => {
  it.each([
    ['PNG', pngImage, 'png', 'image/png'],
    ['JPEG', Buffer.concat([JPEG_SIGNATURE, Buffer.alloc(64)]), 'jpg', 'image/jpeg'],
    ['WebP', Buffer.concat([WEBP_HEADER, Buffer.alloc(64)]), 'webp', 'image/webp'],
  ])('accepts a %s image and stores it under a random name', async (label, content, extension, mimeType) => {
    const response = await submitWithImage(content, 'my holiday photo.bin', 'application/octet-stream');

    expect(response.status).toBe(302);
    const [stored] = newFiles();
    expect(stored).toMatch(new RegExp(`^[0-9a-f-]{36}\\.${extension}$`));
    expect(prisma.attachment.create).toHaveBeenCalledWith({
      data: { reportId: REPORT_ID, url: `/uploads/${stored}`, mimeType, sizeBytes: content.length },
    });
  });

  it('ignores the uploaded file name, including path tricks', async () => {
    await submitWithImage(pngImage, '../../views/index.ejs', 'image/png');

    const [stored] = newFiles();
    expect(stored).not.toContain('index');
    expect(stored).toMatch(/\.png$/);
  });

  it.each([
    ['an HTML page named like an image', Buffer.from('<html><script>alert(1)</script></html>'), 'photo.png', 'image/png'],
    ['an SVG image, which can contain scripts', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), 'drawing.svg', 'image/svg+xml'],
    ['a GIF image', Buffer.from('GIF89a........'), 'anim.gif', 'image/gif'],
  ])('refuses %s, judging by its content', async (label, content, fileName, contentType) => {
    const response = await submitWithImage(content, fileName, contentType);

    expect(response.status).toBe(415);
    expect(newFiles()).toEqual([]);
    expect(prisma.report.create).not.toHaveBeenCalled();
  });

  it('refuses an image larger than 5 MB', async () => {
    const oversized = Buffer.concat([PNG_SIGNATURE, Buffer.alloc(FIVE_MB)]);

    const response = await submitWithImage(oversized, 'big.png', 'image/png');

    expect(response.status).toBe(413);
    expect(newFiles()).toEqual([]);
    expect(prisma.report.create).not.toHaveBeenCalled();
  });

  it('refuses more than one image', async () => {
    const response = await submitWithImages([
      { content: pngImage, fileName: 'one.png', contentType: 'image/png' },
      { content: pngImage, fileName: 'two.png', contentType: 'image/png' },
    ]);

    expect(response.status).toBe(400);
    expect(newFiles()).toEqual([]);
  });

  it('writes nothing to disk when the form is incomplete', async () => {
    const response = await submitWithImage(pngImage, 'photo.png', 'image/png', { ...validForm, title: '' });

    expect(response.status).toBe(422);
    expect(newFiles()).toEqual([]);
  });

  it('writes nothing to disk for a visitor who is not logged in', async () => {
    const response = await submitWithImages([{ content: pngImage, fileName: 'photo.png', contentType: 'image/png' }], {
      sessionCookie: null,
    });

    expect(response.status).toBe(401);
    expect(newFiles()).toEqual([]);
  });

  it('removes the stored image again when saving the report fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    prisma.report.create.mockRejectedValue(new Error('database unavailable'));

    const response = await submitWithImage(pngImage, 'photo.png', 'image/png');

    expect(response.status).toBe(500);
    expect(newFiles()).toEqual([]);
  });
});

describe('serving uploaded images', () => {
  it('tells browsers not to guess a different content type', async () => {
    const name = 'served-image-test.png';
    fs.writeFileSync(path.join(UPLOAD_DIRECTORY, name), pngImage);

    const response = await request(app).get(`/uploads/${name}`);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('image/png');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });
});
