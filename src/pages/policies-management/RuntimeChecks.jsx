import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { BsCardList } from "../../shared/icons/index";
import ButtonBlue from "../../components/ui/ButtonBlue";
import useToaster from "../../components/ui/Toaster";
import {
  useGetRuntimeSettingsQuery,
  useUpdateRuntimeSettingsMutation,
} from "../../store/services/api";

const msToMinutes = (ms) => {
  const n = Number(ms);
  if (!Number.isFinite(n)) return "";
  return String(Math.round(n / 60000));
};

const msToSeconds = (ms) => {
  const n = Number(ms);
  if (!Number.isFinite(n)) return "";
  return String(Math.round(n / 1000));
};

const minutesToMs = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 60000);
};

const secondsToMs = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 1000);
};

export default function RuntimeChecks() {
  const { success, error: showError } = useToaster();
  const { data, isLoading, isError, refetch } = useGetRuntimeSettingsQuery();
  const [updateSettings, { isLoading: saving }] =
    useUpdateRuntimeSettingsMutation();

  const settings = data?.data?.settings || {};

  const [geofenceBypass, setGeofenceBypass] = useState(false);
  const [autoChargeEnabled, setAutoChargeEnabled] = useState(true);
  const [delayMinutes, setDelayMinutes] = useState("120");
  const [intervalSeconds, setIntervalSeconds] = useState("60");
  const [maxAttempts, setMaxAttempts] = useState("3");
  const [retryGapMinutes, setRetryGapMinutes] = useState("30");

  useEffect(() => {
    if (!settings.geofenceBypassEnabled) return;
    setGeofenceBypass(Boolean(settings.geofenceBypassEnabled.value));
    setAutoChargeEnabled(Boolean(settings.invoiceAutoChargeEnabled?.value));
    setDelayMinutes(msToMinutes(settings.invoiceAutoChargeDelayMs?.value));
    setIntervalSeconds(
      msToSeconds(settings.invoiceAutoChargeJobIntervalMs?.value)
    );
    setMaxAttempts(String(settings.invoiceAutoChargeMaxAttempts?.value ?? 3));
    setRetryGapMinutes(msToMinutes(settings.invoiceAutoChargeRetryGapMs?.value));
  }, [settings]);

  const envHints = useMemo(() => {
    const geoEnv = settings.geofenceBypassEnabled?.envValue;
    const chargeEnv = settings.invoiceAutoChargeEnabled?.envValue;
    return {
      geofence: geoEnv == null ? "not set in .env" : String(geoEnv),
      invoice: chargeEnv == null ? "not set in .env (defaults on)" : String(chargeEnv),
    };
  }, [settings]);

  const handleSave = async () => {
    const delayMs = minutesToMs(delayMinutes);
    const intervalMs = secondsToMs(intervalSeconds);
    const retryGapMs = minutesToMs(retryGapMinutes);
    const attempts = Number(maxAttempts);

    if (delayMs == null || intervalMs == null || retryGapMs == null) {
      showError("Delay, interval, and retry gap must be valid numbers");
      return;
    }
    if (!Number.isInteger(attempts) || attempts < 1) {
      showError("Max attempts must be a whole number of at least 1");
      return;
    }

    try {
      await updateSettings({
        geofenceBypassEnabled: geofenceBypass,
        invoiceAutoChargeEnabled: autoChargeEnabled,
        invoiceAutoChargeDelayMs: delayMs,
        invoiceAutoChargeJobIntervalMs: intervalMs,
        invoiceAutoChargeMaxAttempts: attempts,
        invoiceAutoChargeRetryGapMs: retryGapMs,
      }).unwrap();
      success("Runtime checks saved. They apply without a server restart.");
      refetch();
    } catch (err) {
      showError(err?.data?.message || "Failed to save runtime checks");
    }
  };

  return (
    <Box>
      <Box className="flex items-center gap-x-5" sx={{ mb: "28px" }}>
        <Typography color="blue.50">
          <BsCardList size="24px" color="blue.50" />
        </Typography>
        <Box>
          <Typography variant="h4" fontFamily="Switzer" color="grey.20">
            Runtime checks
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: "grey.80", fontFamily: "Switzer", mt: 0.5 }}
          >
            Geofence bypass and invoice auto-charge used to live only in
            server .env. These values are stored in the database and take
            effect immediately.
          </Typography>
        </Box>
      </Box>

      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : isError ? (
        <Alert severity="error">Could not load runtime settings.</Alert>
      ) : (
        <Stack spacing={3} sx={{ maxWidth: 720 }}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" fontFamily="Switzer" sx={{ mb: 1 }}>
                Driver geofence
              </Typography>
              <Alert severity={geofenceBypass ? "warning" : "info"} sx={{ mb: 2 }}>
                {geofenceBypass
                  ? "Bypass is ON. Agents can mark Arrived / Failed from anywhere. Turn this off on production."
                  : "Bypass is OFF. Agents must be inside the arrival radius."}
              </Alert>
              <FormControlLabel
                control={
                  <Switch
                    checked={geofenceBypass}
                    onChange={(e) => setGeofenceBypass(e.target.checked)}
                  />
                }
                label="Bypass geofence distance check"
              />
              <Typography variant="caption" display="block" sx={{ color: "grey.80", mt: 1 }}>
                Env fallback ({settings.geofenceBypassEnabled?.envKey}): {envHints.geofence}
              </Typography>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" fontFamily="Switzer" sx={{ mb: 1 }}>
                Invoice auto-charge
              </Typography>
              <Typography variant="body2" sx={{ color: "grey.80", mb: 2 }}>
                After the shop finalizes an invoice, the worker charges the
                remaining card balance. Changing delay does not rewrite
                bookings already scheduled.
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={autoChargeEnabled}
                    onChange={(e) => setAutoChargeEnabled(e.target.checked)}
                  />
                }
                label="Enable invoice auto-charge"
              />
              <Typography variant="caption" display="block" sx={{ color: "grey.80", mb: 2 }}>
                Env fallback ({settings.invoiceAutoChargeEnabled?.envKey}): {envHints.invoice}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Stack spacing={2}>
                <TextField
                  label="Delay after finalize (minutes)"
                  type="number"
                  value={delayMinutes}
                  onChange={(e) => setDelayMinutes(e.target.value)}
                  inputProps={{ min: 0 }}
                  helperText="First charge wait. Local/QA often uses 2 minutes; production default is 120."
                />
                <TextField
                  label="Worker poll interval (seconds)"
                  type="number"
                  value={intervalSeconds}
                  onChange={(e) => setIntervalSeconds(e.target.value)}
                  inputProps={{ min: 10 }}
                  helperText="How often the worker looks for due charges. Minimum 10 seconds."
                />
                <TextField
                  label="Max scheduled attempts"
                  type="number"
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(e.target.value)}
                  inputProps={{ min: 1, max: 10 }}
                />
                <TextField
                  label="Retry gap (minutes)"
                  type="number"
                  value={retryGapMinutes}
                  onChange={(e) => setRetryGapMinutes(e.target.value)}
                  inputProps={{ min: 0 }}
                  helperText="Wait between recoverable card declines."
                />
              </Stack>
            </CardContent>
          </Card>

          <Box>
            <ButtonBlue
              text={saving ? "Saving…" : "Save runtime checks"}
              onClick={handleSave}
              disabled={saving}
              isLoading={saving}
            />
          </Box>
        </Stack>
      )}
    </Box>
  );
}
