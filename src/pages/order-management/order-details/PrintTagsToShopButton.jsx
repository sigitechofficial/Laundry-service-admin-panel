import { useCallback } from "react";
import { Button } from "../../../design-system";
import useToaster from "../../../components/ui/Toaster";
import usePrintJobTracker, {
  describePrintJobOutcome,
  printJobProgressLabel,
} from "../../../hooks/usePrintJobTracker";
import {
  useLazyGetBookingPrintJobQuery,
  usePrintBookingTagsStarMutation,
} from "../../../store/services/api";

/** Queues garment tags for the order's shop; its agent app prints them on the shop LAN. */
export default function PrintTagsToShopButton({ bookingId }) {
  const toaster = useToaster();
  const [printTags, { isLoading }] = usePrintBookingTagsStarMutation();
  const [fetchJob] = useLazyGetBookingPrintJobQuery();

  const fetchLatestJob = useCallback(
    (jobId) =>
      fetchJob({ bookingId, jobId })
        .unwrap()
        .then((res) => res?.data?.job),
    [fetchJob, bookingId]
  );
  const { job, tracking, track } = usePrintJobTracker(fetchLatestJob);
  const busy = isLoading || tracking;

  const handleClick = async () => {
    try {
      const res = await printTags({ bookingId }).unwrap();
      toaster.info("Tags sent to the shop app…");
      const finalJob = await track(res?.data?.job);
      const outcome = describePrintJobOutcome(finalJob);
      toaster[outcome.tone](outcome.message);
    } catch (err) {
      toaster.error(err?.data?.message || "Could not send tags to the shop printer");
    }
  };

  return (
    <Button
      variant="secondary"
      onClick={handleClick}
      disabled={busy || !bookingId}
      title={
        tracking
          ? printJobProgressLabel(job)
          : "Print garment tags on the shop's Star printer"
      }
    >
      {busy
        ? job?.status === "printing"
          ? "Printing tags…"
          : "Sending tags…"
        : "Print tags (shop)"}
    </Button>
  );
}
