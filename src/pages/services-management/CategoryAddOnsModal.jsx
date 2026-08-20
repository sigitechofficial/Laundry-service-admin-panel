import { Badge, Modal } from "../../design-system";
import { formatAmount } from "../../utilities/formatters";
import {
  getAddOnsForCategoryItems,
  groupAddOnsByCategory,
} from "./serviceAddOnsUtils";

export default function CategoryAddOnsModal({
  open,
  onClose,
  categoryName,
  subCategories = [],
  addOnsList = [],
}) {
  const addOns = getAddOnsForCategoryItems(subCategories, addOnsList);
  const grouped = groupAddOnsByCategory(addOns);

  return (
    <Modal
      open={open}
      title={`Add-ons — ${categoryName || "Category"}`}
      description="Add-ons customers and agents can pick for items in this category. Linked via each add-on’s item ids."
      onClose={onClose}
      secondaryLabel="Close"
      primaryLabel="Done"
      onPrimary={onClose}
    >
      {addOns.length === 0 ? (
        <p style={{ color: "var(--muted)", margin: 0 }}>
          No add-ons linked to items in this category.
        </p>
      ) : (
        <div
          className="jd-catalog-scroll"
          tabIndex={0}
          role="region"
          aria-label={`${addOns.length} add-ons${categoryName ? ` for ${categoryName}` : ""}`}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            minHeight: 0,
            maxHeight: "min(56vh, calc(100vh - 260px))",
            overflowX: "hidden",
            overflowY: "auto",
            overscrollBehavior: "contain",
            paddingRight: 4,
          }}
        >
          <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
            {addOns.length} {addOns.length === 1 ? "add-on" : "add-ons"} linked
            {categoryName ? ` to ${categoryName}` : ""}
          </p>

          {[...grouped.entries()].map(([groupName, services]) => (
            <div
              key={groupName}
              style={{
                border: "1px solid var(--line)",
                borderRadius: "var(--r-lg)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "10px 16px",
                  background: "var(--canvas)",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--accent-ink)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {groupName}
                <span
                  style={{
                    marginLeft: 8,
                    fontWeight: 500,
                    color: "var(--muted)",
                    letterSpacing: 0,
                    textTransform: "none",
                  }}
                >
                  {services.length} {services.length === 1 ? "add-on" : "add-ons"}
                </span>
              </div>
              <div
                style={{
                  padding: "12px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {services.map((svc) => (
                  <div
                    key={svc.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 16,
                      padding: "8px 10px",
                      borderRadius: "var(--r-sm)",
                      background: "var(--canvas)",
                    }}
                  >
                    <span style={{ fontWeight: 500 }}>{svc.name}</span>
                    <Badge tone="brand">{formatAmount(svc.price, null, { applyDefault: true })}</Badge>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
