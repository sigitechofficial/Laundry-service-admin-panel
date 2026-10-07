import { useState } from "react";
import { TbChevronDown, TbX, TbCheck } from "react-icons/tb";

/**
 * Searchable multi-select for catalog entities (services, categories, items, add-ons).
 * options: [{ value, label, price? }]
 */
export default function CatalogMultiSelect({
  options = [],
  selectedIds = [],
  onChange,
  error,
  placeholder = "Select…",
  searchThreshold = 5,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = options.filter((o) =>
    String(o.label || "")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const selected = options.filter((o) => selectedIds.includes(String(o.value)));

  const toggle = (rawId) => {
    const id = String(rawId);
    const next = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];
    onChange(next);
  };

  const formatPrice = (price) => {
    if (price == null || price === "") return null;
    const n = Number(price);
    if (!Number.isFinite(n)) return null;
    return `£${n.toFixed(2)}`;
  };

  return (
    <div style={{ position: "relative" }}>
      {open && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 99 }}
          onClick={() => {
            setOpen(false);
            setSearch("");
          }}
        />
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: selected.length ? "7px 10px" : "9px 12px",
          border: `1.5px solid ${error ? "#ef4444" : open ? "#3b82f6" : "#d1d5db"}`,
          borderRadius: 8,
          background: "#fff",
          cursor: "pointer",
          fontSize: 13,
          color: selected.length ? "#1e293b" : "#94a3b8",
          gap: 8,
          minHeight: 38,
          outline: "none",
          boxShadow: open ? "0 0 0 3px rgba(59,130,246,0.1)" : "none",
          transition: "border-color 0.15s, box-shadow 0.15s",
        }}
      >
        {selected.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, flex: 1, alignItems: "center" }}>
            {selected.map((o) => {
              const priceLabel = formatPrice(o.price);
              return (
                <span
                  key={o.value}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    background: "#eff6ff",
                    color: "#2563eb",
                    borderRadius: 5,
                    padding: "2px 7px 2px 6px",
                    fontSize: 12,
                    fontWeight: 500,
                    border: "1px solid #bfdbfe",
                  }}
                >
                  {o.label}
                  {priceLabel ? (
                    <span style={{ color: "#64748b", fontWeight: 400 }}>{priceLabel}</span>
                  ) : null}
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(o.value);
                    }}
                    style={{ cursor: "pointer", color: "#93c5fd", display: "flex" }}
                  >
                    <TbX size={11} />
                  </span>
                </span>
              );
            })}
          </div>
        ) : (
          <span>{placeholder}</span>
        )}
        <TbChevronDown
          size={15}
          style={{
            flexShrink: 0,
            color: "#64748b",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.15s",
          }}
        />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1.5px solid #e2e8f0",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.09)",
            zIndex: 100,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {options.length > searchThreshold && (
            <div style={{ padding: "8px 10px", borderBottom: "1px solid #f1f5f9" }}>
              <input
                type="text"
                placeholder="Search…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
                style={{
                  width: "100%",
                  border: "1px solid #e2e8f0",
                  borderRadius: 7,
                  padding: "5px 9px",
                  fontSize: 12,
                  outline: "none",
                  color: "#1e293b",
                  background: "#f8fafc",
                }}
              />
            </div>
          )}

          <div style={{ overflowY: "auto", maxHeight: 220 }}>
            {filtered.length === 0 ? (
              <p style={{ margin: 0, padding: "12px", fontSize: 12, color: "#94a3b8" }}>
                {options.length ? "No matches." : "No options loaded."}
              </p>
            ) : (
              filtered.map((o) => {
                const checked = selectedIds.includes(String(o.value));
                const priceLabel = formatPrice(o.price);
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => toggle(o.value)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 12px",
                      border: "none",
                      background: checked ? "#eff6ff" : "transparent",
                      cursor: "pointer",
                      fontSize: 13,
                      color: checked ? "#1d4ed8" : "#1e293b",
                      textAlign: "left",
                      borderBottom: "1px solid #f8fafc",
                    }}
                  >
                    <span
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 4,
                        border: `2px solid ${checked ? "#3b82f6" : "#d1d5db"}`,
                        background: checked ? "#3b82f6" : "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {checked && <TbCheck size={10} color="#fff" />}
                    </span>
                    <span style={{ flex: 1 }}>{o.label}</span>
                    {priceLabel ? (
                      <span style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>
                        {priceLabel}
                      </span>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>

          {selectedIds.length > 0 && (
            <div
              style={{
                padding: "6px 12px",
                borderTop: "1px solid #f1f5f9",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#fafbfc",
              }}
            >
              <span style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>
                {selectedIds.length} selected
              </span>
              <button
                type="button"
                onClick={() => onChange([])}
                style={{
                  fontSize: 11,
                  color: "#ef4444",
                  background: "none",
                  border: "1px solid #fecaca",
                  borderRadius: 5,
                  cursor: "pointer",
                  padding: "2px 8px",
                  fontWeight: 500,
                }}
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
