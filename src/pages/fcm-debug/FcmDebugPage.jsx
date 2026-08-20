import { useCallback, useMemo, useRef, useState } from "react";
import {
  Badge,
  Button,
  Field,
  Input,
  PageHeader,
  Textarea,
} from "../../design-system";
import useToaster from "../../components/ui/Toaster";
import { BASE_URL } from "../../utilities/URL";
import { LS_ACCESS_TOKEN } from "../../utilities/authStorage";
import { fetchWithTimeout } from "../../store/services/fetchWithTimeout";
import { getApiErrorMessage } from "../../store/services/apiErrors";
import { DirectoryFormCard, DirectoryStack } from "../directory-table/directoryTable";

const DEFAULT_TOKEN = "";

function Notice({ tone = "info", children }) {
  const tones = {
    info: { background: "var(--info-bg)", color: "var(--info)" },
    warning: { background: "var(--warning-bg)", color: "var(--warning-700)" },
    danger: { background: "var(--danger-bg)", color: "var(--danger-700)" },
    success: { background: "var(--success-bg)", color: "var(--success-700)" },
  };
  return (
    <div
      style={{
        ...tones[tone],
        padding: "12px 14px",
        borderRadius: "var(--r-md)",
        fontSize: 14.5,
        lineHeight: 1.5,
      }}
    >
      {children}
    </div>
  );
}

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

function chipTone(color) {
  if (color === "success") return "success";
  if (color === "error") return "danger";
  if (color === "warning") return "warning";
  return "neutral";
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
        const res = await fetchWithTimeout(url, {
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
        showError(getApiErrorMessage(err, "Network error calling debug API"));
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
    <div style={{ display: "grid", gap: 20 }}>
      <PageHeader
        title="FCM Push Debug"
        description={`API: ${apiRoot()}`}
      />

      <Notice>
        Use <strong>Check Firebase Status</strong> first, then{" "}
        <strong>Send Test Notification</strong>. Copy the log panel below and
        share it to debug delivery failures (invalid firebase.json, bad token,
        project mismatch, etc.).
      </Notice>

      <DirectoryFormCard title="Send a test push" hint="Check Firebase status first, then send to a device token or user.">
      <DirectoryStack>
        <Field
          label="FCM device token"
          hint="Android / iOS FCM registration token from the app"
        >
          <Textarea
            value={token}
            onChange={(e) => setToken(e.target.value)}
            rows={3}
          />
        </Field>

        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          }}
        >
          <Field label="User ID (optional)" hint="Also loads tokens saved for this user in DB">
            <Input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
          </Field>
          <Field
            label="Debug secret (optional)"
            hint="Only if server has FCM_DEBUG_SECRET set"
          >
            <Input
              value={debugSecret}
              onChange={(e) => setDebugSecret(e.target.value)}
            />
          </Field>
        </div>

        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          }}
        >
          <Field label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Body">
            <Input value={body} onChange={(e) => setBody(e.target.value)} />
          </Field>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <Button variant="secondary" disabled={busy} onClick={onCheckStatus}>
            Check Firebase Status
          </Button>
          <Button disabled={busy} onClick={onSend}>
            Send Test Notification
          </Button>
          <Button variant="ghost" disabled={!logs || busy} onClick={onCopyLogs}>
            Copy all logs
          </Button>
          <Button
            variant="ghost"
            disabled={!logs || busy}
            onClick={() => {
              setLogs("");
              setLastSummary(null);
            }}
          >
            Clear logs
          </Button>
        </div>

        {summaryChips && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {summaryChips.map((chip) => (
              <Badge key={chip.label} tone={chipTone(chip.color)}>
                {chip.label}
              </Badge>
            ))}
          </div>
        )}

        {lastSummary?.parseError && (
          <Notice tone="danger">
            firebase.json parse error: {lastSummary.parseError}
          </Notice>
        )}
        {Array.isArray(lastSummary?.results) && lastSummary.results.length > 0 && (
          <Notice tone={lastSummary.sent ? "success" : "warning"}>
            <div style={{ display: "grid", gap: 4 }}>
              {lastSummary.results.map((result, i) => (
                <div key={i}>
                  {result.success
                    ? `✓ ${result.tokenPreview} → ${result.messageId}`
                    : `✗ ${result.tokenPreview} → ${result.code}: ${result.message}`}
                </div>
              ))}
            </div>
          </Notice>
        )}
      </DirectoryStack>
      </DirectoryFormCard>

      <DirectoryFormCard title="Debug logs" hint="Copy and paste this panel to share delivery failures.">
        <pre
          style={{
            margin: 0,
            padding: 16,
            minHeight: 280,
            maxHeight: 480,
            overflow: "auto",
            borderRadius: "var(--r-xl)",
            background: "var(--n-900)",
            color: "var(--n-100)",
            fontSize: 12,
            fontFamily: "var(--font-mono)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {logs ||
            "No requests yet. Click Check Firebase Status or Send Test Notification."}
          <div ref={logEndRef} />
        </pre>
      </DirectoryFormCard>
    </div>
  );
}
