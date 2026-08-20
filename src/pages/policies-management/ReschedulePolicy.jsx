import { useRef } from "react";
import { Button, PageHeader } from "../../design-system";
import ReschedulePolicyContent from "./ReschedulePolicyContent";
import { TbPlus } from "../../shared/icons/index";

export default function ReschedulePolicy() {
  const addButtonHandlerRef = useRef(null);

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <PageHeader
        title="Reschedule Policy"
        description="Windows and fees for moving pickup or delivery."
        actions={
          <Button
            onClick={() => {
              addButtonHandlerRef.current?.();
            }}
          >
            <TbPlus size={18} />
            Add Reschedule Policy
          </Button>
        }
      />
      <ReschedulePolicyContent onAddButtonRef={addButtonHandlerRef} showZoneFilter />
    </div>
  );
}
