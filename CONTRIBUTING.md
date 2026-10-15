# Contributing to Community Voice

This guide is for developers and students who want to modify, test, or review Community Voice. Contributions should make the application more useful, reliable, accessible, or understandable for residents and maintainers.

## Before you start

1. Read the [README](README.md), [procedural instructions](docs/procedural-instructions.md), and [conceptual documentation](docs/conceptual-documentation.md).
2. Check existing issues and pull requests to avoid duplicating work.
3. For a significant change, describe the proposed approach before implementation.
4. Never request, commit, or share passwords, database credentials, Firebase service-account data, or other secrets.

## Development setup

Follow the setup procedure in the README:

```bash
git clone https://github.com/aframeymi/CV.git
cd CV
npm install
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed
npm run dev
```

Create a local `.env` file for credentials and keep it untracked.

## Contribution workflow

1. Create or select an issue describing the problem or feature.
2. Create a focused branch from the current development branch.
3. Implement the change.
4. Run the relevant automated and manual tests.
5. Update documentation if behaviour, setup, routes, database models, or testing changes.
6. Push the branch and open a pull request.
7. Respond to review comments.
8. Merge only after the required checks pass.

## Branches and commits

Create a focused branch using a descriptive name:

```bash
git checkout -b feature/short-description
```

Use a clear commit message that explains the change, for example:

```text
Add neighbourhood validation to report submission
```

Keep unrelated refactoring out of feature commits where possible. Small commits are easier to review and revert.

## Coding guidelines

- Follow the existing JavaScript module style.
- Prefer clear names over abbreviated names.
- Keep route handling, authentication, database access, and presentation responsibilities separate.
- Validate required input at the boundary of the application.
- Return an appropriate HTTP status and a useful error message for failures.
- Preserve existing authentication and authorisation checks when changing routes.
- Use Prisma relations and schema constraints rather than duplicating database logic.
- Avoid logging passwords, tokens, service-account data, or unnecessary personal information.
- Keep user-facing text clear and accessible.
- Validate uploaded file types, file names, and file sizes before accepting public uploads.

For report-related changes, consider the complete workflow: authentication, report ownership, neighbourhood selection, status, attachments, tracking, editing, and deletion permissions.

## Database changes

When changing the Prisma schema:

1. Update the schema intentionally.
2. Create a migration using the project's Prisma workflow.
3. Test the migration against a development database.
4. Update the seed data if the change affects local setup.
5. Consider existing users, reports, attachments, and status history.
6. Document any required environment or deployment changes.

Do not make a schema change without checking its effect on report creation, tracking, analytics, and deletion behaviour.

## Testing requirements

Before opening a pull request, run the checks relevant to your change:

```bash
npm test
npx playwright test
```

For a report feature, manually test registration, authentication, report creation, tracking, editing, deletion permissions, neighbourhood validation, and image upload behaviour. For a database change, verify both migration and seed commands.

If a test command returns `No tests found`, check the configured test directories and file names. If Playwright requires a running server, start the application in a separate terminal first. If a test cannot be run, state why in the pull request.

## Pull requests

A pull request should include:

- A short summary of the problem and solution.
- The issue or requirement addressed, if applicable.
- The files or components changed.
- Tests run and their results.
- Database or environment-variable changes.
- Screenshots or a short recording for user-interface changes.
- Known limitations or follow-up work.

Keep the pull request focused. Reviewers should be able to understand the change without reconstructing unrelated history.

## Documentation requirements

Update documentation when a change affects:

- Installation or environment variables.
- User-visible behaviour.
- API routes or request data.
- Database models or migrations.
- Testing or deployment procedures.
- Authentication or authorisation behaviour.

Use examples that do not contain real credentials or private user data. Verify commands and procedures before documenting them as successful.

## Review checklist

Before requesting review, confirm:

- [ ] The application starts locally.
- [ ] Required environment variables are documented.
- [ ] Tests relevant to the change pass, or limitations are explained.
- [ ] Authentication and authorisation are preserved.
- [ ] Report ownership and permissions are correct.
- [ ] Database changes include a migration and seed impact review.
- [ ] Error cases have been considered.
- [ ] Documentation is updated.
- [ ] No secrets or generated private files are committed.
