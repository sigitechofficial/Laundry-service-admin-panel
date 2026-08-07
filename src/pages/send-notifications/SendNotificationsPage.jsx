import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { MdNotificationsNone } from "../../shared/icons/index";
import useToaster from "../../components/ui/Toaster";
import ModalComponent from "../../components/shared/Modal";
import {
  useLazySearchNotificationRecipientsQuery,
  usePreviewAdminNotificationMutation,
  useSendAdminNotificationMutation,
} from "../../store/services/api";

const AUDIENCES = [
  { value: "customers", label: "Customers" },
  { value: "agents", label: "Agents" },
  { value: "all", label: "All (customers + agents)" },
];

export default function SendNotificationsPage() {
  const { success, error: showError } = useToaster();

  const [audience, setAudience] = useState("customers");
  const [mode, setMode] = useState("broadcast");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [options, setOptions] = useState([]);
  const [preview, setPreview] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [triggerSearch, { isFetching: searching }] =
    useLazySearchNotificationRecipientsQuery();
  const [previewMutation, { isLoading: previewing }] =
    usePreviewAdminNotificationMutation();
  const [sendMutation, { isLoading: sending }] =
    useSendAdminNotificationMutation();

  useEffect(() => {
    setSelectedUsers([]);
    setOptions([]);
    setPreview(null);
  }, [audience, mode]);

  useEffect(() => {
    if (mode !== "specific") return undefined;
    const q = searchInput.trim();
    if (q.length < 1) {
      setOptions([]);
      return undefined;
    }
    const handle = setTimeout(async () => {
      try {
        const res = await triggerSearch({
          audience,
          q,
          limit: 20,
        }).unwrap();
        setOptions(res?.data?.recipients || []);
      } catch {
        setOptions([]);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [searchInput, audience, mode, triggerSearch]);

  const payloadBase = useMemo(() => {
    const userIds = selectedUsers.map((u) => u.id);
    return {
      audience,
      mode,
      title: title.trim(),
      body: body.trim(),
      ...(mode === "specific" ? { userIds } : {}),
      data: {
        source: "admin_send_notifications_page",
      },
    };
  }, [audience, mode, title, body, selectedUsers]);

  const canPreview =
    Boolean(payloadBase.title) &&
    Boolean(payloadBase.body) &&
    (mode === "broadcast" || selectedUsers.length > 0);

  const onPreview = async () => {
    if (!canPreview) {
      showError("Fill title, description, and recipients first");
      return;
    }
    try {
      const res = await previewMutation(payloadBase).unwrap();
      setPreview(res?.data || null);
      success(res?.message || "Preview ready");
    } catch (err) {
      showError(err?.data?.message || err?.error || "Preview failed");
    }
  };

  const onSendClick = async () => {
    if (!canPreview) {
      showError("Fill title, description, and recipients first");
      return;
    }
    // Always dry-run first for safety, then confirm for real send
    try {
      const dry = await sendMutation({ ...payloadBase, dryRun: true }).unwrap();
      setPreview(dry?.data || null);
      setConfirmOpen(true);
    } catch (err) {
      showError(err?.data?.message || err?.error || "Dry run failed");
    }
  };

  const onConfirmSend = async () => {
    try {
      const res = await sendMutation({
        ...payloadBase,
        dryRun: false,
        confirmBroadcast: mode === "broadcast",
      }).unwrap();
      setLastResult(res?.data || null);
      setConfirmOpen(false);
      success(res?.message || "Notifications sent");
    } catch (err) {
      showError(err?.data?.message || err?.error || "Send failed");
    }
  };

  const busy = previewing || sending;

  return (
    <div className="!space-y-8">
      <Box className="flex items-center gap-x-5 justify-between flex-wrap gap-y-3">
        <Box className="flex items-center gap-x-5">
          <Typography color="blue.50">
            <MdNotificationsNone size="24px" color="blue.50" />
          </Typography>
          <Typography variant="h4" fontFamily="Switzer" color="grey.20">
            Send Notifications
          </Typography>
        </Box>
      </Box>

      <Alert severity="info">
        Push goes through FCM to devices that have an active app token. Use{" "}
        <strong>Preview</strong> before broadcast. Broadcast to many users
        requires an extra confirmation.
      </Alert>

      <Box
        sx={{
          p: 3,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          bgcolor: "background.paper",
        }}
      >
        <Stack spacing={3}>
          <FormControl>
            <FormLabel>Audience</FormLabel>
            <RadioGroup
              row
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
            >
              {AUDIENCES.map((a) => (
                <FormControlLabel
                  key={a.value}
                  value={a.value}
                  control={<Radio />}
                  label={a.label}
                />
              ))}
            </RadioGroup>
          </FormControl>

          <FormControl>
            <FormLabel>Target</FormLabel>
            <RadioGroup
              row
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              <FormControlLabel
                value="broadcast"
                control={<Radio />}
                label="Everyone in audience"
              />
              <FormControlLabel
                value="specific"
                control={<Radio />}
                label="Specific customer / agent"
              />
            </RadioGroup>
          </FormControl>

          {mode === "specific" && (
            <Autocomplete
              multiple
              options={options}
              value={selectedUsers}
              loading={searching}
              filterOptions={(x) => x}
              getOptionLabel={(o) =>
                `${o.name} (#${o.id}) · ${o.role}${
                  o.phoneNumber ? ` · ${o.phoneNumber}` : ""
                }`
              }
              isOptionEqualToValue={(a, b) => a.id === b.id}
              onChange={(_, value) => setSelectedUsers(value)}
              onInputChange={(_, value) => setSearchInput(value)}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    {...getTagProps({ index })}
                    key={option.id}
                    label={`${option.name} (#${option.id})`}
                    size="small"
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search by name, email, phone, or user ID"
                  helperText="Select one or more recipients from the audience above"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {searching ? (
                          <CircularProgress color="inherit" size={18} />
                        ) : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          )}

          <TextField
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            inputProps={{ maxLength: 120 }}
            helperText={`${title.length}/120`}
          />
          <TextField
            label="Description / body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            fullWidth
            multiline
            minRows={3}
            inputProps={{ maxLength: 500 }}
            helperText={`${body.length}/500`}
          />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <Button
              variant="outlined"
              disabled={!canPreview || busy}
              onClick={onPreview}
            >
              Preview audience
            </Button>
            <Button
              variant="contained"
              disabled={!canPreview || busy}
              onClick={onSendClick}
            >
              Send notification
            </Button>
          </Stack>
        </Stack>
      </Box>

      {preview && (
        <Box
          sx={{
            p: 2.5,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
          }}
        >
          <Typography variant="subtitle1" fontWeight={600} mb={1}>
            Audience preview
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={1} mb={1.5}>
            <Chip label={`Targeted: ${preview.targetedUsers ?? 0}`} />
            <Chip
              color="success"
              label={`With tokens: ${preview.usersWithTokens ?? 0}`}
            />
            <Chip
              color="warning"
              label={`No token: ${preview.usersWithoutTokens ?? 0}`}
            />
            <Chip label={`Devices: ${preview.tokenCount ?? 0}`} />
            <Chip label={`Mode: ${preview.mode || mode}`} />
          </Stack>
          {Array.isArray(preview.sample) && preview.sample.length > 0 && (
            <Typography variant="body2" color="text.secondary">
              Sample:{" "}
              {preview.sample
                .map((s) => `${s.name} (#${s.id}/${s.role})`)
                .join(", ")}
            </Typography>
          )}
        </Box>
      )}

      {lastResult && !lastResult.dryRun && (
        <Box
          sx={{
            p: 2.5,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
          }}
        >
          <Typography variant="subtitle1" fontWeight={600} mb={1}>
            Last send result
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={1} mb={1.5}>
            <Chip
              color="success"
              label={`Delivered users: ${lastResult.usersDelivered ?? 0}`}
            />
            <Chip
              color="warning"
              label={`No token: ${lastResult.usersNoToken ?? 0}`}
            />
            <Chip
              color="error"
              label={`Failed: ${lastResult.usersFailed ?? 0}`}
            />
            <Chip
              label={`Device OK: ${lastResult.deviceSuccessCount ?? 0}`}
            />
            <Chip label={`${lastResult.durationMs ?? 0} ms`} />
          </Stack>
          <Divider sx={{ my: 1.5 }} />
          <Box
            component="pre"
            sx={{
              m: 0,
              p: 2,
              maxHeight: 280,
              overflow: "auto",
              borderRadius: 1,
              bgcolor: "#0f172a",
              color: "#e2e8f0",
              fontSize: 12,
              whiteSpace: "pre-wrap",
            }}
          >
            {JSON.stringify(lastResult, null, 2)}
          </Box>
        </Box>
      )}

      <ModalComponent
        open={confirmOpen}
        onClose={() => !sending && setConfirmOpen(false)}
        title="Confirm push notification"
      >
        <Stack spacing={2} sx={{ p: 1 }}>
          <Typography variant="body2">
            You are about to send:
          </Typography>
          <Typography variant="subtitle1" fontWeight={700}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {body}
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={1}>
            <Chip label={`Audience: ${audience}`} />
            <Chip label={`Mode: ${mode}`} />
            <Chip
              color="primary"
              label={`Users: ${preview?.targetedUsers ?? "?"}`}
            />
            <Chip
              color="success"
              label={`With tokens: ${preview?.usersWithTokens ?? "?"}`}
            />
          </Stack>
          {mode === "broadcast" && (preview?.targetedUsers || 0) > 1 && (
            <Alert severity="warning">
              This is a broadcast to multiple users. Only continue if the
              preview counts look correct.
            </Alert>
          )}
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button
              disabled={sending}
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              disabled={sending}
              onClick={onConfirmSend}
            >
              {sending ? "Sending…" : "Confirm & send"}
            </Button>
          </Stack>
        </Stack>
      </ModalComponent>
    </div>
  );
}
