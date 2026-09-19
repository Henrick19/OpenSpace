import { randomBytes } from "node:crypto";

/**
 * Generates a compact URL-safe identifier required by the OpenSpace workflow.
 * This is an ID generator, not a QR-code utility.
 */
export function createUrlId() {
  return randomBytes(16).toString("base64url");
}
