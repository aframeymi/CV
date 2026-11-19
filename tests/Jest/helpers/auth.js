import { verifySessionCookie } from '../mocks/firebase.js';
import prisma from '../mocks/prismaClient.js';

export const SESSION_COOKIE = 'session=test-session';

export const citizen = {
  id: 'user-1',
  firebaseUid: 'uid-citizen',
  email: 'bob@example.com',
  role: { title: 'Citizen' },
};
export const otherCitizen = {
  id: 'user-2',
  firebaseUid: 'uid-other',
  email: 'cara@example.com',
  role: { title: 'Citizen' },
};
export const admin = {
  id: 'user-3',
  firebaseUid: 'uid-admin',
  email: 'alice@example.com',
  role: { title: 'Admin' },
};

export function tokenFor(user, { emailVerified = true } = {}) {
  return { uid: user.firebaseUid, email: user.email, email_verified: emailVerified };
}

// Make the fake Firebase accept the test cookie as this user, and the fake database return their profile
export function logInAs(user, { emailVerified = true } = {}) {
  verifySessionCookie.mockResolvedValue(tokenFor(user, { emailVerified }));
  prisma.user.findUnique.mockResolvedValue(user);
}

// Make the fake Firebase reject the test cookie, like an expired or forged token
export function rejectToken() {
  verifySessionCookie.mockRejectedValue(new Error('invalid token'));
}
