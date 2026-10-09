import { useMemo, useState } from "react";
import dayjs from "dayjs";
import { Select } from "../../design-system";
import { DirectoryMetrics, DirectoryViewModal } from "../directory-table/directoryTable";
import { useGetPromotionAnalyticsQuery, useGetCampaignReportQuery } from "../../store/services/api";

const money = (n) => `£${Number(n || 0).toFixed(2)}`;
/** What a use cost: its discount plus its cashback (cashback promotions give no discount). */
const costOf = (r) => Number(r.discount || 0) + Number(r.cashback || 0);

const RANGES = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last 12 months" },
];

function SectionTitle({ children }) {
  return <h4 className="text-sm font-semibold text-gray-900 mb-2">{children}</h4>;
}

function SimpleTable({ columns, rows, empty = "No paid uses yet" }) {
  if (!rows.length) return <p className="text-xs text-gray-500">{empty}</p>;
  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={`px-3 py-2 font-medium ${c.align === "right" ? "text-right" : "text-left"}`}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.key ?? i} className="border-t border-gray-100">
              {columns.map((c) => (
                <td key={c.key} className={`px-3 py-2 ${c.align === "right" ? "text-right tabular-nums" : ""}`}>{c.render ? c.render(r) : r[c.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Paid discount per day as a row of bars (one per day, height = share of the busiest day). */
function DailyBars({ days = [] }) {
  const max = Math.max(0, ...days.map(costOf));
  if (!days.length) return null;
  return (
    <div>
      <div className="flex items-end gap-px h-24 border-b border-gray-200" role="img" aria-label="Discount given per day">
        {days.map((d) => (
          <div
            key={d.date}
            title={`${dayjs(d.date).format("DD MMM")}: ${d.uses} uses, ${money(costOf(d))}`}
            className="flex-1 bg-blue-500/80 rounded-t-sm min-w-[2px]"
            style={{ height: max ? `${Math.max(2, (costOf(d) / max) * 100)}%` : "2px", opacity: d.uses ? 1 : 0.25 }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[11px] text-gray-500 mt-1">
        <span>{dayjs(days[0].date).format("DD MMM")}</span>
        <span>{dayjs(days[days.length - 1].date).format("DD MMM")}</span>
      </div>
    </div>
  );
}

function ZoneTable({ zones }) {
  return (
    <SimpleTable
      columns={[
        { key: "zoneName", header: "Zone" },
        { key: "uses", header: "Uses", align: "right" },
        { key: "customers", header: "Customers", align: "right" },
        { key: "discount", header: "Discount", align: "right", render: (r) => money(r.discount) },
        ...(zones.some((z) => Number(z.cashback) > 0)
          ? [{ key: "cashback", header: "Cashback", align: "right", render: (r) => money(r.cashback) }]
          : []),
      ]}
      rows={zones.map((z) => ({ ...z, key: z.zoneId ?? z.zoneName }))}
    />
  );
}

function rangeDates(days) {
  return { from: dayjs().subtract(Number(days), "day").startOf("day").toISOString(), to: dayjs().toISOString() };
}

/** Report for one promotion: uses, money, customers, by zone / day / code, recent orders. */
export function PromotionReportModal({ promotion, onClose }) {
  const [days, setDays] = useState("30");
  // Fixed per range choice: a fresh "now" on every render would be a new query each time.
  const range = useMemo(() => rangeDates(days), [days]);
  const { data, isFetching, isError } = useGetPromotionAnalyticsQuery(
    { id: promotion?.id, ...range },
    { skip: !promotion?.id }
  );
  const report = data?.data?.report;
  const s = report?.summary;
  const isCashback = report?.promotion?.benefitType === "cashback";

  return (
    <DirectoryViewModal open={!!promotion} onClose={onClose} title={`Report · ${promotion?.name || ""}`} size="xl">
      {isError ? (
        <p className="text-sm text-red-600">Could not load the report.</p>
      ) : !report ? (
        <p className="text-sm text-gray-500">{isFetching ? "Loading…" : "No data"}</p>
      ) : (
        <div className="space-y-5">
          <DirectoryMetrics
            items={[
              { label: "Paid uses", value: s.uses, hint: report.promotion.usageLimit != null ? `${report.promotion.usesLeft} left of ${report.promotion.usageLimit}` : "No limit" },
              isCashback
                ? { label: "Cashback given", value: money(s.totalCashback), hint: `${money(s.cashbackCredited)} credited · ${money(s.cashbackPending)} waiting for delivery` }
                : { label: "Discount given", value: money(s.totalDiscount), hint: `Avg ${money(s.averageDiscount)} per order` },
              { label: "Customers", value: s.uniqueCustomers },
              { label: "Orders holding it", value: s.bookingsHolding, hint: "Booked, not invoiced/paid yet" },
            ]}
          />
          <p className="text-xs text-gray-500">
            Refunded: {s.refunded} ({money(s.refundedDiscount)} returned to budget) · Did not go ahead: {s.released}
          </p>

          <div>
            <div className="flex items-center justify-between mb-2">
              <SectionTitle>{isCashback ? "Cashback per day" : "Discount per day"}</SectionTitle>
              <div className="w-44">
                <Select options={RANGES} value={days} onChange={setDays} />
              </div>
            </div>
            <DailyBars days={report.byDay} />
          </div>

          <div>
            <SectionTitle>By zone</SectionTitle>
            <ZoneTable zones={report.byZone} />
          </div>

          {report.byCode.length > 0 && (
            <div>
              <SectionTitle>By code</SectionTitle>
              <SimpleTable
                columns={[
                  { key: "code", header: "Code", render: (r) => <span className="font-mono">{r.code}</span> },
                  { key: "uses", header: "Uses", align: "right" },
                  { key: "discount", header: isCashback ? "Cashback" : "Discount", align: "right", render: (r) => money(costOf(r)) },
                ]}
                rows={report.byCode.map((c) => ({ ...c, key: c.code }))}
              />
            </div>
          )}

          <div>
            <SectionTitle>Recent paid orders</SectionTitle>
            <SimpleTable
              columns={[
                { key: "orderTrackId", header: "Order", render: (r) => r.orderTrackId || (r.bookingId ? `#${r.bookingId}` : "—") },
                { key: "couponCode", header: "Code", render: (r) => r.couponCode || "Automatic" },
                { key: "paidAt", header: "Paid", render: (r) => (r.paidAt ? dayjs(r.paidAt).format("DD MMM YYYY HH:mm") : "—") },
                { key: "discount", header: isCashback ? "Cashback" : "Discount", align: "right", render: (r) => money(costOf(r)) },
              ]}
              rows={report.recent.map((r) => ({ ...r, key: r.redemptionId }))}
            />
          </div>
        </div>
      )}
    </DirectoryViewModal>
  );
}

/** Campaign budget, spend and each promotion's share (inside the campaign view). */
export function CampaignReportSection({ campaignId }) {
  const { data, isFetching, isError } = useGetCampaignReportQuery(campaignId, { skip: !campaignId });
  const report = data?.data;
  if (isError) return <p className="text-sm text-red-600">Could not load the campaign report.</p>;
  if (!report) return <p className="text-sm text-gray-500">{isFetching ? "Loading report…" : ""}</p>;
  const b = report.budget;
  const pct = b.percentUsed ?? 0;

  return (
    <div className="space-y-4">
      <DirectoryMetrics
        items={[
          { label: "Budget", value: b.budget != null ? money(b.budget) : "No limit" },
          { label: "Spent", value: money(b.spent), hint: b.percentUsed != null ? `${b.percentUsed}% of budget (discounts + cashback)` : "Discounts + cashback" },
          { label: "Remaining", value: b.remaining != null ? money(b.remaining) : "—" },
          { label: "Paid uses", value: report.summary.uses, hint: `${report.summary.uniqueCustomers} customers` },
        ]}
      />
      {b.budget != null && (
        <div>
          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Budget used">
            <div className={`h-full ${pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-green-500"}`} style={{ width: `${pct}%` }} />
          </div>
          {pct >= 100 && <p className="text-xs text-red-600 mt-1">Budget used up: this campaign's promotions no longer apply.</p>}
        </div>
      )}
      <div>
        <SectionTitle>Promotions in this campaign</SectionTitle>
        <SimpleTable
          empty="No promotions linked to this campaign"
          columns={[
            { key: "name", header: "Promotion" },
            { key: "status", header: "Status" },
            { key: "uses", header: "Uses", align: "right" },
            { key: "discount", header: "Discount", align: "right", render: (r) => money(r.discount) },
            ...(report.promotions.some((p) => Number(p.cashback) > 0)
              ? [{ key: "cashback", header: "Cashback", align: "right", render: (r) => money(r.cashback) }]
              : []),
          ]}
          rows={report.promotions.map((p) => ({ ...p, key: p.id }))}
        />
      </div>
      <div>
        <SectionTitle>By zone</SectionTitle>
        <ZoneTable zones={report.byZone} />
      </div>
    </div>
  );
}
