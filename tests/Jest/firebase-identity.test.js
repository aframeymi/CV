// Unit tests for the Firebase REST client, with the network replaced by a fake fetch.
import {
  FirebaseIdentityError,
  sendPasswordResetEmail,
  sendVerificationEmail,
  setDisplayName,
  signInWithPassword,
  signUpWithPassword,
} from '../../src/services/firebase-identity.js';
import { updateUser } from './mocks/firebase.js';

function respondWith(status, body) {
  global.fetch = jest.fn(async () => ({ ok: status < 400, status, json: async () => body }));
}

function sentRequest() {
  const [url, options] = global.fetch.mock.calls[0];
  return { url, body: JSON.parse(options.body), method: options.method };
}

describe('signInWithPassword', () => {
  it('posts the credentials to the signInWithPassword endpoint with the API key', async () => {
    respondWith(200, { idToken: 'id-token', localId: 'uid-1' });

    const result = await signInWithPassword('a@example.org', 'secret');

    const request = sentRequest();
    expect(request.method).toBe('POST');
    expect(request.url).toBe(
      'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=test-api-key'
    );
    expect(request.body).toEqual({ email: 'a@example.org', password: 'secret', returnSecureToken: true });
    expect(result).toEqual({ idToken: 'id-token', uid: 'uid-1' });
  });

  it('turns a Firebase error into a FirebaseIdentityError with its code', async () => {
    respondWith(400, { error: { code: 400, message: 'INVALID_LOGIN_CREDENTIALS' } });

    const failure = signInWithPassword('a@example.org', 'wrong');

    await expect(failure).rejects.toBeInstanceOf(FirebaseIdentityError);
    await expect(failure).rejects.toMatchObject({ code: 'INVALID_LOGIN_CREDENTIALS' });
  });

  it('keeps only the code when Firebase adds an explanation', async () => {
    respondWith(400, { error: { message: 'WEAK_PASSWORD : Password should be at least 6 characters' } });

    await expect(signUpWithPassword('a@example.org', '123')).rejects.toMatchObject({ code: 'WEAK_PASSWORD' });
  });

  it('reports an unknown error when the response has no message', async () => {
    respondWith(500, {});

    await expect(signInWithPassword('a@example.org', 'x')).rejects.toMatchObject({ code: 'UNKNOWN_ERROR' });
  });
});

describe('signUpWithPassword', () => {
  it('returns the new account ID, token, and normalised email', async () => {
    respondWith(200, { idToken: 'id-token', localId: 'uid-2', email: 'new@example.org' });

    const result = await signUpWithPassword('New@Example.org', 'secret1');

    expect(sentRequest().url).toContain('accounts:signUp?');
    expect(result).toEqual({ idToken: 'id-token', uid: 'uid-2', email: 'new@example.org' });
  });
});

describe('emails sent by Firebase', () => {
  it('asks for a verification email for the signed-in user', async () => {
    respondWith(200, { email: 'a@example.org' });

    await sendVerificationEmail('id-token');

    expect(sentRequest().body).toEqual({ requestType: 'VERIFY_EMAIL', idToken: 'id-token' });
  });

  it('asks for a password reset email', async () => {
    respondWith(200, { email: 'a@example.org' });

    await sendPasswordResetEmail('a@example.org');

    expect(sentRequest().body).toEqual({ requestType: 'PASSWORD_RESET', email: 'a@example.org' });
  });
});

describe('setDisplayName', () => {
  it('updates the name through the Admin SDK', async () => {
    await setDisplayName('uid-1', 'Ada Lovelace');

    expect(updateUser).toHaveBeenCalledWith('uid-1', { displayName: 'Ada Lovelace' });
  });
});
