import { useRef } from "react";
import { Button, PageHeader } from "../../design-system";
import NoShowPolicyContent from "./NoShowPolicyContent";
import { TbPlus } from "../../shared/icons/index";

export default function NoShowPolicy() {
  const addButtonHandlerRef = useRef(null);

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <PageHeader
        title="No Show Policy"
        description="Fees and rules when a customer is not present for pickup or delivery."
        actions={
          <Button
            onClick={() => {
              addButtonHandlerRef.current?.();
            }}
          >
            <TbPlus size={18} />
            Add No Show Policy
          </Button>
        }
      />
      <NoShowPolicyContent onAddButtonRef={addButtonHandlerRef} showZoneFilter />
    </div>
  );
}
