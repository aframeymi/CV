// Email and password operations through the Firebase Auth REST API.
// Every call is a stateless HTTP request, so two users' requests can never share a signed-in state.
import { auth, firebaseApiKey } from '../config/firebase.js';

const IDENTITY_TOOLKIT_URL = 'https://identitytoolkit.googleapis.com/v1/accounts';

export class FirebaseIdentityError extends Error {
  constructor(code) {
    super(`Firebase identity request failed: ${code}`);
    this.code = code;
  }
}

export async function signInWithPassword(email, password) {
  const result = await callIdentityToolkit('signInWithPassword', { email, password, returnSecureToken: true });
  return { idToken: result.idToken, uid: result.localId };
}

export async function signUpWithPassword(email, password) {
  const result = await callIdentityToolkit('signUp', { email, password, returnSecureToken: true });
  return { idToken: result.idToken, uid: result.localId, email: result.email };
}

export async function sendVerificationEmail(idToken) {
  await callIdentityToolkit('sendOobCode', { requestType: 'VERIFY_EMAIL', idToken });
}

export async function sendPasswordResetEmail(email) {
  await callIdentityToolkit('sendOobCode', { requestType: 'PASSWORD_RESET', email });
}

export async function setDisplayName(uid, displayName) {
  await auth.updateUser(uid, { displayName });
}

async function callIdentityToolkit(action, body) {
  const response = await fetch(`${IDENTITY_TOOLKIT_URL}:${action}?key=${firebaseApiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new FirebaseIdentityError(errorCodeFrom(result));
  }
  return result;
}

// Firebase sends codes such as "WEAK_PASSWORD : Password should be at least 6 characters"
function errorCodeFrom(result) {
  const message = result?.error?.message ?? 'UNKNOWN_ERROR';
  return message.split(' : ')[0].trim();
}
