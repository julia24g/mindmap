import { initializeApp, cert, getApps } from "firebase-admin/app";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, "../../firebaseServiceAccount.json"), "utf-8"),
);

// Prevent "app already exists" in dev / hot reload
if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}
