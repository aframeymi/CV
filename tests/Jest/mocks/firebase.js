// Fake of src/config/firebase.js. Tests choose who is logged in through verifyIdToken.
export const verifyIdToken = jest.fn();

export const admin = { auth: () => ({ verifyIdToken }) };

export const auth = {};
export const createUserWithEmailAndPassword = jest.fn();
export const signInWithEmailAndPassword = jest.fn();
export const signOut = jest.fn();
export const sendEmailVerification = jest.fn();
export const sendPasswordResetEmail = jest.fn();
