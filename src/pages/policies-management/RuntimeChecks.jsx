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
  const [shopAcceptCapEnabled, setShopAcceptCapEnabled] = useState(false);
  const [shopAcceptWindowMinutes, setShopAcceptWindowMinutes] = useState("60");
  const [shopAcceptMaxOrders, setShopAcceptMaxOrders] = useState("4");
  const [zoneCatalogOverlaysEnabled, setZoneCatalogOverlaysEnabled] = useState(false);
  const [recurringAutoCreate, setRecurringAutoCreate] = useState(true);
  const [recurringMaxFailures, setRecurringMaxFailures] = useState("3");
  const [recurringTestMode, setRecurringTestMode] = useState(false);
  const [recurringTestMinutesWeekly, setRecurringTestMinutesWeekly] = useState("3");
  const [recurringTestMinutesEveryTwoWeeks, setRecurringTestMinutesEveryTwoWeeks] =
    useState("3");
  const [recurringTestMinutesEveryFourWeeks, setRecurringTestMinutesEveryFourWeeks] =
    useState("3");

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
    if (next.shopAcceptCapEnabled != null) {
      setShopAcceptCapEnabled(Boolean(next.shopAcceptCapEnabled.value));
    }
    if (next.shopAcceptWindowMinutes != null) {
      setShopAcceptWindowMinutes(String(next.shopAcceptWindowMinutes.value ?? 60));
    }
    if (next.shopAcceptMaxOrders != null) {
      setShopAcceptMaxOrders(String(next.shopAcceptMaxOrders.value ?? 4));
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
    // Prefer per-frequency values; fall back to the legacy shared interval so
    // older DB rows still populate the new fields on first load.
    const sharedFallback = String(next.recurringTestIntervalMinutes?.value ?? 3);
    setRecurringTestMinutesWeekly(
      String(next.recurringTestIntervalMinutesWeekly?.value ?? sharedFallback)
    );
    setRecurringTestMinutesEveryTwoWeeks(
      String(
        next.recurringTestIntervalMinutesEveryTwoWeeks?.value ?? sharedFallback
      )
    );
    setRecurringTestMinutesEveryFourWeeks(
      String(
        next.recurringTestIntervalMinutesEveryFourWeeks?.value ?? sharedFallback
      )
    );
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

    const acceptWindowMins = Number(shopAcceptWindowMinutes);
    const acceptMax = Number(shopAcceptMaxOrders);
    if (shopAcceptCapEnabled) {
      if (
        !Number.isInteger(acceptWindowMins) ||
        acceptWindowMins < 1 ||
        acceptWindowMins > 1440
      ) {
        showError("Accept capacity window must be between 1 and 1440 minutes");
        return;
      }
      if (!Number.isInteger(acceptMax) || acceptMax < 0 || acceptMax > 500) {
        showError("Max accepts per window must be between 0 and 500");
        return;
      }
    }

    const recurringFailures = Number(recurringMaxFailures);
    if (!Number.isInteger(recurringFailures) || recurringFailures < 1 || recurringFailures > 10) {
      showError("Recurring max failures must be between 1 and 10");
      return;
    }

    const parseTestMinutes = (raw, label) => {
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 1) {
        showError(`${label} test interval must be a whole number of at least 1 minute`);
        return null;
      }
      return n;
    };

    let weeklyMins = null;
    let twoWeekMins = null;
    let fourWeekMins = null;
    if (recurringTestMode) {
      weeklyMins = parseTestMinutes(recurringTestMinutesWeekly, "Weekly");
      if (weeklyMins == null) return;
      twoWeekMins = parseTestMinutes(
        recurringTestMinutesEveryTwoWeeks,
        "Every two weeks"
      );
      if (twoWeekMins == null) return;
      fourWeekMins = parseTestMinutes(
        recurringTestMinutesEveryFourWeeks,
        "Every four weeks"
      );
      if (fourWeekMins == null) return;
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
        shopAcceptCapEnabled,
        shopAcceptWindowMinutes: Number.isInteger(acceptWindowMins)
          ? acceptWindowMins
          : 60,
        shopAcceptMaxOrders: Number.isInteger(acceptMax) ? acceptMax : 4,
        zoneCatalogOverridesEnabled: zoneCatalogOverlaysEnabled,
        recurringAutoCreateEnabled: recurringAutoCreate,
        recurringMaxFailuresBeforePause: recurringFailures,
        recurringTestModeEnabled: recurringTestMode,
        ...(recurringTestMode
          ? {
              recurringTestIntervalMinutesWeekly: weeklyMins,
              recurringTestIntervalMinutesEveryTwoWeeks: twoWeekMins,
              recurringTestIntervalMinutesEveryFourWeeks: fourWeekMins,
              // Keep shared fallback in sync with Weekly so older readers stay sane.
              recurringTestIntervalMinutes: weeklyMins,
            }
          : {}),
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
            title="Shop accept capacity (all shops)"
            hint="Limit how many marketplace orders a shop can accept inside a rolling time window. Example: 4 orders per 60 minutes. 0 = no shop may accept via marketplace (admin can still assign). Shops over the limit are skipped so the order goes to others. Override per shop on Shop → Order routing."
          >
            <Toggle
              checked={shopAcceptCapEnabled}
              onChange={(e) => setShopAcceptCapEnabled(e.target.checked)}
              label="Enforce accept capacity for all shops"
            />
            {shopAcceptCapEnabled && (
              <div
                style={{
                  marginTop: 16,
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <Field
                  label="Window (minutes)"
                  htmlFor="rc-accept-window"
                  hint="Rolling lookback, e.g. 60 = last hour."
                >
                  <Input
                    id="rc-accept-window"
                    type="number"
                    min={1}
                    max={1440}
                    value={shopAcceptWindowMinutes}
                    onChange={(e) => setShopAcceptWindowMinutes(e.target.value)}
                  />
                </Field>
                <Field
                  label="Max accepts in window"
                  htmlFor="rc-accept-max"
                  hint="0 = nobody can accept via marketplace."
                >
                  <Input
                    id="rc-accept-max"
                    type="number"
                    min={0}
                    max={500}
                    value={shopAcceptMaxOrders}
                    onChange={(e) => setShopAcceptMaxOrders(e.target.value)}
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
                  ? `TEST MODE ON. Weekly → ${recurringTestMinutesWeekly || "?"} min · Every two weeks → ${recurringTestMinutesEveryTwoWeeks || "?"} min · Every four weeks → ${recurringTestMinutesEveryFourWeeks || "?"} min. Just Once never auto-generates. Turn OFF on production.`
                  : "Test mode is OFF. Recurring orders use their real cadence (Weekly = 7 days, Every two weeks = 14 days, Every four weeks = 28 days)."}
              </Notice>
              <div style={{ marginTop: 12 }}>
                <Toggle
                  checked={recurringTestMode}
                  onChange={(e) => setRecurringTestMode(e.target.checked)}
                  label="Enable recurring test mode (compress interval to minutes)"
                />
              </div>
              {recurringTestMode && (
                <div
                  style={{
                    marginTop: 16,
                    display: "grid",
                    gap: 14,
                    padding: 14,
                    borderRadius: "var(--r-md)",
                    border: "1px solid var(--line)",
                    background: "var(--canvas)",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12.5,
                      color: "var(--muted)",
                      lineHeight: 1.45,
                    }}
                  >
                    Set each customer-app frequency’s test interval in minutes.
                    Same value on all three = same behaviour as before; different
                    values = each cadence regenerates on its own clock.
                  </p>

                  <Field
                    label="Just Once"
                    htmlFor="rc-recurring-test-just-once"
                    hint="Just Once never auto-generates a next order — no test interval."
                  >
                    <Input
                      id="rc-recurring-test-just-once"
                      value="N/A — does not recur"
                      disabled
                      style={{ maxWidth: 220 }}
                    />
                  </Field>

                  <Field
                    label="Weekly (real = 7 days)"
                    htmlFor="rc-recurring-test-weekly"
                    hint="Minutes until the next Weekly order is generated in test mode."
                  >
                    <Input
                      id="rc-recurring-test-weekly"
                      type="number"
                      min={1}
                      value={recurringTestMinutesWeekly}
                      onChange={(e) => setRecurringTestMinutesWeekly(e.target.value)}
                      style={{ maxWidth: 120 }}
                    />
                  </Field>

                  <Field
                    label="Every two weeks (real = 14 days)"
                    htmlFor="rc-recurring-test-two-weeks"
                    hint="Minutes until the next Every-two-weeks order is generated in test mode."
                  >
                    <Input
                      id="rc-recurring-test-two-weeks"
                      type="number"
                      min={1}
                      value={recurringTestMinutesEveryTwoWeeks}
                      onChange={(e) =>
                        setRecurringTestMinutesEveryTwoWeeks(e.target.value)
                      }
                      style={{ maxWidth: 120 }}
                    />
                  </Field>

                  <Field
                    label="Every four weeks (real = 28 days)"
                    htmlFor="rc-recurring-test-four-weeks"
                    hint="Minutes until the next Every-four-weeks order is generated in test mode."
                  >
                    <Input
                      id="rc-recurring-test-four-weeks"
                      type="number"
                      min={1}
                      value={recurringTestMinutesEveryFourWeeks}
                      onChange={(e) =>
                        setRecurringTestMinutesEveryFourWeeks(e.target.value)
                      }
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
