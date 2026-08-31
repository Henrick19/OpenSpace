# OpenSpace — PSB Combined Dashboard

This repository is the shared team workspace for the PSB OpenSpace project. The planned application will combine:

- OpenSpace capture upload and processing-status monitoring;
- floor-plan selection and capture starting-point input;
- robot and IoT telemetry;
- later machine-learning results and AI-assisted insights.

## Current repository stage

The application code has **not** been added yet. This version establishes the agreed folder structure and team guidance only. Team members should review and confirm the structure before React, Node.js or AWS implementation begins.

## Planned structure

```text
apps/
  web/                 Planned Vite + React + TypeScript frontend
  api/                 Planned Node.js integration and upload service
packages/
  shared/              Planned types and contracts shared by web and API
infra/
  aws/                 Future AWS infrastructure and environment notes
docs/
  architecture/        Folder and system-structure guidance
  development/         Local-development instructions
  deployment/          Future AWS migration instructions
```

See:

- [Folder structure guide](docs/architecture/FOLDER_STRUCTURE.md)
- [Local development plan](docs/development/LOCAL_SETUP.md)
- [AWS migration plan](docs/deployment/AWS_MIGRATION.md)
- [Security guidance](SECURITY.md)

## Important security rule

Never commit OpenSpace credentials, access tokens, passwords, secret-manager links, real `.env` files, INSV capture files or sensitive API responses. OpenSpace credentials must eventually be used only by the server-side integration service, never by React browser code.
