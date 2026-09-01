# Application folder structure

## Frontend: `apps/web`

```text
src/
├── assets/       images and imported visual files
├── components/   small reusable UI, including TopBar and Sidebar
├── features/     future larger feature modules
├── hooks/        reusable React behaviour
├── layouts/      AppLayout, which joins common navigation and page content
├── pages/        Dashboard, New Capture, Progress and History screens
├── routes/       all URL-to-page definitions
├── services/     the browser API layer
└── styles/       global CSS placed after Bootstrap
```

A page should focus on presentation and user interaction. It should call functions such as `captureApi.list()` instead of writing `fetch()` calls throughout the component.

## Local service: `apps/api`

```text
src/
├── database/     SQLite connection and schema creation
├── repositories/ SQL operations hidden behind JavaScript functions
├── routes/       endpoints called by the React service layer
├── openspace/    future authenticated OpenSpace adapter
├── services/     future upload and processing workflows
└── app.js        assembles Express without starting a network listener
```

`server.js` starts the service and opens SQLite. `app.js` is kept separate so automated tests can run without opening a public port.

## Shared package: `packages/shared`

Contains safe JavaScript constants used by both applications, such as the allowed capture statuses. It must never contain credentials or environment-specific values.

## Data flow

```text
Page component
  ↓
Frontend service (`apps/web/src/services`)
  ↓
Express route (`apps/api/src/routes`)
  ↓
SQLite repository or future OpenSpace service
```

## Team rules

1. Put route-level screens in `pages`, not `components`.
2. Reuse `TopBar`, `Sidebar` and `AppLayout`.
3. Put browser requests in `services`; pages should not know API URLs.
4. Put SQL only in repositories/database files.
5. Keep authenticated OpenSpace logic on the server.
6. Do not commit generated builds, dependencies, credentials, databases or captures.
