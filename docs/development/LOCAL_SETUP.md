# Local development

## Start the workspace

```bash
nvm use
npm install
npm run dev
```

- React: `http://localhost:5173`
- Node.js API: `http://localhost:8787`
- SQLite: `apps/api/data/database/openspace.sqlite`

SQLite and its temporary WAL files are ignored by Git. Each developer receives a separate local database.

## Development modes

### Mock/local mode

This is the default for the team. It needs no OpenSpace credential. Pages can use the local routes and SQLite database while the OpenSpace adapter is being implemented.

### Approved integration mode

Only authorised integration developers may enable live OpenSpace calls. The Node.js process receives credentials from the approved secret manager at runtime. React must never receive them.

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
