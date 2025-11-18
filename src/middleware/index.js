// src/middleware/index.js
import { admin } from '../config/firebase.js';

// Strict version: blocks when not authenticated
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

// Soft version: tries to decode; never blocks
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

// Export both in a single default object to avoid named export issues
export default {
  verifyToken,
  attachUserIfPresent,
};
