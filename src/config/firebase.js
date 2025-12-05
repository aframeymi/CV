import 'dotenv/config';
import * as firebase from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
} from 'firebase/auth';

import admin from 'firebase-admin';


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

if (!admin.apps.length) {
  const serviceJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  const serviceAccount = JSON.parse(serviceJson);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const auth = getAuth();

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
