import { isAdmin } from '../policies/roles.js';
import { logSecurityEvent } from '../services/server-log.js';
import { readSession } from '../services/session-service.js';
import { findOrCreateProfile, ProfileConflictError } from '../services/user-profile-service.js';

function rememberToken(req, res, token) {
  req.user = token;
  res.locals.user = token;
}

// Lets through a logged-in user with a verified email, and loads their profile into req.currentUser
const requireVerifiedUser = async (req, res, next) => {
  const token = await readSession(req);
  if (!token) {
    logSecurityEvent('access.denied', req, { reason: 'not_logged_in' });
    return res.status(401).json({ error: 'Please log in.' });
  }
  rememberToken(req, res, token);
  if (!token.email_verified) {
    logSecurityEvent('access.denied', req, { reason: 'email_not_verified' });
    return res.status(403).json({ error: 'Please verify your email address, then log in again.' });
  }
  try {
    req.currentUser = await findOrCreateProfile(token);
    return next();
  } catch (error) {
    if (error instanceof ProfileConflictError) {
      logSecurityEvent('access.denied', req, { reason: 'profile_conflict' });
      return res.status(403).json({ error: error.message });
    }
    return next(error);
  }
};

// Must run after requireVerifiedUser
const requireAdmin = (req, res, next) => {
  if (!isAdmin(req.currentUser)) {
    logSecurityEvent('access.denied', req, { reason: 'not_admin' });
    return res.status(403).json({ error: 'Administrator access only.' });
  }
  return next();
};

// Runs on every request so pages can show whether someone is logged in. Never blocks a request.
const attachUserIfPresent = async (req, res, next) => {
  const token = await readSession(req);
  if (token) {
    rememberToken(req, res, token);
  } else {
    res.locals.user = null;
  }
  return next();
};

export default {
  requireVerifiedUser,
  requireAdmin,
  attachUserIfPresent,
};
