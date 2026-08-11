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
} from "../../store/services/api";

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

  const serverAlerts = data?.data?.alerts || [];
  const [localPrefs, setLocalPrefs] = useState({});
  const [dirty, setDirty] = useState(false);

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
        Choose which operational alerts you receive as push notifications. Disabled alerts
        still appear in the admin panel — only push is suppressed.
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        High-priority alerts (late pickup/delivery, payment failures, failed attempts) are
        enabled by default so you can plan capacity and resolve issues quickly.
      </Alert>

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
                  }}
                >
                  <Box flex={1}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      <Typography variant="body1" fontWeight={500}>
                        {item.label}
                      </Typography>
                      {item.priority === "high" && (
                        <Chip label="High priority" size="small" color="warning" variant="outlined" />
                      )}
                    </Stack>
                    <Typography variant="body2" color="text.secondary" mt={0.25}>
                      {item.description}
                    </Typography>
                  </Box>
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
                    sx={{ m: 0, flexShrink: 0 }}
                  />
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
