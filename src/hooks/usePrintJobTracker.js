import { useCallback, useEffect, useRef, useState } from "react";

const POLL_MS = 2000;
const MAX_WAIT_MS = 75000;
const TERMINAL = new Set(["printed", "failed", "expired", "stalled"]);

export function printJobProgressLabel(job) {
  if (!job) return "";
  if (job.status === "pending") return "Waiting for the shop app to pick up the job…";
  if (job.status === "printing") return "Shop app is printing…";
  return "";
}

/** Maps a finished (or timed-out) job to a toast tone + message. */
export function describePrintJobOutcome(job) {
  switch (job?.status) {
    case "printed":
      return { tone: "success", message: "Printed on the shop's Star printer" };
    case "failed":
      return {
        tone: "error",
        message: `Shop printer failed: ${job.message || "unknown error"}`,
      };
    case "stalled":
      return {
        tone: "error",
        message: "The shop device stopped responding while printing. Check the printer.",
      };
    case "expired":
      return {
        tone: "error",
        message:
          "No shop device picked up the job. Open the agent app on the shop Wi-Fi and try again.",
      };
    case "printing":
      return { tone: "info", message: "Still printing on the shop device…" };
    default:
      return {
        tone: "warning",
        message:
          "No shop device has picked this up yet. It prints if the agent app opens on the shop Wi-Fi within 10 minutes.",
      };
  }
}

/** @param {(jobId: number) => Promise<object>} fetchJob resolves the latest job */
export default function usePrintJobTracker(fetchJob) {
  const [job, setJob] = useState(null);
  const [tracking, setTracking] = useState(false);
  const unmounted = useRef(false);

  useEffect(
    () => () => {
      unmounted.current = true;
    },
    []
  );

  const track = useCallback(
    async (initialJob) => {
      let current = initialJob;
      setJob(current);
      setTracking(true);
      const startedAt = Date.now();
      while (
        !unmounted.current &&
        current &&
        !TERMINAL.has(current.status) &&
        Date.now() - startedAt < MAX_WAIT_MS
      ) {
        await new Promise((resolve) => setTimeout(resolve, POLL_MS));
        if (unmounted.current) break;
        try {
          current = await fetchJob(current.id);
          setJob(current);
        } catch {
          // Transient network error: keep polling until the deadline.
        }
      }
      if (!unmounted.current) setTracking(false);
      return current;
    },
    [fetchJob]
  );

  return { job, tracking, track };
}
