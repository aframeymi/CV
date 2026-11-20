# Security overview

This page explains how Community Voice is protected, and where each protection lives in the code and the tests. The details of every threat, with its status, are in the [threat model](threat-model.md). The results of the scan of the running site are in the [ZAP baseline report](zap-baseline.md).

## Contents

- [1. Threat model](#1-threat-model)
- [2. Threats and mitigations by layer](#2-threats-and-mitigations-by-layer)
- [3. Authentication](#3-authentication)
- [4. Authorisation](#4-authorisation)
- [5. Validation and output encoding](#5-validation-and-output-encoding)
- [6. Encryption](#6-encryption)
- [7. Signing](#7-signing)
- [8. Key management](#8-key-management)
- [9. Web application security: OWASP Top 10](#9-web-application-security-owasp-top-10)
- [10. Secure development lifecycle](#10-secure-development-lifecycle)

## 1. Threat model

The [threat model](threat-model.md) was written before any security change, so each fix answers a recorded threat. It lists:

- the **assets**, from personal data and passwords to the service-account key;
- the **threat actors**, from anonymous visitors to a compromised dependency;
- the **entry points** and the **trust boundaries** between the browser, the server, Neon, and Firebase;
- **41 threats** sorted by layer, each classified with STRIDE (spoofing, tampering, repudiation, information disclosure, denial of service, elevation of privilege) and given a risk level;
- **accepted risks** with their reasons, and **assumptions** about external settings that still need checking.

Every pull request that fixed a threat also updated its status, so the history of the document shows the work step by step.

## 2. Threats and mitigations by layer

| Layer | Main threats | Mitigations |
|---|---|---|
| Physical | Theft of the developer laptop or a data centre break-in | Secrets only in `.env`, never in Git; disk encryption on the laptop. Data centres are the providers' responsibility |
| Network | Direct connections to the database, flooding | Strong generated database password per Neon branch; Render, Neon, and Google absorb volumetric attacks |
| Transport | Eavesdropping, HTTPS downgrade | TLS everywhere, HSTS for one year, `Secure` cookies over HTTPS |
| Application | Broken access control, XSS, CSRF, injection, password guessing, unsafe uploads | Sections 3 to 7 below |
| Development and operations | Vulnerable dependencies, leaked secrets, untested changes | Section 10 below |

## 3. Authentication

*Who is this?* Firebase Authentication checks the email and password. The application never sees a stored password: Firebase keeps only a salted hash, made with its own variant of scrypt.

- **Login** ([`auth-controller.js`](../../src/controllers/auth-controller.js)): the server sends the password to Firebase over HTTPS and turns the returned ID token into a **Firebase session cookie** ([`session-service.js`](../../src/services/session-service.js)). The cookie is `HttpOnly` (scripts cannot read it), `SameSite=Lax` (not sent with cross-site form posts), `Secure` over HTTPS, and valid for one day.
- **Every request** verifies the cookie's signature and checks that it has not been revoked.
- **Logout** revokes every session of the user at Firebase, so a copied cookie stops working too.
- **Email verification** is required before anything can be changed.
- **Passwords** need at least 12 characters, with no rules about symbols (NIST SP 800-63B).
- **Guessing** is limited to 10 failed logins per IP address in 15 minutes ([`rate-limits.js`](../../src/middleware/rate-limits.js)).
- **Account enumeration** is avoided: login gives one message for a wrong email or password, and a password reset request gives the same notice whether or not the account exists.

Tested in [`auth.test.js`](../../tests/Jest/auth.test.js) and [`rate-limits.test.js`](../../tests/Jest/rate-limits.test.js).

## 4. Authorisation

*What may this person do?* Authentication alone is not enough: a logged-in citizen must still not change other people's reports.

- **Roles:** Citizen and Admin ([`roles.js`](../../src/policies/roles.js)). New accounts are always citizens. Admins can only be made directly in the database.
- **One rule per decision:** [`report-policy.js`](../../src/policies/report-policy.js) says who may change a report: its author or an admin. The edit form, saving, and deleting all use it ([`report-access.js`](../../src/middleware/report-access.js)).
- **Admin pages** require a verified admin. The public graph uses `/api/stats`, which holds no personal data.
- **Status codes:** 401 means "log in first", 403 means "logged in, but not allowed".
- **Profiles** are found by Firebase ID, never by email, so a new Firebase account with the same address cannot take over an existing profile.

Tested in [`reports.test.js`](../../tests/Jest/reports.test.js), [`report-policy.test.js`](../../tests/Jest/report-policy.test.js), and [`admin-routes.test.js`](../../tests/Jest/admin-routes.test.js).

## 5. Validation and output encoding

*Never trust input, and never let data turn into code.*

- **Forms:** every form is checked on the server against the rules in [`forms.js`](../../src/validation/forms.js): required fields, maximum lengths, email format, and the ID format Prisma generates. Fields a form does not define are dropped, so no form can change another column.
- **Uploads:** one JPEG, PNG, or WebP image of at most 5 MB, recognised by its first bytes, never by its name. It is saved under a random name chosen by the server, only after the rest of the form is valid ([`image-storage.js`](../../src/services/image-storage.js)).
- **SQL injection:** Prisma sends every value as a parameter. The one raw query uses `$queryRaw`, which does the same.
- **XSS:** EJS escapes all output, JSON placed in a page has every `<` escaped ([`script-json.js`](../../src/utils/script-json.js)), and the Content Security Policy blocks inline scripts as a second line of defence.

Tested in [`forms.test.js`](../../tests/Jest/forms.test.js), [`uploads.test.js`](../../tests/Jest/uploads.test.js), and [`inline-code.test.js`](../../tests/Jest/inline-code.test.js).

## 6. Encryption

| Where | How |
|---|---|
| Browser to Render | TLS (HTTPS), terminated at Render's proxy. HSTS tells browsers never to use plain HTTP for a year |
| Server to Neon | TLS, required by `sslmode=require` in `DATABASE_URL` |
| Server to Firebase | TLS for every call of the Auth REST API and the Admin SDK |
| Data at rest | Encrypted by Neon, Firebase, and Render on their storage (the providers' responsibility) |
| Passwords | Not encrypted but hashed by Firebase with a salt, so not even Firebase can read them back |

Hashing and encryption differ: encrypted data can be decrypted with the key, while a hash cannot be reversed. That is why passwords are hashed.

## 7. Signing

A signature proves who created a value and that nobody changed it, without hiding it.

| Value | Signed with | Checked by |
|---|---|---|
| Session cookie | RS256 (RSA with SHA-256) by Google, with Firebase's private key | `verifySessionCookie`, with Google's public keys, on every request |
| CSRF token | HMAC-SHA256 with `CSRF_SECRET`, over the session and a random value | [`csrf-protection.js`](../../src/middleware/csrf-protection.js), on every form post |
| Dependencies | `package-lock.json` records an integrity hash (SHA-512) for every package | `npm ci`, which refuses a package whose contents differ |
| GitHub Actions | Pinned to a full commit SHA | GitHub, which runs exactly that commit |

RS256 is asymmetric: anyone can check the signature with the public key, but only Google can create one. HMAC is symmetric: the same secret creates and checks the token, so it must stay on the server.

## 8. Key management

### Where the secrets are

| Secret | Purpose | Kept in |
|---|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | Admin access to Firebase: sessions, revocation | `.env` locally, Render's environment settings |
| `DATABASE_URL` | Database user and password, one per Neon branch | `.env` (development branch), Render (production branch) |
| `CSRF_SECRET` | Signs the CSRF tokens | `.env` and Render, with a different random value in each |
| `FIREBASE_API_KEY` | Identifies the Firebase project to the Auth REST API | `.env` and Render. **Not a secret** by Firebase's design: it only names the project, and it can be restricted to the Identity Toolkit API in Google Cloud |

Rules:

- **Never in Git.** `.env` is ignored, and `.env.example` holds placeholders only. GitHub push protection and gitleaks in CI check for secrets.
- **One value per environment**, so a leaked development value does not open production.
- **Least privilege where the provider allows it:** the laptop's database password is refused by the production branch.

### Rotation

Rotate a secret at once if it may have been exposed, for example in a screenshot, a log, or a commit.

**Firebase service account** (T-43):

1. In the Firebase console, open **Project settings > Service accounts** and click **Generate new private key**.
2. Put the new JSON on one line into `FIREBASE_SERVICE_ACCOUNT`, in `.env` and in Render's environment settings. Render redeploys.
3. Check that login works.
4. In the Google Cloud console, open **IAM & Admin > Service accounts**, select the Firebase Admin account, and on the **Keys** tab delete the old key. Only now does the old key stop working.

**Database password:**

1. In the Neon console, open the branch, then **Roles**, and reset the password of the role.
2. Update `DATABASE_URL` where that branch is used: `.env` for development, Render for production.

**CSRF secret:**

1. Generate a new value with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
2. Replace `CSRF_SECRET`. Forms that are open in a browser stop working once, and users have to reload the page.

**All sessions of one user,** for example after a stolen laptop: revoking the user's refresh tokens in Firebase, which is what logout does, ends every session of that user at once.

## 9. Web application security: OWASP Top 10

How the application addresses each category of the [OWASP Top 10:2025](https://owasp.org/Top10/):

| Category | In this application |
|---|---|
| A01 Broken Access Control | One report policy for edit and delete, admin checks, 401/403, profiles by Firebase ID, CSRF tokens |
| A02 Security Misconfiguration | Security headers, no stack traces, no framework banner, seed refuses production, admins only by SQL |
| A03 Software Supply Chain Failures | Lockfile with integrity hashes, `npm audit` in CI, Dependabot with a two-week delay, Actions pinned to SHAs, Chart.js served from the installed package |
| A04 Cryptographic Failures | TLS everywhere, HSTS, passwords hashed by Firebase, signed sessions and CSRF tokens, secrets outside Git |
| A05 Injection | Prisma parameters, `$queryRaw`, EJS escaping, escaped JSON in scripts, Content Security Policy |
| A06 Insecure Design | Threat model first, server-side validation, uploads saved only after the form is valid, rate limits |
| A07 Authentication Failures | Firebase hashing, 12-character passwords, login rate limit, revocable session cookies, email verification, no account enumeration at login |
| A08 Software or Data Integrity Failures | Uploads recognised by content, form fields whitelisted, signed cookies and tokens |
| A09 Security Logging and Alerting Failures | Security events as JSON lines with user ID and IP address, never secrets or emails |
| A10 Mishandling of Exceptional Conditions | One error handler that shows only an error ID, failed uploads cleaned up, transactions for reports |

## 10. Secure development lifecycle

Security was built in through the same steps for every change:

1. **Plan:** the threat model was written first, and each step started from its open threats.
2. **Develop on a branch:** one branch and pull request per step, one commit per change.
3. **Test:** every security rule has tests, and each rule was deliberately broken once to confirm that a test fails. The tests run without secrets, because Firebase and the database are replaced by fakes; one extra test loads the real Firebase setup.
4. **Check automatically:** every pull request runs the tests, ESLint with security rules, `npm audit`, gitleaks, and CodeQL. Branch protection lets a change into `main` only through a pull request whose checks pass ([`.github/workflows`](../../.github/workflows)).
5. **Test the running application:** an OWASP ZAP baseline scan, with every finding fixed or explained ([`zap-baseline.md`](zap-baseline.md)).
6. **Maintain:** Dependabot proposes updates every week, CodeQL also runs weekly, and the threat model records what is accepted and what still needs checking.
