// Load environment variables from the .env file
import 'dotenv/config';
// Firebase client SDK: app setup and auth functions
import * as firebase from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
} from 'firebase/auth';

// Firebase Admin SDK (server side), used to verify tokens
import admin from 'firebase-admin';

// Initialize the Firebase client app only once
if (!firebase.getApps || firebase.getApps().length === 0) {
  const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
  };
  firebase.initializeApp(firebaseConfig);
}

// Initialize the Admin SDK only once
if (!admin.apps.length) {

  // Service account credentials are stored as JSON text in an environment variable
  const serviceJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  const serviceAccount = JSON.parse(serviceJson);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// Shared Firebase Auth instance
const auth = getAuth();

// Export auth helpers and the Admin SDK for use in controllers and middleware
export {
  auth,
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  admin,
};
