import { HiArrowNarrowRight } from "react-icons/hi";
import FigureShimmer from "./FigureShimmer";
import { formatMoney, resolveCurrencySymbol } from "../../utilities/formatters";

function money(amount, source, fallbackSymbol, fallbackCode) {
  const symbol = resolveCurrencySymbol(source) || fallbackSymbol;
  const code =
    source?.currency ??
    source?.currencyCode ??
    source?.currency_code ??
    source?.feeCurrency ??
    fallbackCode;
  return formatMoney(amount, symbol, code);
}

function CardShell({ children }) {
  return (
    <article className="relative flex h-full min-h-[260px] flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-5 py-[18px] shadow-[0_1px_2px_rgba(16,21,31,0.04)] before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-[var(--accent)] before:content-['']">
      {children}
    </article>
  );
}

function CardTitle({ icon: Icon, title }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      {Icon ? <Icon size={18} className="text-[var(--accent-ink)]" /> : null}
      <h3 className="m-0 text-[15px] font-bold leading-tight tracking-[-0.2px] text-[var(--ink)]">
        {title}
      </h3>
    </div>
  );
}

function FooterLink({ label, onClick }) {
  if (!onClick) return null;
  return (
    <>
      <hr className="mb-3 mt-auto border-0 border-t border-[var(--line)]" />
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1.5 self-start border-0 bg-transparent p-0 text-[13px] font-semibold text-[var(--accent)] hover:text-[var(--accent-ink)]"
      >
        {label}
        <HiArrowNarrowRight size={14} />
      </button>
    </>
  );
}

/** Month-to-date / last-month sales metric card. */
export function SalesMetricCard({
  title,
  icon,
  total,
  totalLabel = "Total Sales",
  orders = 0,
  avgOrderValue = 0,
  trendPct,
  showTrend = false,
  statusLabel,
  onView,
  loading = false,
  currencySource,
}) {
  const trend = Number(trendPct);
  const up = trend >= 0;
  const trendReady = Number.isFinite(trend);

  return (
    <CardShell>
      <CardTitle icon={icon} title={title} />

      {loading ? (
        <FigureShimmer width={160} height={36} className="mb-1" />
      ) : (
        <p className="m-0 text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ink)] [font-variant-numeric:tabular-nums]">
          {money(total, currencySource)}
        </p>
      )}
      <p className="mb-4 mt-1 text-[13px] text-[var(--muted)]">{totalLabel}</p>

      <div className="mb-3 grid grid-cols-2 gap-4">
        <div>
          {loading ? (
            <FigureShimmer width={56} height={24} className="mb-1" />
          ) : (
            <p className="m-0 text-xl font-bold text-[var(--ink)] [font-variant-numeric:tabular-nums]">
              {orders}
            </p>
          )}
          <p className="m-0 text-[13px] text-[var(--muted)]">Orders</p>
        </div>
        <div>
          {loading ? (
            <FigureShimmer width={88} height={24} className="mb-1" />
          ) : (
            <p className="m-0 text-xl font-bold text-[var(--ink)] [font-variant-numeric:tabular-nums]">
              {money(avgOrderValue, currencySource)}
            </p>
          )}
          <p className="m-0 text-[13px] text-[var(--muted)]">Avg order value</p>
        </div>
      </div>

      {showTrend && trendReady ? (
        loading ? (
          <FigureShimmer width={180} height={16} className="mb-1" />
        ) : (
          <p
            className={`mb-1 mt-0 inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${
              up
                ? "bg-[var(--success-bg)] text-[var(--success)]"
                : "bg-[var(--danger-bg)] text-[var(--danger)]"
            }`}
          >
            vs last month (MTD) {up ? "▲" : "▼"} {up ? "+" : ""}
            {trend}%
          </p>
        )
      ) : null}

      {statusLabel && !loading ? (
        <p className="mb-1 mt-0 text-[13px] text-[var(--muted)]">{statusLabel}</p>
      ) : null}

      <FooterLink label="View report" onClick={onView} />
    </CardShell>
  );
}

/** Ranked list cards (shops / services). */
export function SalesRankCard({
  title,
  icon,
  subtitle,
  rows = [],
  nameKey = "name",
  amountKey = "amount",
  metaKey,
  metaPrefix = "Qty:",
  emptyText = "No data yet.",
  footerLabel = "View report",
  onView,
  onSubtitleClick,
  loading = false,
  currencySource,
}) {
  return (
    <CardShell>
      <CardTitle icon={icon} title={title} />

      {subtitle ? (
        onSubtitleClick ? (
          <button
            type="button"
            onClick={onSubtitleClick}
            className="mb-3 inline-flex items-center gap-1 self-start border-0 bg-transparent p-0 text-[12.5px] font-semibold text-[var(--accent)] hover:text-[var(--accent-ink)]"
          >
            {subtitle}
            <HiArrowNarrowRight size={12} />
          </button>
        ) : (
          <p className="mb-3 mt-0 text-xs text-[var(--muted)]">{subtitle}</p>
        )
      ) : null}

      <div className="flex-1">
        {loading ? (
          Array.from({ length: 5 }).map((_, idx) => (
            <div
              key={idx}
              className={`flex items-center justify-between py-2.5 ${
                idx === 0 ? "" : "border-t border-[var(--line)]"
              }`}
            >
              <div className="flex flex-col gap-1.5">
                <FigureShimmer width={140 + (idx % 3) * 24} height={14} />
                {metaKey ? <FigureShimmer width={72} height={10} /> : null}
              </div>
              <FigureShimmer width={72} height={14} />
            </div>
          ))
        ) : rows.length === 0 ? (
          <p className="m-0 px-0 py-8 text-center text-[13px] text-[var(--muted)]">
            {emptyText}
          </p>
        ) : (
          rows.map((row, idx) => {
            const name = row[nameKey] ?? row.shopName ?? row.name ?? "—";
            const amount = row[amountKey] ?? row.shopRevenue ?? row.revenue ?? 0;
            const meta = metaKey != null ? row[metaKey] : null;

            return (
              <div
                key={row.shopId ?? row.serviceId ?? idx}
                className={`flex items-start justify-between gap-4 py-2.5 ${
                  idx === 0 ? "" : "border-t border-[var(--line)]"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="m-0 overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold text-[var(--ink)]">
                    {name}
                  </p>
                  {meta != null ? (
                    <p className="mt-0.5 mb-0 text-xs text-[var(--muted)]">
                      {metaPrefix} {meta}
                    </p>
                  ) : null}
                </div>
                <p className="m-0 shrink-0 text-sm font-bold text-[var(--ink)] [font-variant-numeric:tabular-nums]">
                  {money(
                    amount,
                    row,
                    resolveCurrencySymbol(currencySource),
                    currencySource?.currency ?? currencySource?.currencyCode
                  )}
                </p>
              </div>
            );
          })
        )}
      </div>

      <FooterLink label={footerLabel} onClick={onView} />
    </CardShell>
  );
}

export function SalesBoard({ children }) {
  return <section className="flex flex-col gap-4">{children}</section>;
}
