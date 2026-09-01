# Security guidance

## Secrets

- Keep OpenSpace organisation credentials in the school-approved secret manager.
- Never place secrets in React code, `VITE_` variables, Git, screenshots, documentation or chat messages.
- Do not commit real `.env` files, temporary access tokens or secret-manager share links.
- Only the planned Node.js service may read OpenSpace credentials and call authenticated OpenSpace endpoints.
- Frontend-only developers should use mock data and should not require access to organisation credentials.

## Capture data

- Do not commit INSV files, extracted images or API responses containing project information.
- SQLite stores capture metadata and local file paths only. Do not store INSV file contents or credentials in the database.
- Use local ignored directories for temporary uploads and diagnostics.
- Confirm school and project retention rules before storing research copies in Amazon S3.

## If a secret is exposed

Stop using it, notify the lecturer or project owner immediately, remove it from working files and request rotation from the issuing provider. Removing a secret from the latest Git commit does not remove it from earlier Git history.
