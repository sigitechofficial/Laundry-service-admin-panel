import { Badge, Button } from "../../../design-system";
import { formatMoney } from "../../../utilities/formatters";
import { customerShopStat } from "../../order-management/returningCustomerStat";

const PANEL = {
  padding: 16,
  border: "1px solid #e6e9f0",
  borderRadius: 16,
  background: "#fff",
  boxShadow: "0 1px 2px rgba(16, 21, 31, 0.04)",
};

/**
 * Per-shop order + spend history for a customer.
 * Same returning-customer threshold as Assign order / Order details.
 *
 * @param {object} props
 * @param {Array} props.history
 * @param {string} [props.title]
 * @param {string} [props.currencySymbol]
 * @param {number|string|null} [props.selectedShopId] - highlight / filter selection
 * @param {(shop: object|null) => void} [props.onSelectShop] - click row to filter orders
 * @param {boolean} [props.returningOnly] - show only returning shops
 * @param {(shop: object) => void} [props.onToggleExclusion] - exclude/include shop for customer
 * @param {number|string|null} [props.exclusionBusyShopId]
 * @param {() => void} [props.onAssignShop] - open assign preferred shop modal
 * @param {() => void} [props.onUnlinkAssignment] - open unlink modal when customer has active assignment
 * @param {object|null} [props.activeAssignment]
 */
export default function CustomerShopHistoryPanel({
  history = [],
  title = "Orders by shop",
  currencySymbol = "£",
  selectedShopId = null,
  onSelectShop,
  returningOnly = false,
  onToggleExclusion,
  exclusionBusyShopId = null,
  onAssignShop,
  onUnlinkAssignment,
  activeAssignment = null,
}) {
  const allRows = Array.isArray(history) ? history : [];
  const rows = returningOnly ? allRows.filter((h) => h.isReturning) : allRows;
  const returningCount = allRows.filter((h) => h.isReturning).length;
  const excludedCount = allRows.filter((h) => h.isExcluded).length;
  const assigned = activeAssignment || allRows.find((h) => h.activeAssignment)?.activeAssignment;
  const selectable = typeof onSelectShop === "function";
  const canExclude = typeof onToggleExclusion === "function";
  const canAssign = typeof onAssignShop === "function";
  const money = (n) => formatMoney(Number(n) || 0, currencySymbol);

  return (
    <div style={PANEL}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{title}</h2>
        <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {allRows.length ? (
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              {allRows.length} shop{allRows.length === 1 ? "" : "s"}
              {returningCount ? ` · returning at ${returningCount}` : ""}
              {excludedCount ? ` · excluded ${excludedCount}` : ""}
              {assigned ? ` · assigned → ${assigned.shopName}` : ""}
            </span>
          ) : null}
          {canAssign ? (
            <Button size="sm" variant="secondary" onClick={onAssignShop}>
              Assign shop
            </Button>
          ) : null}
          {assigned && typeof onUnlinkAssignment === "function" ? (
            <Button size="sm" variant="secondary" onClick={onUnlinkAssignment}>
              Unlink
            </Button>
          ) : null}
        </span>
      </div>

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
          {returningOnly
            ? "Not a returning customer at any shop yet."
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
            const busy = String(exclusionBusyShopId) === String(h.shopId);
            return (
              <div
                key={h.shopId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "10px 12px",
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
                    {h.isAssignedShop ? (
                      <Badge tone="success">Assigned</Badge>
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
                </RowTag>
                <span
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: 6,
                    flexShrink: 0,
                  }}
                >
                  <strong style={{ fontSize: 14 }}>{money(h.totalSpend)}</strong>
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>
                    shop spend
                  </span>
                  {canExclude ? (
                    <Button
                      size="sm"
                      variant={h.isExcluded ? "secondary" : "danger"}
                      disabled={busy}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleExclusion(h);
                      }}
                    >
                      {busy ? "…" : h.isExcluded ? "Include" : "Exclude"}
                    </Button>
                  ) : null}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
