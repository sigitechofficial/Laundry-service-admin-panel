/**
 * Live deploy fingerprint for Amplify admin builds.
 * Bundle values come from Vite define (Amplify AWS_COMMIT_ID / AWS_BRANCH).
 * /release.json is written at build time so you can confirm the served files.
 */

const FALLBACK = {
  app: "laundry-admin",
  version: "0.0.0",
  commit: "local",
  shortCommit: "local",
  branch: "local",
  deployedAt: null,
  packagedAt: null,
};

function fromBundle() {
  const commit =
    typeof __DEPLOY_COMMIT__ !== "undefined" ? String(__DEPLOY_COMMIT__) : "local";
  const branch =
    typeof __DEPLOY_BRANCH__ !== "undefined" ? String(__DEPLOY_BRANCH__) : "local";
  const deployedAt =
    typeof __DEPLOY_AT__ !== "undefined" ? String(__DEPLOY_AT__) : null;
  const version =
    typeof __APP_VERSION__ !== "undefined" ? String(__APP_VERSION__) : "0.0.0";
  const shortCommit = commit === "local" ? "local" : commit.slice(0, 8);
  return {
    app: "laundry-admin",
    version,
    commit,
    shortCommit,
    branch,
    deployedAt,
    packagedAt: deployedAt,
    source: "bundle",
  };
}

function normalize(raw, source) {
  if (!raw || typeof raw !== "object") return null;
  const commit = String(raw.commit || raw.sha || "unknown");
  const shortCommit = String(
    raw.shortCommit || (commit === "unknown" ? "unknown" : commit.slice(0, 8))
  );
  return {
    app: raw.app || "laundry-admin",
    version: String(raw.version || FALLBACK.version),
    commit,
    shortCommit,
    branch: String(raw.branch || "unknown"),
    deployedAt: raw.deployedAt || raw.packagedAt || null,
    packagedAt: raw.packagedAt || raw.deployedAt || null,
    source,
  };
}

export function getBundledDeploymentInfo() {
  try {
    return fromBundle();
  } catch {
    return { ...FALLBACK, source: "fallback" };
  }
}

/**
 * Fetch /release.json (cache-bust) and merge with bundle.
 * If shortCommit differs, mismatch=true (stale CDN / wrong deploy).
 */
export async function loadDeploymentInfo() {
  const bundled = getBundledDeploymentInfo();
  let served = null;
  let mismatch = false;
  let fetchError = null;

  try {
    const res = await fetch(`/release.json?t=${Date.now()}`, {
      cache: "no-store",
    });
    if (res.ok) {
      served = normalize(await res.json(), "release.json");
      if (
        served?.shortCommit &&
        bundled?.shortCommit &&
        served.shortCommit !== "local" &&
        bundled.shortCommit !== "local" &&
        served.shortCommit !== bundled.shortCommit
      ) {
        mismatch = true;
      }
    } else {
      fetchError = `HTTP ${res.status}`;
    }
  } catch (e) {
    fetchError = e?.message || "fetch failed";
  }

  const primary = served || bundled;
  return {
    ...primary,
    bundled,
    served,
    mismatch,
    fetchError,
  };
}

export function formatDeployedAt(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
  } catch {
    return String(iso);
  }
}

export function formatDeploymentLine(info) {
  if (!info) return "version unknown";
  const parts = [
    `v${info.version || "?"}`,
    info.branch || "?",
    info.shortCommit || "?",
  ];
  if (info.deployedAt) parts.push(formatDeployedAt(info.deployedAt));
  return parts.join(" · ");
}
