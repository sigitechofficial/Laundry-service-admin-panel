import { useEffect, useMemo, useState } from "react";
import { Badge, Button, PageHeader } from "../../design-system";
import {
  DirectoryError,
  DirectoryFormCard,
  PageLoading,
} from "../directory-table/directoryTable";
import useToaster from "../../components/ui/Toaster";
import {
  useGetAdminNotificationPreferencesQuery,
  useUpdateAdminNotificationPreferencesMutation,
  useDemoAdminNotificationAlertMutation,
  useRegisterAdminFcmTokenMutation,
} from "../../store/services/api";
import { requestDeviceToken } from "../../utilities/requestFCMToken";
import { ensureAdminFcmRegistered } from "../../utilities/adminWebNotifications";

const CATEGORY_LABELS = {
  pickup: "Pickup",
  delivery: "Delivery",
  payment: "Payment",
  orders: "Orders",
  operations: "Operations",
};

const CATEGORY_ORDER = ["pickup", "delivery", "payment", "orders", "operations"];

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

function Toggle({ checked, onChange, label }) {
  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        cursor: "pointer",
        userSelect: "none",
        margin: 0,
        position: "relative",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          border: 0,
        }}
      />
      <span
        aria-hidden
        style={{
          width: 40,
          height: 22,
          borderRadius: 999,
          background: checked ? "var(--accent)" : "var(--n-300)",
          position: "relative",
          flexShrink: 0,
          transition: "background var(--dur) var(--ease)",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: checked ? 20 : 2,
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "#fff",
            transition: "left var(--dur) var(--ease)",
            boxShadow: "var(--e-1)",
          }}
        />
      </span>
      {label}
    </label>
  );
}

