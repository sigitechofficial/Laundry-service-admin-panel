import {
  assignActionLabel,
  canAdminAssignOrReassignFromBooking,
} from "../../../shared/adminAssignGate";

export default function OrderAssignActionButton({
  booking,
  onClick,
}) {
  if (!canAdminAssignOrReassignFromBooking(booking)) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center h-[var(--ctrl-h)] whitespace-nowrap rounded-[var(--r-md)] border border-[#2c3ba0] bg-[#eef0fb] px-4 text-[14px] font-semibold text-[#20307f] hover:bg-[#2c3ba0] hover:text-white"
    >
      {assignActionLabel(booking)}
    </button>
  );
}
