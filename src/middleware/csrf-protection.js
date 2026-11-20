// Protection against cross-site request forgery with signed double-submit tokens.
// Every page gets a random token, signed with a server secret and bound to the visitor's session,
// both in an HttpOnly cookie and in a hidden field of each form. Another site can make a browser send
// the cookie, but it cannot read the page, so it cannot put the matching token into its forged form.
// CSRF_SECRET comes from the environment, which server.js loads from .env before anything else.
import { doubleCsrf } from 'csrf-csrf';
import { logSecurityEvent } from '../services/server-log.js';
import { SESSION_COOKIE } from '../services/session-service.js';

export const CSRF_FIELD = '_csrf';
export const CSRF_COOKIE = 'csrf-token';
const MINIMUM_SECRET_LENGTH = 32;
const EXPIRED_FORM = 'This form has expired. Please go back, reload the page, and try again.';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Multipart forms are parsed inside their route, after the login check, so their fields are not
// readable yet when the global check runs. These routes call checkCsrfToken right after parsing.
const CHECKED_AFTER_PARSING = new Set(['POST /submit-report']);

const secret = process.env.CSRF_SECRET;
if (!secret || secret.length < MINIMUM_SECRET_LENGTH) {
  throw new Error(`CSRF_SECRET must be set to a random value of at least ${MINIMUM_SECRET_LENGTH} characters.`);
}

const { generateCsrfToken, validateRequest } = doubleCsrf({
  getSecret: () => secret,
  // Tokens issued before login stop working after it, and the other way round
  getSessionIdentifier: (req) => req.cookies[SESSION_COOKIE] ?? '',
  cookieName: CSRF_COOKIE,
  cookieOptions: { httpOnly: true, sameSite: 'strict', path: '/' },
  getCsrfTokenFromRequest: (req) => req.body?.[CSRF_FIELD],
});

// Makes a token available to every page as csrfToken, for the hidden field of its forms.
// Secure follows the request, like the session cookie, so the cookie also works on http://localhost.
export function provideCsrfToken(req, res, next) {
  res.locals.csrfToken = generateCsrfToken(req, res, { cookieOptions: { secure: req.secure } });
  next();
}

// Refuses every request that can change something unless it carries a valid token
export function requireCsrfToken(req, res, next) {
  if (SAFE_METHODS.has(req.method) || CHECKED_AFTER_PARSING.has(`${req.method} ${req.path}`)) {
    return next();
  }
  return checkCsrfToken(req, res, next);
}

export function checkCsrfToken(req, res, next) {
  if (validateRequest(req)) {
    return next();
  }
  logSecurityEvent('csrf.rejected', req);
  return res.status(403).send(EXPIRED_FORM);
}
