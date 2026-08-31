# OpenSpace — PSB Combined Dashboard

This repository is the shared team workspace for the PSB OpenSpace project. The planned application will combine:

- OpenSpace capture upload and processing-status monitoring;
- floor-plan selection and capture starting-point input;
- robot and IoT telemetry;
- later machine-learning results and AI-assisted insights.

## Current repository stage

The npm workspace, Vite React frontend and Node.js TypeScript service are now initialised. This foundation includes a local health check only; OpenSpace integration and the final dashboard features have not been added yet.

## Install workspace dependencies

Use Node.js 22 and npm 10:

```bash
nvm use
npm install
npm run dev
```

Open `http://localhost:5173`. The frontend proxies `/api` requests to the Node.js service at `http://localhost:8787`.

The repository uses one root `package-lock.json` for all workspaces. Do not run separate installs inside each application folder. Run `npm run check` before committing implementation changes.

## Planned structure

```text
apps/
  web/                 Planned Vite + React + TypeScript frontend
  api/                 Planned Node.js integration and upload service
packages/
  shared/              Planned types and contracts shared by web and API
infra/
  aws/                 Future AWS infrastructure and environment notes
docker/                Planned container structure and Docker guidance
docs/
  architecture/        Folder and system-structure guidance
  development/         Local-development instructions
  deployment/          Future AWS migration instructions
```

See:

- [Folder structure guide](docs/architecture/FOLDER_STRUCTURE.md)
- [Dependency plan](docs/development/DEPENDENCIES.md)
- [Local development plan](docs/development/LOCAL_SETUP.md)
- [Docker setup plan](docs/deployment/DOCKER_SETUP.md)
- [AWS migration plan](docs/deployment/AWS_MIGRATION.md)
- [Security guidance](SECURITY.md)

## Important security rule

Never commit OpenSpace credentials, access tokens, passwords, secret-manager links, real `.env` files, INSV capture files or sensitive API responses. OpenSpace credentials must eventually be used only by the server-side integration service, never by React browser code.
