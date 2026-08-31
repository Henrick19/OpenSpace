# Planned application folder structure

This guide explains the purpose of each placeholder folder. No application source code is included at this stage.

## Overview

```text
apps/
├── web/
│   ├── public/
│   └── src/
│       ├── assets/
│       ├── components/
│       ├── features/
│       ├── hooks/
│       ├── layouts/
│       ├── pages/
│       ├── routes/
│       ├── services/
│       ├── styles/
│       └── types/
├── api/
│   ├── data/
│   │   ├── diagnostics/
│   │   └── uploads/
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── middleware/
│       ├── openspace/
│       ├── routes/
│       ├── services/
│       └── types/
packages/
└── shared/
    └── src/
infra/
└── aws/
docker/
docs/
├── architecture/
├── development/
└── deployment/
```

## Frontend: `apps/web`

This folder will contain the Vite, React and TypeScript application after implementation is approved.

- `public/`: static public files that do not need to be imported by TypeScript.
- `src/assets/`: local images, icons and other imported visual assets.
- `src/components/`: reusable UI elements such as buttons, tables, cards and status badges.
- `src/features/`: larger domain modules, for example capture upload, capture history and IoT monitoring.
- `src/hooks/`: reusable React hooks and stateful browser behaviour.
- `src/layouts/`: shared page structures such as the header, sidebar and main content frame.
- `src/pages/`: route-level screens shown to the user.
- `src/routes/`: route definitions and navigation rules.
- `src/services/`: browser-side calls to the PSB Node.js service. It must not store OpenSpace secrets.
- `src/styles/`: global styles, design tokens and shared styling rules.
- `src/types/`: frontend-only TypeScript types.

## Server-side integration: `apps/api`

This folder will contain the local Node.js service. It will protect OpenSpace credentials, coordinate the capture-upload workflow and provide safe endpoints to the React application.

- `data/uploads/`: temporary local capture files during development. Contents are ignored by Git.
- `data/diagnostics/`: temporary redacted diagnostic output. Contents are ignored by Git.
- `src/config/`: validated server configuration and environment handling.
- `src/controllers/`: request handlers that translate frontend requests into service calls.
- `src/middleware/`: validation, error handling, access control and safe logging.
- `src/openspace/`: the OpenSpace private API client and endpoint-specific adapters.
- `src/routes/`: Node.js API route definitions used by the React application.
- `src/services/`: application workflows such as upload orchestration and status monitoring.
- `src/types/`: server-only data types.

The browser must call this service instead of calling authenticated OpenSpace endpoints directly.

## Shared contracts: `packages/shared`

This package will contain safe, non-secret data contracts shared by the frontend and Node.js service, such as capture status, sheet summaries and validation types. It should not contain runtime credentials or server configuration.

## AWS preparation: `infra/aws`

This folder is reserved for future infrastructure-as-code and AWS environment documentation. It must remain documentation-only until the AWS account, region, sponsorship, service selection and security responsibilities are confirmed.

## Container preparation: `docker`

This folder records the agreed Docker approach before runnable container files are introduced. The first useful container target will be the Node.js integration service. React can continue to run through Vite during local development and can later be built as static files for AWS Amplify Hosting.

## Documentation folders

- `docs/architecture/`: technical structure and approved architecture decisions.
- `docs/development/`: local setup, team workflow and validation instructions.
- `docs/deployment/`: future AWS migration and deployment procedures.

Existing project-management, proposal, research, meeting, wireframe and presentation folders under `docs/` remain unchanged.

## Team rules

1. Do not place an entire page implementation in the reusable `components` folder.
2. Reuse common UI before creating duplicate versions.
3. Keep OpenSpace-specific authenticated logic in `apps/api/src/openspace`.
4. Keep browser requests in `apps/web/src/services` and point them to the PSB service.
5. Do not commit generated builds, dependencies, secrets or captured files.
6. Record approved architecture changes before reorganising shared folders.
