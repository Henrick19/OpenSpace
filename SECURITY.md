# Security guidance

## Secrets

- Keep OpenSpace organisation credentials in the private local backend `.env` during the MVP, then migrate them to AWS Secrets Manager for deployment.
- Never place secrets in React code, `VITE_` variables, Git, screenshots, documentation or chat messages.
- Do not commit real `.env` files, temporary access tokens or secret-manager share links.
- The temporary local credential file is `apps/api/.env`. Keep it in mock mode unless you are an authorised integration developer.
- Never use `VITE_` for OpenSpace credentials; Vite variables are included in browser code.
- Only the planned Node.js service may read OpenSpace credentials and call authenticated OpenSpace endpoints.
- Frontend-only developers should use mock data and should not require access to organisation credentials.

## Capture data

- Do not commit INSV files, extracted images or API responses containing project information.
- SQLite stores capture metadata and local file paths only. Do not store INSV file contents or credentials in the database.
- Use local ignored directories for temporary uploads and diagnostics.
- Confirm school and project retention rules before storing research copies in Amazon S3.

## If a secret is exposed

Stop using it, notify the lecturer or project owner immediately, remove it from working files and request rotation from the issuing provider. Removing a secret from the latest Git commit does not remove it from earlier Git history.
