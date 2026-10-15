# Community Voice

Community Voice is a web application that allows citizens to report problems with public infrastructure in Berlin. A user can create an account, sign in, submit a report with a title, description, neighbourhood, and optional image, then track, edit, or delete reports. The application also provides administrative reporting and analytics endpoints.

## Contents

- [Features](#features)
- [Conceptual overview](#conceptual-overview)
- [Technology stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Getting started](#getting-started)
- [Tutorial: submit and track a report](#tutorial-submit-and-track-a-report)
- [Hello World](#hello-world)
- [Database and seed data](#database-and-seed-data)
- [Testing](#testing)
- [Project structure](#project-structure)
- [Configuration and security](#configuration-and-security)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## Features

- User registration, login, logout, email verification, and password reset through Firebase Authentication.
- Local user profiles and role information stored with Prisma and PostgreSQL.
- Creation of civic reports with a title, description, neighbourhood, and optional image.
- Report status values: `OPEN`, `IN_PROGRESS`, and `RESOLVED`.
- Report tracking, editing, and deletion with author/admin permissions.
- Image uploads handled with Multer and served from the public uploads directory.
- Administrative statistics, including counts by status, top reporters, and busiest neighbourhoods.

## Conceptual overview

Community Voice is a server-rendered web application designed to help citizens report infrastructure problems in Berlin. Users can create an account, sign in, submit reports about local issues, attach images, and track the progress of their reports.

The application follows an Express-based architecture. Browser requests are received by the Express server and directed to the appropriate routes and controllers. Authentication middleware reads the user's cookie and verifies the Firebase authentication token before protected actions are allowed. Prisma acts as the database access layer and communicates with PostgreSQL, where user profiles, reports, locations, attachments, categories, and status changes are stored. EJS templates generate the user interface displayed in the browser.

## Community Voice System Architecture
```mermaid
flowchart LR
    U[Citizen or administrator] -->|Browser request| E[Express application]
    E --> M[Authentication middleware]
    M -->|Verify Firebase token| F[Firebase Authentication]
    E --> R[Routes and controllers]
    R --> P[Prisma ORM]
    P --> D[(PostgreSQL database)]
    R --> V[EJS views]
    V --> U
    R --> S[Static files and image uploads]
    S --> U
```
**Figure 1: Community Voice system architecture.** Users interact with the application through a web browser. Express handles incoming requests, authentication middleware verifies Firebase tokens, routes and controllers coordinate application behaviour, Prisma provides access to the PostgreSQL database, EJS views generate web pages, and the upload system handles report images.

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

## Getting started

### 1. Clone the repository

```bash
git clone https://github.com/aframeymi/CV.git
cd CV
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root. Do not commit this file.

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"

FIREBASE_API_KEY="your-firebase-api-key"
FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_STORAGE_BUCKET="your-project.firebasestorage.app"
FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
FIREBASE_APP_ID="your-app-id"
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'

PORT=5000
```

The Firebase service account value must be valid JSON in the format expected by the Firebase Admin SDK. Keep all credentials private.

### 4. Apply the database schema

For an existing migration history, apply pending migrations with:

```bash
npx prisma migrate deploy
```

If you are developing a new schema change locally, use the appropriate Prisma migration workflow rather than editing the generated SQL by hand.

### 5. Load development data

```bash
npm run prisma:seed
```

The seed script creates roles, a Berlin city record, neighbourhoods, categories, example users, example reports, and additional demo reports for performance testing.

### 6. Start the application

```bash
npm run dev
```

Open `http://localhost:5000` in a browser. For a production-style start, use:

```bash
npm start
```

### 7. Inspect the database with Prisma Studio

```bash
npx prisma studio
```

## Tutorial: submit and track a report

1. Open the application at `http://localhost:5000`.
2. Choose **Register** and create a user account with an email address and password.
3. Complete email verification if Firebase requires it.
4. Sign in with the new account.
5. Open the report form.
6. Enter a short, descriptive title, such as `Broken streetlight near the station`.
7. Add a description explaining what is wrong and where it can be found.
8. Select the relevant neighbourhood.
9. Optionally attach an image showing the issue.
10. Submit the report.
11. Open the tracking page to confirm that the new report appears with status `OPEN`.
12. Use the edit or delete action only when you have permission to modify that report.

A useful report should be specific, factual, and actionable. Include the location, visible symptoms, and any information that would help the municipality investigate the problem.

## Hello World

This small exercise confirms that Node.js, Express, and the project can serve a response.

### Option A: use the application root route

Start the application and visit:

```text
http://localhost:5000/
```

The application should render the Community Voice landing page. This is the project's user-facing equivalent of a Hello World response.

### Option B: add a minimal diagnostic route

In the Express application file, add this route before `app.listen`:

```js
app.get('/hello', (req, res) => {
  res.send('Hello World');
});
```

Restart the development server and visit:

```text
http://localhost:5000/hello
```

The expected response is:

```text
Hello World
```

This route is intended as a local verification exercise. Remove it or protect it before production deployment if it is not part of the application design.

## Database and seed data

The Prisma schema models the following concepts:

- `User` and `Role` for accounts and permissions
- `City` and `Neighborhood` for report locations
- `Report` for civic issues
- `Category` for report classification
- `Attachment` for uploaded files
- `StatusChange` for report status history

Reports belong to one author and one neighbourhood, can have multiple categories and attachments, and use a controlled status enum.

![Community Voice database relationships](<CV Tables.png>)

**Figure 2: Community Voice database relationships.** This entity-relationship diagram shows how users, reports, locations, categories, attachments, and status history are related in the database.


## Testing

Run the configured automated tests with:

```bash
npm test
```

End-to-end tests are configured with Playwright. If the project includes browser tests in the configured test directory, run them with:

```bash
npx playwright test
```

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

## Configuration and security

- Never commit `.env`, Firebase service-account JSON, database passwords, or private keys.
- Use a separate Firebase project and database for development where possible.
- Validate uploaded file types, file names, and file sizes before deploying publicly.
- Use HTTPS in production so authentication cookies and credentials are protected in transit.
- Review authorisation checks on every route that reads, edits, or deletes user data.
- Replace development seed passwords before using the database outside local development.

## Troubleshooting

### The server cannot connect to PostgreSQL

Check that `DATABASE_URL` is present, correctly formatted, and points to a reachable database. Then run `npx prisma migrate deploy` again.

### Firebase initialisation fails

Check every Firebase variable in `.env`, especially `FIREBASE_SERVICE_ACCOUNT`. The service-account value must be valid JSON and must not contain accidental line breaks or shell quoting errors.

### Prisma cannot find the generated client

Run:

```bash
npx prisma generate
```

Then restart the development server.

### Uploaded images cannot be displayed

Confirm that `public/uploads` exists and that the application serves the `public` directory as static content.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before making changes. In summary: create a focused branch, keep changes small, test them locally, update documentation when behaviour changes, and open a pull request with a clear description.

## Deployment

A deployed instance is available at:

<https://cv-wluv.onrender.com>

The deployment environment must provide the same required environment variables as a local installation. Never copy local secrets into source control.
