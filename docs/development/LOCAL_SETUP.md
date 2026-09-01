# Local development

## Start the workspace

```bash
nvm use
npm install
cp apps/api/.env.example apps/api/.env
npm run dev
```

- React: `http://localhost:5173`
- Node.js API: `http://localhost:8787`
- SQLite: `apps/api/data/database/openspace.sqlite`

SQLite and its temporary WAL files are ignored by Git. Each developer receives a separate local database.

The actual `.env` file is also ignored by Git. Leave `OPENSPACE_MODE=mock` for normal page development. Only an authorised backend developer may set `OPENSPACE_MODE=live` and provide the base URL, client ID and client secret. The service refuses to start in live mode when a required value is missing.

## Development modes

### Mock/local mode

This is the default for the team. It needs no OpenSpace credential. Pages can use the local routes and SQLite database while the OpenSpace adapter is being implemented.

### Approved integration mode

Only authorised integration developers may enable live OpenSpace calls. During the local MVP, the Node.js process reads credentials from its private, Git-ignored `.env` file. After AWS deployment, this source will be replaced by AWS Secrets Manager. React must never receive the values.

## Working on an assigned page

1. Find the page in `apps/web/src/pages`.
2. Reuse the common layout; do not add another top bar or sidebar.
3. Add reusable page elements to `components` only when more than one page needs them.
4. Request data through `apps/web/src/services`.
5. Ask the integration owner to add a new service/route function when required.
6. Run `npm run check` before sharing the branch.

## Current frontend routes

| URL | Page |
|---|---|
| `/dashboard` | Dashboard |
| `/captures/new` | New capture and verification |
| `/captures/:captureId/progress` | Upload and processing progress |
| `/captures` | Capture history |

## Local API endpoints

| Method and path | Purpose |
|---|---|
| `GET /api/health` | Local service health check |
| `GET /api/dashboard/summary` | Dashboard capture totals |
| `GET /api/projects` | Locally cached projects; future OpenSpace sync |
| `GET /api/captures` | Search/filter/paginate capture history |
| `POST /api/captures` | Create a local capture metadata record |
| `GET /api/captures/:id` | Retrieve one capture job |

These endpoints currently operate locally and do not make a live OpenSpace request.

## Understanding progress

The progress page displays byte-transfer progress from 0–100%. After the transfer is accepted, the OpenSpace cloud-processing phase uses a spinner and stage label rather than an invented percentage. The page refreshes the local capture record every 15 seconds; the future OpenSpace adapter will update that record after polling a supported status endpoint.

Until OpenSpace documents a definitive completion field or viewer URL, disappearance from `pendingCaptures` must be treated as requiring confirmation rather than automatically becoming `ready`.
