# Local SQLite database

The API service creates the database automatically on first start. SQLite stores metadata and job status; it does not store the INSV file content or any OpenSpace credential.

## Tables

### `projects`

Cached OpenSpace project summaries: site ID, project name, region, activity status and last sync time.

### `sheets`

Floor/sheet summaries: sheet ID, site ID, display name/order, floor-plan image ID, dimensions, deletion status and last sync time.

### `captures`

One row for each capture started through the PSB dashboard. It stores:

- local ID and later OpenSpace capture ID;
- project/site and sheet/floor snapshots;
- capture and file names, size, local path and optional checksum;
- confirmed capture time and starting-point coordinates;
- status and real upload percentage;
- upload, submission and processing timestamps;
- viewer URL and any error message.

Allowed statuses are `draft`, `validating`, `importing`, `saved_locally`, `waiting_for_internet`, `uploading`, `submitted`, `processing`, `ready` and `failed`.

### `capture_events`

An audit-style timeline for each job. Every row records a capture ID, stage, optional message/progress and timestamp.

### `schema_migrations`

Records which database schema versions have been applied so later changes can be introduced safely.

## Date rules

Save timestamps in UTC ISO-8601 format. Convert them to Singapore time only for display. `captured_at` should be confirmed from camera metadata or by the user; do not silently use the computer file modification time.

## Later AWS migration

Pages call the frontend API layer and Node routes rather than SQLite directly. This separation allows the repository implementation to be changed later without rewriting each page.
