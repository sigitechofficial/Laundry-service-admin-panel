/**
 * Star SP700 / SP742 Ethernet printer for a shop.
 * The API cannot reach a shop LAN, so prints run on the shop's agent app,
 * which shares these settings with every device of the shop.
 */
import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Field, Input, Select } from "../../design-system";
import { Toggle } from "../misc-kit";
import useToaster from "../../components/ui/Toaster";
import usePrintJobTracker, {
  describePrintJobOutcome,
  printJobProgressLabel,
} from "../../hooks/usePrintJobTracker";
import {
  useGetShopPrinterQuery,
  useLazyGetShopPrintJobQuery,
  usePutShopPrinterMutation,
  useTestShopPrinterMutation,
} from "../../store/services/api";

const CARD = {
  padding: 16,
  border: "1px solid #e6e9f0",
  borderRadius: 16,
  background: "#fff",
  boxShadow: "0 1px 2px rgba(16, 21, 31, 0.04)",
};

const HINT = {
  margin: "4px 0 0",
  fontSize: 13,
  color: "var(--muted)",
  lineHeight: 1.5,
};

const emptyForm = {
  enabled: false,
  ipAddress: "",
  port: "9100",
  paperWidthMm: "76",
  partialCut: true,
  shopDisplayName: "",
};

export default function ShopPrinterSettingsCard({ shopUserId }) {
  const toaster = useToaster();
  const skip = !shopUserId;
  const { data, isLoading, isError } = useGetShopPrinterQuery(shopUserId, { skip });
  const [putPrinter, { isLoading: isSaving }] = usePutShopPrinterMutation();
  const [testPrinter, { isLoading: isTesting }] = useTestShopPrinterMutation();
  const [fetchJob] = useLazyGetShopPrintJobQuery();
  const [form, setForm] = useState(emptyForm);

  const fetchLatestJob = useCallback(
    (jobId) =>
      fetchJob({ shopId: shopUserId, jobId })
        .unwrap()
        .then((res) => res?.data?.job),
    [fetchJob, shopUserId]
  );
  const { job, tracking, track } = usePrintJobTracker(fetchLatestJob);

  const saved = data?.data?.printer;

  useEffect(() => {
    if (!saved) return;
    setForm({
      enabled: !!saved.enabled,
      ipAddress: saved.ipAddress || "",
      port: String(saved.port || 9100),
      paperWidthMm: String(saved.paperWidthMm === 58 ? 58 : 76),
      partialCut: saved.partialCut !== false,
      shopDisplayName: saved.shopDisplayName || "",
    });
  }, [saved]);

  const setField = (key) => (e) => {
    const value = e?.target ? e.target.value : e;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!shopUserId) return;
    try {
      await putPrinter({
        shopId: shopUserId,
        body: {
          enabled: !!form.enabled,
          ipAddress: String(form.ipAddress || "").trim(),
          port: Number(form.port) || 9100,
          paperWidthMm: Number(form.paperWidthMm) === 58 ? 58 : 76,
          partialCut: form.partialCut !== false,
          shopDisplayName: String(form.shopDisplayName || "").trim(),
        },
      }).unwrap();
      toaster.success("Shop printer saved. The shop app picks it up automatically.");
    } catch (err) {
      toaster.error(err?.data?.message || "Failed to save printer settings");
    }
  };

  const handleTest = async () => {
    if (!shopUserId) return;
    try {
      const res = await testPrinter(shopUserId).unwrap();
      const finalJob = await track(res?.data?.job);
      const outcome = describePrintJobOutcome(finalJob);
      toaster[outcome.tone](outcome.message);
    } catch (err) {
      toaster.error(err?.data?.message || "Could not send the test print");
    }
  };

  if (skip) return null;

  const busy = isTesting || tracking;
  const progress = tracking ? printJobProgressLabel(job) : "";

  return (
    <div style={CARD}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <strong>Star receipt printer</strong>
        {saved?.configured ? (
          <Badge tone="success">Configured</Badge>
        ) : (
          <Badge tone="neutral">Not set up</Badge>
        )}
      </div>
      <p style={HINT}>
        SP700 / SP742 Ethernet (TCP 9100). Prints run on the shop&apos;s agent app,
        so keep it open on the same Wi‑Fi as the printer. These settings are shared
        with every device of the shop.
      </p>

      {isLoading ? (
        <p style={{ ...HINT, marginTop: 12 }}>Loading printer settings…</p>
      ) : null}
      {isError ? (
        <p style={{ ...HINT, marginTop: 12, color: "var(--danger)" }}>
          Could not load printer settings.
        </p>
      ) : null}

      <div
        style={{
          marginTop: 16,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div>
            <div>Enabled</div>
            <p style={HINT}>Allow print jobs to this printer</p>
          </div>
          <Toggle
            checked={!!form.enabled}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, enabled: e.target.checked }))
            }
            label="Enable Star printer"
          />
        </div>

        <Field label="Printer IP (on the shop network)" htmlFor="shop-printer-ip">
          <Input
            id="shop-printer-ip"
            value={form.ipAddress}
            onChange={setField("ipAddress")}
            placeholder="192.168.1.50"
            autoComplete="off"
          />
        </Field>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          <Field label="Port" htmlFor="shop-printer-port">
            <Input
              id="shop-printer-port"
              value={form.port}
              onChange={setField("port")}
              placeholder="9100"
              inputMode="numeric"
            />
          </Field>
          <Field label="Paper width">
            <Select
              aria-label="Paper width"
              value={form.paperWidthMm}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, paperWidthMm: String(value) }))
              }
              options={[
                { value: "76", label: "76mm (SP742)" },
                { value: "58", label: "58mm" },
              ]}
            />
          </Field>
        </div>

        <Field label="Receipt header name (optional)" htmlFor="shop-printer-name">
          <Input
            id="shop-printer-name"
            value={form.shopDisplayName}
            onChange={setField("shopDisplayName")}
            placeholder="Shop display name on receipt"
          />
        </Field>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div>
            <div>Partial cut between tags</div>
            <p style={HINT}>Each garment tag tears separately</p>
          </div>
          <Toggle
            checked={form.partialCut !== false}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, partialCut: e.target.checked }))
            }
            label="Partial cut between tags"
          />
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving…" : "Save printer"}
          </Button>
          <Button
            variant="secondary"
            onClick={handleTest}
            disabled={busy || !saved?.configured}
          >
            {busy ? "Testing…" : "Send test print"}
          </Button>
        </div>
        {progress ? <p style={HINT}>{progress}</p> : null}
        {!saved?.configured && !isLoading ? (
          <p style={HINT}>Save an enabled printer with an IP to send a test print.</p>
        ) : null}
      </div>
    </div>
  );
}
