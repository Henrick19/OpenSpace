# Local development plan

This repository currently contains folder placeholders and documentation only. It is not yet a runnable application.

## Planned local architecture

```text
React browser application
        ↓ safe local requests
Node.js integration and upload service
        ↓ authenticated server-side requests
OpenSpace private API
```

The React application must not receive the OpenSpace client secret, machine-user password or access token.

## Before implementation starts

The team should confirm:

1. the frontend framework: Vite + React + TypeScript;
2. the Node.js version and package-management approach;
3. the approved OpenSpace project/site configuration;
4. which developers are authorised to use the internal secret manager;
5. the initial mock-data contracts shared between the frontend and service;
6. the first MVP screens and ownership assignments.

## Planned development modes

### Mock mode

Mock mode should be the normal development option for UI work. It should simulate project selection, floor-sheet display, upload progress and processing status without using credentials or submitting a real capture.

### Approved integration mode

Only authorised developers should enable real OpenSpace integration. The Node.js process should receive secrets temporarily from the approved internal secret manager. Secret values must not be written into repository files.

## Planned first implementation sequence

1. Initialise the workspace configuration without adding credentials.
2. Initialise the Vite React frontend in `apps/web`.
3. Initialise the Node.js TypeScript service in `apps/api`.
4. Define safe shared contracts in `packages/shared`.
5. Implement mock endpoints and build the MVP screens.
6. Add the approved OpenSpace adapter behind the Node.js service.
7. Add automated checks before enabling any live upload test.

## Expected local ports

The team may use these defaults after implementation:

- React development server: `http://localhost:5173`
- Node.js service: `http://localhost:8787`

Vite can later proxy browser requests beginning with `/api` to the local Node.js service.

## Validation expectations

When code is introduced, the repository should provide one documented validation command that runs formatting or linting, type checks, tests and production builds. No live OpenSpace request should run as part of the normal automated test suite.
