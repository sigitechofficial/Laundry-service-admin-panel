import { Badge, Button, Select } from "../../../design-system";
import { formatMoney } from "../../../utilities/formatters";
import { customerShopStat } from "../../order-management/returningCustomerStat";

const PANEL = {
  padding: 16,
  border: "1px solid #e6e9f0",
  borderRadius: 16,
  background: "#fff",
  boxShadow: "0 1px 2px rgba(16, 21, 31, 0.04)",
};

const FILTER_OPTIONS = [
  { value: "all", label: "All shops" },
  { value: "returning", label: "Returning only" },
  { value: "assigned", label: "Assigned only" },
  { value: "excluded", label: "Excluded only" },
];

/**
 * Per-shop order + spend history for a customer.
 * Returning shops appear in the same list as badges; each row has Assign / Unlink / Exclude.
 */
export default function CustomerShopHistoryPanel({
  history = [],
  title = "Orders by shop",
  currencySymbol = "£",
  selectedShopId = null,
  onSelectShop,
  returningOnly = false,
  listFilter = "all",
  onListFilterChange,
  onToggleExclusion,
  exclusionBusyShopId = null,
  onAssignShop,
  onAssignShopRow,
  onUnlinkAssignment,
  assignBusyShopId = null,
  activeAssignment = null,
  showHeaderAssign = true,
  compact = false,
}) {
  const allRows = Array.isArray(history) ? history : [];
  const filter = returningOnly ? "returning" : listFilter || "all";
  const rows = allRows.filter((h) => {
    if (filter === "returning") return h.isReturning;
    if (filter === "assigned") return h.isAssignedShop;
    if (filter === "excluded") return h.isExcluded;
    return true;
  });
  const returningCount = allRows.filter((h) => h.isReturning).length;
  const excludedCount = allRows.filter((h) => h.isExcluded).length;
  const assigned =
    activeAssignment ||
    allRows.find((h) => h.activeAssignment)?.activeAssignment;
  const selectable = typeof onSelectShop === "function";
  const canExclude = typeof onToggleExclusion === "function";
  const canAssignRow = typeof onAssignShopRow === "function";
  const canUnlink = typeof onUnlinkAssignment === "function";
  const money = (n) => formatMoney(Number(n) || 0, currencySymbol);

  return (
    <div style={PANEL}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{title}</h2>
          {allRows.length ? (
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted)" }}>
              {allRows.length} shop{allRows.length === 1 ? "" : "s"}
              {returningCount ? ` · returning at ${returningCount}` : ""}
              {excludedCount ? ` · excluded ${excludedCount}` : ""}
              {assigned ? ` · preferred → ${assigned.shopName}` : ""}
            </p>
          ) : null}
        </div>
        <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {typeof onListFilterChange === "function" && !returningOnly ? (
            <div style={{ minWidth: 150 }}>
              <Select
                aria-label="Filter shops"
                value={filter}
                onChange={(v) => onListFilterChange(v || "all")}
                options={FILTER_OPTIONS}
              />
            </div>
          ) : null}
          {showHeaderAssign && typeof onAssignShop === "function" ? (
            <Button size="sm" variant="secondary" onClick={onAssignShop}>
              Find & assign shop
            </Button>
          ) : null}
          {assigned && canUnlink && showHeaderAssign ? (
            <Button size="sm" variant="secondary" onClick={onUnlinkAssignment}>
              Unlink preferred
            </Button>
          ) : null}
        </span>
      </div>

      {!compact ? (
        <p
          style={{
            margin: "0 0 12px",
            fontSize: 12.5,
            color: "var(--muted)",
            lineHeight: 1.45,
          }}
        >
          <strong>Returning</strong> = order history (≥2 completed).{" "}
          <strong>Assign</strong> on a row makes that shop preferred for new
          orders. <strong>Unlink</strong> clears preferred.{" "}
          <strong>Exclude</strong> blocks marketplace for bad experience —
          separate from assign.
        </p>
      ) : null}

      {selectable && selectedShopId != null && String(selectedShopId) !== "" ? (
        <button
          type="button"
          onClick={() => onSelectShop(null)}
          style={{
            marginBottom: 10,
            border: "none",
            background: "transparent",
            color: "var(--accent, #20307f)",
            fontWeight: 600,
            fontSize: 12,
            cursor: "pointer",
            padding: 0,
          }}
        >
          Clear shop filter
        </button>
      ) : null}

      {rows.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
          {filter === "returning"
            ? "Not a returning customer at any shop yet."
            : filter === "excluded"
              ? "No excluded shops."
              : filter === "assigned"
                ? "No preferred shop assigned."
                : "No shop history yet — this customer has not placed an assigned order."}
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map((h) => {
            const stat = customerShopStat({
              completed: h.completedOrders,
              total: h.totalOrders,
              isReturning: h.isReturning,
            });
            const selected =
              selectedShopId != null &&
              String(selectedShopId) === String(h.shopId);
            const RowTag = selectable ? "button" : "div";
            const busyExclude = String(exclusionBusyShopId) === String(h.shopId);
            const busyAssign = String(assignBusyShopId) === String(h.shopId);
            const isThisAssigned = Boolean(h.isAssignedShop);
            return (
              <div
                key={h.shopId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "12px 12px",
                  borderRadius: 10,
                  border: selected
                    ? "1px solid var(--accent, #20307f)"
                    : h.isExcluded
                      ? "1px solid #FECACA"
                      : "1px solid var(--line, #e6e9f0)",
                  background: selected
                    ? "var(--brand-50, #eef2ff)"
                    : h.isExcluded
                      ? "#FEF2F2"
                      : isThisAssigned
                        ? "#ECFDF5"
                        : h.isReturning
                          ? "var(--brand-50, #f5f7ff)"
                          : "transparent",
                }}
              >
                <RowTag
                  type={selectable ? "button" : undefined}
                  onClick={
                    selectable
                      ? () => onSelectShop(selected ? null : h)
                      : undefined
                  }
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    minWidth: 0,
                    flex: 1,
                    border: "none",
                    background: "transparent",
                    cursor: selectable ? "pointer" : "default",
                    textAlign: "left",
                    padding: 0,
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <strong style={{ fontSize: 13 }}>{h.shopName}</strong>
                    {h.isReturning ? (
                      <Badge tone="brand">Returning</Badge>
                    ) : null}
                    {isThisAssigned ? (
                      <Badge tone="success">Preferred</Badge>
                    ) : null}
                    {h.isExcluded ? (
                      <Badge tone="danger">Excluded</Badge>
                    ) : null}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>
                    {stat
                      ? stat.count
                      : `${h.totalOrders} order${h.totalOrders === 1 ? "" : "s"}`}
                    {h.exclusionReason
                      ? ` · ${h.exclusionReason}`
                      : selectable
                        ? " · click to filter orders"
                        : null}
                  </span>
                  {isThisAssigned ? (
                    <span style={{ fontSize: 11, color: "var(--success, #047857)", fontWeight: 600 }}>
                      New orders offered here first
                    </span>
                  ) : h.isExcluded ? (
                    <span style={{ fontSize: 11, color: "var(--danger)", fontWeight: 600 }}>
                      Marketplace blocked — orders will not go here
                    </span>
                  ) : null}
                </RowTag>
                <span
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: 8,
                    flexShrink: 0,
                  }}
                >
                  <div style={{ textAlign: "right" }}>
                    <strong style={{ fontSize: 14 }}>{money(h.totalSpend)}</strong>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>
                      shop spend
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {canAssignRow && !isThisAssigned ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busyAssign}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAssignShopRow(h);
                        }}
                        title="Make this the preferred shop for new orders"
                      >
                        {busyAssign ? "…" : "Assign"}
                      </Button>
                    ) : null}
                    {isThisAssigned && canUnlink ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUnlinkAssignment();
                        }}
                        title="Clear preferred assignment for this shop"
                      >
                        Unlink
                      </Button>
                    ) : null}
                    {canExclude ? (
                      <Button
                        size="sm"
                        variant={h.isExcluded ? "secondary" : "danger"}
                        disabled={busyExclude}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleExclusion(h);
                        }}
                        title={
                          h.isExcluded
                            ? "Allow marketplace orders to this shop again"
                            : "Block marketplace orders to this shop (bad experience)"
                        }
                      >
                        {busyExclude ? "…" : h.isExcluded ? "Include" : "Exclude"}
                      </Button>
                    ) : null}
                  </div>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
