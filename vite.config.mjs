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

const PRODUCTION_ENV_ALIASES = {
  VITE_API_BASE_URL: ["LAUNDRY_API_BASE_URL"],
  VITE_GOOGLE_MAPS_KEY: ["LAUNDRY_GOOGLE_MAPS_KEY"],
  VITE_FIREBASE_API_KEY: ["LAUNDRY_FIREBASE_API_KEY"],
  VITE_FIREBASE_AUTH_DOMAIN: ["LAUNDRY_FIREBASE_AUTH_DOMAIN"],
  VITE_FIREBASE_PROJECT_ID: ["LAUNDRY_FIREBASE_PROJECT_ID"],
  VITE_FIREBASE_STORAGE_BUCKET: ["LAUNDRY_FIREBASE_STORAGE_BUCKET"],
  VITE_FIREBASE_MESSAGING_SENDER_ID: ["LAUNDRY_FIREBASE_MESSAGING_SENDER_ID"],
  VITE_FIREBASE_APP_ID: ["LAUNDRY_FIREBASE_APP_ID"],
  VITE_FIREBASE_VAPID_KEY: [
    "VITE_FIREBASE_MESSAGING_VAPID_KEY",
    "LAUNDRY_FIREBASE_VAPID_KEY",
  ],
};

// Last working Amplify production values (commit 89df315). Console env vars
// override these. Amplify app dkuj4lgqcrq22 never had VITE_* set, so a hard
// throw here takes the live admin host down.
//
// API host follows the same rule as deploy-admin.yml:
//   Amplify `dev` / `stage` → stage API (Zone Catalog lives here first)
//   Amplify `main` / unknown → prod API
function amplifyApiDefault(branch) {
  const name = String(branch || "").trim().toLowerCase();
  if (name === "dev" || name === "stage") {
    return "https://stagelaundry.sigisolutions.net/";
  }
  return "https://prodlaundry.sigisolutions.net/";
}

const AMPLIFY_PRODUCTION_DEFAULTS = {
  VITE_API_BASE_URL: "https://prodlaundry.sigisolutions.net/",
  VITE_GOOGLE_MAPS_KEY: "AIzaSyADTqd6DhbPp9HHY93FzP4ySblD4fx-bBE",
  VITE_FIREBASE_API_KEY: "AIzaSyDdZLCsf0CQN_DIkE0mAOmRv9_pvlRq2qg",
  VITE_FIREBASE_AUTH_DOMAIN: "laundry-app-bf43c.firebaseapp.com",
  VITE_FIREBASE_PROJECT_ID: "laundry-app-bf43c",
  VITE_FIREBASE_STORAGE_BUCKET: "laundry-app-bf43c.firebasestorage.app",
  VITE_FIREBASE_MESSAGING_SENDER_ID: "880600214434",
  VITE_FIREBASE_APP_ID: "1:880600214434:web:9f770646a7fcf4d95ee0fb",
  VITE_FIREBASE_VAPID_KEY:
    "BHqdkpwqEH9B9Rnw_lsvJz9cfuNyo-c8wPXLLexm6X9E0gryGLxztXXvGfqazZL7frP2D6GL9B1MO9JObNiYrRE",
};

function envValue(env, key) {
  return String(env[key] || process.env[key] || "").trim();
}

function applyProductionEnv(env) {
  const branch =
    envValue(env, "VITE_APP_BRANCH") ||
    envValue(env, "AWS_BRANCH") ||
    String(process.env.AWS_BRANCH || "").trim();
  const defaults = {
    ...AMPLIFY_PRODUCTION_DEFAULTS,
    VITE_API_BASE_URL: amplifyApiDefault(branch),
  };

  // Amplify `dev`/`stage` is the staging admin. A leftover prodlaundry URL
  // (console or baked default) makes Zone Catalog 404 on this host.
  const configuredApi =
    envValue(env, "VITE_API_BASE_URL") || envValue(env, "LAUNDRY_API_BASE_URL");
  if (
    (branch === "dev" || branch === "stage") &&
    /prodlaundry/i.test(configuredApi)
  ) {
    env.VITE_API_BASE_URL = defaults.VITE_API_BASE_URL;
    process.env.VITE_API_BASE_URL = defaults.VITE_API_BASE_URL;
    console.warn(
      `[vite] ${branch} branch was pointed at prodlaundry; forcing ${defaults.VITE_API_BASE_URL}`
    );
  }

  for (const key of REQUIRED_PRODUCTION_ENV) {
    if (envValue(env, key)) continue;
    const aliasHit = (PRODUCTION_ENV_ALIASES[key] || []).find((alias) =>
      envValue(env, alias)
    );
    const value = aliasHit
      ? envValue(env, aliasHit)
      : defaults[key];
    if (!value) continue;
    env[key] = value;
    process.env[key] = value;
    console.warn(
      `[vite] ${key} missing in production; using ${
        aliasHit ? `alias ${aliasHit}` : "Amplify production default"
      }`
    );
  }

  const missing = REQUIRED_PRODUCTION_ENV.filter((key) => !envValue(env, key));
  if (missing.length) {
    throw new Error(
      `Missing required production environment variables: ${missing.join(", ")}`
    );
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, root, "");
  if (mode === "production") {
    applyProductionEnv(env);
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
