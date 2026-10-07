import { useState } from "react";
import { TbChevronDown, TbX, TbCheck } from "react-icons/tb";

/** Searchable multi-select dropdown for collection zones. */
export default function ZoneMultiSelect({ zones = [], selectedIds = [], onChange, error }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = zones.filter((z) => {
    const name = (z.name ?? z.zoneName ?? "").toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const selectedZones = zones.filter((z) => selectedIds.includes(String(z.id ?? z._id)));

  const toggle = (rawId) => {
    const id = String(rawId);
    const next = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];
    onChange(next);
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
          padding: selectedZones.length ? "7px 10px" : "9px 12px",
          border: `1.5px solid ${error ? "#ef4444" : open ? "#3b82f6" : "#d1d5db"}`,
          borderRadius: 8,
          background: "#fff",
          cursor: "pointer",
          fontSize: 13,
          color: selectedZones.length ? "#1e293b" : "#94a3b8",
          gap: 8,
          minHeight: 38,
          outline: "none",
          boxShadow: open ? "0 0 0 3px rgba(59,130,246,0.1)" : "none",
          transition: "border-color 0.15s, box-shadow 0.15s",
        }}
      >
        {selectedZones.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, flex: 1, alignItems: "center" }}>
            {selectedZones.map((z) => {
              const id = String(z.id ?? z._id);
              return (
                <span
                  key={id}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                    background: "#eff6ff",
                    color: "#2563eb",
                    borderRadius: 5,
                    padding: "2px 7px 2px 6px",
                    fontSize: 12,
                    fontWeight: 500,
                    border: "1px solid #bfdbfe",
                  }}
                >
                  {z.name ?? z.zoneName ?? `Zone #${id}`}
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(id);
                    }}
                    style={{ cursor: "pointer", color: "#93c5fd", display: "flex", marginLeft: 1 }}
                  >
                    <TbX size={11} />
                  </span>
                </span>
              );
            })}
          </div>
        ) : (
          <span>Select zones…</span>
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
          {zones.length > 5 && (
            <div style={{ padding: "8px 10px", borderBottom: "1px solid #f1f5f9" }}>
              <input
                type="text"
                placeholder="Search zones…"
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

          <div style={{ overflowY: "auto", maxHeight: 200 }}>
            {filtered.length === 0 ? (
              <p style={{ margin: 0, padding: "12px", fontSize: 12, color: "#94a3b8" }}>
                {zones.length ? "No zones match." : "No zones loaded."}
              </p>
            ) : (
              filtered.map((z) => {
                const id = String(z.id ?? z._id);
                const checked = selectedIds.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggle(id)}
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
                        transition: "all 0.1s",
                      }}
                    >
                      {checked && <TbCheck size={10} color="#fff" />}
                    </span>
                    {z.name ?? z.zoneName ?? `Zone #${id}`}
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