export default function AdminNotificationSettingsPage() {
  const { success, error: showError } = useToaster();
  const { data, isLoading, isError, refetch } = useGetAdminNotificationPreferencesQuery();
  const [updatePrefs, { isLoading: saving }] = useUpdateAdminNotificationPreferencesMutation();
  const [demoAlert, { isLoading: demoing }] = useDemoAdminNotificationAlertMutation();
  const [registerFcm, { isLoading: registeringFcm }] = useRegisterAdminFcmTokenMutation();

  const serverAlerts = useMemo(() => data?.data?.alerts || [], [data?.data?.alerts]);
  const [localPrefs, setLocalPrefs] = useState({});
  const [dirty, setDirty] = useState(false);
  const [forceDemo, setForceDemo] = useState(false);
  const [demoingType, setDemoingType] = useState(null);
  const [lastDemo, setLastDemo] = useState(null);
  const [fcmStatus, setFcmStatus] = useState(null);

  useEffect(() => {
    if (!serverAlerts.length) return;
    const next = {};
    for (const item of serverAlerts) {
      next[item.alertType] = Boolean(item.enabled);
    }
    setLocalPrefs(next);
    setDirty(false);
  }, [serverAlerts]);

  const grouped = useMemo(() => {
    const map = {};
    for (const item of serverAlerts) {
      const cat = item.category || "other";
      if (!map[cat]) map[cat] = [];
      map[cat].push(item);
    }
    return CATEGORY_ORDER.filter((c) => map[c]?.length).map((c) => ({
      key: c,
      label: CATEGORY_LABELS[c] || c,
      items: map[c],
    }));
  }, [serverAlerts]);

  const enabledTypes = useMemo(
    () => Object.entries(localPrefs).filter(([, on]) => on).map(([k]) => k),
    [localPrefs]
  );

  const handleToggle = (alertType) => {
    setLocalPrefs((prev) => ({
      ...prev,
      [alertType]: !prev[alertType],
    }));
    setDirty(true);
  };

  const handleSave = async () => {
    try {
      await updatePrefs({ preferences: localPrefs }).unwrap();
      success("Notification preferences saved");
      setDirty(false);
      refetch();
    } catch (err) {
      showError(err?.data?.message || "Failed to save preferences");
    }
  };

  const handleRefreshFcm = async () => {
    try {
      const token = await requestDeviceToken();
      if (!token || token.length < 80 || /^no-fcm/i.test(token)) {
        setFcmStatus("missing");
        showError(
          "Could not get an FCM token. Allow notifications, use HTTPS, then try again. Check Firebase env (VITE_FIREBASE_*)."
        );
        return;
      }
      const result = await ensureAdminFcmRegistered();
      if (!result?.ok) {
        // Fallback to explicit API if ensure used cached race
        await registerFcm({ dvToken: token }).unwrap();
      }
      setFcmStatus("ok");
      success("FCM token registered. Website notifications are ready — try Demo.");
    } catch (err) {
      setFcmStatus("error");
      showError(err?.data?.message || "Failed to register FCM token");
    }
  };

  const runDemo = async ({ alertType, alertTypes } = {}) => {
    if (dirty) {
      showError("Save your preference changes before running a demo");
      return;
    }
    const key = alertType || "all";
    setDemoingType(key);
    try {
      const res = await demoAlert({
        ...(alertType ? { alertType } : {}),
        ...(alertTypes ? { alertTypes } : {}),
        force: forceDemo,
      }).unwrap();
      const payload = res?.data || res;
      setLastDemo(payload);
      const sent = payload?.successCount ?? 0;
      const skipped = payload?.skippedCount ?? 0;
      const failed = payload?.failedCount ?? 0;
      if (sent > 0) {
        success(
          `Demo: ${sent} sent${skipped ? `, ${skipped} skipped (Off)` : ""}${
            failed ? `, ${failed} failed` : ""
          }. Check browser notifications.`
        );
      } else if (skipped > 0 && failed === 0) {
        showError(
          "Skipped — toggle is Off. Turn it On and Save, or enable Force demo."
        );
      } else {
        showError(
          "Demo push failed. Allow notifications in the browser and re-login to refresh FCM token."
        );
      }
    } catch (err) {
      showError(err?.data?.message || "Failed to send demo alert");
    } finally {
      setDemoingType(null);
    }
  };

  if (isLoading) {
    return <PageLoading label="Loading preferences…" />;
  }

  if (isError) {
    return (
      <DirectoryError>
        Could not load notification preferences. Please refresh and try again.
      </DirectoryError>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 960 }}>
      <PageHeader
        title="Admin Alert Notifications"
        description="Choose which operational alerts you receive as push notifications. Use Demo to verify each flag is working on this browser."
      />

      <Notice>
        High-priority alerts are On by default. Before demoing: allow browser notifications,
        stay logged in, then click Demo. Titles start with [DEMO] so you can tell them apart.
      </Notice>

      {(fcmStatus === "missing" || fcmStatus === "error") && (
        <Notice tone="warning">
          This browser does not have a valid FCM token yet. Allow notifications, then click{" "}
          <strong>Refresh FCM token</strong> before running a demo.
        </Notice>
      )}

      <DirectoryFormCard
        title="Demo run"
        hint="Sends a sample push only to you (does not create real orders)."
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <Button
            variant="secondary"
            disabled={registeringFcm}
            onClick={handleRefreshFcm}
          >
            {registeringFcm ? "Registering…" : "Refresh FCM token"}
          </Button>
          {fcmStatus === "ok" && <Badge tone="success">FCM ready</Badge>}
          {fcmStatus === "missing" && <Badge tone="danger">FCM missing</Badge>}
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "center",
          }}
        >
          <Toggle
            checked={forceDemo}
            onChange={(e) => setForceDemo(e.target.checked)}
            label="Force demo (even if toggle is Off)"
          />
          <Button
            variant="secondary"
            disabled={demoing || dirty || enabledTypes.length === 0}
            onClick={() => runDemo({ alertTypes: enabledTypes })}
          >
            {demoingType === "all" ? "Sending…" : `Demo all enabled (${enabledTypes.length})`}
          </Button>
          <Button
            variant="ghost"
            disabled={demoing || dirty}
            onClick={() => runDemo({})}
          >
            Demo every flag
          </Button>
        </div>
        {dirty && (
          <p className="jd-field__hint" style={{ margin: "10px 0 0", color: "var(--warning-700)" }}>
            Save preferences before running demos.
          </p>
        )}
        {lastDemo && (
          <div style={{ marginTop: 14 }}>
            <Notice tone={lastDemo.successCount > 0 ? "success" : "warning"}>
              Last demo: {lastDemo.successCount} sent · {lastDemo.skippedCount} skipped ·{" "}
              {lastDemo.failedCount} failed
            </Notice>
          </div>
        )}
      </DirectoryFormCard>

      {grouped.map(({ key, label, items }) => (
        <DirectoryFormCard key={key} title={label}>
          <div style={{ display: "grid", gap: 12 }}>
            {items.map((item) => (
              <div
                key={item.alertType}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                    <strong style={{ fontWeight: 600 }}>{item.label}</strong>
                    {item.priority === "high" && (
                      <Badge tone="warning">High priority</Badge>
                    )}
                  </div>
                  <p className="jd-field__hint" style={{ margin: "4px 0 0" }}>
                    {item.description}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={demoing || dirty}
                    onClick={() => runDemo({ alertType: item.alertType })}
                  >
                    {demoingType === item.alertType ? "…" : "Demo"}
                  </Button>
                  <Toggle
                    checked={Boolean(localPrefs[item.alertType])}
                    onChange={() => handleToggle(item.alertType)}
                    label={localPrefs[item.alertType] ? "On" : "Off"}
                  />
                </div>
              </div>
            ))}
          </div>
        </DirectoryFormCard>
      ))}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Button disabled={!dirty || saving} onClick={handleSave}>
          {saving ? "Saving…" : "Save preferences"}
        </Button>
      </div>
    </div>
  );
}
