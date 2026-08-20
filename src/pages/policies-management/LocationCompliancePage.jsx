import { useMemo, useState } from "react";
import { PageHeader, Table } from "../../design-system";
import {
  useGetComplianceEventsQuery,
  useGetGeofenceOverrideReportQuery,
} from "../../store/services/api";
import { Delay } from "../../components/shared/Loaders";
import { DATE_TIME_FORMAT, formatDate } from "../../utilities/formatters";
import {
  DirectoryClearButton,
  DirectoryDateInput,
  DirectoryDotPills,
  DirectoryIdentity,
  DirectoryMetric,
  DirectoryMetrics,
  DirectoryTableWrap,
  DirectoryToolbar,
  DirectoryToolbarEnd,
} from "../directory-table/directoryTable";
import { joinMeta } from "../directory-table/directoryTableUtils";

function unwrap(res) {
  return res?.data !== undefined ? res.data : res;
}

export default function LocationCompliancePage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const params = useMemo(() => {
    const p = {};
    if (from) p.from = from;
    if (to) p.to = to;
    return p;
  }, [from, to]);

  const { data: reportRaw, isLoading: loadingReport, isError: reportError } =
    useGetGeofenceOverrideReportQuery(params);
  const { data: eventsRaw, isLoading: loadingEvents, isError: eventsError } =
    useGetComplianceEventsQuery({
      ...params,
      overridesOnly: true,
      limit: 50,
    });

  const report = unwrap(reportRaw) || {};
  const summary = report.summary || {};
  const byActor = report.byActor || [];
  const events = unwrap(eventsRaw)?.rows || [];

  if (loadingReport && loadingEvents) return <Delay />;
  if (reportError || eventsError) {
    return (
      <p style={{ color: "var(--danger)", margin: 0 }}>
        Could not load location compliance
        {reportError && eventsError
          ? " (override report and events failed)."
          : reportError
            ? " (override report failed)."
            : " (events failed)."}
      </p>
    );
  }

  const actorColumns = [
    {
      key: "actor",
      header: "Driver",
      render: (row) => <DirectoryIdentity name={row.actor} meta={row.shop} />,
    },
    {
      key: "totalActions",
      header: "Actions",
      render: (row) => <DirectoryMetric value={row.totalActions} />,
    },
    {
      key: "overrideCount",
      header: "Overrides",
      render: (row) => (
        <DirectoryMetric value={row.overrideCount} hint={`${row.overrideRate ?? 0}%`} />
      ),
    },
  ];

  const actorRows = byActor.map((r, idx) => ({
    id: `${r.actorUserId}-${r.shopId}-${idx}`,
    actor: r.actorName || r.actorUserId || "—",
    shop: r.shopName || r.shopId || "—",
    totalActions: r.totalActions,
    overrideCount: r.overrideCount,
    overrideRate: r.overrideRate,
  }));

  const eventColumns = [
    {
      key: "booking",
      header: "Event",
      render: (row) => (
        <DirectoryIdentity
          name={row.booking}
          meta={joinMeta(row.action, row.when)}
        />
      ),
    },
    {
      key: "flags",
      header: "Flags",
      render: (row) => <DirectoryDotPills items={row.flags} />,
    },
    {
      key: "distance",
      header: "Distance",
      render: (row) => <DirectoryMetric value={row.distance} />,
    },
  ];

  const eventRows = events.map((ev) => {
    const flags = [
      ev.action ? { key: "action", label: ev.action, tone: "info" } : null,
      ev.failInstructionSetId
        ? { key: "fail", label: `Fail set v${ev.failInstructionSetVersion || "?"}`, tone: "info" }
        : null,
      Array.isArray(ev.acknowledgedItemSnapshot) && ev.acknowledgedItemSnapshot.length
        ? { key: "ack", label: `${ev.acknowledgedItemSnapshot.length} steps acked`, tone: "teal" }
        : null,
    ].filter(Boolean);
    return {
      id: ev.id,
      booking: ev.booking?.orderTrackId || ev.bookingId ? `#${ev.booking?.orderTrackId || ev.bookingId}` : "—",
      action: ev.action,
      when: ev.createdAt ? formatDate(ev.createdAt, DATE_TIME_FORMAT) : "",
      distance:
        ev.distanceMeters != null
          ? `${ev.distanceMeters}m / ${ev.requiredRadiusMeters}m`
          : "n/a",
      flags,
    };
  });

  const dateToolbar = (
    <DirectoryToolbar>
      <DirectoryDateInput
        id="comp-from"
        value={from}
        onChange={setFrom}
        aria-label="From"
        title="From"
      />
      <DirectoryDateInput
        id="comp-to"
        value={to}
        onChange={setTo}
        aria-label="To"
        title="To"
      />
      {from || to ? (
        <DirectoryToolbarEnd>
          <DirectoryClearButton
            onClick={() => {
              setFrom("");
              setTo("");
            }}
          />
        </DirectoryToolbarEnd>
      ) : null}
    </DirectoryToolbar>
  );

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <PageHeader
        title="Location compliance"
        description="Geofence override rates for Arrived / Complete actions. Global QA bypass is excluded from override scoring. Fail-instruction ack snapshots appear on fail events when present."
      />

      <DirectoryMetrics
        items={[
          { label: "Actions", value: summary.totalActions ?? 0, tone: "brand" },
          { label: "Overrides", value: summary.overrideCount ?? 0, tone: "warning" },
          { label: "Override %", value: `${summary.overrideRate ?? 0}%`, tone: "danger" },
          { label: "QA bypass", value: summary.globalBypassCount ?? 0, tone: "navy" },
        ]}
      />

      <section>
        <h3 style={{ margin: "0 0 12px" }}>By driver / shop</h3>
        <DirectoryTableWrap toolbar={dateToolbar}>
          <Table columns={actorColumns} rows={actorRows} rowKey={(row) => row.id} empty="No data for this range." />
        </DirectoryTableWrap>
      </section>

      <section>
        <h3 style={{ margin: "0 0 12px" }}>Recent override events</h3>
        <DirectoryTableWrap>
          <Table
            columns={eventColumns}
            rows={eventRows}
            rowKey={(row) => row.id}
            empty="No override events yet."
          />
        </DirectoryTableWrap>
      </section>
    </div>
  );
}
