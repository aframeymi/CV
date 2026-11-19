import {
  FirebaseIdentityError,
  sendVerificationEmail,
  setDisplayName,
  signInWithPassword,
  signUpWithPassword,
} from '../services/firebase-identity.js';
import { endSession, startSession } from '../services/session-service.js';
import { findOrCreateProfile, ProfileConflictError } from '../services/user-profile-service.js';

// The same message for a wrong email and a wrong password, so the form does not reveal which accounts exist
const LOGIN_FAILED = 'Incorrect email or password.';
const TOO_MANY_ATTEMPTS = 'Too many attempts. Please wait a few minutes and try again.';
const REGISTERED = 'Account created. We sent you an email: please verify your address, then sign in.';

const LOGIN_FAILURES = {
  INVALID_LOGIN_CREDENTIALS: { status: 401, message: LOGIN_FAILED },
  EMAIL_NOT_FOUND: { status: 401, message: LOGIN_FAILED },
  INVALID_PASSWORD: { status: 401, message: LOGIN_FAILED },
  INVALID_EMAIL: { status: 401, message: LOGIN_FAILED },
  USER_DISABLED: { status: 401, message: LOGIN_FAILED },
  TOO_MANY_ATTEMPTS_TRY_LATER: { status: 429, message: TOO_MANY_ATTEMPTS },
};

const REGISTRATION_FAILURES = {
  EMAIL_EXISTS: { status: 409, message: 'An account with this email address already exists. Try signing in.' },
  WEAK_PASSWORD: { status: 422, message: 'Please choose a password with at least 6 characters.' },
  INVALID_EMAIL: { status: 422, message: 'Please enter a valid email address.' },
  TOO_MANY_ATTEMPTS_TRY_LATER: { status: 429, message: TOO_MANY_ATTEMPTS },
};

export async function logIn(req, res, next) {
  const { email, password } = req.body;
  if (!email || !password) {
    return renderSignIn(res, 422, { error: 'Please enter your email address and password.' });
  }
  try {
    const { idToken } = await signInWithPassword(email, password);
    await startSession(req, res, idToken);
    return res.redirect('/');
  } catch (error) {
    const failure = error instanceof FirebaseIdentityError && LOGIN_FAILURES[error.code];
    if (failure) {
      return renderSignIn(res, failure.status, { error: failure.message });
    }
    return next(error);
  }
}

export async function logOut(req, res, next) {
  try {
    await endSession(req, res);
    return res.redirect('/');
  } catch (error) {
    return next(error);
  }
}

// Creates the account and profile, then asks the user to verify their email before signing in
export async function register(req, res, next) {
  const { email, password, confirm_password: passwordConfirmation, name, surname, phone } = req.body;
  if (!email || !password) {
    return renderSignUp(res, 422, 'Please enter your email address and a password.');
  }
  if (password !== passwordConfirmation) {
    return renderSignUp(res, 422, 'Passwords do not match.');
  }
  try {
    const account = await signUpWithPassword(email, password);
    const displayName = [name, surname].filter(Boolean).join(' ');
    await nameAccount(account.uid, displayName);
    await sendVerificationEmail(account.idToken);
    await findOrCreateProfile({ uid: account.uid, email: account.email, name: displayName }, { phone });
    return renderSignIn(res, 201, { notice: REGISTERED });
  } catch (error) {
    if (error instanceof ProfileConflictError) {
      return renderSignUp(res, 409, error.message);
    }
    const failure = error instanceof FirebaseIdentityError && REGISTRATION_FAILURES[error.code];
    if (failure) {
      return renderSignUp(res, failure.status, failure.message);
    }
    return next(error);
  }
}

// The name is only for display, so a failure here must not stop the registration
async function nameAccount(uid, displayName) {
  if (!displayName) {
    return;
  }
  try {
    await setDisplayName(uid, displayName);
  } catch (error) {
    console.error('Could not set the display name of a new account:', error.message);
  }
}

function renderSignIn(res, status, { error, notice } = {}) {
  return res.status(status).render('sign_in', { title: 'Login', error, notice });
}

function renderSignUp(res, status, error) {
  return res.status(status).render('sign_up', { title: 'Register', error });
}
