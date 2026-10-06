import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Button, Select, Table } from "../../design-system";
import { Delay } from "../../components/shared/Loaders";
import {
  useGetShopCustomersQuery,
  useExcludeCustomerFromShopMutation,
  useIncludeCustomerForShopMutation,
} from "../../store/services/api";
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
import AssignCustomerShopModal from "../customer-management/AssignCustomerShopModal";
import UnlinkCustomerShopModal from "../customer-management/UnlinkCustomerShopModal";
import CustomerRoutingEventsPanel from "../customer-management/CustomerRoutingEventsPanel";

const CARD = {
  padding: 16,
  border: "1px solid #e6e9f0",
  borderRadius: 16,
  background: "#fff",
  boxShadow: "0 1px 2px rgba(16, 21, 31, 0.04)",
};

const LIST_FILTER_OPTIONS = [
  { value: "all", label: "All customers" },
  { value: "returning", label: "Returning only" },
  { value: "assigned", label: "Assigned only" },
  { value: "excluded", label: "Excluded only" },
  { value: "spend_high", label: "Spend: High → Low" },
  { value: "spend_low", label: "Spend: Low → High" },
  { value: "spend_above_500", label: "Spend above £500" },
  { value: "spend_above_100", label: "Spend above £100" },
  { value: "spend_below_100", label: "Spend below £100" },
];

/**
 * Shop detail → Customers tab.
 * Returning badges live in the main list; assign preferred shop + exclude
 * are independent controls.
 */
