import { randomUUID } from "node:crypto";

/**
 * Generate the OpenSpace `url-id` format documented for capture and upload IDs.
 *
 * OpenSpace requires the 16 bytes of a genuine UUIDv4 encoded as URL-safe
 * Base64 without padding. Encoding random bytes directly is insufficient
 * because their UUID version/variant bits are not guaranteed to be v4.
 */
export function createUrlId() {
  const uuidHex = randomUUID().replaceAll("-", "");
  return Buffer.from(uuidHex, "hex").toString("base64url");
}
