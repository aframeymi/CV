# Community Voice: Procedural Instructions

These instructions are for a developer or student setting up Community Voice locally and verifying its main workflows. Complete the procedures in order unless you are only testing one specific feature.

## 1. Get started

### Goal

Run Community Voice locally and confirm that the application can connect to its database.

### Requirements

- Node.js 18 or later
- npm 9 or later
- Git
- PostgreSQL
- A Firebase project configured for email/password authentication

### Procedure

1. Clone the repository:

   ```bash
   git clone https://github.com/aframeymi/CV.git
   cd CV
   ```

2. Install the project's dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the project root and add the database, Firebase, and port variables described in the README. Never commit this file.

4. Generate the Prisma client:

   ```bash
   npx prisma generate
   ```

5. Apply the database migrations:

   ```bash
   npx prisma migrate deploy
   ```

6. Add development records:

   ```bash
   npm run prisma:seed
   ```

7. Start the development server:

   ```bash
   npm run dev
   ```

8. Open `http://localhost:5000`.

### Successful result

A successful setup should result in all of the following:

- The server starts without an uncaught exception.
- `http://localhost:5000` loads the Community Voice landing page.
- The registration and sign-in pages are accessible.
- Prisma can connect to the configured database.

### If the procedure fails

- If dependencies are missing, run `npm install` again.
- If the Prisma client is missing, run `npx prisma generate`.
- If tables are missing, run `npx prisma migrate deploy`.
- If the database connection fails, check `DATABASE_URL` and confirm that the database is reachable.
- If Firebase fails to initialise, check the variable names and the formatting of `FIREBASE_SERVICE_ACCOUNT`.
- If port 5000 is occupied, stop the other process or set a different `PORT` in `.env`.

> Before submission, run these commands in a clean environment and confirm that they match the actual repository structure and `package.json` scripts.

## 2. Tutorial: create, review, and manage a report

### Goal

Complete the main citizen workflow from registration to report tracking.

### Procedure

1. Open `http://localhost:5000`.
2. Select **Register**.
3. Enter a name, email address, password, and any other requested profile information.
4. Submit the form.
5. If email verification is enabled in the Firebase project, open the verification email and complete verification.
6. Sign in with the same account.
7. Navigate to the report form.
8. Enter a concise title, for example `Pothole beside the market`.
9. Describe the problem, including its approximate location and why it needs attention.
10. Select the correct neighbourhood.
11. Add an image if one helps explain the issue.
12. Submit the report.
13. Open the tracking page and confirm that the report appears with status `OPEN`.
14. Open the report's edit action and correct a non-critical detail, if needed.
15. Return to the tracking page and confirm that the updated text is displayed.
16. If testing deletion, delete only the test report and confirm that it no longer appears.

### Expected result

The report should appear on the tracking page and remain associated with the authenticated user. If the implementation creates attachment records, a report with an image should also have attachment metadata and a stored file path.

### If the report does not appear

Check the server terminal for an error and confirm that:

- The user is authenticated.
- The selected neighbourhood exists in the database.
- The database connection is active.
- The uploaded file, if used, is stored under the configured public uploads directory.

## 3. Generate a Hello World response

### Goal

Verify the smallest possible Express response.

### Procedure

1. Open the Express application entry point.
2. Add the following route before the server starts listening:

   ```js
   app.get('/hello', (req, res) => {
     res.send('Hello World');
   });
   ```

3. Save the file.
4. Start or restart the development server:

   ```bash
   npm run dev
   ```

5. Visit `http://localhost:5000/hello`.

### Expected result

The browser displays:

```text
Hello World
```

### Clean-up

Remove the route after completing the exercise unless `/hello` is intentionally part of the application. Restart the server and confirm that the rest of the application still loads.

## 4. Run tests

Run the Jest test suite:

```bash
npm test
```

Run Playwright browser tests when the test environment and application server are available:

```bash
npx playwright test
```

A successful test run should report that the configured tests have passed. If the command returns `No tests found`, check the configured test directories and file names before treating the result as successful. If Playwright requires a running server, start the application in a separate terminal first.

## 5. Inspect the database

1. Ensure `DATABASE_URL` is configured.
2. Start Prisma Studio:

   ```bash
   npx prisma studio
   ```

3. Open the local Prisma Studio URL shown in the terminal.
4. Inspect `User`, `Report`, `Neighborhood`, `Attachment`, and `StatusChange` records.
5. Stop Prisma Studio with `Ctrl+C` when finished.

## 6. Common recovery actions

- If the application cannot start, check the terminal output and verify the entry point in `package.json`.
- If migrations fail, confirm that `DATABASE_URL` points to the intended development database.
- If seed data is missing, run `npm run prisma:seed` only against a development database.
- If Firebase authentication fails, check all Firebase environment variables and the service-account JSON.
- If uploaded images cannot be displayed, confirm that `public/uploads` exists and that the application serves the `public` directory as static content.
