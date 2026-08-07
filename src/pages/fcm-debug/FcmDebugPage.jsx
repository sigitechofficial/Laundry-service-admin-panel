import { useCallback, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Stack,
  TextField,
  Typography,
  Chip,
  Alert,
} from "@mui/material";
import { MdNotificationsNone } from "../../shared/icons/index";
import useToaster from "../../components/ui/Toaster";
import { BASE_URL } from "../../utilities/URL";
import { LS_ACCESS_TOKEN } from "../../utilities/authStorage";

const DEFAULT_TOKEN =
  "cVQDqeIUTAGCQBlAhm4gJs:APA91bE4A_8-XjyM2U3xDCC_mvmo88bSIo1bLGGcYNc6ymTpPnIPyg5mjMPKLhi0S6vs3ewlZFfjBQp9jrg5E-C5iBlvz1S9Gx7U2jOecRkML_j0uDSSlV0";

function apiRoot() {
  return String(BASE_URL || "").replace(/\/$/, "");
}

function formatLogBlock(entry) {
  const lines = [
    "════════════════════════════════════════════════════════════",
    `[${entry.at}] ${entry.action}`,
    `HTTP: ${entry.httpStatus ?? "n/a"}  ok=${entry.ok}`,
    `URL: ${entry.url}`,
    "────────────────────────────────────────────────────────────",
    typeof entry.body === "string"
      ? entry.body
      : JSON.stringify(entry.body, null, 2),
    "",
  ];
  if (entry.error) {
    lines.push(`CLIENT_ERROR: ${entry.error}`, "");
  }
  return lines.join("\n");
}

