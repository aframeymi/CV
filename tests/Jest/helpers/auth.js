import { verifyIdToken } from '../mocks/firebase.js';

export const SESSION_COOKIE = 'access_token=test-token';

// Make the fake Firebase accept the test cookie as this user
export function logInAs(email) {
  verifyIdToken.mockResolvedValue({ email });
}

// Make the fake Firebase reject the test cookie, like an expired or forged token
export function rejectToken() {
  verifyIdToken.mockRejectedValue(new Error('invalid token'));
}
