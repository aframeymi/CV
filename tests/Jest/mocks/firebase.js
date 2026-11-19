// Fake of src/config/firebase.js. Tests choose who is logged in through verifyIdToken.
export const verifyIdToken = jest.fn();
export const updateUser = jest.fn();

export const admin = { auth: () => ({ verifyIdToken, updateUser }) };
export const firebaseApiKey = 'test-api-key';

export const auth = {};
export const createUserWithEmailAndPassword = jest.fn();
export const signInWithEmailAndPassword = jest.fn();
export const signOut = jest.fn();
export const sendEmailVerification = jest.fn();
export const sendPasswordResetEmail = jest.fn();
