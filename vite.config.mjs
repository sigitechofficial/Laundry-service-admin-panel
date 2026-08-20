import { defineConfig, loadEnv } from "vite";
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

const REQUIRED_PRODUCTION_ENV = [
  "VITE_API_BASE_URL",
  "VITE_GOOGLE_MAPS_KEY",
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
  "VITE_FIREBASE_VAPID_KEY",
];

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, root, "");
  if (mode === "production") {
    const missing = REQUIRED_PRODUCTION_ENV.filter(
      (key) => !String(env[key] || "").trim()
    );
    if (missing.length) {
      throw new Error(
        `Missing required production environment variables: ${missing.join(", ")}`
      );
    }
  }

  const configuredApi = String(
    env.VITE_API_BASE_URL || env.LAUNDRY_API_BASE_URL || "http://127.0.0.1:8083"
  ).replace(/\/$/, "");
  const proxyTarget = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(
    configuredApi
  )
    ? configuredApi
    : "http://127.0.0.1:8083";

  return {
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
    host: true, // Listen on LAN as well as localhost
    port: 5174,
    allowedHosts: [
      "unprolifically-unsuggestible-zackary.ngrok-free.dev",
      ".ngrok-free.dev",
      ".ngrok.io",
      ".ngrok.app",
    ],
    // Same-WiFi admin: browser hits this origin; Vite forwards to the local API.
    // Does not bind or expose the backend itself.
    proxy: {
      "/api": {
        target: proxyTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  };
});
