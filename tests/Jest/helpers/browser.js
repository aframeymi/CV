// Helpers that send requests the way a browser does. A browser can only send a form after loading
// a page, which gives it the CSRF cookie and the token, so these helpers do the same.
import request from 'supertest';
import app from '../../../src/app.js';

const HIDDEN_TOKEN = /name="_csrf" value="([^"]+)"/;
let visitorCount = 0;

// A different IP address for every request, as if each came from a different visitor, so the rate
// limits only apply where a test sends the same address on purpose. The app reads the address from
// X-Forwarded-For, because it trusts the proxy in front of it.
export function newVisitorAddress() {
  visitorCount += 1;
  return `10.0.${Math.floor(visitorCount / 250)}.${(visitorCount % 250) + 1}`;
}

// Loads a page as the visitor with this session cookie, or as a visitor who is not logged in
export async function csrfCredentials(sessionCookie) {
  const call = request(app).get('/sign_in');
  const page = await (sessionCookie ? call.set('Cookie', sessionCookie) : call);
  const [, token] = page.text.match(HIDDEN_TOKEN);
  const csrfCookie = page.headers['set-cookie'].find((cookie) => cookie.startsWith('csrf-token=')).split(';')[0];
  return { token, cookies: [sessionCookie, csrfCookie].filter(Boolean) };
}

export async function postForm(url, form = {}, { sessionCookie, headers = {} } = {}) {
  const { token, cookies } = await csrfCredentials(sessionCookie);
  return request(app)
    .post(url)
    .set('X-Forwarded-For', newVisitorAddress())
    .set(headers)
    .set('Cookie', cookies)
    .type('form')
    .send({ ...form, _csrf: token });
}
