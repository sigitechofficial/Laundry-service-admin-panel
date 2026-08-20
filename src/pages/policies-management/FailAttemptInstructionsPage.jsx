import { useMemo, useState } from "react";
import { Button, Field, Input, Modal, PageHeader, Select, Table, Textarea } from "../../design-system";
import { CheckRow, Notice, TabBar, Toggle } from "../misc-kit";
import {
  DirectoryDotPill,
  DirectoryError,
  DirectoryFormCard,
  DirectoryIdentity,
  DirectoryTableWrap,
} from "../directory-table/directoryTable";
import useToaster from "../../components/ui/Toaster";
import {
  useCreateFailAttemptInstructionMutation,
  useCreateZoneFailAttemptSetMutation,
  useGetAllZonesQuery,
  useGetFailAttemptInstructionSetsQuery,
  useSetFailAttemptSetActiveMutation,
  useUpdateFailAttemptInstructionMutation,
} from "../../store/services/api";
import { Delay } from "../../components/shared/Loaders";
import FailAttemptReasonsSection from "./FailAttemptReasonsSection";

function unwrapSets(res) {
  const d = res?.data !== undefined ? res.data : res;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  return [];
}

const PAGE_TABS = [
  { value: "checklist", label: "Checklist" },
  { value: "reasons", label: "Fail reasons" },
];

const SCOPE_TABS = [
  { value: "pickup", label: "Pickup" },
  { value: "delivery", label: "Delivery" },
];

