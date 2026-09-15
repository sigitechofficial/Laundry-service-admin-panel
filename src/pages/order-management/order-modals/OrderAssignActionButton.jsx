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
      className="h-[34px] whitespace-nowrap rounded-[9px] border border-[#2c3ba0] bg-[#eef0fb] px-3 text-[12.5px] font-semibold text-[#20307f] hover:bg-[#2c3ba0] hover:text-white"
    >
      {assignActionLabel(booking)}
    </button>
  );
}
