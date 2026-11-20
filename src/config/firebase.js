// Firebase setup for the server. Passwords are checked through the Auth REST API (see firebase-identity.js),
// and sessions through the Admin SDK, so the browser-oriented client SDK is not needed here.
import 'dotenv/config';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// The service account credentials are stored as JSON text in an environment variable.
// getApps() avoids a second initialisation when this module is loaded again, for example by nodemon.
const app = getApps()[0] ?? initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });

export const auth = getAuth(app);

// Web API key used by the Firebase Auth REST API
export const firebaseApiKey = process.env.FIREBASE_API_KEY;
