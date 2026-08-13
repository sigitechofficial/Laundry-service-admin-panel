import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const root = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));

const commit = String(
  process.env.VITE_APP_COMMIT ||
    process.env.AWS_COMMIT_ID ||
    process.env.GITHUB_SHA ||
    "local"
).trim();
const branch = String(
  process.env.VITE_APP_BRANCH ||
    process.env.AWS_BRANCH ||
    process.env.GITHUB_REF_NAME ||
    "local"
).trim();
const deployedAt = String(
  process.env.VITE_APP_DEPLOYED_AT || new Date().toISOString()
).trim();

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Expose both prefixes so FCM can use either LAUNDRY_FIREBASE_* or standard VITE_FIREBASE_* from .env
  envPrefix: ["LAUNDRY_", "VITE_"],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version || "0.0.0"),
    __DEPLOY_COMMIT__: JSON.stringify(commit),
    __DEPLOY_BRANCH__: JSON.stringify(branch),
    __DEPLOY_AT__: JSON.stringify(deployedAt),
  },
  server: {
    host: true, // Listen on all addresses
    allowedHosts: [
      "unprolifically-unsuggestible-zackary.ngrok-free.dev",
      ".ngrok-free.dev",
      ".ngrok.io",
      ".ngrok.app",
    ],
  },
});
