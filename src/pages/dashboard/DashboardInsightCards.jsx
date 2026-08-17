import { Box, Typography, Divider } from "@mui/material";
import { BsBarChartFill, BsPerson, BsPeople, BsShop } from "react-icons/bs";
import { MdOutlineCalendarMonth } from "react-icons/md";
import { HiArrowNarrowRight } from "react-icons/hi";
import FigureShimmer from "../../components/ui/FigureShimmer";

/** JustDryCleans theme tokens (see shared/theme.js) */
const COLORS = {
  title: "#000099",
  accent: "#248ECF",
  text: "#1E293B",
  heading: "#000000",
  muted: "#64748B",
  border: "#D0D5DD",
  green: "#379465",
  card: "#FFFFFF",
  board: "#FAFAFA",
  rowHover: "#F4F7FF",
};

function money(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "£0.00";
  return `£${v.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function CardShell({ children, sx }) {
  return (
    <Box
      sx={{
        bgcolor: COLORS.card,
        borderRadius: "10px",
        boxShadow:
          "0 1px 2px rgba(0,0,153,0.04), 0 4px 16px rgba(30,41,59,0.06)",
        border: "1px solid #F1F5F9",
        px: 2.5,
        py: 2.25,
        display: "flex",
        flexDirection: "column",
        minHeight: 260,
        height: "100%",
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

function CardTitle({ icon: Icon, title }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
      {Icon ? <Icon size={18} color={COLORS.title} /> : null}
      <Typography
        sx={{
          fontFamily: "Inter, sans-serif",
          fontWeight: 700,
          fontSize: 15,
          color: COLORS.title,
          lineHeight: 1.2,
        }}
      >
        {title}
      </Typography>
    </Box>
  );
}

function FooterLink({ label, onClick }) {
  if (!onClick) return null;
  return (
    <>
      <Divider sx={{ borderColor: COLORS.border, mt: "auto", mb: 1.5 }} />
      <Box
        component="button"
        type="button"
        onClick={onClick}
        sx={{
          all: "unset",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 0.5,
          fontFamily: "Inter, sans-serif",
          fontSize: 13,
          fontWeight: 600,
          color: COLORS.title,
          "&:hover": { opacity: 0.75 },
        }}
      >
        {label}
        <HiArrowNarrowRight size={14} />
      </Box>
    </>
  );
}

/** Reference: Month-to-Date / Last Month Sales */
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
}) {
  const trend = Number(trendPct);
  const up = trend >= 0;

  return (
    <CardShell>
      <CardTitle icon={icon} title={title} />

      {loading ? (
        <FigureShimmer width={160} height={36} sx={{ mb: 0.5 }} />
      ) : (
        <Typography
          sx={{
            fontFamily: "Inter, sans-serif",
            fontWeight: 800,
            fontSize: { xs: 28, md: 32 },
            color: COLORS.heading,
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {money(total)}
        </Typography>
      )}
      <Typography
        sx={{
          fontFamily: "Inter, sans-serif",
          fontSize: 13,
          color: COLORS.muted,
          mt: 0.5,
          mb: 2,
        }}
      >
        {totalLabel}
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 2,
          mb: 1.5,
        }}
      >
        <Box>
          {loading ? (
            <FigureShimmer width={56} height={24} sx={{ mb: 0.5 }} />
          ) : (
            <Typography
              sx={{
                fontFamily: "Inter, sans-serif",
                fontWeight: 800,
                fontSize: 20,
                color: COLORS.heading,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {orders}
            </Typography>
          )}
          <Typography
            sx={{
              fontFamily: "Inter, sans-serif",
              fontSize: 13,
              color: COLORS.muted,
            }}
          >
            Orders
          </Typography>
        </Box>
        <Box>
          {loading ? (
            <FigureShimmer width={88} height={24} sx={{ mb: 0.5 }} />
          ) : (
            <Typography
              sx={{
                fontFamily: "Inter, sans-serif",
                fontWeight: 800,
                fontSize: 20,
                color: COLORS.heading,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {money(avgOrderValue)}
            </Typography>
          )}
          <Typography
            sx={{
              fontFamily: "Inter, sans-serif",
              fontSize: 13,
              color: COLORS.muted,
            }}
          >
            Avg Order Value
          </Typography>
        </Box>
      </Box>

      {showTrend ? (
        loading ? (
          <FigureShimmer width={180} height={16} sx={{ mb: 0.5 }} />
        ) : (
          <Typography
            sx={{
              fontFamily: "Inter, sans-serif",
              fontSize: 13,
              fontWeight: 600,
              color: COLORS.green,
              mb: 0.5,
            }}
          >
            vs Last Month (MTD) {up ? "▲" : "▼"} {up ? "+" : ""}
            {Number.isFinite(trend) ? trend : 0}%
          </Typography>
        )
      ) : null}

      {statusLabel && !loading ? (
        <Typography
          sx={{
            fontFamily: "Inter, sans-serif",
            fontSize: 13,
            color: COLORS.muted,
            mb: 0.5,
          }}
        >
          {statusLabel}
        </Typography>
      ) : null}

      <FooterLink label="View Report" onClick={onView} />
    </CardShell>
  );
}

/** Reference: ranked list cards */
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
  footerLabel = "View Report",
  onView,
  onSubtitleClick,
  loading = false,
}) {
  return (
    <CardShell>
      <CardTitle icon={icon} title={title} />

      {subtitle ? (
        <Box
          component={onSubtitleClick ? "button" : "p"}
          type={onSubtitleClick ? "button" : undefined}
          onClick={onSubtitleClick}
          sx={{
            all: onSubtitleClick ? "unset" : undefined,
            cursor: onSubtitleClick ? "pointer" : "default",
            fontFamily: "Inter, sans-serif",
            fontSize: 12,
            color: COLORS.muted,
            mb: 1.5,
            display: "inline-flex",
            alignItems: "center",
            gap: 0.5,
            "&:hover": onSubtitleClick ? { color: COLORS.title } : undefined,
          }}
        >
          {subtitle}
          {onSubtitleClick ? <HiArrowNarrowRight size={12} /> : null}
        </Box>
      ) : null}

      <Box sx={{ flex: 1 }}>
        {loading ? (
          Array.from({ length: 5 }).map((_, idx) => (
            <Box
              key={idx}
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                py: 1.25,
                borderTop: idx === 0 ? "none" : `1px solid ${COLORS.border}`,
              }}
            >
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                <FigureShimmer width={140 + (idx % 3) * 24} height={14} />
                {metaKey ? <FigureShimmer width={72} height={10} /> : null}
              </Box>
              <FigureShimmer width={72} height={14} />
            </Box>
          ))
        ) : rows.length === 0 ? (
          <Typography
            sx={{
              fontFamily: "Inter, sans-serif",
              fontSize: 13,
              color: COLORS.muted,
              textAlign: "center",
              py: 4,
            }}
          >
            {emptyText}
          </Typography>
        ) : (
          rows.map((row, idx) => {
            const name = row[nameKey] ?? row.shopName ?? row.name ?? "—";
            const amount =
              row[amountKey] ?? row.shopRevenue ?? row.revenue ?? 0;
            const meta = metaKey != null ? row[metaKey] : null;

            return (
              <Box
                key={row.shopId ?? row.serviceId ?? idx}
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 2,
                  py: 1.25,
                  px: 0.5,
                  mx: -0.5,
                  borderRadius: "6px",
                  borderTop: idx === 0 ? "none" : `1px solid ${COLORS.border}`,
                  "&:hover": { bgcolor: COLORS.rowHover },
                }}
              >
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography
                    sx={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: 14,
                      fontWeight: 600,
                      color: COLORS.heading,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {name}
                  </Typography>
                  {meta != null ? (
                    <Typography
                      sx={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: 12,
                        color: COLORS.muted,
                        mt: 0.25,
                      }}
                    >
                      {metaPrefix} {meta}
                    </Typography>
                  ) : null}
                </Box>
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.5,
                    flexShrink: 0,
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: 14,
                      fontWeight: 700,
                      color: COLORS.heading,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {money(amount)}
                  </Typography>
                  <HiArrowNarrowRight size={14} color={COLORS.muted} />
                </Box>
              </Box>
            );
          })
        )}
      </Box>

      <FooterLink label={footerLabel} onClick={onView} />
    </CardShell>
  );
}

export const SalesIcons = {
  chart: BsBarChartFill,
  person: BsPerson,
  people: BsPeople,
  calendar: MdOutlineCalendarMonth,
  store: BsShop,
};

export function SalesBoard({ children }) {
  return (
    <Box
      sx={{
        bgcolor: COLORS.board,
        borderRadius: "16px",
        p: { xs: 2, md: 2.5 },
      }}
    >
      {children}
    </Box>
  );
}
