# Planned dependencies

No packages are installed in the repository yet because the current milestone contains no application code. Installing dependencies now would create manifests and a lockfile for an application that does not yet exist. The following list records the intended dependency baseline for team review.

## Developer tools

- **Git:** version control and team branches.
- **Node.js 22 LTS:** planned JavaScript and TypeScript runtime.
- **npm workspaces:** manage the web, API and shared packages from the repository root.
- **Docker Desktop:** optional local container runtime for the Node.js integration service.
- **1Password CLI or another school-approved method:** inject authorised development secrets without saving them in Git.

## Root workspace

Planned responsibility: coordinate commands across the frontend, API and shared package.

- `concurrently`: start the web and API development processes together.

## Frontend: `apps/web`

### Runtime packages

- `react`: component-based frontend framework.
- `react-dom`: render the React application in the browser.
- `react-router-dom`: dashboard routes and navigation.
- `@openspace/shared`: safe types shared with the Node.js service.

### Development packages

- `vite`: development server and production frontend build.
- `typescript`: static type checking.
- `@vitejs/plugin-react`: React support for Vite.
- `@types/react` and `@types/react-dom`: TypeScript definitions.
- `vitest`: frontend unit testing.
- `oxlint` or an agreed linting tool: code-quality checks.

## Node.js service: `apps/api`

### Runtime packages

- `express`: local HTTP service used by the React application.
- `cors`: controlled cross-origin behaviour during development.
- `multer`: receive selected upload files from the browser.
- `zod`: validate requests, configuration and OpenSpace response data.
- `dotenv`: local non-secret configuration during development; real secrets must come from the approved secret manager.
- `@openspace/shared`: shared capture and status contracts.

### Development packages

- `typescript`: compile and type-check the service.
- `tsx`: run TypeScript during development.
- `vitest`: unit and integration testing.
- `supertest`: test local HTTP routes without starting an external server.
- `@types/node`, `@types/express`, `@types/cors`, `@types/multer` and `@types/supertest`: TypeScript definitions.

## Shared package: `packages/shared`

- `typescript`: build safe interfaces and validation contracts shared by the web and API packages.

## When dependencies should be added

Dependencies should be installed only when the team begins the corresponding implementation. At that time:

1. create the root npm workspace and package manifests;
2. use compatible, reviewed package versions;
3. commit the generated lockfile;
4. run a vulnerability review;
5. remove any dependency that is not actually used;
6. document the standard install and validation commands.

Docker itself is a developer tool, not an npm dependency.
