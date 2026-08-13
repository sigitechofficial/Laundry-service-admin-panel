#!/usr/bin/env node
/**
 * Writes public/release.json for Amplify (and local) builds.
 * Prefer Amplify: AWS_COMMIT_ID, AWS_BRANCH.
 * Fallback: VITE_APP_*, GITHUB_*, or "local".
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

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
const shortCommit = commit === "local" ? "local" : commit.slice(0, 8);

const release = {
  app: "laundry-admin",
  version: pkg.version || "0.0.0",
  commit,
  shortCommit,
  branch,
  deployedAt,
  packagedAt: deployedAt,
};

const publicDir = path.join(root, "public");
fs.mkdirSync(publicDir, { recursive: true });
const out = path.join(publicDir, "release.json");
fs.writeFileSync(out, `${JSON.stringify(release, null, 2)}\n`);
console.log(
  `[write-release-info] ${out} → ${branch} @ ${shortCommit} (${deployedAt})`
);
