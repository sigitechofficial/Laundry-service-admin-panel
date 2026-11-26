import { useCallback, useRef } from "react";
import useToaster from "../../../components/ui/Toaster";
import { useUpdateAgentApprovalMutation } from "../../../store/services/api";

const ok = (res) => res?.status === "1" || res?.status === 1;

/** Approve / reject / move back to review a shop's registration, with toasts. Each returns true on success. */
export default function useAgentApprovalActions() {
  const { success, error: showError } = useToaster();
  const [updateApproval, { isLoading }] = useUpdateAgentApprovalMutation();
  const busyRef = useRef(false);

  const run = useCallback(
    async (agentId, body, okMessage, failMessage) => {
      if (busyRef.current) return false;
      busyRef.current = true;
      try {
        const res = await updateApproval({ agentId, body }).unwrap();
        if (ok(res)) {
          success(okMessage(res));
          return true;
        }
        showError(res?.message || failMessage);
        return false;
      } catch (err) {
        showError(err?.data?.message || failMessage);
        return false;
      } finally {
        busyRef.current = false;
      }
    },
    [showError, success, updateApproval]
  );

  const approve = useCallback(
    (agentId, isRestore = false) =>
      run(
        agentId,
        { action: "approve" },
        (res) => res?.message || (isRestore ? "Agent restored and approved" : "Agent approved"),
        "Failed to approve agent"
      ),
    [run]
  );

  const reject = useCallback(
    (agentId, { reasons, note }) =>
      run(
        agentId,
        { action: "reject", reasons, note },
        (res) => (res?.data?.emailQueued ? "Agent rejected. They've been emailed the reasons." : res?.message || "Agent rejected"),
        "Failed to reject agent"
      ),
    [run]
  );

  const reopen = useCallback(
    (agentId) =>
      run(
        agentId,
        { action: "reopen" },
        () => "Moved back to review. Check the registration again before approving.",
        "Could not move back to review"
      ),
    [run]
  );

  return { approve, reject, reopen, busy: isLoading };
}
