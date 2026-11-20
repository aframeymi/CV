// The security headers on pages, static files, and errors
import request from 'supertest';
import app from '../../src/app.js';

function policyOf(response) {
  return Object.fromEntries(
    response.headers['content-security-policy']
      .split(';')
      .map((directive) => directive.trim().split(/\s+/))
      .map(([name, ...sources]) => [name, sources])
  );
}

describe('Content Security Policy of a page', () => {
  let policy;

  beforeEach(async () => {
    policy = policyOf(await request(app).get('/'));
  });

  it('allows scripts and styles only from this site, never inline', () => {
    expect(policy['default-src']).toEqual(["'self'"]);
    expect(policy['script-src']).toEqual(["'self'"]);
    expect(policy['style-src']).toEqual(["'self'"]);
    expect(policy['object-src']).toEqual(["'none'"]);
  });

  it('allows only Google Maps in frames, and no site to frame this page', () => {
    expect(policy['frame-src']).toEqual(['https://www.google.com']);
    expect(policy['frame-ancestors']).toEqual(["'none'"]);
  });

  it('sends forms only to this site', () => {
    expect(policy['form-action']).toEqual(["'self'"]);
  });
});

describe.each(['/', '/style.css', '/does-not-exist'])('other headers on %s', (url) => {
  let response;

  beforeEach(async () => {
    response = await request(app).get(url);
  });

  it('has a Content Security Policy', () => {
    expect(response.headers['content-security-policy']).toMatch(/default-src '(self|none)'/);
  });

  it('cannot be shown in a frame', () => {
    expect(response.headers['x-frame-options']).toBe('DENY');
  });

  it('keeps browsers on HTTPS for a year', () => {
    expect(response.headers['strict-transport-security']).toBe('max-age=31536000; includeSubDomains');
  });

  it('stops browsers from guessing content types', () => {
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  it('does not reveal the server framework', () => {
    expect(response.headers['x-powered-by']).toBeUndefined();
  });
});
