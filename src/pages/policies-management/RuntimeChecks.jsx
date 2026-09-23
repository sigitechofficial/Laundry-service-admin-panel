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
  const [preferredShopEnabled, setPreferredShopEnabled] = useState(true);
  const [preferredShopWindowMinutes, setPreferredShopWindowMinutes] = useState("10");
  const [zoneCatalogOverlaysEnabled, setZoneCatalogOverlaysEnabled] = useState(false);
  const [recurringAutoCreate, setRecurringAutoCreate] = useState(true);
  const [recurringMaxFailures, setRecurringMaxFailures] = useState("3");
  const [recurringTestMode, setRecurringTestMode] = useState(false);
  const [recurringTestMinutes, setRecurringTestMinutes] = useState("3");

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
    if (next.preferredShopEnabled != null) {
      setPreferredShopEnabled(Boolean(next.preferredShopEnabled.value));
    }
    if (next.preferredShopWindowMinutes != null) {
      setPreferredShopWindowMinutes(String(next.preferredShopWindowMinutes.value ?? 10));
    }
    if (next.zoneCatalogOverridesEnabled != null) {
      setZoneCatalogOverlaysEnabled(Boolean(next.zoneCatalogOverridesEnabled.value));
    }
    if (next.recurringAutoCreateEnabled != null) {
      setRecurringAutoCreate(Boolean(next.recurringAutoCreateEnabled.value));
    }
    if (next.recurringMaxFailuresBeforePause != null) {
      setRecurringMaxFailures(String(next.recurringMaxFailuresBeforePause.value ?? 3));
    }
    if (next.recurringTestModeEnabled != null) {
      setRecurringTestMode(Boolean(next.recurringTestModeEnabled.value));
    }
    if (next.recurringTestIntervalMinutes != null) {
      setRecurringTestMinutes(String(next.recurringTestIntervalMinutes.value ?? 3));
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

    const windowMins = Number(preferredShopWindowMinutes);
    if (!Number.isInteger(windowMins) || windowMins < 1 || windowMins > 60) {
      showError("Preferred shop window must be between 1 and 60 minutes");
      return;
    }

    const recurringFailures = Number(recurringMaxFailures);
    if (!Number.isInteger(recurringFailures) || recurringFailures < 1 || recurringFailures > 10) {
      showError("Recurring max failures must be between 1 and 10");
      return;
    }

    const recurringMinutes = Number(recurringTestMinutes);
    if (recurringTestMode && (!Number.isInteger(recurringMinutes) || recurringMinutes < 1)) {
      showError("Recurring test interval must be a whole number of at least 1 minute");
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
        preferredShopEnabled,
        preferredShopWindowMinutes: windowMins,
        zoneCatalogOverridesEnabled: zoneCatalogOverlaysEnabled,
        recurringAutoCreateEnabled: recurringAutoCreate,
        recurringMaxFailuresBeforePause: recurringFailures,
        recurringTestModeEnabled: recurringTestMode,
        recurringTestIntervalMinutes: recurringMinutes,
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

          <DirectoryFormCard
            title="Preferred shop assignment"
            hint="When a returning customer places a new order, the shop that last completed a job for them gets a private head-start window. If they don't accept in time, the booking opens to all shops in the zone."
          >
            <Toggle
              checked={preferredShopEnabled}
              onChange={(e) => setPreferredShopEnabled(e.target.checked)}
              label="Send new bookings to preferred shop first"
            />
            {preferredShopEnabled && (
              <div style={{ marginTop: 16 }}>
                <Field
                  label="Head-start window (minutes)"
                  htmlFor="rc-preferred-window"
                  hint="How long the preferred shop has exclusive access before the booking broadcasts to all shops. Min 1, max 60."
                >
                  <Input
                    id="rc-preferred-window"
                    type="number"
                    min={1}
                    max={60}
                    value={preferredShopWindowMinutes}
                    onChange={(e) => setPreferredShopWindowMinutes(e.target.value)}
                    style={{ maxWidth: 120 }}
                  />
                </Field>
              </div>
            )}
          </DirectoryFormCard>

          <DirectoryFormCard
            title="Zone catalog overlays"
            hint="When on, each zone can have its own prices and hidden items. When off, every zone uses the master catalog."
          >
            <Notice tone={zoneCatalogOverlaysEnabled ? "warning" : "info"}>
              {zoneCatalogOverlaysEnabled
                ? "Overlays are ON. Customers and agents see zone prices. New charges use those prices."
                : "Overlays are OFF. Zone Catalog edits are saved but apps still show master prices."}
            </Notice>
            <div style={{ marginTop: 12 }}>
              <Toggle
                checked={zoneCatalogOverlaysEnabled}
                onChange={(e) => setZoneCatalogOverlaysEnabled(e.target.checked)}
                label="Zone catalog overlays"
              />
            </div>
            <p className="jd-field__hint" style={{ margin: "8px 0 0" }}>
              Env fallback ({settings.zoneCatalogOverridesEnabled?.envKey || "ZONE_CATALOG_OVERRIDES"}):{" "}
              {settings.zoneCatalogOverridesEnabled?.envValue == null
                ? "not set in .env (defaults off)"
                : String(settings.zoneCatalogOverridesEnabled.envValue)}
            </p>
          </DirectoryFormCard>

          <DirectoryFormCard
            title="Recurring orders"
            hint="Recurring bookings (Weekly / Every two weeks / Every four weeks) auto-generate the next order one interval AFTER the order date — not immediately after delivery. A background scheduler creates the next order when its time arrives."
          >
            <Toggle
              checked={recurringAutoCreate}
              onChange={(e) => setRecurringAutoCreate(e.target.checked)}
              label="Enable recurring auto-create"
            />
            <p className="jd-field__hint" style={{ margin: "8px 0 16px" }}>
              Env fallback ({settings.recurringAutoCreateEnabled?.envKey || "RECURRING_AUTO_CREATE_ENABLED"}):{" "}
              {settings.recurringAutoCreateEnabled?.envValue == null
                ? "not set in .env (defaults on)"
                : String(settings.recurringAutoCreateEnabled.envValue)}
            </p>

            <div style={{ display: "grid", gap: 12 }}>
              <Field
                label="Max generation failures before pause"
                htmlFor="rc-recurring-failures"
                hint="Auto-pause a recurring plan after this many consecutive generation failures. Min 1, max 10."
              >
                <Input
                  id="rc-recurring-failures"
                  type="number"
                  min={1}
                  max={10}
                  value={recurringMaxFailures}
                  onChange={(e) => setRecurringMaxFailures(e.target.value)}
                  style={{ maxWidth: 120 }}
                />
              </Field>
            </div>

            <div style={{ marginTop: 16 }}>
              <Notice tone={recurringTestMode ? "warning" : "info"}>
                {recurringTestMode
                  ? `TEST MODE ON. Every recurring order regenerates after ${recurringTestMinutes || "?"} minute(s) instead of its real weekly/2-weekly/4-weekly cadence. Turn OFF on production.`
                  : "Test mode is OFF. Recurring orders use their real cadence (Weekly = 7 days, etc.)."}
              </Notice>
              <div style={{ marginTop: 12 }}>
                <Toggle
                  checked={recurringTestMode}
                  onChange={(e) => setRecurringTestMode(e.target.checked)}
                  label="Enable recurring test mode (compress interval to minutes)"
                />
              </div>
              {recurringTestMode && (
                <div style={{ marginTop: 16 }}>
                  <Field
                    label="Test interval (minutes)"
                    htmlFor="rc-recurring-test-minutes"
                    hint="e.g. 3 = the next recurring order is generated 3 minutes after the previous one, so the whole cycle can be verified without waiting days."
                  >
                    <Input
                      id="rc-recurring-test-minutes"
                      type="number"
                      min={1}
                      value={recurringTestMinutes}
                      onChange={(e) => setRecurringTestMinutes(e.target.value)}
                      style={{ maxWidth: 120 }}
                    />
                  </Field>
                </div>
              )}
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