export default function FailAttemptInstructionsPage() {
  const { success, error: showError } = useToaster();
  const [pageTab, setPageTab] = useState("checklist");
  const [scope, setScope] = useState("pickup");
  const [addOpen, setAddOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isRequired, setIsRequired] = useState(true);
  const [zoneId, setZoneId] = useState("");

  const { data, isLoading, isError, refetch } = useGetFailAttemptInstructionSetsQuery(scope);
  const { data: zonesData } = useGetAllZonesQuery();
  const [createItem, { isLoading: creating }] = useCreateFailAttemptInstructionMutation();
  const [updateItem] = useUpdateFailAttemptInstructionMutation();
  const [createZoneSet, { isLoading: creatingZone }] = useCreateZoneFailAttemptSetMutation();
  const [setActive] = useSetFailAttemptSetActiveMutation();

  const sets = useMemo(() => unwrapSets(data), [data]);
  const globalSet = sets.find((s) => s.zoneId == null) || sets[0];
  const zoneSets = sets.filter((s) => s.zoneId != null);
  const items = globalSet?.items || [];

  const zones = useMemo(() => {
    const raw = zonesData?.data ?? zonesData ?? [];
    const list = Array.isArray(raw) ? raw : raw?.zones || [];
    return list.map((z) => ({
      value: String(z.id),
      label: z.name || z.zoneName || `Zone ${z.id}`,
    }));
  }, [zonesData]);

  const toggleEnabled = async (item, next) => {
    try {
      await updateItem({
        instructionId: item.id,
        isEnabled: next,
        isRequired: next ? item.isRequired : false,
      }).unwrap();
      success(next ? "Instruction enabled" : "Instruction disabled");
      refetch();
    } catch (e) {
      showError(e?.data?.message || e?.message || "Update failed");
    }
  };

  const toggleRequired = async (item, next) => {
    try {
      await updateItem({
        instructionId: item.id,
        isRequired: next,
        isEnabled: next ? true : item.isEnabled,
      }).unwrap();
      success("Required flag updated");
      refetch();
    } catch (e) {
      showError(e?.data?.message || e?.message || "Update failed");
    }
  };

  const onAdd = async () => {
    if (!globalSet?.id || !title.trim()) return;
    try {
      await createItem({
        setId: globalSet.id,
        title: title.trim(),
        body: body.trim() || null,
        isRequired,
        isEnabled: true,
      }).unwrap();
      success("Instruction added");
      setAddOpen(false);
      setTitle("");
      setBody("");
      setIsRequired(true);
      refetch();
    } catch (e) {
      showError(e?.data?.message || e?.message || "Create failed");
    }
  };

  const onCreateZoneSet = async () => {
    if (!zoneId) return;
    try {
      await createZoneSet({
        scope,
        zoneId: Number(zoneId),
      }).unwrap();
      success("Zone checklist created (cloned from global)");
      setZoneId("");
      refetch();
    } catch (e) {
      showError(e?.data?.message || e?.message || "Zone set failed");
    }
  };

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <PageHeader
        title="Fail attempt settings"
        description="Reasons agents pick when an attempt fails, plus the checklist they must acknowledge. Fee and no-fee reasons both appear in the app and on the order."
      />

      <TabBar value={pageTab} tabs={PAGE_TABS} onChange={setPageTab} />

      {pageTab === "reasons" ? <FailAttemptReasonsSection /> : null}

      {pageTab === "checklist" ? (
        isLoading ? (
          <Delay />
        ) : isError ? (
          <DirectoryError onRetry={() => refetch()}>Could not load fail-attempt checklists.</DirectoryError>
        ) : (
          <div style={{ display: "grid", gap: 20 }}>
            <p className="jd-field__hint" style={{ margin: 0 }}>
              Checklist shown to agents before marking pickup or delivery failed. Disabled items never
              appear in the app. Required items must be acknowledged.
            </p>

            <TabBar value={scope} tabs={SCOPE_TABS} onChange={setScope} />

            <Notice tone="info">
              Active set: {globalSet?.name || "—"} (v{globalSet?.version || "—"})
            </Notice>

            <DirectoryTableWrap>
              <Table
                columns={[
                  {
                    key: "title",
                    header: "Instruction",
                    render: (item) => (
                      <DirectoryIdentity name={item.title} meta={item.body} id={item.id} />
                    ),
                  },
                  {
                    key: "required",
                    header: "Required",
                    render: (item) => (
                      <DirectoryDotPill tone={item.isRequired ? "warning" : "neutral"}>
                        {item.isRequired ? "Required" : "Optional"}
                      </DirectoryDotPill>
                    ),
                  },
                  {
                    key: "actions",
                    header: "Actions",
                    render: (item) => (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "flex-end" }}>
                        <Toggle
                          checked={Boolean(item.isEnabled)}
                          onChange={(e) => toggleEnabled(item, e.target.checked)}
                          label="Enabled"
                        />
                        <CheckRow
                          checked={Boolean(item.isRequired)}
                          onChange={(e) => toggleRequired(item, e.target.checked)}
                          disabled={!item.isEnabled}
                          label="Required"
                        />
                      </div>
                    ),
                  },
                ]}
                rows={items}
                rowKey={(item) => item.id}
                empty="No instructions yet for this scope."
              />
            </DirectoryTableWrap>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button onClick={() => setAddOpen(true)}>Add instruction</Button>
            </div>

            <DirectoryFormCard
              title="Zone overrides"
              hint="Create a zone-specific checklist (starts as a clone of the global set). Agents in that zone see the zone set when active."
            >
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end", marginBottom: 12 }}>
                <Field label="Zone">
                  <div style={{ minWidth: 220 }}>
                    <Select
                      aria-label="Zone"
                      value={zoneId}
                      onChange={setZoneId}
                      options={zones}
                      placeholder="Select zone"
                    />
                  </div>
                </Field>
                <Button variant="secondary" disabled={!zoneId || creatingZone} onClick={onCreateZoneSet}>
                  {creatingZone ? "Creating…" : "Create / activate zone set"}
                </Button>
              </div>
              <DirectoryTableWrap>
                <Table
                  columns={[
                    {
                      key: "name",
                      header: "Zone set",
                      render: (zs) => (
                        <DirectoryIdentity
                          name={zs.name}
                          meta={`Zone ${zs.zoneId} · ${zs.items?.length || 0} items · v${zs.version}`}
                          id={zs.id}
                        />
                      ),
                    },
                    {
                      key: "actions",
                      header: "Actions",
                      render: (zs) => (
                        <Toggle
                          checked={Boolean(zs.isActive)}
                          onChange={async (e) => {
                            try {
                              await setActive({
                                setId: zs.id,
                                isActive: e.target.checked,
                              }).unwrap();
                              refetch();
                            } catch (err) {
                              showError(err?.data?.message || err?.message || "Failed");
                            }
                          }}
                          label="Active"
                        />
                      ),
                    },
                  ]}
                  rows={zoneSets}
                  rowKey={(zs) => zs.id}
                  empty="No zone overrides yet."
                />
              </DirectoryTableWrap>
            </DirectoryFormCard>

            <Modal
              open={addOpen}
              title="Add instruction"
              onClose={() => setAddOpen(false)}
              primaryLabel="Save"
              onPrimary={onAdd}
              primaryDisabled={creating || !title.trim()}
            >
              <div style={{ display: "grid", gap: 12 }}>
                <Field label="Title" htmlFor="fail-inst-title">
                  <Input
                    id="fail-inst-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </Field>
                <Field label="Body" htmlFor="fail-inst-body">
                  <Textarea
                    id="fail-inst-body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                  />
                </Field>
                <CheckRow
                  checked={isRequired}
                  onChange={(e) => setIsRequired(e.target.checked)}
                  label="Required acknowledgment"
                />
              </div>
            </Modal>
          </div>
        )
      ) : null}
    </div>
  );
}
