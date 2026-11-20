// A browser can only send a form after loading a page, which gives it the CSRF cookie and the token.
// These helpers do the same, so tests post forms the way a browser does.
import request from 'supertest';
import app from '../../../src/app.js';

const HIDDEN_TOKEN = /name="_csrf" value="([^"]+)"/;

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
  return request(app).post(url).set(headers).set('Cookie', cookies).type('form').send({ ...form, _csrf: token });
}
