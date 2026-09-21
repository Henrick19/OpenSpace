# PSB Backend API Documentation

The Node.js service publishes interactive Swagger documentation generated from its OpenAPI document.

## Open the documentation

Start the application from the repository root:

```bash
nvm use
npm run dev
```

Then open:

- Interactive Swagger UI: `http://localhost:8787/api/docs`
- Raw OpenAPI JSON: `http://localhost:8787/api/docs/openapi.json`

Swagger UI shows each request field, query parameter, response status and returned object. Its **Try it out** button can call the local backend directly. When testing file upload, use a non-sensitive test INSV file and keep `OPENSPACE_MODE=mock` unless a live test has been approved.

## How frontend developers use it

React pages should call the existing frontend service functions instead of writing backend URLs inside page components.

| Page requirement | Frontend service | PSB backend endpoint |
| --- | --- | --- |
| Dashboard totals and recent uploads | `dashboardApi.getSummary()` | `GET /api/dashboard/summary` |
| Project and floor dropdowns | `projectApi.list()` | `GET /api/projects` |
| Search upload history | `uploadApi.list(filters)` | `GET /api/uploads` |
| Submit an INSV file | `uploadApi.create(form, onProgress)` | `POST /api/uploads` |
| Read upload status | `uploadApi.get(id)` | `GET /api/uploads/{id}` |
| Retry an upload or status check | `uploadApi.retry(id)` | `POST /api/uploads/{id}/retry` |
| Cancel a local transfer | `uploadApi.cancel(id)` | `POST /api/uploads/{id}/cancel` |

The Swagger response examples describe what each service function returns to the page.

## Where the OpenAPI definition lives

The source document is:

```text
apps/api/src/openapi/document.js
```

Update this document whenever a PSB backend route, request field or response shape changes. The test in `apps/api/src/openapi/document.test.js` confirms that every MVP path is documented and that private OpenSpace paths and credential names are absent.

## Security boundary

This documentation covers only the PSB backend endpoints used by React. It intentionally excludes:

- OpenSpace authentication;
- the private capture-upload endpoint paths;
- `layout2` and `pendingCaptures` implementation details;
- client IDs, client secrets, usernames, passwords and access tokens.

The React application must never call OpenSpace directly. The browser calls the PSB backend, and only the server-side OpenSpace client performs the private integration workflow.
