import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader, Table } from "../../design-system";
import {
  useGetComplianceEventsQuery,
  useGetGeofenceOverrideReportQuery,
  useLazyGetComplianceEventsQuery,
} from "../../store/services/api";
import { Delay } from "../../components/shared/Loaders";
import { DATE_TIME_FORMAT, formatDate } from "../../utilities/formatters";
import { csvFormat } from "../../utilities/csvExport";
import { useCsvExport } from "../../hooks/useCsvExport";
import {
  DirectoryClearButton,
  DirectoryDateInput,
  DirectoryDotPills,
  DirectoryExportButton,
  DirectoryIdentity,
  DirectoryMetric,
  DirectoryMetrics,
  DirectorySearch,
  DirectoryTableWrap,
  DirectoryToolbar,
  DirectoryToolbarEnd,
} from "../directory-table/directoryTable";
import { joinMeta } from "../directory-table/directoryTableUtils";
import ListPagination from "../order-management/ListPagination";

const SEARCH_DEBOUNCE_MS = 400;
const EVENTS_DEFAULT_PAGE_SIZE = 25;

function unwrap(res) {
  return res?.data !== undefined ? res.data : res;
}

function personName(user) {
  if (!user) return "";
  return [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email || "";
}

function eventDriverName(ev) {
  return personName(ev?.actor) || ev?.actorName || (ev?.actorUserId ? `User #${ev.actorUserId}` : "");
}

function eventShopName(ev) {
  return (
    ev?.shop?.businessInfo?.shopName ||
    ev?.shopName ||
    personName(ev?.shop) ||
    (ev?.shopId ? `Shop #${ev.shopId}` : "")
  );
}

function eventBookingLabel(ev) {
  return ev?.booking?.orderTrackId || (ev?.bookingId != null ? String(ev.bookingId) : "");
}

/** CSV columns operate on the raw API event row (export mode returns the same shape). */
const EVENT_CSV_COLUMNS = [
  { header: "Time", value: (ev) => csvFormat.dateTime(ev?.createdAt) },
  { header: "Action", value: (ev) => ev?.action || "" },
  { header: "Driver", value: (ev) => eventDriverName(ev) },
  { header: "Driver email", value: (ev) => ev?.actor?.email || "" },
  { header: "Shop", value: (ev) => eventShopName(ev) },
  { header: "Shop owner", value: (ev) => personName(ev?.shop) },
  { header: "Order / booking", value: (ev) => eventBookingLabel(ev) },
  { header: "Booking ID", value: (ev) => ev?.bookingId ?? "" },
  { header: "Within geofence", value: (ev) => (ev?.withinGeofence == null ? "" : csvFormat.bool(ev.withinGeofence)) },
  { header: "Override used", value: (ev) => csvFormat.bool(ev?.overrideUsed) },
  { header: "QA bypass", value: (ev) => csvFormat.bool(ev?.geofenceBypassedGlobal) },
  { header: "Distance (m)", value: (ev) => ev?.distanceMeters ?? "" },
  { header: "Required radius (m)", value: (ev) => ev?.requiredRadiusMeters ?? "" },
  { header: "Driver lat", value: (ev) => ev?.driverLat ?? "" },
  { header: "Driver lng", value: (ev) => ev?.driverLng ?? "" },
  { header: "Customer lat", value: (ev) => ev?.customerLat ?? "" },
  { header: "Customer lng", value: (ev) => ev?.customerLng ?? "" },
  { header: "Fail set version", value: (ev) => ev?.failInstructionSetVersion ?? "" },
  {
    header: "Steps acknowledged",
    value: (ev) =>
      Array.isArray(ev?.acknowledgedItemSnapshot) ? ev.acknowledgedItemSnapshot.length : "",
  },
  { header: "Notes", value: (ev) => ev?.overrideReason || ev?.notes || "" },
];

/** Client-side rows from the geofence override report (already aggregated per actor). */
const ACTOR_CSV_COLUMNS = [
  { header: "Driver", value: (r) => (r.actor === "—" ? "" : r.actor) },
  { header: "Driver user ID", value: (r) => r.actorUserId ?? "" },
  { header: "Shop", value: (r) => (r.shop === "—" ? "" : r.shop) },
  { header: "Shop ID", value: (r) => r.shopId ?? "" },
  { header: "Actions", value: (r) => r.totalActions ?? 0 },
  { header: "Overrides", value: (r) => r.overrideCount ?? 0 },
  { header: "Override %", value: (r) => r.overrideRate ?? 0 },
];

export default function LocationCompliancePage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [eventsPage, setEventsPage] = useState(1);
  const [eventsPageSize, setEventsPageSizeState] = useState(EVENTS_DEFAULT_PAGE_SIZE);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  // Any filter / search / page-size change restarts the events list from page 1.
  useEffect(() => {
    setEventsPage(1);
  }, [from, to, debouncedSearch, eventsPageSize]);

  const setEventsPageSize = useCallback((size) => {
    setEventsPageSizeState(size);
    setEventsPage(1);
  }, []);

  const params = useMemo(() => {
    const p = {};
    if (from) p.from = from;
    if (to) p.to = to;
    return p;
  }, [from, to]);

  /** Filter params shared by the paged events query and the events CSV export. */
  const eventsFilterParams = useMemo(
    () => ({
      ...params,
      overridesOnly: true,
      ...(debouncedSearch && { search: debouncedSearch }),
    }),
    [params, debouncedSearch]
  );

  const eventsParams = useMemo(
    () => ({ ...eventsFilterParams, page: eventsPage, limit: eventsPageSize }),
    [eventsFilterParams, eventsPage, eventsPageSize]
  );

  const { data: reportRaw, isLoading: loadingReport, isError: reportError } =
    useGetGeofenceOverrideReportQuery(params);
  const {
    data: eventsRaw,
    isLoading: loadingEvents,
    isFetching: fetchingEvents,
    isError: eventsError,
  } = useGetComplianceEventsQuery(eventsParams);
  const [fetchEventsForExport] = useLazyGetComplianceEventsQuery();

  const report = unwrap(reportRaw) || {};
  const summary = report.summary || {};
  const byActor = report.byActor;
  const eventsData = unwrap(eventsRaw) || {};
  const events = eventsData.rows || [];
  const eventsPagination = eventsData.pagination || {};
  const eventsTotalRows =
    Number(eventsPagination.totalRecords ?? eventsData.total ?? events.length) || 0;

  const actorRows = useMemo(
    () =>
      (Array.isArray(byActor) ? byActor : []).map((r, idx) => ({
        id: `${r.actorUserId}-${r.shopId}-${idx}`,
        actorUserId: r.actorUserId,
        shopId: r.shopId,
        actor: r.actorName || r.actorUserId || "—",
        shop: r.shopName || r.shopId || "—",
        totalActions: r.totalActions,
        overrideCount: r.overrideCount,
        overrideRate: r.overrideRate,
      })),
    [byActor]
  );

  const fetchAllEventsForExport = useCallback(async () => {
    // `false` → never serve the export from a cached page response.
    const res = await fetchEventsForExport(
      { ...eventsFilterParams, export: true },
      false
    ).unwrap();
    const payload = unwrap(res) || {};
    return {
      rows: payload.rows || [],
      pagination: payload.pagination || null,
    };
  }, [fetchEventsForExport, eventsFilterParams]);

  const csvFilenameFilters = useMemo(
    () => ({ from, to, search: debouncedSearch }),
    [from, to, debouncedSearch]
  );

  const eventsCsv = useCsvExport({
    filenameBase: "location-compliance-events",
    columns: EVENT_CSV_COLUMNS,
    fetchAll: fetchAllEventsForExport,
    filenameFilters: csvFilenameFilters,
  });

  const reportCsvFilters = useMemo(() => ({ from, to }), [from, to]);
  const reportCsv = useCsvExport({
    filenameBase: "geofence-override-report",
    columns: ACTOR_CSV_COLUMNS,
    rows: actorRows,
    filenameFilters: reportCsvFilters,
  });

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
      key: "driver",
      header: "Driver / shop",
      render: (row) => (
        <DirectoryIdentity name={row.driver || "—"} meta={row.shop || undefined} />
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
    const bookingLabel = eventBookingLabel(ev);
    return {
      id: ev.id,
      booking: bookingLabel ? `#${bookingLabel}` : "—",
      action: ev.action,
      when: ev.createdAt ? formatDate(ev.createdAt, DATE_TIME_FORMAT) : "",
      driver: eventDriverName(ev),
      shop: eventShopName(ev),
      distance:
        ev.distanceMeters != null
          ? `${ev.distanceMeters}m / ${ev.requiredRadiusMeters}m`
          : "n/a",
      flags,
    };
  });

  const hasDateFilters = Boolean(from || to);

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
      <DirectoryToolbarEnd>
        {hasDateFilters ? (
          <DirectoryClearButton
            onClick={() => {
              setFrom("");
              setTo("");
            }}
          />
        ) : null}
        <DirectoryExportButton
          onClick={reportCsv.run}
          loading={reportCsv.isExporting}
          count={actorRows.length}
          title="Download CSV of the override report (per driver / shop)"
        />
      </DirectoryToolbarEnd>
    </DirectoryToolbar>
  );

  const eventsToolbar = (
    <DirectoryToolbar>
      <DirectorySearch
        id="comp-events-search"
        value={searchInput}
        onChange={setSearchInput}
        placeholder="Search order track ID, driver name / email, shop or owner…"
      />
      <DirectoryToolbarEnd>
        {searchInput ? (
          <DirectoryClearButton
            onClick={() => {
              setSearchInput("");
              setDebouncedSearch("");
            }}
          />
        ) : null}
        {fetchingEvents ? <span className="jd-field__hint">Refreshing…</span> : null}
        <DirectoryExportButton
          onClick={eventsCsv.run}
          loading={eventsCsv.isExporting}
          count={eventsTotalRows}
        />
      </DirectoryToolbarEnd>
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
        <DirectoryTableWrap
          toolbar={eventsToolbar}
          footer={
            <ListPagination
              page={eventsPage}
              pageSize={eventsPageSize}
              totalRows={eventsTotalRows}
              onPageChange={setEventsPage}
              onPageSizeChange={setEventsPageSize}
              noun="events"
            />
          }
        >
          <Table
            columns={eventColumns}
            rows={eventRows}
            rowKey={(row) => row.id}
            empty={
              fetchingEvents
                ? "Loading events…"
                : debouncedSearch || hasDateFilters
                  ? "No override events match these filters."
                  : "No override events yet."
            }
          />
        </DirectoryTableWrap>
      </section>
    </div>
  );
}
