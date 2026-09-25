import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Button, Select, Table } from "../../design-system";
import { Delay } from "../../components/shared/Loaders";
import { useGetShopCustomersQuery } from "../../store/services/api";
import { formatDate, formatMoney } from "../../utilities/formatters";
import { formatUserPhone } from "../../utilities/contactLinks";
import {
  DirectoryActionView,
  DirectoryActions,
  DirectoryDotPill,
  DirectoryIdentity,
  DirectoryMetrics,
  DirectorySearch,
  DirectoryTableWrap,
  DirectoryToolbar,
  DirectoryToolbarEnd,
  DirectoryToolSelect,
} from "../directory-table/directoryTable";
import { joinMeta } from "../directory-table/directoryTableUtils";
import { customerShopStat } from "../order-management/returningCustomerStat";

const CARD = {
  padding: 16,
  border: "1px solid #e6e9f0",
  borderRadius: 16,
  background: "#fff",
  boxShadow: "0 1px 2px rgba(16, 21, 31, 0.04)",
};

const TOP_OPTIONS = [
  { value: "5", label: "Top 5" },
  { value: "10", label: "Top 10" },
];

const LIST_FILTER_OPTIONS = [
  { value: "all", label: "All customers" },
  { value: "returning", label: "Returning only" },
];

/**
 * Shop detail → Customers tab.
 * Returning customers, spend, and top-N leaderboard (same threshold as assign flow).
 */
