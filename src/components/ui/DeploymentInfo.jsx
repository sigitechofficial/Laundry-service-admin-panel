import { useEffect, useState } from "react";
import { Box, Tooltip, Typography } from "@mui/material";
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
    ? "error.main"
    : variant === "login"
      ? "rgba(255,255,255,0.85)"
      : "grey.20";

  if (variant === "login") {
    return (
      <Tooltip title={<pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{tip}</pre>}>
        <Box
          component="button"
          type="button"
          onClick={copy}
          className="absolute bottom-4 left-0 right-0 z-20 mx-auto w-fit cursor-pointer border-0 bg-transparent"
          sx={{ color }}
          aria-label="Deployment version info"
        >
          <Typography
            variant="caption"
            fontFamily="Switzer"
            sx={{ fontSize: 11, letterSpacing: 0.2, opacity: 0.95 }}
          >
            {line}
            {info.mismatch ? " · mismatch" : ""}
          </Typography>
        </Box>
      </Tooltip>
    );
  }

  if (variant === "header") {
    return (
      <Tooltip title={<pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{tip}</pre>}>
        <Box
          component="button"
          type="button"
          onClick={copy}
          aria-label="Deployment version info"
          sx={{
            border: "1px solid",
            borderColor: info.mismatch ? "error.main" : "rgba(0,0,0,0.12)",
            bgcolor: info.mismatch ? "rgba(211,47,47,0.06)" : "rgba(0,0,0,0.03)",
            borderRadius: "8px",
            px: 1.25,
            py: 0.5,
            cursor: "pointer",
            maxWidth: { xs: 140, md: 280 },
            textAlign: "left",
          }}
        >
          <Typography
            variant="caption"
            fontFamily="Switzer"
            color={info.mismatch ? "error.main" : "grey.20"}
            noWrap
            sx={{ display: "block", fontSize: 11, fontWeight: 500 }}
          >
            {info.branch}@{info.shortCommit}
            {info.mismatch ? " !" : ""}
          </Typography>
          <Typography
            variant="caption"
            fontFamily="Switzer"
            color="grey.20"
            noWrap
            sx={{ display: { xs: "none", md: "block" }, fontSize: 10, opacity: 0.85 }}
          >
            v{info.version} · {formatDeployedAt(info.deployedAt)}
          </Typography>
        </Box>
      </Tooltip>
    );
  }

  return (
    <Typography variant="caption" color={color} fontFamily="Switzer" onClick={copy}>
      {line}
    </Typography>
  );
}
