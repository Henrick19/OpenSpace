import { useEffect, useState } from "react";

import type { HealthResponse } from "@openspace/shared";

type ConnectionState =
  | { status: "checking" }
  | { status: "connected"; health: HealthResponse }
  | { status: "unavailable"; message: string };

export function App() {
  const [connection, setConnection] = useState<ConnectionState>({ status: "checking" });

  useEffect(() => {
    const controller = new AbortController();

    async function checkApi() {
      try {
        const response = await fetch("/api/health", { signal: controller.signal });

        if (!response.ok) {
          throw new Error(`Health check returned ${response.status}.`);
        }

        const health = (await response.json()) as HealthResponse;
        setConnection({ status: "connected", health });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setConnection({
          status: "unavailable",
          message: error instanceof Error ? error.message : "The API service is unavailable.",
        });
      }
    }

    void checkApi();
    return () => controller.abort();
  }, []);

  return (
    <main className="app-shell">
      <section className="intro-card" aria-labelledby="page-title">
        <span className="eyebrow">PSB OpenSpace project</span>
        <h1 id="page-title">Frontend foundation is ready</h1>
        <p>
          The Vite React application and local Node.js service are now connected. Dashboard features
          will be added in later implementation steps.
        </p>

        <div className={`status status--${connection.status}`} role="status" aria-live="polite">
          {connection.status === "checking" && "Checking the local API service…"}
          {connection.status === "connected" &&
            `Connected to ${connection.health.service} (${connection.health.status}).`}
          {connection.status === "unavailable" && `API unavailable: ${connection.message}`}
        </div>

        <div className="foundation-grid">
          <article>
            <h2>React frontend</h2>
            <p>Runs locally through Vite on port 5173.</p>
          </article>
          <article>
            <h2>Node.js service</h2>
            <p>Runs locally on port 8787 and owns future OpenSpace integration.</p>
          </article>
          <article>
            <h2>Security boundary</h2>
            <p>No OpenSpace credentials or integration calls are included at this stage.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
