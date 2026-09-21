import "dotenv/config";

import { createApp } from "./app.js";
import { loadEnvironment } from "./config/environment.js";
import { createDatabase } from "./database/connection.js";

// Application entry point: load configuration, open SQLite and wire Express.
const environment = loadEnvironment();
const database = createDatabase(environment.databasePath);
const { app, coordinator } = createApp({ database, environment });

const server = app.listen(environment.port, () => {
  console.log(`OpenSpace local API listening on http://localhost:${environment.port}`);
  console.log(`OpenSpace integration mode: ${environment.openSpace.mode}`);
  coordinator.resumeProcessingChecks();
});

// Close the HTTP server and database cleanly when local development stops.
function shutdown() {
  server.close(() => {
    database.close();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
