# Community Voice

Community Voice is a web application that allows citizens to report problems with public infrastructure in Berlin. Users can create an account, submit reports with descriptions and optional images, and track reported issues.

This README is primarily for developers who want to run, test, or contribute to Community Voice. For detailed procedures, read the [procedural instructions](docs/procedural-instructions.md). For the system design, read the [conceptual documentation](docs/conceptual-documentation.md). Contributors should also read [CONTRIBUTING.md](CONTRIBUTING.md).

## Contents

- [Features](#features)
- [Project status and known limitations](#project-status-and-known-limitations)
- [Technology stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Quick start](#quick-start)
- [Documentation](#documentation)
- [Project structure](#project-structure)
- [Testing](#testing)
- [Code analysis tools](#code-analysis-tools)
- [Configuration and security](#configuration-and-security)
- [Accounts and roles](#accounts-and-roles)
- [Deployment](#deployment)

## Features

- User registration, login, logout, email verification, and password reset through Firebase Authentication.
- Local user profiles and role information stored with Prisma and PostgreSQL.
- Civic reports with a title, description, neighbourhood, and optional image.
- Report statuses of `OPEN`, `IN_PROGRESS`, and `RESOLVED`.
- Report tracking, 20 reports per page, with editing and deletion for the author or an admin.
- Image uploads handled with Multer and served from the public uploads directory.
- Administrative statistics, including counts by status, top reporters, and busiest neighbourhoods.

## Project status and known limitations

Community Voice is a student project under active development. The core workflow works: registering, logging in, submitting reports with an image, tracking them, editing and deleting your own reports, and the statistics. The following are known gaps.

**Not built yet.** These parts are visible in the application but are placeholders:

1. **Report status cannot be changed.** Every report stays `OPEN`. No page changes the status, and the tracking page does not show it. The Received, In Process, and Processed tracker at the top of that page is decorative.
2. **Fixed texts on the tracking page.** "Your report was successfully submitted. You received 50 bonus points." and "234 more similar reports in your area." always appear. Bonus points do not exist.
3. **Fixed numbers on the home page.** The three report counts are not read from the database.
4. **Profile page.** The name, account type, and statistics are fixed text, and the settings form does nothing.
5. **Pages that do not exist yet.** The **Setting** link in the profile menu goes to `/settings`, and the feedback form on the home page posts to `/feedback`. Both show the 404 page.
6. **Language choice.** The language selected when registering or on the profile page is ignored.
7. **Categories.** Categories exist in the database, but a report cannot be given one yet.

**Technical limitations:**

8. **Uploaded images on Render.** Images are stored on the server's disk, which a redeploy can clear. Object storage would fix this (T-45 in the [threat model](docs/security/threat-model.md)).
9. **Browser tests.** The Playwright tests are out of date and will be rewritten. The Jest tests are current and run on every pull request.
10. **One Firebase project.** Local development and the live site share one Firebase project, so accounts created while testing locally also exist on the live site.

Security limitations and accepted risks are listed in the [threat model](docs/security/threat-model.md).

## Technology stack

- **Runtime:** Node.js 22
- **Server:** Express 5
- **Templates:** EJS
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** Firebase Authentication and Firebase Admin SDK
- **Uploads:** Multer
- **Security:** helmet (headers), csrf-csrf (CSRF tokens), express-rate-limit, zod (input validation)
- **Charts:** Chart.js, served from the installed package
- **Testing:** Jest, SuperTest, and Playwright
- **Development:** Nodemon

## Prerequisites

Install or obtain the following before starting:

- Node.js 22
- npm 9 or later
- Git
- A PostgreSQL database, either local or hosted, such as Neon
- A Firebase project with email/password authentication enabled

## Quick start

### 1. Clone and install

```bash
git clone https://github.com/aframeymi/CV.git
cd CV
npm install
```

### 2. Configure the environment

Copy `.env.example` to `.env` in the project root and fill in your values. Do not commit `.env`.

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"
FIREBASE_API_KEY="your-firebase-api-key"
FIREBASE_SERVICE_ACCOUNT=
CSRF_SECRET=
PORT=5000
```

`FIREBASE_SERVICE_ACCOUNT` must contain the complete Firebase service-account JSON required by the Firebase Admin SDK.

`CSRF_SECRET` signs the tokens that protect every form. It must be a random value of at least 32 characters, different in every environment. The application refuses to start without it. Generate one with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Never place a real credential in the README or commit it to Git.

### 3. Prepare and seed the database

```bash
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed        # reference data: roles, cities, neighbourhoods, categories
npm run prisma:seed:demo   # optional, development database only: example users and 1,000 reports
```

The reference seed only adds missing rows, so it is safe on any database. The demo seed refuses to run when `NODE_ENV=production`, replaces only example users (`@example.com`) and their reports, and never creates an admin account.

### 4. Start the application

```bash
npm run dev
```

Open `http://localhost:5000` in a browser.

## Documentation

- [Conceptual documentation](docs/conceptual-documentation.md) — purpose, users, architecture, workflows, and database design.
- [Procedural instructions](docs/procedural-instructions.md) — setup, tutorial, Hello World, testing, database inspection, and troubleshooting.
- [Contributors guide](CONTRIBUTING.md) — branches, coding, database changes, testing, and pull requests.
- [Security overview](docs/security/README.md) — how the application is protected, topic by topic, with links to the code and tests.
- [Threat model](docs/security/threat-model.md) — assets, threats by layer, and the status of each threat.
- [ZAP baseline scan](docs/security/zap-baseline.md) — results of scanning the running application.

## Project structure

```text
.
├── .github/
│   ├── workflows/          # CI and CodeQL checks for every pull request
│   └── dependabot.yml      # Weekly dependency updates
├── docs/                   # Conceptual and procedural documentation
│   └── security/           # Security overview, threat model, ZAP report
├── prisma/
│   ├── schema.prisma       # Database models and relations
│   ├── migrations/         # Database changes, applied in order
│   ├── seed.js             # Reference data, and demo data with --demo
│   └── seeds/              # The data the seed adds, and when demo data is allowed
├── public/                 # Stylesheet, browser scripts, images, and uploaded photos
├── src/
│   ├── server.js           # Loads .env and starts the server
│   ├── app.js              # Express setup, middleware order, and page routes
│   ├── config/             # Firebase Admin SDK and trusted proxy settings
│   ├── controllers/        # Login, logout, registration, and password reset
│   ├── middleware/         # Security headers, CSRF, rate limits, sessions, uploads, errors
│   ├── policies/           # Who may do what: roles and report changes
│   ├── routes/             # Account routes under /api
│   ├── services/           # Firebase, sessions, profiles, images, reports, logging
│   ├── utils/              # Small helpers, such as JSON for inline scripts
│   └── validation/         # The rules every form must meet
├── tests/
│   ├── Jest/               # Unit and integration tests, with fakes for Firebase and the database
│   └── E2E/                # Playwright browser tests (out of date)
├── views/                  # EJS page templates
│   └── includes/           # Shared head, navigation bar, and CSRF field
├── prismaClient.js         # Shared Prisma client
├── .env.example            # Every setting the application needs, without values
├── eslint.config.js        # Lint rules, including security rules
├── jest.config.js          # Test setup
└── package.json            # Scripts and dependencies
```

## Testing

Run the configured automated tests with:

```bash
npm test
npm run lint
npx playwright test
```

`npm test` runs the Jest tests, which replace Firebase and the database with fakes, so they need no secrets or network. The Playwright tests are out of date and will be rewritten.

See the [procedural instructions](docs/procedural-instructions.md) for testing procedures and the [contributors guide](CONTRIBUTING.md) for testing requirements.

## Code analysis tools

These run on every pull request and every change to `main` ([`.github/workflows`](.github/workflows)). Branch protection only lets a pull request into `main` once they pass.

| Tool | What it checks | Where to run or see it |
|---|---|---|
| Jest and SuperTest | Behaviour of every route, security rule, and service | `npm test`, CI job "Tests" |
| ESLint with `eslint-plugin-security` | Common bugs, and patterns that often lead to vulnerabilities, such as dynamic file paths or unsafe regular expressions. Warnings fail the check | `npm run lint`, CI job "Lint", rules in [`eslint.config.js`](eslint.config.js) |
| `npm audit` | Known vulnerabilities in dependencies. Fails on critical ones | `npm audit --omit=dev`, CI job "Dependency audit" |
| gitleaks | Secrets such as keys or passwords anywhere in the Git history | CI job "Secret scan" |
| CodeQL | Vulnerabilities found by following data through the code, such as injection or path traversal | CI workflow "CodeQL", results under **Security > Code scanning** |
| Dependabot | Newer versions of npm packages and GitHub Actions, as weekly pull requests | [`.github/dependabot.yml`](.github/dependabot.yml), **Pull requests** |
| GitHub secret scanning and push protection | Known kinds of secrets, refused before they are pushed | Repository settings, **Security** |

## Configuration and security

The [threat model](docs/security/threat-model.md) lists the assets, trust boundaries, and known threats, with the current status of each.

- Never commit `.env`, Firebase service-account JSON, database passwords, or private keys. Push protection and gitleaks check for them.
- Use a separate Firebase project and database for development where possible.
- Every form is checked on the server against the rules in [`src/validation/forms.js`](src/validation/forms.js): required fields, maximum lengths, email format, and ID format. Fields a form does not define are ignored.
- New passwords need at least 12 characters, with no rules about symbols or digits. Set the Firebase password policy (Authentication → Settings → Password policy) to the same minimum, so passwords set on Firebase's own reset page follow it too.
- Every response carries a strict Content Security Policy, HSTS, and clickjacking protection ([`security-headers.js`](src/middleware/security-headers.js)). Pages must not contain inline scripts, `style` attributes, or `on...=` handlers: put code in `public/` and styles in `public/style.css`. A test fails otherwise.
- Every form that sends a POST must include `<%- include('includes/csrf-field') %>`. Requests without a valid CSRF token are refused with 403.
- Login, registration, password reset, and report submission are rate limited per IP address ([`rate-limits.js`](src/middleware/rate-limits.js)).
- Unexpected errors show visitors a general page with a short error ID, never details. Pass errors on with `next(error)` instead of answering 500 in a route.
- Security events (logins, refused requests, report changes) are written as JSON lines to the server output with `logSecurityEvent` ([`server-log.js`](src/services/server-log.js)). Never log passwords, tokens, cookies, form contents, or email addresses. On Render, filter the log for `"type":"security"` or for an error ID.
- Report images must be JPEG, PNG, or WebP and at most 5 MB. The type is checked from the file content, and files are stored under random names.
- Use HTTPS in production so authentication cookies and credentials are protected in transit.
- Review authorisation checks on every route that reads, edits, or deletes user data.
- Logins are Firebase session cookies: `HttpOnly`, `SameSite=Lax`, `Secure` over HTTPS, valid for one day, checked for revocation on every request, and revoked at logout.
- Firebase stores and checks all passwords. The application database holds no password data.
- Use a separate database for development, such as a Neon branch, and run the demo seed only there.

## Accounts and roles

Every account starts as a **Citizen**. A citizen must verify their email address before they can submit, edit, or delete reports, and can only edit or delete their own. An **Admin** can edit or delete any report and use the `/admin` routes.

The application never grants the admin role itself, and the seed never creates an admin. To make someone an admin:

1. They register, verify their email address, and log in once, which creates their profile.
2. In the Neon console, open the SQL editor on the correct branch and run, with their address:

   ```sql
   UPDATE users
   SET role_id = (SELECT id FROM "Role" WHERE title = 'Admin')
   WHERE email = 'person@example.org' AND firebase_uid IS NOT NULL;
   ```

3. Check that it worked. Neon's SQL editor reports "Statement executed successfully" even when no row matched, for example because of a typo in the address, so run:

   ```sql
   SELECT u.email, r.title
   FROM users u JOIN "Role" r ON r.id = u.role_id
   WHERE u.email = 'person@example.org';
   ```

   It should return one row with `Admin`. The role is read on every request, so it applies straight away: `/admin/analytics` now opens for them.

To remove the role, run the same statement with `'Citizen'` instead of `'Admin'`.

## Deployment

A deployed instance runs on Render at <https://cv-wluv.onrender.com>, with the `production` branch of the Neon database.

### Render settings

| Setting | Value |
|---|---|
| Build Command | `npm ci && npm run deploy:prepare` |
| Start Command | `npm start` |
| Node.js version | 22, taken from `engines` in `package.json` |

`npm run deploy:prepare` generates the Prisma client, applies any migrations that have not run yet (`prisma migrate deploy`, which never resets data), and adds the reference data. It never adds demo data or an admin. If any part fails, the build fails and Render keeps the previous version running. The free plan has no separate pre-deploy step, so this runs during the build.

### Environment variables on Render

| Variable | Value |
|---|---|
| `DATABASE_URL` | Connection string of the Neon `production` branch, never the development one |
| `FIREBASE_API_KEY` | As in `.env` |
| `FIREBASE_SERVICE_ACCOUNT` | The service-account JSON on one line |
| `CSRF_SECRET` | Its own random value, generated as described in [Configure the environment](#2-configure-the-environment), never the local one |
| `NODE_ENV` | `production` |
| `TRUST_PROXY_HOPS` | `3`. Requests reach the app through Cloudflare and two Render proxies, and Express must skip exactly these to find the visitor's address. Measured on Render; see [`src/config/proxy.js`](src/config/proxy.js) |

Render provides `PORT` itself. Never copy local secrets into source control.

### After a deployment

1. Open the site and check that the pages load over HTTPS.
2. Register or log in, and submit a report with an image.
3. In Render's **Logs**, check that the security events show your own IP address in `ip`. The rate limits count per address, so they only work if `TRUST_PROXY_HOPS` matches the number of proxies. If `ip` shows a private `10.x` address, the number is too low. If it shows an address that a request can set itself with an `X-Forwarded-For` header, it is too high.
4. The first time only: make an admin as described in [Accounts and roles](#accounts-and-roles), using the SQL editor on the `production` branch.
