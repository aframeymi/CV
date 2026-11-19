// Login sessions are Firebase session cookies: signed by Firebase, verified on every request, revocable.
import { admin } from '../config/firebase.js';

export const SESSION_COOKIE = 'session';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SESSION_DURATION_MS = ONE_DAY_MS;
const CHECK_REVOKED = true;

// Exchanges a fresh Firebase ID token for a session cookie and sets it on the response
export async function startSession(req, res, idToken) {
  const sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn: SESSION_DURATION_MS });
  res.cookie(SESSION_COOKIE, sessionCookie, { ...cookieOptions(req), maxAge: SESSION_DURATION_MS });
}

// Returns the verified session claims, or null if the cookie is missing, invalid, expired, or revoked
export async function readSession(req) {
  const sessionCookie = req.cookies?.[SESSION_COOKIE];
  if (!sessionCookie) {
    return null;
  }
  try {
    return await admin.auth().verifySessionCookie(sessionCookie, CHECK_REVOKED);
  } catch {
    return null;
  }
}

// Revokes every session of the user at Firebase, so a copied cookie stops working, then deletes the cookie.
// Clearing the cookie alone would leave a stolen copy valid until it expires.
export async function endSession(req, res) {
  const session = await readSession(req);
  res.clearCookie(SESSION_COOKIE, cookieOptions(req));
  if (session) {
    await admin.auth().revokeRefreshTokens(session.sub);
  }
}

// Not readable by page scripts, never sent over plain HTTP in production, and not sent on cross-site form posts
function cookieOptions(req) {
  return { httpOnly: true, secure: req.secure, sameSite: 'lax', path: '/' };
}
