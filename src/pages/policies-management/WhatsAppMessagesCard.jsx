import { useEffect, useMemo, useState } from "react";
import { Badge, Button } from "../../design-system";
import { Notice, Toggle } from "../misc-kit";
import { DirectoryFormCard } from "../directory-table/directoryTable";
import useToaster from "../../components/ui/Toaster";
import { formatDate, DATE_TIME_FORMAT } from "../../utilities/formatters";
import { useGetWhatsAppStatusQuery, useUpdateRuntimeSettingsMutation } from "../../store/services/api";

const STATUS_TONE = {
  read: "success",
  delivered: "success",
  sent: "brand",
  queued: "neutral",
  accepted: "neutral",
  sending: "neutral",
  failed: "danger",
  undelivered: "danger",
};

const muted = { fontSize: 13, color: "var(--muted, #6b7280)", margin: 0 };
const line = { borderTop: "1px solid var(--line, #e6e9f0)" };

/**
 * Automatic WhatsApp messages to customers (Twilio + Meta-approved templates):
 * master switch, one switch per message, what is set up on the server, the
 * template text to submit to Meta, and the latest messages sent.
 * Saves only its own settings.
 */
export default function WhatsAppMessagesCard({ settings }) {
  const { success, error: showError } = useToaster();
  const { data, isLoading, isError, refetch } = useGetWhatsAppStatusQuery();
  const [updateSettings, { isLoading: saving }] = useUpdateRuntimeSettingsMutation();
  const info = useMemo(() => data?.data || {}, [data]);
  const events = useMemo(() => info.events || [], [info]);
  const recent = info.recent || [];

  const [master, setMaster] = useState(false);
  const [perEvent, setPerEvent] = useState({});
  const [showTexts, setShowTexts] = useState(false);

  useEffect(() => {
    setMaster(Boolean(settings?.whatsappEnabled?.value));
    const next = {};
    for (const e of events) next[e.settingKey] = settings?.[e.settingKey]?.value !== false;
    setPerEvent(next);
  }, [settings, events]);

  const ready = Boolean(info.twilioConfigured && info.senderConfigured);
  const templatesReady = events.filter((e) => e.templateConfigured).length;

  const save = async () => {
    try {
      await updateSettings({ whatsappEnabled: master, ...perEvent }).unwrap();
      success("WhatsApp settings saved.");
      refetch();
    } catch (err) {
      showError(err?.data?.message || "Could not save the WhatsApp settings");
    }
  };

  return (
    <DirectoryFormCard
      title="WhatsApp messages to customers"
      hint="Automatic WhatsApp updates through Twilio. Each message is a template approved by Meta. A customer who turned WhatsApp updates off in the app gets none, and the same message is never sent twice for one order."
    >
      {isLoading ? (
        <p style={muted}>Loading WhatsApp set-up…</p>
      ) : isError ? (
        <p style={muted}>Could not load the WhatsApp set-up.</p>
      ) : (
        <>
          <Notice tone={!ready ? "warning" : master ? "success" : "info"}>
            {!info.twilioConfigured
              ? "Twilio is not set up on the server (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN)."
              : !info.senderConfigured
                ? "No WhatsApp sender yet. Add the approved number as TWILIO_WHATSAPP_FROM in the server .env."
                : master
                  ? `WhatsApp messages are ON. ${templatesReady} of ${events.length} templates set up.`
                  : `WhatsApp messages are OFF. ${templatesReady} of ${events.length} templates set up.`}
          </Notice>

          <div style={{ marginTop: 12 }}>
            <Toggle checked={master} onChange={(e) => setMaster(e.target.checked)} label="Send WhatsApp messages" />
          </div>

          <div style={{ marginTop: 12, ...line }}>
            {events.map((e) => (
              <div
                key={e.event}
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  padding: "10px 0",
                  ...line,
                }}
              >
                <Toggle
                  checked={perEvent[e.settingKey] !== false}
                  disabled={!master}
                  onChange={(ev) => setPerEvent((p) => ({ ...p, [e.settingKey]: ev.target.checked }))}
                  label={e.label}
                />
                {e.templateConfigured ? (
                  <Badge tone="success">Template set up</Badge>
                ) : (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <Badge tone="warning">No template</Badge>
                    <code style={{ fontSize: 12 }}>{e.templateEnv}</code>
                  </span>
                )}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 8 }}>
            <button
              type="button"
              onClick={() => setShowTexts((v) => !v)}
              style={{ background: "none", border: 0, padding: 0, color: "var(--accent, #2c3ba0)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
            >
              {showTexts ? "Hide" : "Show"} template text to submit to Meta
            </button>
            {showTexts ? (
              <ol style={{ margin: "8px 0 0", paddingLeft: 18, display: "grid", gap: 8 }}>
                {events.map((e) => (
                  <li key={e.event} style={{ fontSize: 13 }}>
                    <strong>{e.label}</strong> <code style={{ fontSize: 12 }}>({e.templateEnv})</code>
                    <p style={{ margin: "2px 0 0", color: "var(--ink-2, #38424f)" }}>{e.text}</p>
                  </li>
                ))}
              </ol>
            ) : null}
          </div>

          <div style={{ marginTop: 14 }}>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save WhatsApp settings"}
            </Button>
          </div>

          <div style={{ marginTop: 16, paddingTop: 12, ...line }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>Latest messages ({recent.length})</div>
            {!recent.length ? (
              <p style={muted}>No WhatsApp messages sent yet.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ textAlign: "left", color: "var(--muted, #6b7280)" }}>
                      <th style={{ padding: "6px 8px 6px 0" }}>Order</th>
                      <th style={{ padding: "6px 8px" }}>Message</th>
                      <th style={{ padding: "6px 8px" }}>To</th>
                      <th style={{ padding: "6px 8px" }}>Status</th>
                      <th style={{ padding: "6px 0 6px 8px" }}>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((m) => (
                      <tr key={m.id} style={line}>
                        <td style={{ padding: "6px 8px 6px 0", whiteSpace: "nowrap" }}>#{m.orderTrackId || m.bookingId}</td>
                        <td style={{ padding: "6px 8px" }}>{m.label}</td>
                        <td style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>{m.toMasked || "—"}</td>
                        <td style={{ padding: "6px 8px" }}>
                          <Badge tone={STATUS_TONE[m.status] || "neutral"}>{m.status}</Badge>
                          {m.error ? <div style={{ ...muted, fontSize: 12, marginTop: 2 }}>{m.error}</div> : null}
                        </td>
                        <td style={{ padding: "6px 0 6px 8px", whiteSpace: "nowrap" }}>
                          {formatDate(m.sentAt || m.createdAt, DATE_TIME_FORMAT)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </DirectoryFormCard>
  );
}
