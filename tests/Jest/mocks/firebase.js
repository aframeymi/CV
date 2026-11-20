// Fake of src/config/firebase.js. Tests choose who is logged in through verifySessionCookie.
export const verifySessionCookie = jest.fn();
export const createSessionCookie = jest.fn();
export const revokeRefreshTokens = jest.fn();
export const updateUser = jest.fn();

export const auth = { verifySessionCookie, createSessionCookie, revokeRefreshTokens, updateUser };
export const firebaseApiKey = 'test-api-key';
