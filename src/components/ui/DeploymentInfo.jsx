import { useEffect, useState } from "react";
import {
  formatDeploymentLine,
  formatDeployedAt,
  loadDeploymentInfo,
} from "../../utilities/deploymentInfo";

/**
 * Shows Amplify / build fingerprint so you can confirm the live admin version.
 * @param {"login"|"header"|"inline"} variant
 */
export default function DeploymentInfo({ variant = "inline" }) {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    let cancelled = false;
    loadDeploymentInfo().then((data) => {
      if (!cancelled) setInfo(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!info) return null;

  const line = formatDeploymentLine(info);
  const tip = [
    `App: ${info.app}`,
    `Version: ${info.version}`,
    `Branch: ${info.branch}`,
    `Commit: ${info.commit}`,
    `Deployed: ${formatDeployedAt(info.deployedAt)}`,
    info.mismatch
      ? "WARNING: JS bundle commit ≠ /release.json (possible cache)"
      : "Bundle matches /release.json (or local)",
    "Click to copy",
  ].join("\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(
          {
            version: info.version,
            branch: info.branch,
            commit: info.commit,
            shortCommit: info.shortCommit,
            deployedAt: info.deployedAt,
            mismatch: info.mismatch,
          },
          null,
          2
        )
      );
    } catch {
      /* ignore */
    }
  };

  const color = info.mismatch
    ? "#F53939"
    : variant === "login"
      ? "rgba(255,255,255,0.85)"
      : "#8F95B2";

  if (variant === "login") {
    return (
      <button
        type="button"
        title={tip}
        onClick={copy}
        className="absolute bottom-4 left-0 right-0 z-20 mx-auto w-fit cursor-pointer border-0 bg-transparent"
        style={{ color }}
        aria-label="Deployment version info"
      >
        <span className="font-[Switzer] text-[11px] tracking-[0.2px] opacity-95">
          {line}
          {info.mismatch ? " · mismatch" : ""}
        </span>
      </button>
    );
  }

  if (variant === "header") {
    return (
      <button
        type="button"
        title={tip}
        onClick={copy}
        aria-label="Deployment version info"
        className="cursor-pointer rounded-lg px-2.5 py-1 text-left max-w-[140px] md:max-w-[280px]"
        style={{
          border: "1px solid",
          borderColor: info.mismatch ? "#F53939" : "rgba(0,0,0,0.12)",
          background: info.mismatch ? "rgba(211,47,47,0.06)" : "rgba(0,0,0,0.03)",
        }}
      >
        <span
          className="block truncate font-[Switzer] text-[11px] font-medium"
          style={{ color: info.mismatch ? "#F53939" : "#8F95B2" }}
        >
          {info.branch}@{info.shortCommit}
          {info.mismatch ? " !" : ""}
        </span>
        <span className="hidden truncate font-[Switzer] text-[10px] opacity-85 md:block" style={{ color: "#8F95B2" }}>
          v{info.version} · {formatDeployedAt(info.deployedAt)}
        </span>
      </button>
    );
  }

  return (
    <span
      className="cursor-pointer font-[Switzer] text-xs"
      style={{ color }}
      title={tip}
      onClick={copy}
    >
      {line}
    </span>
  );
}
