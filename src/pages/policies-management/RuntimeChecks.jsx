import { useEffect, useMemo, useState } from "react";
import { Button, Field, Input, PageHeader } from "../../design-system";
import { Notice, Toggle } from "../misc-kit";
import { DirectoryError, DirectoryFormCard, PageLoading } from "../directory-table/directoryTable";
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
  const [updateSettings, { isLoading: saving }] = useUpdateRuntimeSettingsMutation();

  const settings = useMemo(
    () => data?.data?.settings || {},
    [data?.data?.settings]
  );

  const [geofenceBypass, setGeofenceBypass] = useState(false);
  const [autoChargeEnabled, setAutoChargeEnabled] = useState(true);
  const [delayMinutes, setDelayMinutes] = useState("120");
  const [intervalSeconds, setIntervalSeconds] = useState("60");
  const [maxAttempts, setMaxAttempts] = useState("3");
  const [retryGapMinutes, setRetryGapMinutes] = useState("30");

  useEffect(() => {
    const next = data?.data?.settings;
    if (!next || typeof next !== "object") return;
    if (next.geofenceBypassEnabled) {
      setGeofenceBypass(Boolean(next.geofenceBypassEnabled.value));
    }
    if (next.invoiceAutoChargeEnabled) {
      setAutoChargeEnabled(Boolean(next.invoiceAutoChargeEnabled.value));
    }
    if (next.invoiceAutoChargeDelayMs) {
      setDelayMinutes(msToMinutes(next.invoiceAutoChargeDelayMs.value));
    }
    if (next.invoiceAutoChargeJobIntervalMs) {
      setIntervalSeconds(msToSeconds(next.invoiceAutoChargeJobIntervalMs.value));
    }
    if (next.invoiceAutoChargeMaxAttempts) {
      setMaxAttempts(String(next.invoiceAutoChargeMaxAttempts.value ?? 3));
    }
    if (next.invoiceAutoChargeRetryGapMs) {
      setRetryGapMinutes(msToMinutes(next.invoiceAutoChargeRetryGapMs.value));
    }
  }, [data]);

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
    <div style={{ display: "grid", gap: 20, maxWidth: 720 }}>
      <PageHeader
        title="Runtime checks"
        description="Geofence bypass and invoice auto-charge used to live only in server .env. These values are stored in the database and take effect immediately."
      />

      {isLoading ? (
        <PageLoading label="Loading runtime settings…" />
      ) : isError ? (
        <DirectoryError>Could not load runtime settings.</DirectoryError>
      ) : (
        <>
          <DirectoryFormCard title="Driver geofence">
            <Notice tone={geofenceBypass ? "warning" : "info"}>
              {geofenceBypass
                ? "Bypass is ON. Agents can mark Arrived / Failed from anywhere. Turn this off on production."
                : "Bypass is OFF. Agents must be inside the arrival radius."}
            </Notice>
            <div style={{ marginTop: 12 }}>
              <Toggle
                checked={geofenceBypass}
                onChange={(e) => setGeofenceBypass(e.target.checked)}
                label="Bypass geofence distance check"
              />
            </div>
            <p className="jd-field__hint" style={{ margin: "8px 0 0" }}>
              Env fallback ({settings.geofenceBypassEnabled?.envKey}): {envHints.geofence}
            </p>
          </DirectoryFormCard>

          <DirectoryFormCard
            title="Invoice auto-charge"
            hint="After the shop finalizes an invoice, the worker charges the remaining card balance. Changing delay does not rewrite bookings already scheduled."
          >
            <Toggle
              checked={autoChargeEnabled}
              onChange={(e) => setAutoChargeEnabled(e.target.checked)}
              label="Enable invoice auto-charge"
            />
            <p className="jd-field__hint" style={{ margin: "8px 0 16px" }}>
              Env fallback ({settings.invoiceAutoChargeEnabled?.envKey}): {envHints.invoice}
            </p>
            <div style={{ display: "grid", gap: 12 }}>
              <Field
                label="Delay after finalize (minutes)"
                htmlFor="rc-delay"
                hint="First charge wait. Local/QA often uses 2 minutes; production default is 120."
              >
                <Input
                  id="rc-delay"
                  type="number"
                  min={0}
                  value={delayMinutes}
                  onChange={(e) => setDelayMinutes(e.target.value)}
                />
              </Field>
              <Field
                label="Worker poll interval (seconds)"
                htmlFor="rc-interval"
                hint="How often the worker looks for due charges. Minimum 10 seconds."
              >
                <Input
                  id="rc-interval"
                  type="number"
                  min={10}
                  value={intervalSeconds}
                  onChange={(e) => setIntervalSeconds(e.target.value)}
                />
              </Field>
              <Field label="Max scheduled attempts" htmlFor="rc-attempts">
                <Input
                  id="rc-attempts"
                  type="number"
                  min={1}
                  max={10}
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(e.target.value)}
                />
              </Field>
              <Field
                label="Retry gap (minutes)"
                htmlFor="rc-retry"
                hint="Wait between recoverable card declines."
              >
                <Input
                  id="rc-retry"
                  type="number"
                  min={0}
                  value={retryGapMinutes}
                  onChange={(e) => setRetryGapMinutes(e.target.value)}
                />
              </Field>
            </div>
          </DirectoryFormCard>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save runtime checks"}
          </Button>
        </>
      )}
    </div>
  );
}
