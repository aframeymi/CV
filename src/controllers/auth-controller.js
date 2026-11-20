import {
  FirebaseIdentityError,
  sendPasswordResetEmail,
  sendVerificationEmail,
  setDisplayName,
  signInWithPassword,
  signUpWithPassword,
} from '../services/firebase-identity.js';
import { endSession, startSession } from '../services/session-service.js';
import { findOrCreateProfile, ProfileConflictError } from '../services/user-profile-service.js';
import { checkForm, loginForm, passwordResetForm, registrationForm } from '../validation/forms.js';

// The same message for a wrong email and a wrong password, so the form does not reveal which accounts exist
const LOGIN_FAILED = 'Incorrect email or password.';
const TOO_MANY_ATTEMPTS = 'Too many attempts. Please wait a few minutes and try again.';
const REGISTERED = 'Account created. We sent you an email: please verify your address, then sign in.';
const PASSWORD_RESET_REQUESTED =
  'If an account exists for this address, we sent it a link to reset the password.';

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
  const { values, problem } = checkForm(loginForm, req.body);
  if (problem) {
    return renderSignIn(res, 422, { error: problem });
  }
  try {
    const { idToken } = await signInWithPassword(values.email, values.password);
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
  const { values, problem } = checkForm(registrationForm, req.body);
  if (problem) {
    return renderSignUp(res, 422, problem);
  }
  try {
    const account = await signUpWithPassword(values.email, values.password);
    const displayName = `${values.name} ${values.surname}`;
    await nameAccount(account.uid, displayName);
    await sendVerificationEmail(account.idToken);
    await findOrCreateProfile({ uid: account.uid, email: account.email, name: displayName });
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

// The notice is the same whether or not an account exists, so the form does not reveal registered addresses
export async function requestPasswordReset(req, res, next) {
  const { values, problem } = checkForm(passwordResetForm, req.body);
  if (problem) {
    return renderSignIn(res, 422, { error: problem });
  }
  try {
    await sendPasswordResetEmail(values.email);
  } catch (error) {
    if (!(error instanceof FirebaseIdentityError)) {
      return next(error);
    }
    if (error.code === 'TOO_MANY_ATTEMPTS_TRY_LATER') {
      return renderSignIn(res, 429, { error: TOO_MANY_ATTEMPTS });
    }
  }
  return renderSignIn(res, 200, { notice: PASSWORD_RESET_REQUESTED });
}

// The name is only for display, so a failure here must not stop the registration
async function nameAccount(uid, displayName) {
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
