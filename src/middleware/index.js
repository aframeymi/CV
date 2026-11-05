// Firebase Admin SDK, used to verify login tokens 
import { admin } from '../config/firebase.js';

// Protects route by blocking the request unless user has a valid token
const verifyToken = async (req, res, next) => {
  try {
    const idToken = req.cookies?.access_token;
    if (!idToken) {
      return res.status(403).json({ error: 'No token provided' });
    }
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    res.locals.user = decodedToken; 
    return next();
  } catch (error) {
    console.error('Error verifying token:', error);
    return res.status(403).json({ error: 'Unauthorized' });
  }
};

// Runs on every request: attaches the user if logged in
const attachUserIfPresent = async (req, res, next) => {
  try {
    const idToken = req.cookies?.access_token;
    if (!idToken) {
      res.locals.user = null;
      return next();
    }
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    res.locals.user = decodedToken;
  } catch (e) {
    res.locals.user = null;
  }
  return next();
};

export default {
  verifyToken,
  attachUserIfPresent,
};
