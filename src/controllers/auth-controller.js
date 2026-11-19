import { FirebaseIdentityError, signInWithPassword } from '../services/firebase-identity.js';
import { endSession, startSession } from '../services/session-service.js';

// The same message for a wrong email and a wrong password, so the form does not reveal which accounts exist
const LOGIN_FAILED = 'Incorrect email or password.';
const TOO_MANY_ATTEMPTS = 'Too many attempts. Please wait a few minutes and try again.';

const LOGIN_FAILURES = {
  INVALID_LOGIN_CREDENTIALS: { status: 401, message: LOGIN_FAILED },
  EMAIL_NOT_FOUND: { status: 401, message: LOGIN_FAILED },
  INVALID_PASSWORD: { status: 401, message: LOGIN_FAILED },
  INVALID_EMAIL: { status: 401, message: LOGIN_FAILED },
  USER_DISABLED: { status: 401, message: LOGIN_FAILED },
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

function renderSignIn(res, status, { error, notice } = {}) {
  return res.status(status).render('sign_in', { title: 'Login', error, notice });
}
