# OpenSpace — PSB Capture Dashboard

This repository is the shared team workspace for the first PSB OpenSpace MVP. The current implementation focuses on four screens:

- dashboard;
- new capture and verification;
- upload/processing progress;
- upload history.

The IoT and AI screens are outside this first implementation stage.

## Technology

- **Frontend:** Vite, React JavaScript and Bootstrap 5
- **Local service:** Node.js JavaScript and Express
- **Local database:** SQLite through `better-sqlite3`
- **Navigation:** React Router
- **Future integration:** OpenSpace Private API through the Node.js service only

## Run locally

Use Node.js 24 LTS and npm 11. From the repository root:

```bash
nvm use
npm install
cp apps/api/.env.example apps/api/.env
npm run dev
```

Open `http://localhost:5173`. Vite forwards `/api` requests to the local service at `http://localhost:8787`. SQLite is created automatically at `apps/api/data/database/openspace.sqlite`; it is ignored by Git.

Interactive PSB backend documentation is available at `http://localhost:8787/api/docs`. The raw OpenAPI document is available at `http://localhost:8787/api/docs/openapi.json`. These pages document only PSB-owned endpoints; private OpenSpace endpoints and credentials are excluded.

The actual `apps/api/.env` file is local and ignored by Git. New developers leave it in mock mode. Only an authorised backend integration developer may add the real OpenSpace client ID and secret. Never add secrets to a `VITE_` variable because Vite exposes those values to browser code.

Before committing:

```bash
npm run check
```

## Simple rule for page developers

Page developers normally work inside `apps/web/src/pages`. Reuse `TopBar`, `Sidebar` and `AppLayout`; do not recreate them on each page.

When a page needs data, call a function from `apps/web/src/services`:

```text
React page → frontend service → Node.js route → repository/OpenSpace adapter
```

Do not call OpenSpace directly from a React page and never place OpenSpace credentials in browser code.

For the upload-only MVP, use `dashboardApi.getSummary()` for the dashboard and the reusable methods in `uploadApi` for creating, listing, reading and retrying upload records. SQLite is accessed only by the Node.js repository layer.

## Main folders

```text
apps/
  web/src/
    components/       shared TopBar and Sidebar
    layouts/          shared page frame
    pages/            team-owned route screens
    routes/           central React route definitions
    services/         frontend API layer
  api/src/
    database/         SQLite connection and schema
    repositories/     database queries
    routes/           safe endpoints for React
    openapi/          Swagger/OpenAPI documentation for PSB endpoints
    openspace/        future private API adapter
packages/shared/      safe shared constants
```

Read the [folder structure guide](docs/architecture/FOLDER_STRUCTURE.md), [local setup guide](docs/development/LOCAL_SETUP.md), [API documentation guide](docs/development/API_DOCUMENTATION.md), [database guide](docs/development/DATABASE.md) and [security guidance](SECURITY.md).

## Security

Never commit OpenSpace credentials, tokens, real `.env` files, secret-manager links, INSV files or the local SQLite database. Frontend-only developers can work in mock mode without credentials.

## Planned progress display

When its page owner implements the progress screen, it should separate two different operations:

1. **File transfer:** a real 0–100% value based on transferred bytes.
2. **OpenSpace processing:** an indeterminate state because the current integration does not provide a reliable processing percentage.

The application shows `Ready` only after the capture has first been observed in `pendingCaptures` and later disappears from that list. This avoids treating an initially unregistered capture as completed.
