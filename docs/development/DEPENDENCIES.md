# Workspace dependencies

Use one root `npm install`. Do not install separately inside each workspace.

## Frontend

- `react` and `react-dom`: interface components and browser rendering
- `react-router-dom`: page navigation
- `bootstrap`: accessible layout and common visual classes
- `vite`: local development and production build
- `oxlint`: JavaScript/React linting
- `vitest`: frontend tests

## Node.js service

- `express`: endpoints for the React application
- `better-sqlite3`: local SQLite access
- `cors`: controlled local browser access
- `zod`: request validation
- `multer`: future INSV form upload handling
- `dotenv`: non-secret local configuration; real credentials come from the approved manager
- `vitest`: API and SQLite repository tests

## Shared package

`@openspace/shared` contains plain JavaScript constants. TypeScript and its `@types` packages are intentionally not required by this project.
