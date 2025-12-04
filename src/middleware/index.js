import { admin } from '../config/firebase.js';

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