export default function ShopCustomersTab({ shopId, currencySymbol = "£" }) {
  const navigate = useNavigate();
  const [listFilter, setListFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [assignTarget, setAssignTarget] = useState(null);
  const [unlinkTarget, setUnlinkTarget] = useState(null);

  const returningOnly = listFilter === "returning";
  const { data, isLoading, isError, refetch, isFetching } = useGetShopCustomersQuery(
    {
      shopId,
      top: 10,
      returningOnly,
    },
    { skip: !shopId, refetchOnMountOrArgChange: true }
  );
  const [excludeCustomer] = useExcludeCustomerFromShopMutation();
  const [includeCustomer] = useIncludeCustomerForShopMutation();

  const payload = data?.data ?? data ?? {};
  const summary = payload.summary || {};
  const recentRoutingEvents = Array.isArray(payload.recentRoutingEvents)
    ? payload.recentRoutingEvents
    : [];
  const customers = useMemo(
    () => (Array.isArray(payload.customers) ? payload.customers : []),
    [payload.customers]
  );

  const filtered = useMemo(() => {
    let rows = customers;
    if (listFilter === "excluded") {
      rows = rows.filter((c) => c.isExcluded);
    } else if (listFilter === "assigned") {
      rows = rows.filter((c) => c.hasActiveAssignment);
    } else if (listFilter === "spend_above_500") {
      rows = rows.filter((c) => (Number(c.totalSpend) || 0) >= 500);
    } else if (listFilter === "spend_above_100") {
      rows = rows.filter((c) => (Number(c.totalSpend) || 0) >= 100);
    } else if (listFilter === "spend_below_100") {
      rows = rows.filter((c) => (Number(c.totalSpend) || 0) < 100);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((c) =>
        [c.name, c.email, c.phoneNum, c.customerId, c.assignedShopName]
          .some((v) => String(v ?? "").toLowerCase().includes(q))
      );
    }
    if (listFilter === "spend_high") {
      rows = [...rows].sort(
        (a, b) => (Number(b.totalSpend) || 0) - (Number(a.totalSpend) || 0)
      );
    } else if (listFilter === "spend_low") {
      rows = [...rows].sort(
        (a, b) => (Number(a.totalSpend) || 0) - (Number(b.totalSpend) || 0)
      );
    }
    return rows;
  }, [customers, search, listFilter]);

  const money = (n) => formatMoney(Number(n) || 0, currencySymbol);

  const toggleExclusion = async (row) => {
    if (!shopId || !row?.customerId) return;
    setBusyId(row.customerId);
    try {
      if (row.isExcluded) {
        await includeCustomer({
          customerId: row.customerId,
          shopId,
        }).unwrap();
      } else {
        const reason = window.prompt(
          "Why exclude this customer from this shop? (optional)",
          "Customer not satisfied with this shop"
        );
        if (reason === null) return;
        await excludeCustomer({
          customerId: row.customerId,
          shopId,
          reason: reason.trim() || undefined,
        }).unwrap();
      }
    } catch (err) {
      window.alert(
        err?.data?.message || err?.error || "Could not update exclusion"
      );
    } finally {
      setBusyId(null);
    }
  };

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
      key: "orderHistory",
      header: "Orders at shop",
      render: (row) => {
        const stat = customerShopStat({
          completed: row.completedOrders,
          total: row.totalOrders,
          isReturning: row.isReturning,
        });
        const hasBadges =
          row.isReturning || row.hasActiveAssignment || row.isExcluded;
        return (
          <div style={{ display: "grid", gap: 4 }}>
            <span style={{ fontWeight: 600, fontSize: 13, whiteSpace: "nowrap" }}>
              {stat ? stat.count : `${row.totalOrders} orders`}
            </span>
            {hasBadges ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  flexWrap: "wrap",
                }}
              >
                {row.isReturning ? (
                  <DirectoryDotPill tone="brand">Returning</DirectoryDotPill>
                ) : null}
                {row.hasActiveAssignment ? (
                  <Badge tone="success">
                    {row.isAssignedHere
                      ? "Assigned here"
                      : `Assigned → ${row.assignedShopName || "shop"}`}
                  </Badge>
                ) : null}
                {row.isExcluded ? (
                  <Badge tone="danger">Excluded</Badge>
                ) : null}
              </div>
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
            onClick={() =>
              navigate(`/customer-management/details/${row.customerId}`)
            }
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              setAssignTarget({
                customerId: row.customerId,
                name: row.name,
              })
            }
            title="Assign preferred shop for new orders"
          >
            Assign
          </Button>
          {row.hasActiveAssignment ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                setUnlinkTarget({
                  customerId: row.customerId,
                  name: row.name,
                  assignedShopName: row.assignedShopName,
                })
              }
              title="Unlink preferred shop assignment"
            >
              Unlink
            </Button>
          ) : null}
          <Button
            variant={row.isExcluded ? "secondary" : "danger"}
            size="sm"
            disabled={busyId === row.customerId}
            onClick={() => toggleExclusion(row)}
            title={
              row.isExcluded
                ? "Allow this customer’s orders to reach this shop again"
                : "Stop routing this customer’s new orders to this shop (bad experience)"
            }
          >
            {busyId === row.customerId
              ? "…"
              : row.isExcluded
                ? "Include"
                : "Exclude"}
          </Button>
        </DirectoryActions>
      ),
    },
  ];

  if (isLoading && !payload.summary) {
    return (
      <div
        style={{
          minHeight: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
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
      <p className="jd-lead" style={{ margin: 0 }}>
        <strong>Returning</strong> = ≥{payload.returningThreshold ?? 2}{" "}
        completed here. <strong>Assign</strong> sets preferred shop for new
        orders (not an exclude). <strong>Exclude</strong> blocks a shop after
        bad experience. Unlink clears assignment; exclusions stay.
      </p>
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
            label: "Assigned",
            value: summary.assignedCustomers ?? 0,
            tone: "brand",
          },
          {
            label: "Excluded",
            value: summary.excludedCustomers ?? 0,
            tone: "danger",
          },
          {
            label: "Total spend",
            value: money(summary.totalSpend),
            tone: "warning",
          },
        ]}
      />

      <div>
        <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700 }}>
          {returningOnly
            ? "Returning customers"
            : listFilter === "excluded"
              ? "Excluded customers"
              : listFilter === "assigned"
                ? "Assigned customers"
                : listFilter === "spend_high"
                  ? "Customers by spend (high → low)"
                  : listFilter === "spend_low"
                    ? "Customers by spend (low → high)"
                    : listFilter === "spend_above_500"
                      ? "Customers with spend above £500"
                      : listFilter === "spend_above_100"
                        ? "Customers with spend above £100"
                        : listFilter === "spend_below_100"
                          ? "Customers with spend below £100"
                          : "All customers at this shop"}
          {isFetching ? (
            <span
              style={{
                marginLeft: 8,
                fontSize: 12,
                color: "var(--muted)",
                fontWeight: 500,
              }}
            >
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
              listFilter === "excluded"
                ? "No customers are excluded from this shop"
                : listFilter === "assigned"
                  ? "No customers have an active preferred-shop assignment"
                  : listFilter === "spend_above_500"
                    ? "No customers with spend above £500"
                    : listFilter === "spend_above_100"
                      ? "No customers with spend above £100"
                      : listFilter === "spend_below_100"
                        ? "No customers with spend below £100"
                        : returningOnly
                          ? "No returning customers at this shop"
                          : "No customers have ordered at this shop yet"
            }
          />
        </DirectoryTableWrap>
      </div>

      <CustomerRoutingEventsPanel
        title="Recent routing changes"
        events={recentRoutingEvents}
        showCustomer
        emptyText="No assign / exclude changes involving this shop yet."
      />

      <AssignCustomerShopModal
        open={Boolean(assignTarget)}
        customerId={assignTarget?.customerId}
        customerName={assignTarget?.name}
        sourceShopId={shopId}
        onClose={() => setAssignTarget(null)}
        onSuccess={() => refetch()}
      />
      <UnlinkCustomerShopModal
        open={Boolean(unlinkTarget)}
        customerId={unlinkTarget?.customerId}
        customerName={unlinkTarget?.name}
        assignedShopName={unlinkTarget?.assignedShopName}
        onClose={() => setUnlinkTarget(null)}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