export default function ShopCustomersTab({ shopId, currencySymbol = "£" }) {
  const navigate = useNavigate();
  const [topN, setTopN] = useState("10");
  const [listFilter, setListFilter] = useState("all");
  const [search, setSearch] = useState("");

  const returningOnly = listFilter === "returning";
  const { data, isLoading, isError, refetch, isFetching } = useGetShopCustomersQuery(
    {
      shopId,
      top: Number(topN) === 5 ? 5 : 10,
      returningOnly,
    },
    { skip: !shopId, refetchOnMountOrArgChange: true }
  );

  const payload = data?.data ?? data ?? {};
  const summary = payload.summary || {};
  const topReturning = Array.isArray(payload.topReturning) ? payload.topReturning : [];
  const customers = useMemo(
    () => (Array.isArray(payload.customers) ? payload.customers : []),
    [payload.customers]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter((c) =>
      [c.name, c.email, c.phoneNum, c.customerId]
        .some((v) => String(v ?? "").toLowerCase().includes(q))
    );
  }, [customers, search]);

  const money = (n) => formatMoney(Number(n) || 0, currencySymbol);

  const customerColumns = [
    {
      key: "name",
      header: "Customer",
      render: (row) => (
        <DirectoryIdentity
          name={row.name}
          meta={joinMeta(row.email, formatUserPhone(row) || row.phoneNum)}
          id={row.customerId}
        />
      ),
    },
    {
      key: "orders",
      header: "Orders at shop",
      render: (row) => {
        const stat = customerShopStat({
          completed: row.completedOrders,
          total: row.totalOrders,
          isReturning: row.isReturning,
        });
        return (
          <div style={{ display: "grid", gap: 4 }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>
              {stat ? stat.count : `${row.totalOrders} orders`}
            </span>
            {row.isReturning ? (
              <DirectoryDotPill tone="brand">Returning</DirectoryDotPill>
            ) : null}
          </div>
        );
      },
    },
    {
      key: "spend",
      header: "Spend",
      render: (row) => (
        <div style={{ display: "grid", gap: 2 }}>
          <strong style={{ fontSize: 13 }}>{money(row.totalSpend)}</strong>
          {row.completedSpend > 0 && row.completedSpend !== row.totalSpend ? (
            <span style={{ fontSize: 11, color: "var(--muted)" }}>
              Completed {money(row.completedSpend)}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: "lastOrderAt",
      header: "Last order",
      render: (row) => (
        <span style={{ fontSize: 13 }}>
          {row.lastOrderAt ? formatDate(row.lastOrderAt) : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Action",
      render: (row) => (
        <DirectoryActions>
          <DirectoryActionView
            title="Open customer"
            onClick={() => navigate(`/customer-management/details/${row.customerId}`)}
          />
        </DirectoryActions>
      ),
    },
  ];

  if (isLoading && !payload.summary) {
    return (
      <div style={{ minHeight: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Delay />
      </div>
    );
  }

  if (isError) {
    return (
      <div style={CARD}>
        <p style={{ margin: "0 0 12px", color: "var(--danger)" }}>
          Could not load shop customers.
        </p>
        <Button variant="secondary" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <DirectoryMetrics
        items={[
          {
            label: "Customers",
            value: summary.totalCustomers ?? 0,
            tone: "brand",
          },
          {
            label: "Returning",
            value: summary.returningCustomers ?? 0,
            tone: "success",
            hint: `≥ ${payload.returningThreshold ?? 2} completed at this shop`,
          },
          {
            label: "Returning spend",
            value: money(summary.returningSpend),
            tone: "navy",
          },
          {
            label: "Total spend",
            value: money(summary.totalSpend),
            tone: "warning",
          },
        ]}
      />

      <div style={CARD}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 14,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
              Top returning customers
            </h2>
            <p className="jd-lead" style={{ margin: "4px 0 0" }}>
              Ranked by spend at this shop
            </p>
          </div>
          <div style={{ minWidth: 120 }}>
            <Select
              aria-label="Top returning count"
              value={topN}
              onChange={(v) => setTopN(String(v ?? "10"))}
              options={TOP_OPTIONS}
            />
          </div>
        </div>

        {topReturning.length === 0 ? (
          <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>
            No returning customers yet — need at least{" "}
            {payload.returningThreshold ?? 2} completed orders at this shop.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {topReturning.map((row, index) => (
              <button
                key={row.customerId}
                type="button"
                onClick={() =>
                  navigate(`/customer-management/details/${row.customerId}`)
                }
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid var(--line, #e6e9f0)",
                  background: "var(--brand-50, #f5f7ff)",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: "#fff",
                      border: "1px solid var(--line)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: 12,
                      flexShrink: 0,
                    }}
                  >
                    {index + 1}
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <strong style={{ fontSize: 13 }}>{row.name}</strong>
                    <span
                      style={{
                        display: "block",
                        fontSize: 12,
                        color: "var(--muted)",
                      }}
                    >
                      {row.completedOrders} completed · {row.totalOrders} total
                    </span>
                  </span>
                  <Badge tone="brand">Returning</Badge>
                </span>
                <strong style={{ fontSize: 14, whiteSpace: "nowrap" }}>
                  {money(row.totalSpend)}
                </strong>
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700 }}>
          {returningOnly ? "Returning customers" : "All customers at this shop"}
          {isFetching ? (
            <span style={{ marginLeft: 8, fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>
              Updating…
            </span>
          ) : null}
        </h2>
        <DirectoryTableWrap
          toolbar={
            <DirectoryToolbar>
              <DirectorySearch
                id="shop-customers-search"
                value={search}
                onChange={setSearch}
                placeholder="Search name, email, phone…"
              />
              <DirectoryToolSelect>
                <Select
                  aria-label="Customer list filter"
                  value={listFilter}
                  onChange={(v) => setListFilter(v || "all")}
                  options={LIST_FILTER_OPTIONS}
                />
              </DirectoryToolSelect>
              <DirectoryToolbarEnd>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>
                  {filtered.length} shown
                </span>
              </DirectoryToolbarEnd>
            </DirectoryToolbar>
          }
        >
          <Table
            columns={customerColumns}
            rows={filtered}
            rowKey={(row) => row.customerId}
            empty={
              returningOnly
                ? "No returning customers at this shop"
                : "No customers have ordered at this shop yet"
            }
          />
        </DirectoryTableWrap>
      </div>
    </div>
  );
}
