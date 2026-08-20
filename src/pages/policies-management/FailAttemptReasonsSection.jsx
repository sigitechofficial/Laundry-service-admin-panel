import { useMemo, useState } from "react";
import { Button, Field, Input, Modal, PageHeader, Select, Table, Textarea } from "../../design-system";
import { CheckRow, Toggle } from "../misc-kit";
import {
  DirectoryDotPills,
  DirectoryError,
  DirectoryIdentity,
  DirectoryMetrics,
  DirectoryTableWrap,
} from "../directory-table/directoryTable";
import useToaster from "../../components/ui/Toaster";
import {
  useCreateFailAttemptReasonMutation,
  useGetFailAttemptReasonsQuery,
  useUpdateFailAttemptReasonMutation,
} from "../../store/services/api";
import { Delay } from "../../components/shared/Loaders";

function unwrapReasons(res) {
  const d = res?.data !== undefined ? res.data : res;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  return [];
}

const SCOPE_OPTIONS = [
  { value: "both", label: "Pickup and delivery" },
  { value: "pickup", label: "Pickup only" },
  { value: "delivery", label: "Delivery only" },
];

export default function FailAttemptReasonsSection() {
  const { success, error: showError } = useToaster();
  const { data, isLoading, isError, refetch } = useGetFailAttemptReasonsQuery();
  const [createReason, { isLoading: creating }] = useCreateFailAttemptReasonMutation();
  const [updateReason] = useUpdateFailAttemptReasonMutation();

  const [addOpen, setAddOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [scope, setScope] = useState("both");
  const [chargesFee, setChargesFee] = useState(false);
  const [requiresCompliance, setRequiresCompliance] = useState(false);
  const [requiresNote, setRequiresNote] = useState(false);

  const reasons = useMemo(() => unwrapReasons(data), [data]);
  const feeOn = reasons.filter((r) => r.status !== false && r.chargesFee);
  const feeOff = reasons.filter((r) => r.status !== false && !r.chargesFee);

  const resetForm = () => {
    setLabel("");
    setDescription("");
    setScope("both");
    setChargesFee(false);
    setRequiresCompliance(false);
    setRequiresNote(false);
  };

  const toggleField = async (row, patch, okMsg) => {
    try {
      await updateReason({ reasonId: row.id, ...patch }).unwrap();
      success(okMsg);
      refetch();
    } catch (e) {
      showError(e?.data?.message || e?.message || "Update failed");
    }
  };

  const onAdd = async () => {
    if (!label.trim()) return;
    try {
      await createReason({
        label: label.trim(),
        description: description.trim() || null,
        scope,
        chargesFee,
        requiresCompliance,
        requiresNote,
        status: true,
      }).unwrap();
      success("Fail reason added");
      setAddOpen(false);
      resetForm();
      refetch();
    } catch (e) {
      showError(e?.data?.message || e?.message || "Create failed");
    }
  };

  if (isLoading) return <Delay />;
  if (isError) {
    return <DirectoryError onRetry={() => refetch()}>Could not load fail reasons.</DirectoryError>;
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <PageHeader
        title="Fail reasons"
        description="Agents pick a reason only — they never see fee vs no-fee. Fee outcome stays on the order. Checklist appears in the app only when “Checklist” is on."
        actions={<Button onClick={() => setAddOpen(true)}>Add reason</Button>}
      />

      <DirectoryMetrics
        items={[
          { label: "Fee reasons", value: feeOn.length, tone: "warning" },
          { label: "No-fee reasons", value: feeOff.length, tone: "success" },
          { label: "Total", value: reasons.length, tone: "brand" },
        ]}
      />

      <DirectoryTableWrap>
        <Table
          columns={[
            {
              key: "label",
              header: "Reason",
              render: (row) => (
                <DirectoryIdentity name={row.label} meta={row.description || row.code} id={row.id} />
              ),
            },
            {
              key: "flags",
              header: "Flags",
              render: (row) => (
                <DirectoryDotPills
                  items={[
                    {
                      key: "fee",
                      tone: row.chargesFee ? "warning" : "success",
                      label: row.chargesFee ? "Fee may apply" : "No fee",
                    },
                    { key: "scope", tone: "neutral", label: String(row.scope || "both") },
                    row.requiresNote ? { key: "note", tone: "info", label: "Note" } : null,
                    row.requiresCompliance
                      ? { key: "check", tone: "info", label: "Checklist" }
                      : null,
                  ].filter(Boolean)}
                />
              ),
            },
            {
              key: "actions",
              header: "Actions",
              render: (row) => (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "flex-end" }}>
                  <Toggle
                    checked={Boolean(row.status)}
                    onChange={(e) =>
                      toggleField(
                        row,
                        { status: e.target.checked },
                        e.target.checked ? "Reason enabled" : "Reason disabled"
                      )
                    }
                    label="Enabled"
                  />
                  <CheckRow
                    checked={Boolean(row.chargesFee)}
                    onChange={(e) =>
                      toggleField(
                        row,
                        { chargesFee: e.target.checked },
                        e.target.checked
                          ? "This reason can charge a fee"
                          : "This reason will not charge a fee"
                      )
                    }
                    label="Charges fee"
                  />
                  <CheckRow
                    checked={Boolean(row.requiresCompliance)}
                    onChange={(e) =>
                      toggleField(
                        row,
                        { requiresCompliance: e.target.checked },
                        e.target.checked
                          ? "Checklist required for this reason"
                          : "Checklist skipped for this reason"
                      )
                    }
                    label="Checklist"
                  />
                  <CheckRow
                    checked={Boolean(row.requiresNote)}
                    onChange={(e) =>
                      toggleField(row, { requiresNote: e.target.checked }, "Note requirement updated")
                    }
                    label="Note"
                  />
                </div>
              ),
            },
          ]}
          rows={reasons}
          rowKey={(row) => row.id}
          empty="No fail reasons yet. Add one, or re-run deploy seeds."
        />
      </DirectoryTableWrap>

      <Modal
        open={addOpen}
        title="Add fail reason"
        onClose={() => setAddOpen(false)}
        primaryLabel="Save"
        onPrimary={onAdd}
        primaryDisabled={creating || !label.trim()}
      >
        <div style={{ display: "grid", gap: 12 }}>
          <Field label="Label" htmlFor="fail-reason-label">
            <Input
              id="fail-reason-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </Field>
          <Field label="Description" htmlFor="fail-reason-desc">
            <Textarea
              id="fail-reason-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <Field label="Applies to">
            <Select
              aria-label="Applies to"
              value={scope}
              onChange={setScope}
              options={SCOPE_OPTIONS}
            />
          </Field>
          <CheckRow
            checked={chargesFee}
            onChange={(e) => setChargesFee(e.target.checked)}
            label="May charge a no-show fee"
          />
          <CheckRow
            checked={requiresCompliance}
            onChange={(e) => setRequiresCompliance(e.target.checked)}
            label="Require on-site checklist in the agent app"
          />
          <CheckRow
            checked={requiresNote}
            onChange={(e) => setRequiresNote(e.target.checked)}
            label="Require a short note from the agent"
          />
        </div>
      </Modal>
    </div>
  );
}
