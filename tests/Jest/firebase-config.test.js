// The other tests replace src/config/firebase.js with a fake, so they cannot notice when a new
// firebase-admin version changes its API. This test loads the real file instead, with a throwaway
// service account generated here, so such an upgrade fails in CI rather than at startup on Render.
import { generateKeyPairSync } from 'crypto';

const FUNCTIONS_THE_APP_USES = ['createSessionCookie', 'verifySessionCookie', 'revokeRefreshTokens', 'updateUser'];

function throwawayServiceAccount() {
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });
  return {
    type: 'service_account',
    project_id: 'config-test-project',
    private_key: privateKey,
    client_email: 'config-test@config-test-project.iam.gserviceaccount.com',
  };
}

describe('the real Firebase setup', () => {
  const configured = process.env.FIREBASE_SERVICE_ACCOUNT;

  afterEach(() => {
    process.env.FIREBASE_SERVICE_ACCOUNT = configured;
  });

  it('provides every Auth function the application calls', () => {
    process.env.FIREBASE_SERVICE_ACCOUNT = JSON.stringify(throwawayServiceAccount());

    jest.isolateModules(() => {
      const { auth } = jest.requireActual('../../src/config/firebase.js');

      FUNCTIONS_THE_APP_USES.forEach((name) => expect(typeof auth[name]).toBe('function'));
    });
  });
});
