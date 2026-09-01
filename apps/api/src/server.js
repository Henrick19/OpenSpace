import "dotenv/config";

import { createApp } from "./app.js";
import { createDatabase } from "./database/connection.js";

const port = Number.parseInt(process.env.PORT ?? "8787", 10);
if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error("PORT must be a valid TCP port number.");
}

const database = createDatabase();
const server = createApp({ database }).listen(port, "127.0.0.1", () => {
  console.log(`OpenSpace API service listening on http://localhost:${port}`);
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
