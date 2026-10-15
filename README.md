# Community Voice

Community Voice is a web application that allows citizens to report problems with public infrastructure in Berlin. Users can create an account, submit reports with descriptions and optional images, and track reported issues.

This README is primarily for developers who want to run, test, or contribute to Community Voice. For detailed procedures, read the [procedural instructions](docs/procedural-instructions.md). For the system design, read the [conceptual documentation](docs/conceptual-documentation.md). Contributors should also read [CONTRIBUTING.md](CONTRIBUTING.md).

## Contents

- [Features](#features)
- [Technology stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Quick start](#quick-start)
- [Documentation](#documentation)
- [Project structure](#project-structure)
- [Testing](#testing)
- [Configuration and security](#configuration-and-security)
- [Deployment](#deployment)

## Features

- User registration, login, logout, email verification, and password reset through Firebase Authentication.
- Local user profiles and role information stored with Prisma and PostgreSQL.
- Civic reports with a title, description, neighbourhood, and optional image.
- Report statuses of `OPEN`, `IN_PROGRESS`, and `RESOLVED`.
- Report tracking, editing, and deletion with author/admin permissions.
- Image uploads handled with Multer and served from the public uploads directory.
- Administrative statistics, including counts by status, top reporters, and busiest neighbourhoods.

## Technology stack

- **Runtime:** Node.js 18 or later
- **Server:** Express 4
- **Templates:** EJS
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** Firebase Authentication and Firebase Admin SDK
- **Uploads:** Multer
- **Testing:** Jest, SuperTest, and Playwright
- **Development:** Nodemon

## Prerequisites

Install or obtain the following before starting:

- Node.js 18 or later
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

Create a `.env` file in the project root. Do not commit this file.

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"
FIREBASE_API_KEY="your-firebase-api-key"
FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_STORAGE_BUCKET="your-project.firebasestorage.app"
FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
FIREBASE_APP_ID="your-app-id"
FIREBASE_SERVICE_ACCOUNT=
PORT=5000
```

`FIREBASE_SERVICE_ACCOUNT` must contain the complete Firebase service-account JSON required by the Firebase Admin SDK. Never place a real credential in the README or commit it to Git.

### 3. Prepare and seed the database

```bash
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed
```

### 4. Start the application

```bash
npm run dev
```

Open `http://localhost:5000` in a browser.

> **Important:** Before submission or deployment, confirm that the commands above match the actual paths and scripts in `package.json` and the repository.

## Documentation

- [Conceptual documentation](docs/conceptual-documentation.md) — purpose, users, architecture, workflows, and database design.
- [Procedural instructions](docs/procedural-instructions.md) — setup, tutorial, Hello World, testing, database inspection, and troubleshooting.
- [Contributors guide](CONTRIBUTING.md) — branches, coding, database changes, testing, and pull requests.

## Project structure

```text
.
├── prisma/
│   ├── schema.prisma       # Database models and relations
│   └── seed.js             # Development data
├── public/                 # Static assets and uploaded files
├── views/                  # EJS page templates
├── routes/                 # HTTP routes
├── controllers/            # Authentication and user operations
├── middleware/             # Authentication and request middleware
├── app.js                  # Express application setup and routes
├── prismaClient.js         # Shared Prisma client
├── firebase.js             # Firebase client/admin configuration
├── package.json            # Scripts and dependencies
└── README.md               # Project documentation
```

## Testing

Run the configured automated tests with:

```bash
npm test
npx playwright test
```

See the [procedural instructions](docs/procedural-instructions.md) for testing procedures and the [contributors guide](CONTRIBUTING.md) for testing requirements.

## Configuration and security

- Never commit `.env`, Firebase service-account JSON, database passwords, or private keys.
- Use a separate Firebase project and database for development where possible.
- Validate uploaded file types, file names, and file sizes before deploying publicly.
- Use HTTPS in production so authentication cookies and credentials are protected in transit.
- Review authorisation checks on every route that reads, edits, or deletes user data.
- Replace development seed passwords before using the database outside local development.

## Deployment

A deployed instance is available at:

<https://cv-wluv.onrender.com>

The deployment environment must provide the same required environment variables as a local installation. Never copy local secrets into source control.