export default function FcmDebugPage() {
  const { success, error: showError } = useToaster();
  const [token, setToken] = useState(DEFAULT_TOKEN);
  const [userId, setUserId] = useState("");
  const [title, setTitle] = useState("FCM Debug Test");
  const [body, setBody] = useState(
    "If you see this, push delivery from the stage server works."
  );
  const [debugSecret, setDebugSecret] = useState("");
  const [logs, setLogs] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastSummary, setLastSummary] = useState(null);
  const logEndRef = useRef(null);

  const appendLog = useCallback((entry) => {
    setLogs((prev) => `${prev}${formatLogBlock(entry)}`);
    setTimeout(() => {
      logEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }, []);

  const callDebugApi = useCallback(
    async (action, path, options = {}) => {
      const url = `${apiRoot()}${path}`;
      const headers = {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      };
      const accessToken = localStorage.getItem(LS_ACCESS_TOKEN);
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
      if (debugSecret.trim()) {
        headers["X-FCM-Debug-Secret"] = debugSecret.trim();
      }

      const started = new Date().toISOString();
      setBusy(true);
      try {
        const res = await fetch(url, {
          ...options,
          headers: { ...headers, ...(options.headers || {}) },
          credentials: "include",
        });

        const text = await res.text();
        let parsed;
        try {
          parsed = text ? JSON.parse(text) : null;
        } catch {
          parsed = text;
        }

        const entry = {
          at: started,
          action,
          url,
          httpStatus: res.status,
          ok: res.ok,
          body: parsed,
        };
        appendLog(entry);

        const data = parsed && typeof parsed === "object" ? parsed.data : null;
        setLastSummary({
          action,
          httpStatus: res.status,
          apiStatus: parsed?.status,
          message: parsed?.message,
          sent: data?.sent,
          successCount: data?.successCount,
          failureCount: data?.failureCount,
          reason: data?.reason,
          firebaseReady: data?.firebaseReady ?? data?.diagnostics?.firebaseReady,
          parseOk: data?.parseOk ?? data?.diagnostics?.parseOk,
          parseError: data?.parseError ?? data?.diagnostics?.parseError,
          projectId: data?.projectId ?? data?.diagnostics?.projectId,
          results: data?.results,
        });

        if (res.ok && String(parsed?.status) === "1") {
          success(parsed?.message || `${action} OK`);
        } else {
          showError(parsed?.message || `${action} failed (HTTP ${res.status})`);
        }

        return { res, parsed };
      } catch (err) {
        appendLog({
          at: started,
          action,
          url,
          httpStatus: null,
          ok: false,
          body: null,
          error: err?.message || String(err),
        });
        showError(err?.message || "Network error calling debug API");
        return null;
      } finally {
        setBusy(false);
      }
    },
    [appendLog, debugSecret, showError, success]
  );

  const onCheckStatus = () => callDebugApi("FCM_STATUS", "/debug/fcm/status", { method: "GET" });

  const onSend = () => {
    const trimmed = token.trim();
    if (!trimmed && !userId.trim()) {
      showError("Enter a device FCM token and/or userId");
      return;
    }
    const payload = {
      title: title.trim() || "FCM Debug Test",
      body: body.trim() || "Debug push",
      data: { source: "admin_fcm_debug_page" },
    };
    if (trimmed) payload.token = trimmed;
    if (userId.trim()) payload.userId = userId.trim();

    return callDebugApi("FCM_SEND", "/debug/fcm/send", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  };

  const onCopyLogs = async () => {
    if (!logs.trim()) {
      showError("No logs to copy yet");
      return;
    }
    try {
      await navigator.clipboard.writeText(logs);
      success("Logs copied — paste them in chat");
    } catch {
      showError("Clipboard failed — select the log box and copy manually");
    }
  };

  const summaryChips = useMemo(() => {
    if (!lastSummary) return null;
    const chips = [
      { label: `HTTP ${lastSummary.httpStatus}`, color: lastSummary.httpStatus < 400 ? "success" : "error" },
    ];
    if (lastSummary.firebaseReady != null) {
      chips.push({
        label: lastSummary.firebaseReady ? "Firebase ready" : "Firebase NOT ready",
        color: lastSummary.firebaseReady ? "success" : "error",
      });
    }
    if (lastSummary.parseOk === false) {
      chips.push({ label: "firebase.json invalid", color: "error" });
    }
    if (lastSummary.sent != null) {
      chips.push({
        label: lastSummary.sent ? "Push accepted" : "Push failed",
        color: lastSummary.sent ? "success" : "error",
      });
    }
    if (lastSummary.successCount != null) {
      chips.push({
        label: `ok=${lastSummary.successCount} fail=${lastSummary.failureCount ?? 0}`,
        color: "default",
      });
    }
    if (lastSummary.reason) {
      chips.push({ label: lastSummary.reason, color: "warning" });
    }
    return chips;
  }, [lastSummary]);

  return (
    <div className="!space-y-8">
      <Box className="flex items-center gap-x-5 justify-between flex-wrap gap-y-3">
        <Box className="flex items-center gap-x-5">
          <Typography color="blue.50">
            <MdNotificationsNone size="24px" color="blue.50" />
          </Typography>
          <Typography variant="h4" fontFamily="Switzer" color="grey.20">
            FCM Push Debug
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          API: {apiRoot()}
        </Typography>
      </Box>

      <Alert severity="info">
        Use <strong>Check Firebase Status</strong> first, then{" "}
        <strong>Send Test Notification</strong>. Copy the log panel below and
        share it to debug delivery failures (invalid firebase.json, bad token,
        project mismatch, etc.).
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
        <Stack spacing={2.5}>
          <TextField
            label="FCM device token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            fullWidth
            multiline
            minRows={2}
            helperText="Android / iOS FCM registration token from the app"
          />
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              label="User ID (optional)"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              fullWidth
              helperText="Also loads tokens saved for this user in DB"
            />
            <TextField
              label="Debug secret (optional)"
              value={debugSecret}
              onChange={(e) => setDebugSecret(e.target.value)}
              fullWidth
              helperText="Only if server has FCM_DEBUG_SECRET set"
            />
          </Stack>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
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
            />
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <Button
              variant="outlined"
              disabled={busy}
              onClick={onCheckStatus}
            >
              Check Firebase Status
            </Button>
            <Button
              variant="contained"
              disabled={busy}
              onClick={onSend}
            >
              Send Test Notification
            </Button>
            <Button variant="text" disabled={!logs || busy} onClick={onCopyLogs}>
              Copy all logs
            </Button>
            <Button
              variant="text"
              color="inherit"
              disabled={!logs || busy}
              onClick={() => {
                setLogs("");
                setLastSummary(null);
              }}
            >
              Clear logs
            </Button>
          </Stack>

          {summaryChips && (
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {summaryChips.map((c) => (
                <Chip key={c.label} size="small" label={c.label} color={c.color} />
              ))}
            </Stack>
          )}

          {lastSummary?.parseError && (
            <Alert severity="error">
              firebase.json parse error: {lastSummary.parseError}
            </Alert>
          )}
          {Array.isArray(lastSummary?.results) && lastSummary.results.length > 0 && (
            <Alert severity={lastSummary.sent ? "success" : "warning"}>
              {lastSummary.results.map((r, i) => (
                <Typography key={i} variant="body2" component="div">
                  {r.success
                    ? `✓ ${r.tokenPreview} → ${r.messageId}`
                    : `✗ ${r.tokenPreview} → ${r.code}: ${r.message}`}
                </Typography>
              ))}
            </Alert>
          )}
        </Stack>
      </Box>

      <Box>
        <Typography variant="subtitle1" fontWeight={600} mb={1}>
          Debug logs (copy &amp; paste to share)
        </Typography>
        <Box
          component="pre"
          sx={{
            m: 0,
            p: 2,
            minHeight: 280,
            maxHeight: 480,
            overflow: "auto",
            borderRadius: 2,
            bgcolor: "#0f172a",
            color: "#e2e8f0",
            fontSize: 12,
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {logs ||
            "No requests yet. Click Check Firebase Status or Send Test Notification."}
          <div ref={logEndRef} />
        </Box>
      </Box>
    </div>
  );
}
