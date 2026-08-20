import { useEffect, useMemo, useRef, useState } from "react";
import {
  Badge,
  Button,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Textarea,
} from "../../design-system";
import useToaster from "../../components/ui/Toaster";
import {
  useLazySearchNotificationRecipientsQuery,
  usePreviewAdminNotificationMutation,
  useSendAdminNotificationMutation,
} from "../../store/services/api";
import NotificationDevicePreview from "./NotificationDevicePreview";
import styles from "./SendNotifications.module.css";

const AUDIENCES = [
  { value: "customers", label: "Customers" },
  { value: "agents", label: "Agents" },
  { value: "all", label: "All (customers + agents)" },
];

const TARGETS = [
  { value: "broadcast", label: "Everyone in audience" },
  { value: "specific", label: "Specific customer / agent" },
];

function Notice({ tone = "info", children }) {
  const toneClass =
    tone === "warning"
      ? styles.noticeWarning
      : tone === "danger"
        ? styles.noticeDanger
        : tone === "success"
          ? styles.noticeSuccess
          : styles.noticeInfo;
  return <div className={`${styles.notice} ${toneClass}`}>{children}</div>;
}

function recipientLabel(user) {
  return `${user.name} (#${user.id}) · ${user.role}${
    user.phoneNumber ? ` · ${user.phoneNumber}` : ""
  }`;
}

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
  const [previewError, setPreviewError] = useState(null);
  const [sendError, setSendError] = useState(null);

  const [triggerSearch, { isFetching: searching }] =
    useLazySearchNotificationRecipientsQuery();
  const [previewMutation, { isLoading: previewing }] =
    usePreviewAdminNotificationMutation();
  const [sendMutation, { isLoading: sending }] =
    useSendAdminNotificationMutation();

  const resetTargeting = () => {
    setSelectedUsers([]);
    setOptions([]);
    setPreview(null);
    setPreviewError(null);
    setSearchInput("");
  };

  const onAudienceChange = (next) => {
    setAudience(next);
    resetTargeting();
  };

  const onModeChange = (next) => {
    setMode(next);
    resetTargeting();
  };

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

  const payloadRef = useRef(payloadBase);
  payloadRef.current = payloadBase;

  const runPreview = async (silent = false) => {
    if (!canPreview) {
      if (!silent) showError("Fill title, description, and recipients first");
      return;
    }
    try {
      const res = await previewMutation(payloadRef.current).unwrap();
      setPreview(res?.data || null);
      setPreviewError(null);
      if (!silent) success(res?.message || "Preview ready");
    } catch (err) {
      const message = err?.data?.message || err?.error || "Preview failed";
      setPreviewError(message);
      if (!silent) showError(message);
    }
  };

  const recipientKey =
    mode === "specific" ? selectedUsers.map((u) => u.id).sort().join(",") : "";

  useEffect(() => {
    if (!canPreview) return undefined;
    const handle = setTimeout(async () => {
      try {
        const res = await previewMutation(payloadRef.current).unwrap();
        setPreview(res?.data || null);
        setPreviewError(null);
      } catch (err) {
        setPreviewError(err?.data?.message || err?.error || "Preview failed");
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [audience, mode, recipientKey, canPreview, previewMutation]);

  const onSendClick = async () => {
    if (!canPreview) {
      showError("Fill title, description, and recipients first");
      return;
    }
    setSendError(null);
    try {
      const dry = await sendMutation({ ...payloadBase, dryRun: true }).unwrap();
      setPreview(dry?.data || null);
      setConfirmOpen(true);
    } catch (err) {
      const message = err?.data?.message || err?.error || "Dry run failed";
      setSendError(message);
      showError(message);
    }
  };

  const onConfirmSend = async () => {
    if (sending) return;
    setSendError(null);
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
      const message = err?.data?.message || err?.error || "Send failed";
      setSendError(message);
      showError(message);
    }
  };

  const busy = previewing || sending;

  return (
    <div className={styles.page}>
      <PageHeader
        title="Send Notifications"
        description="Compose a push and watch the lock-screen and in-app cards update as you type. Delivery still goes through FCM to devices with an active token."
      />

      <Notice>
        Use <strong>Preview audience</strong> to refresh targeted counts. Broadcast
        to many users requires an extra confirmation.
      </Notice>

      <div className={styles.layout}>
        <div className={`${styles.panel} ${styles.form}`}>
          <Field label="Audience">
            <Select
              value={audience}
              onChange={onAudienceChange}
              options={AUDIENCES}
              aria-label="Audience"
            />
          </Field>

          <Field label="Target">
            <Select
              value={mode}
              onChange={onModeChange}
              options={TARGETS}
              aria-label="Target"
            />
          </Field>

          {mode === "specific" && (
            <Field
              label="Search by name, email, phone, or user ID"
              hint="Select one or more recipients from the audience above"
            >
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search recipients"
                aria-label="Search recipients"
              />
              {searching ? (
                <span className="jd-field__hint">Searching…</span>
              ) : null}
              {mode === "specific" &&
              searchInput.trim() &&
              !searching &&
              options.length === 0 ? (
                <span className="jd-field__hint">No matches</span>
              ) : null}
              {options.length > 0 ? (
                <div className={styles.searchHits}>
                  {options.map((option) => {
                    const on = selectedUsers.some((user) => user.id === option.id);
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setSelectedUsers((prev) =>
                            prev.some((user) => user.id === option.id)
                              ? prev
                              : [...prev, option]
                          );
                        }}
                        className={`${styles.searchHit}${on ? ` ${styles.searchHitOn}` : ""}`}
                      >
                        {recipientLabel(option)}
                      </button>
                    );
                  })}
                </div>
              ) : null}
              {selectedUsers.length > 0 ? (
                <div className={styles.chips}>
                  {selectedUsers.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() =>
                        setSelectedUsers((prev) =>
                          prev.filter((item) => item.id !== user.id)
                        )
                      }
                      className={styles.chipBtn}
                      aria-label={`Remove ${user.name}`}
                    >
                      <Badge tone="brand">{`${user.name} (#${user.id})`} ×</Badge>
                    </button>
                  ))}
                </div>
              ) : null}
            </Field>
          )}

          <Field label="Title" hint={`${title.length}/120`}>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="Notification title"
              aria-label="Notification title"
            />
          </Field>

          <Field label="Description / body" hint={`${body.length}/500`}>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={500}
              rows={4}
              placeholder="Notification body"
              aria-label="Notification body"
            />
          </Field>

          {previewError ? <Notice tone="danger">{previewError}</Notice> : null}
          {sendError ? <Notice tone="danger">{sendError}</Notice> : null}

          <div className={styles.actions}>
            <Button
              variant="secondary"
              disabled={!canPreview || busy}
              onClick={() => runPreview(false)}
            >
              {previewing ? "Previewing…" : "Preview audience"}
            </Button>
            <Button disabled={!canPreview || busy} onClick={onSendClick}>
              {sending ? "Sending…" : "Send notification"}
            </Button>
          </div>
        </div>

        <aside className={`${styles.panel} ${styles.previewCol}`}>
          <div className={styles.previewHead}>
            <h2 className={styles.previewTitle}>Live device preview</h2>
            {preview ? (
              <div className={styles.counts}>
                <Badge>Targeted: {preview.targetedUsers ?? 0}</Badge>
                <Badge tone="success">With tokens: {preview.usersWithTokens ?? 0}</Badge>
                <Badge tone="warning">No token: {preview.usersWithoutTokens ?? 0}</Badge>
                <Badge>Devices: {preview.tokenCount ?? 0}</Badge>
                <Badge>Mode: {preview.mode || mode}</Badge>
              </div>
            ) : (
              <p className="jd-field__hint" style={{ margin: 0 }}>
                {previewing
                  ? "Loading audience counts…"
                  : "Audience counts appear here after a preview."}
              </p>
            )}
          </div>

          <NotificationDevicePreview title={title} body={body} />
        </aside>
      </div>

      {lastResult && !lastResult.dryRun && (
        <div className={styles.panel}>
          <h2 className={styles.resultTitle}>Last send result</h2>
          <div className={styles.counts}>
            <Badge tone="success">
              Delivered users: {lastResult.usersDelivered ?? 0}
            </Badge>
            <Badge tone="warning">No token: {lastResult.usersNoToken ?? 0}</Badge>
            <Badge tone="danger">Failed: {lastResult.usersFailed ?? 0}</Badge>
            <Badge>Device OK: {lastResult.deviceSuccessCount ?? 0}</Badge>
            <Badge>{lastResult.durationMs ?? 0} ms</Badge>
          </div>
        </div>
      )}

      <Modal
        open={confirmOpen}
        onClose={() => !sending && setConfirmOpen(false)}
        title="Confirm push notification"
        description="You are about to send:"
        secondaryLabel="Cancel"
        primaryLabel={sending ? "Sending…" : "Confirm & send"}
        primaryDisabled={sending}
        secondaryDisabled={sending}
        onPrimary={() => {
          if (sending) return;
          onConfirmSend();
        }}
      >
        <div style={{ display: "grid", gap: 12 }}>
          <strong style={{ fontSize: 16 }}>{title}</strong>
          <p className="jd-field__hint" style={{ margin: 0 }}>
            {body}
          </p>
          <div className={styles.counts}>
            <Badge>Audience: {audience}</Badge>
            <Badge>Mode: {mode}</Badge>
            <Badge tone="brand">Users: {preview?.targetedUsers ?? "?"}</Badge>
            <Badge tone="success">
              With tokens: {preview?.usersWithTokens ?? "?"}
            </Badge>
          </div>
          {sendError ? <Notice tone="danger">{sendError}</Notice> : null}
          {mode === "broadcast" && (preview?.targetedUsers || 0) > 1 && (
            <Notice tone="warning">
              This is a broadcast to multiple users. Only continue if the
              preview counts look correct.
            </Notice>
          )}
        </div>
      </Modal>
    </div>
  );
}
