import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import { MdNotificationsNone } from "../../shared/icons/index";
import useToaster from "../../components/ui/Toaster";
import {
  useGetAdminNotificationPreferencesQuery,
  useUpdateAdminNotificationPreferencesMutation,
  useDemoAdminNotificationAlertMutation,
  useRegisterAdminFcmTokenMutation,
} from "../../store/services/api";
import { requestDeviceToken } from "../../utilities/requestFCMToken";

const CATEGORY_LABELS = {
  pickup: "Pickup",
  delivery: "Delivery",
  payment: "Payment",
  orders: "Orders",
  operations: "Operations",
};

const CATEGORY_ORDER = ["pickup", "delivery", "payment", "orders", "operations"];

export default function AdminNotificationSettingsPage() {
  const { success, error: showError } = useToaster();
  const { data, isLoading, isError, refetch } = useGetAdminNotificationPreferencesQuery();
  const [updatePrefs, { isLoading: saving }] = useUpdateAdminNotificationPreferencesMutation();
  const [demoAlert, { isLoading: demoing }] = useDemoAdminNotificationAlertMutation();
  const [registerFcm, { isLoading: registeringFcm }] = useRegisterAdminFcmTokenMutation();

  const serverAlerts = data?.data?.alerts || [];
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
      await registerFcm({ dvToken: token }).unwrap();
      setFcmStatus("ok");
      success("FCM token registered. You can run Demo now.");
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
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={320}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Could not load notification preferences. Please refresh and try again.
      </Alert>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 960 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
        <MdNotificationsNone size={28} />
        <Typography variant="h5" fontWeight={600}>
          Admin Alert Notifications
        </Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Choose which operational alerts you receive as push notifications. Use Demo to
        verify each flag is working on this browser.
      </Typography>

      <Alert severity="info" sx={{ mb: 2 }}>
        High-priority alerts are On by default. Before demoing: allow browser notifications,
        stay logged in, then click Demo. Titles start with [DEMO] so you can tell them apart.
      </Alert>

      <Alert severity="warning" sx={{ mb: 2 }}>
        Your last demo failed because the server had placeholder token{" "}
        <code>no-fcm-token</code> (login without real FCM). Click{" "}
        <strong>Refresh FCM token</strong> below first, then Demo again.
      </Alert>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Demo run
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={1.5}>
            Sends a sample push only to you (does not create real orders).
          </Typography>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            alignItems={{ xs: "stretch", sm: "center" }}
            flexWrap="wrap"
            mb={1.5}
          >
            <Button
              variant="contained"
              color="secondary"
              disabled={registeringFcm}
              onClick={handleRefreshFcm}
            >
              {registeringFcm ? "Registering…" : "Refresh FCM token"}
            </Button>
            {fcmStatus === "ok" && (
              <Chip label="FCM ready" color="success" size="small" />
            )}
            {fcmStatus === "missing" && (
              <Chip label="FCM missing" color="error" size="small" />
            )}
          </Stack>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            alignItems={{ xs: "stretch", sm: "center" }}
            flexWrap="wrap"
          >
            <FormControlLabel
              control={
                <Switch
                  checked={forceDemo}
                  onChange={(e) => setForceDemo(e.target.checked)}
                  color="warning"
                />
              }
              label="Force demo (even if toggle is Off)"
            />
            <Button
              variant="outlined"
              disabled={demoing || dirty || enabledTypes.length === 0}
              onClick={() => runDemo({ alertTypes: enabledTypes })}
            >
              {demoingType === "all" ? "Sending…" : `Demo all enabled (${enabledTypes.length})`}
            </Button>
            <Button
              variant="outlined"
              color="warning"
              disabled={demoing || dirty}
              onClick={() => runDemo({})}
            >
              Demo every flag
            </Button>
          </Stack>
          {dirty && (
            <Typography variant="caption" color="warning.main" display="block" mt={1}>
              Save preferences before running demos.
            </Typography>
          )}
          {lastDemo && (
            <Alert
              severity={lastDemo.successCount > 0 ? "success" : "warning"}
              sx={{ mt: 2 }}
            >
              Last demo: {lastDemo.successCount} sent · {lastDemo.skippedCount} skipped ·{" "}
              {lastDemo.failedCount} failed
            </Alert>
          )}
        </CardContent>
      </Card>

      {grouped.map(({ key, label, items }) => (
        <Card key={key} variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              {label}
            </Typography>
            <Divider sx={{ mb: 1.5 }} />
            <Stack spacing={1}>
              {items.map((item) => (
                <Box
                  key={item.alertType}
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 2,
                    py: 0.5,
                    flexWrap: "wrap",
                  }}
                >
                  <Box flex={1} minWidth={200}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      <Typography variant="body1" fontWeight={500}>
                        {item.label}
                      </Typography>
                      {item.priority === "high" && (
                        <Chip
                          label="High priority"
                          size="small"
                          color="warning"
                          variant="outlined"
                        />
                      )}
                    </Stack>
                    <Typography variant="body2" color="text.secondary" mt={0.25}>
                      {item.description}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center" flexShrink={0}>
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={demoing || dirty}
                      onClick={() => runDemo({ alertType: item.alertType })}
                    >
                      {demoingType === item.alertType ? "…" : "Demo"}
                    </Button>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={Boolean(localPrefs[item.alertType])}
                          onChange={() => handleToggle(item.alertType)}
                          color="primary"
                        />
                      }
                      label={localPrefs[item.alertType] ? "On" : "Off"}
                      labelPlacement="start"
                      sx={{ m: 0 }}
                    />
                  </Stack>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      ))}

      <Stack direction="row" spacing={2} justifyContent="flex-end">
        <Button
          variant="contained"
          disabled={!dirty || saving}
          onClick={handleSave}
          startIcon={saving ? <CircularProgress size={18} color="inherit" /> : null}
        >
          {saving ? "Saving…" : "Save preferences"}
        </Button>
      </Stack>
    </Box>
  );
}
