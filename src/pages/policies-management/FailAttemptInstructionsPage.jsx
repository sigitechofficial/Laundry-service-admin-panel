import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import ChangeStatus from "../../components/ui/Switch";
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
import SelectField from "../../components/ui/SelectField";
import FailAttemptReasonsSection from "./FailAttemptReasonsSection";

function unwrapSets(res) {
  const d = res?.data !== undefined ? res.data : res;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  return [];
}

export default function FailAttemptInstructionsPage() {
  const { success, error: showError } = useToaster();
  const [pageTab, setPageTab] = useState("checklist");
  const [scope, setScope] = useState("pickup");
  const [addOpen, setAddOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isRequired, setIsRequired] = useState(true);
  const [zoneId, setZoneId] = useState("");

  const { data, isLoading, refetch } = useGetFailAttemptInstructionSetsQuery(scope);
  const { data: zonesData } = useGetAllZonesQuery();
  const [createItem, { isLoading: creating }] =
    useCreateFailAttemptInstructionMutation();
  const [updateItem] = useUpdateFailAttemptInstructionMutation();
  const [createZoneSet, { isLoading: creatingZone }] =
    useCreateZoneFailAttemptSetMutation();
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
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={700} mb={1}>
        Fail attempt settings
      </Typography>
      <Typography color="text.secondary" mb={2}>
        Reasons agents pick when an attempt fails, plus the checklist they
        must acknowledge. Fee and no-fee reasons both appear in the app and
        on the order.
      </Typography>

      <Tabs
        value={pageTab}
        onChange={(_, v) => setPageTab(v)}
        sx={{ mb: 2, borderBottom: "1px solid #E5E7EB" }}
      >
        <Tab value="checklist" label="Checklist" />
        <Tab value="reasons" label="Fail reasons" />
      </Tabs>

      {pageTab === "reasons" ? <FailAttemptReasonsSection /> : null}

      {pageTab === "checklist" ? (
      <>
      {isLoading ? <Delay /> : null}
      {!isLoading ? (
      <>
      <Typography color="text.secondary" mb={2}>
        Checklist shown to agents before marking pickup or delivery failed.
        Disabled items never appear in the app. Required items must be
        acknowledged.
      </Typography>

      <Tabs
        value={scope}
        onChange={(_, v) => setScope(v)}
        sx={{ mb: 2 }}
      >
        <Tab value="pickup" label="Pickup" />
        <Tab value="delivery" label="Delivery" />
      </Tabs>

      <Alert severity="info" sx={{ mb: 2 }}>
        Active set: {globalSet?.name || "—"} (v{globalSet?.version || "—"})
      </Alert>

      <Stack direction="row" justifyContent="space-between" mb={2}>
        <Typography fontWeight={600}>Global checklist items</Typography>
        <Button variant="contained" onClick={() => setAddOpen(true)}>
          Add instruction
        </Button>
      </Stack>

      <Stack spacing={1.5}>
        {items.map((item) => (
          <Box
            key={item.id}
            sx={{
              p: 2,
              border: "1px solid #E5E7EB",
              borderRadius: 2,
              bgcolor: "#fff",
            }}
          >
            <Stack
              direction={{ xs: "column", md: "row" }}
              justifyContent="space-between"
              gap={1}
            >
              <Box>
                <Typography fontWeight={700}>{item.title}</Typography>
                {item.body ? (
                  <Typography variant="body2" color="text.secondary">
                    {item.body}
                  </Typography>
                ) : null}
              </Box>
              <Stack direction="row" spacing={2} alignItems="center">
                <FormControlLabel
                  control={
                    <ChangeStatus
                      checked={Boolean(item.isEnabled)}
                      onChange={(e) =>
                        toggleEnabled(item, e.target.checked)
                      }
                    />
                  }
                  label="Enabled"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={Boolean(item.isRequired)}
                      onChange={(e) =>
                        toggleRequired(item, e.target.checked)
                      }
                      disabled={!item.isEnabled}
                    />
                  }
                  label="Required"
                />
              </Stack>
            </Stack>
          </Box>
        ))}
        {!items.length ? (
          <Alert severity="warning">No instructions yet for this scope.</Alert>
        ) : null}
      </Stack>

      <Box mt={4}>
        <Typography fontWeight={700} mb={1}>
          Zone overrides
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Create a zone-specific checklist (starts as a clone of the global
          set). Agents in that zone see the zone set when active.
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} mb={2}>
          <Box sx={{ minWidth: 220 }}>
            <SelectField
              label="Zone"
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
              options={zones}
            />
          </Box>
          <Button
            variant="outlined"
            disabled={!zoneId || creatingZone}
            onClick={onCreateZoneSet}
          >
            Create / activate zone set
          </Button>
        </Stack>
        <Stack spacing={1}>
          {zoneSets.map((zs) => (
            <Box
              key={zs.id}
              sx={{
                p: 1.5,
                border: "1px solid #E5E7EB",
                borderRadius: 2,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography>
                {zs.name} (zone {zs.zoneId}) — {zs.items?.length || 0} items —
                v{zs.version}
              </Typography>
              <FormControlLabel
                control={
                  <ChangeStatus
                    checked={Boolean(zs.isActive)}
                    onChange={async (e) => {
                      try {
                        await setActive({
                          setId: zs.id,
                          isActive: e.target.checked,
                        }).unwrap();
                        refetch();
                      } catch (err) {
                        showError(
                          err?.data?.message || err?.message || "Failed"
                        );
                      }
                    }}
                  />
                }
                label="Active"
              />
            </Box>
          ))}
        </Stack>
      </Box>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth>
        <DialogTitle>Add instruction</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
            />
            <TextField
              label="Body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              fullWidth
              multiline
              minRows={2}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={isRequired}
                  onChange={(e) => setIsRequired(e.target.checked)}
                />
              }
              label="Required acknowledgment"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={creating || !title.trim()}
            onClick={onAdd}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
      </>
      ) : null}
      </>
      ) : null}
    </Box>
  );
}
