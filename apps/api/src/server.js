import "dotenv/config";

import { createApp } from "./app.js";
import { loadEnvironment } from "./config/environment.js";
import { createDatabase } from "./database/connection.js";

const environment = loadEnvironment();
const database = createDatabase(environment.databasePath);
const server = createApp({ database, webOrigin: environment.webOrigin }).listen(environment.port, "127.0.0.1", () => {
  console.log(`OpenSpace API service listening on http://localhost:${environment.port}`);
  console.log(`OpenSpace integration mode: ${environment.openSpace.mode}`);
});

function shutDown(signal) {
  console.log(`${signal} received. Closing the API service.`);
  server.close((error) => {
    if (error) {
      console.error("The API service could not close cleanly.", error);
      process.exitCode = 1;
    }
    database.close();
  });
}

process.on("SIGINT", () => shutDown("SIGINT"));
process.on("SIGTERM", () => shutDown("SIGTERM"));
