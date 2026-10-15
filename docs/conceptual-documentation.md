# Community Voice: Conceptual Documentation

This document is intended for developers, contributors, and assessors who need to understand how Community Voice works without reading the implementation code.

## 1. Purpose and problem

Community Voice is a civic reporting platform for Berlin. It gives residents a structured way to communicate infrastructure problems to the municipality rather than relying on informal messages or unstructured complaints.

The application turns a citizen's observation into a trackable report containing a title, description, location, optional evidence, an owner, and a status. This creates a shared record that can be followed from submission through resolution.

## 2. Users and responsibilities

### Citizen

A citizen can:

- Register and authenticate.
- Create a report about a local issue.
- Add a title, description, neighbourhood, and optional image.
- View reports and follow their progress.
- Edit or delete reports where the application permits it.

### Administrator

An administrator has elevated responsibility for managing the platform and can access administrative reporting and analytics. The data model represents administrator and citizen roles separately so that access decisions can be made based on role.

Administrative authorisation should be enforced by the relevant middleware before production deployment. The presence of an administrative route alone does not guarantee that only administrators can access it.

## 3. System boundary

The project is a web application. The browser is the primary client. The Express server is responsible for routing, authentication middleware, validation, rendering, file handling, and coordination with external services. Firebase provides identity services, while PostgreSQL stores the application's domain data.

### Community Voice system architecture

```mermaid
flowchart TB
    subgraph Client[Client]
        Browser[Web browser]
    end

    subgraph Application[Community Voice application]
        Express[Express server]
        AuthMiddleware[Cookie and token middleware]
        Routes[Routes and controllers]
        Views[EJS views]
        Uploads[Static files and uploads]
        Prisma[Prisma data access]
    end

    Firebase[(Firebase Authentication)]
    PostgreSQL[(PostgreSQL)]

    Browser --> Express
    Express --> AuthMiddleware
    AuthMiddleware --> Firebase
    Express --> Routes
    Routes --> Views
    Views --> Browser
    Routes --> Uploads
    Routes --> Prisma
    Prisma --> PostgreSQL
```

**Figure 1: Community Voice system architecture.** Users interact with Community Voice through a web browser. Express handles requests, authentication middleware verifies Firebase tokens, routes and controllers coordinate application behaviour, Prisma provides access to PostgreSQL, EJS views generate web pages, and the upload system handles report images.

## 4. Core workflow

### Authentication

1. The user submits registration details.
2. Firebase creates the authentication identity and can send a verification email.
3. The application creates a corresponding local user profile with a role.
4. During login, Firebase returns an identity token.
5. The server stores the token in an `access_token` cookie and verifies it when protected routes are accessed.

### Report creation

1. The authenticated user opens the report form.
2. The user submits report details and, optionally, an image.
3. Authentication middleware verifies the token.
4. The application finds the local user profile.
5. Prisma creates the report with status `OPEN`.
6. If an image was supplied, the application stores its file path and attachment metadata.
7. A status-history record records the initial state.
8. The user is redirected to the tracking page.

### Tracking and administration

The tracking view retrieves reports from PostgreSQL and orders them by creation time. Administrative endpoints aggregate report data by status and identify high-volume reporters and neighbourhoods. These aggregates support monitoring and future operational decision-making.

## 5. Domain model and database design

The data model is relational:

- A **Role** can be assigned to many **Users**.
- A **City** contains many **Neighbourhoods**.
- A **User** can author many **Reports**.
- A **Neighbourhood** can contain many **Reports**.
- A **Report** can have many **Attachments** and **StatusChanges**.
- A **Report** can have many **Categories**, and a category can be applied to many reports.

The report status is restricted to `OPEN`, `IN_PROGRESS`, and `RESOLVED`. This prevents arbitrary status text from entering the database and makes reporting more consistent.

![Community Voice database relationships](<../CV Tables.png>)

**Figure 2: Community Voice database relationships.** This entity-relationship diagram shows how users, roles, reports, locations, attachments, status changes, and categories are related in the database.

## 6. Architectural responsibilities

| Component | Responsibility |
|---|---|
| Browser and EJS views | Present forms, pages, report information, and user actions |
| Express | Receive HTTP requests and send HTML or JSON responses |
| Routes | Map URLs and HTTP methods to application behaviour |
| Middleware | Parse requests, read cookies, attach user information, and verify tokens |
| Controllers | Coordinate authentication and user-profile operations |
| Multer | Receive uploaded image files |
| Firebase | Authenticate users and verify identity tokens |
| Prisma | Provide typed access to PostgreSQL models |
| PostgreSQL | Persist users, reports, locations, statuses, and attachments |

## 7. Design rationale

The project separates authentication identity from the local user profile. Firebase handles password authentication and identity verification, while PostgreSQL stores application-specific information such as names, roles, and authored reports. This allows the application to use a managed authentication service while retaining control over its domain data.

Prisma provides a central schema for relationships and constraints. Express keeps the application request-driven and lightweight, while EJS allows the server to render pages without requiring a separate frontend build system.

## 8. Implementation considerations

Before submission or deployment, verify that:

- The `package.json` start scripts point to the actual application entry point.
- The migration and seed commands point to the actual Prisma directory.
- Every report-creation path supplies all fields required by the Prisma schema, including the report neighbourhood where required.
- Uploaded files are validated and stored safely in production.
- Administrative routes enforce administrator authorisation rather than relying only on route naming.

These checks prevent readers from assuming that a successful architecture diagram guarantees a production-ready deployment.
