import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ChangeStatus from "../../components/ui/Switch";
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

const CARD_SX = {
  p: 2,
  border: "1px solid #E5E7EB",
  borderRadius: 2,
  bgcolor: "#fff",
};

export default function FailAttemptReasonsSection() {
  const { success, error: showError } = useToaster();
  const { data, isLoading, refetch } = useGetFailAttemptReasonsQuery();
  const [createReason, { isLoading: creating }] =
    useCreateFailAttemptReasonMutation();
  const [updateReason] = useUpdateFailAttemptReasonMutation();

  const [addOpen, setAddOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [scope, setScope] = useState("both");
  const [chargesFee, setChargesFee] = useState(false);
  const [requiresNote, setRequiresNote] = useState(false);

  const reasons = useMemo(() => unwrapReasons(data), [data]);
  const feeOn = reasons.filter((r) => r.status !== false && r.chargesFee);
  const feeOff = reasons.filter((r) => r.status !== false && !r.chargesFee);

  const resetForm = () => {
    setLabel("");
    setDescription("");
    setScope("both");
    setChargesFee(false);
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

  return (
    <Box>
      <Typography color="text.secondary" mb={2}>
        Agents must pick one of these reasons when marking pickup or delivery
        failed. Reasons that charge a no-show fee and reasons that do not are
        both shown in the app and on the order.
      </Typography>

      <Alert severity="info" sx={{ mb: 2 }}>
        Active catalog: {feeOn.length} fee reason{feeOn.length === 1 ? "" : "s"} ·{" "}
        {feeOff.length} no-fee reason{feeOff.length === 1 ? "" : "s"}
      </Alert>

      <Stack direction="row" justifyContent="space-between" mb={2}>
        <Typography fontWeight={600}>Catalog</Typography>
        <Button variant="contained" onClick={() => setAddOpen(true)}>
          Add reason
        </Button>
      </Stack>

      <Stack spacing={1.5}>
        {reasons.map((row) => (
          <Box key={row.id} sx={CARD_SX}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              justifyContent="space-between"
              gap={1.5}
            >
              <Box sx={{ minWidth: 0 }}>
                <Stack direction="row" gap={1} flexWrap="wrap" mb={0.75}>
                  <Chip
                    size="small"
                    label={row.chargesFee ? "Fee may apply" : "No fee"}
                    sx={{
                      fontWeight: 700,
                      bgcolor: row.chargesFee ? "#FFEDD5" : "#D1FAE5",
                      color: row.chargesFee ? "#9A3412" : "#065F46",
                    }}
                  />
                  <Chip
                    size="small"
                    variant="outlined"
                    label={String(row.scope || "both").toUpperCase()}
                  />
                  {row.requiresNote ? (
                    <Chip size="small" variant="outlined" label="Note required" />
                  ) : null}
                </Stack>
                <Typography fontWeight={700}>{row.label}</Typography>
                {row.description ? (
                  <Typography variant="body2" color="text.secondary">
                    {row.description}
                  </Typography>
                ) : null}
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mt: 0.5 }}
                >
                  {row.code}
                </Typography>
              </Box>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                alignItems={{ sm: "center" }}
              >
                <FormControlLabel
                  control={
                    <ChangeStatus
                      checked={Boolean(row.status)}
                      onChange={(e) =>
                        toggleField(
                          row,
                          { status: e.target.checked },
                          e.target.checked ? "Reason enabled" : "Reason disabled"
                        )
                      }
                    />
                  }
                  label="Enabled"
                />
                <FormControlLabel
                  control={
                    <Checkbox
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
                    />
                  }
                  label="Charges fee"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={Boolean(row.requiresNote)}
                      onChange={(e) =>
                        toggleField(
                          row,
                          { requiresNote: e.target.checked },
                          "Note requirement updated"
                        )
                      }
                    />
                  }
                  label="Note"
                />
              </Stack>
            </Stack>
          </Box>
        ))}
        {!reasons.length ? (
          <Alert severity="warning">
            No fail reasons yet. Add one, or re-run deploy seeds.
          </Alert>
        ) : null}
      </Stack>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth>
        <DialogTitle>Add fail reason</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              fullWidth
            />
            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              multiline
              minRows={2}
            />
            <TextField
              select
              label="Applies to"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
            >
              <MenuItem value="both">Pickup and delivery</MenuItem>
              <MenuItem value="pickup">Pickup only</MenuItem>
              <MenuItem value="delivery">Delivery only</MenuItem>
            </TextField>
            <FormControlLabel
              control={
                <Checkbox
                  checked={chargesFee}
                  onChange={(e) => setChargesFee(e.target.checked)}
                />
              }
              label="May charge a no-show fee"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={requiresNote}
                  onChange={(e) => setRequiresNote(e.target.checked)}
                />
              }
              label="Require a short note from the agent"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={creating || !label.trim()}
            onClick={onAdd}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
