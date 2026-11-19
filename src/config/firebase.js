// Firebase setup for the server. Passwords are checked through the Auth REST API (see firebase-identity.js),
// and sessions through the Admin SDK, so the browser-oriented client SDK is not needed here.
import 'dotenv/config';
import admin from 'firebase-admin';

if (!admin.apps.length) {
  // The service account credentials are stored as JSON text in an environment variable
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

// Web API key used by the Firebase Auth REST API
const firebaseApiKey = process.env.FIREBASE_API_KEY;

export { admin, firebaseApiKey };
