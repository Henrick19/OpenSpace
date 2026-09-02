# Local SQLite database

The API service creates the database automatically on first start. SQLite stores metadata and job status; it does not store the INSV file content or any OpenSpace credential.

## Tables

### `uploads` (current MVP table)

One row represents one INSV upload attempt started from the PSB dashboard. It stores the project/floor snapshot selected in the form, file metadata, capture time, starting point, upload percentage, status, retry count, timestamps, any error and an optional OpenSpace link.

Allowed statuses are `pending`, `uploading`, `completed`, `failed` and `cancelled`.

The INSV binary is **not** stored in SQLite. It is streamed to OpenSpace. SQLite stores only the information needed by the dashboard and upload-history screens.

### `projects`

Cached OpenSpace project summaries: site ID, project name, region, activity status and last sync time.

### `sheets`

Floor/sheet summaries: sheet ID, site ID, display name/order, floor-plan image ID, dimensions, deletion status and last sync time.

### `schema_migrations`

Records which database schema versions have been applied so later changes can be introduced safely.

## Date rules

Save timestamps in UTC ISO-8601 format. Convert them to Singapore time only for display. `captured_at` should be confirmed from camera metadata or by the user; do not silently use the computer file modification time.

## Later AWS migration

Pages call the frontend API layer and Node routes rather than SQLite directly. This separation allows the repository implementation to be changed later without rewriting each page.

## Methods page developers use

React pages import `uploadApi` from `apps/web/src/services/uploadApi.js`; they never import SQLite code directly.

```js
import { dashboardApi } from "../services/dashboardApi.js";
import { uploadApi } from "../services/uploadApi.js";

const dashboard = await dashboardApi.getSummary();
const history = await uploadApi.list({ status: "completed", page: 1 });
const created = await uploadApi.create(formData);
await uploadApi.retry(failedUploadId);
```

`dashboardApi.getSummary()` returns `totalUploads`, `inProgress`, `completed`, `failed` and `recentUploads`.

## Demo data

When `SEED_DEMO_DATA=true`, the local service adds three records only if the `uploads` table is empty: one uploading, one completed and one failed. Set it to `false` when real upload records should be used without demo rows.
