import crypto from "crypto";

export function makePublicSlug(bytes = 9) {
  return crypto.randomBytes(bytes).toString("base64url");
}
