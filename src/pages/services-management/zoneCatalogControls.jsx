import { Fragment, useEffect, useMemo, useState } from "react";
import { Button, Field, Input, Select } from "../../design-system";
import useToaster from "../../components/ui/Toaster";
import {
  useCopyZoneCatalogOverridesMutation,
  useResetZoneCatalogOverrideMutation,
  useUpsertZoneCatalogOverrideMutation,
} from "../../store/services/api";
import { TbChevronDown, TbChevronRight } from "../../shared/icons/index";
import { formatAmount } from "../../utilities/formatters";
import { getApiErrorMessage } from "../../store/services/apiErrors";
import { DirectoryDotPill, DirectoryTableWrap } from "../directory-table/directoryTable";
import { EmptyHint } from "./QueryState";

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

/**
 * Single place that writes zone overlays. Every control on the Service
 * Catalog page in zone scope goes through this hook so toasts, busy state
 * and error handling stay consistent.
 */
export function useZoneOverlayActions(zoneId) {
  const { success, error: toastError } = useToaster();
  const [upsert, { isLoading: saving }] = useUpsertZoneCatalogOverrideMutation();
  const [reset, { isLoading: resetting }] = useResetZoneCatalogOverrideMutation();

  const save = async (body, okMsg) => {
    if (!zoneId) return false;
    try {
      await upsert({ zoneId, body }).unwrap();
      if (okMsg) success(okMsg);
      return true;
    } catch (err) {
      toastError(getApiErrorMessage(err, "Could not save zone change."));
      return false;
    }
  };

  const resetRow = async (body, okMsg) => {
    if (!zoneId) return false;
    try {
      await reset({ zoneId, body }).unwrap();
      success(okMsg || "Reset to master");
      return true;
    } catch (err) {
      toastError(getApiErrorMessage(err, "Could not reset to master."));
      return false;
    }
  };

  return { save, resetRow, busy: saving || resetting };
}

/* ------------------------------------------------------------------ */
/* Small presentational pieces                                         */
/* ------------------------------------------------------------------ */

export function ZoneVisibilityPill({ isEnabled, parentHidden = false }) {
  if (parentHidden) {
    return <DirectoryDotPill tone="neutral">Hidden by parent</DirectoryDotPill>;
  }
  return (
    <DirectoryDotPill tone={isEnabled ? "success" : "danger"}>
      {isEnabled ? "Visible" : "Hidden"}
    </DirectoryDotPill>
  );
}

export function ZoneSourcePill({ inherited, staged = false }) {
  if (staged) return <DirectoryDotPill tone="warning">Staged</DirectoryDotPill>;
  return (
    <DirectoryDotPill tone={inherited ? "neutral" : "info"}>
      {inherited ? "Master" : "Zone override"}
    </DirectoryDotPill>
  );
}

function ToggleVisibilityButton({ isEnabled, disabled, onClick, label }) {
  return (
    <Button
      size="sm"
      variant={isEnabled ? "secondary" : "primary"}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={`${isEnabled ? "Hide" : "Show"} ${label} in this zone`}
    >
      {isEnabled ? "Hide" : "Show"}
    </Button>
  );
}

function ResetButton({ disabled, onClick, label = "Reset" }) {
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {label}
    </Button>
  );
}

function formatPriceInput(value) {
  if (value == null || value === "") return "";
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : "";
}

/**
 * Inline price editor. Saves only when the value actually differs from
 * what the zone currently resolves to, so accidental clicks don't create
 * no-op overlays.
 */
export function ZonePriceEditor({
  price,
  zonePrice,
  masterPrice,
  priceInherited,
  staged,
  disabled,
  onSave,
}) {
  // Show the stored zone price when one exists (even while overlays are
  // staged/off); otherwise the effective price, which equals master.
  const shown = zonePrice != null && zonePrice !== "" ? zonePrice : price;
  const [draft, setDraft] = useState(formatPriceInput(shown));
  useEffect(() => {
    setDraft(formatPriceInput(shown));
  }, [shown]);

  const current = shown == null || shown === "" ? null : Number(shown);
  const draftNum = String(draft).trim() === "" ? null : Number(draft);
  const invalid = draftNum != null && (!Number.isFinite(draftNum) || draftNum < 0);
  const dirty =
    !invalid &&
    draftNum !== null &&
    (current === null || Math.abs(draftNum - current) > 0.0001);
  const commit = () => onSave(draftNum.toFixed(2));

  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
      <Input
        type="text"
        inputMode="decimal"
        value={draft}
        disabled={disabled}
        onChange={(e) => {
          const next = e.target.value.replace(",", ".");
          // digits with at most one dot and two decimals
          if (next === "" || /^\d*\.?\d{0,2}$/.test(next)) setDraft(next);
        }}
        onBlur={() => {
          if (!invalid && draftNum !== null) setDraft(draftNum.toFixed(2));
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Enter" && dirty && !invalid) {
            e.preventDefault();
            commit();
          }
        }}
        aria-label="Zone price"
        style={{ width: 92, textAlign: "right" }}
      />
      {dirty ? (
        <Button
          size="sm"
          disabled={disabled || invalid}
          onClick={(e) => {
            e.stopPropagation();
            commit();
          }}
        >
          Save
        </Button>
      ) : null}
      <span
        style={{ fontSize: 11, color: "var(--muted)", flexBasis: "100%" }}
        title={
          staged
            ? "Zone pricing is switched off in runtime settings (zoneCatalogOverridesEnabled). The zone price is stored and will apply once it is turned on."
            : undefined
        }
      >
        {priceInherited
          ? "Master price"
          : `Master ${formatAmount(masterPrice, null, { applyDefault: true })}${
              staged ? " · saved, applies when zone pricing is on" : ""
            }`}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Preferences for the selected service                                */
/* ------------------------------------------------------------------ */

function flattenPreferences(rows, depth = 0, parentHidden = false, out = []) {
  (rows || []).forEach((pref) => {
    const hiddenByParent = parentHidden;
    out.push({ pref, depth, parentHidden: hiddenByParent });
    flattenPreferences(
      pref.childTypes,
      depth + 1,
      hiddenByParent || !pref.isEnabled,
      out
    );
  });
  return out;
}

export function ZoneServicePreferences({
  serviceId,
  serviceHidden,
  preferences,
  disabled,
  onSave,
  onReset,
}) {
  const rows = useMemo(() => flattenPreferences(preferences), [preferences]);

  if (!rows.length) {
    return (
      <p style={{ margin: "0 0 12px", color: "var(--muted)", fontSize: 13 }}>
        No preferences linked to this service in the master catalog.
      </p>
    );
  }

  return (
    <div
      style={{
        marginBottom: 12,
        padding: 12,
        background: "var(--canvas)",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-lg)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: "var(--muted)",
          }}
        >
          Preferences in this zone
        </span>
        {serviceHidden ? (
          <DirectoryDotPill tone="warning">Service hidden — customers won&apos;t see these</DirectoryDotPill>
        ) : null}
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        {rows.map(({ pref, depth, parentHidden }) => (
          <div
            key={`${serviceId}-${pref.id}`}
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 8,
              padding: "6px 8px",
              marginLeft: depth * 18,
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-md)",
              opacity: parentHidden ? 0.6 : 1,
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 13, flex: "1 1 160px" }}>
              {pref.name}
              {depth > 0 ? (
                <span style={{ color: "var(--muted)", fontWeight: 400 }}> · sub-preference</span>
              ) : null}
            </span>
            <ZoneVisibilityPill isEnabled={pref.isEnabled} parentHidden={parentHidden} />
            <ZoneSourcePill inherited={pref.inherited} />
            <ToggleVisibilityButton
              label={pref.name}
              isEnabled={pref.isEnabled}
              disabled={disabled || parentHidden}
              onClick={() =>
                onSave(
                  {
                    type: "preference",
                    serviceId,
                    preferenceTypeId: pref.id,
                    entityId: pref.id,
                    isEnabled: !pref.isEnabled,
                    sortOrder: pref.sortOrder ?? null,
                  },
                  pref.isEnabled
                    ? `"${pref.name}" hidden in this zone`
                    : `"${pref.name}" visible in this zone`
                )
              }
            />
            {!pref.inherited ? (
              <ResetButton
                disabled={disabled}
                onClick={() =>
                  onReset(
                    {
                      type: "preference",
                      entityId: pref.id,
                      serviceId,
                      preferenceTypeId: pref.id,
                    },
                    `"${pref.name}" reset to master`
                  )
                }
              />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Categories → items table for the selected service (zone scope)       */
/* ------------------------------------------------------------------ */

function matchesSearch(cat, q) {
  if (!q) return true;
  const hay = [cat.name, cat.description, ...(cat.items || []).map((i) => i.name)]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

export function ZoneCategoriesTable({
  serviceHidden,
  categories,
  searchTerm,
  disabled,
  onSave,
  onReset,
}) {
  const [expanded, setExpanded] = useState({});
  const q = String(searchTerm || "").trim().toLowerCase();

  const rows = useMemo(
    () => (categories || []).filter((cat) => matchesSearch(cat, q)),
    [categories, q]
  );

  useEffect(() => {
    if (!q) return;
    setExpanded((prev) => {
      const next = { ...prev };
      rows.forEach((cat) => {
        if ((cat.items || []).some((i) => String(i.name || "").toLowerCase().includes(q))) {
          next[cat.categoryId] = true;
        }
      });
      return next;
    });
  }, [q, rows]);

  const toggle = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  if (!rows.length) {
    return (
      <DirectoryTableWrap>
        <EmptyHint>No categories found for this service.</EmptyHint>
      </DirectoryTableWrap>
    );
  }

  return (
    <DirectoryTableWrap>
      <p style={{ margin: 0, padding: "12px 16px 0", color: "#5c6673", fontSize: 13 }}>
        Hide/show categories and items for this zone, or set a zone price. Ordering follows the
        master catalog.
      </p>
      <div style={{ maxHeight: 560, overflow: "auto" }}>
        <table className="jd-tbl" style={{ minWidth: 560 }}>
          <thead>
            <tr>
              <th style={{ width: 44 }} />
              <th style={{ width: 40 }}>SL</th>
              <th>Category</th>
              <th style={{ width: 64 }}>Items</th>
              <th style={{ width: 130 }}>Status</th>
              <th style={{ width: 132, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((cat, idx) => {
              const isOpen = Boolean(expanded[cat.categoryId]);
              const items = cat.items || [];
              const visibleItems = items.filter((i) => i.isEnabled).length;
              const catHiddenByParent = serviceHidden;
              return (
                <Fragment key={cat.categoryId}>
                  <tr
                    onClick={() => toggle(cat.categoryId)}
                    style={{ cursor: "pointer", opacity: cat.isEnabled ? 1 : 0.7 }}
                  >
                    <td>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggle(cat.categoryId);
                        }}
                        aria-label={isOpen ? "Collapse" : "Expand"}
                      >
                        {isOpen ? <TbChevronDown size={18} /> : <TbChevronRight size={18} />}
                      </Button>
                    </td>
                    <td>{idx + 1}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{cat.name}</div>
                      {cat.description ? (
                        <div style={{ fontSize: 12, color: "var(--muted)", maxWidth: 360 }}>
                          {String(cat.description).replace(/<[^>]+>/g, "")}
                        </div>
                      ) : null}
                    </td>
                    <td>
                      {visibleItems}/{items.length}
                    </td>
                    <td>
                      <div style={{ display: "grid", gap: 4, justifyItems: "start" }}>
                        <ZoneVisibilityPill
                          isEnabled={cat.isEnabled}
                          parentHidden={catHiddenByParent}
                        />
                        <ZoneSourcePill inherited={cat.inherited} />
                      </div>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div
                        style={{
                          display: "flex",
                          gap: 6,
                          justifyContent: "flex-end",
                          flexWrap: "wrap",
                        }}
                      >
                        <ToggleVisibilityButton
                          label={cat.name}
                          isEnabled={cat.isEnabled}
                          disabled={disabled}
                          onClick={() =>
                            onSave(
                              {
                                type: "category",
                                categoryId: cat.categoryId,
                                entityId: cat.categoryId,
                                isEnabled: !cat.isEnabled,
                              },
                              cat.isEnabled
                                ? `"${cat.name}" hidden in this zone`
                                : `"${cat.name}" visible in this zone`
                            )
                          }
                        />
                        {!cat.inherited ? (
                          <ResetButton
                            disabled={disabled}
                            onClick={() =>
                              onReset(
                                { type: "category", entityId: cat.categoryId },
                                `"${cat.name}" reset to master`
                              )
                            }
                          />
                        ) : null}
                      </div>
                    </td>
                  </tr>

                  {isOpen ? (
                    <tr>
                      <td colSpan={6} style={{ background: "var(--canvas)", padding: 12 }}>
                        {items.length === 0 ? (
                          <p style={{ color: "var(--faint)", margin: 0, fontSize: 13 }}>
                            No items configured in the master catalog.
                          </p>
                        ) : (
                          <table className="jd-tbl">
                            <thead>
                              <tr>
                                <th>Item</th>
                                <th style={{ width: 170 }}>Zone price</th>
                                <th style={{ width: 130 }}>Status</th>
                                <th>Add-ons on this item</th>
                                <th style={{ width: 132, textAlign: "right" }}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {items.map((item) => {
                                const itemParentHidden =
                                  catHiddenByParent || !cat.isEnabled;
                                return (
                                  <tr
                                    key={item.subCategoryId}
                                    style={{ opacity: item.isEnabled ? 1 : 0.7 }}
                                  >
                                    <td style={{ fontWeight: 500 }}>
                                      <div>{item.name ?? "—"}</div>
                                      {item.masterStatus === false ? (
                                        <div style={{ fontSize: 11, color: "var(--muted)" }}>
                                          Inactive in master
                                        </div>
                                      ) : null}
                                    </td>
                                    <td>
                                      <ZonePriceEditor
                                        price={item.price}
                                        zonePrice={item.zonePrice}
                                        masterPrice={item.masterPrice}
                                        priceInherited={item.priceInherited}
                                        staged={item.staged}
                                        disabled={disabled}
                                        onSave={(price) =>
                                          onSave(
                                            {
                                              type: "item",
                                              subCategoryId: item.subCategoryId,
                                              entityId: item.subCategoryId,
                                              price,
                                            },
                                            `Zone price saved for "${item.name}"`
                                          )
                                        }
                                      />
                                    </td>
                                    <td>
                                      <div style={{ display: "grid", gap: 4 }}>
                                        <ZoneVisibilityPill
                                          isEnabled={item.isEnabled}
                                          parentHidden={itemParentHidden}
                                        />
                                        <ZoneSourcePill
                                          inherited={item.inherited && item.priceInherited}
                                          staged={item.staged}
                                        />
                                      </div>
                                    </td>
                                    <td>
                                      {(item.attach || []).length ? (
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                          {item.attach.map((link) => (
                                            <button
                                              key={link.addOnCategoryId}
                                              type="button"
                                              disabled={disabled}
                                              title={
                                                link.isEnabled
                                                  ? "Click to hide this add-on group on this item in the zone"
                                                  : "Click to show this add-on group on this item in the zone"
                                              }
                                              onClick={() =>
                                                onSave(
                                                  {
                                                    type: "attach",
                                                    subCategoryId: item.subCategoryId,
                                                    addOnCategoryId: link.addOnCategoryId,
                                                    isEnabled: !link.isEnabled,
                                                  },
                                                  link.isEnabled
                                                    ? `"${link.name}" hidden on "${item.name}"`
                                                    : `"${link.name}" shown on "${item.name}"`
                                                )
                                              }
                                              style={{
                                                padding: "2px 10px",
                                                borderRadius: 999,
                                                border: `1px solid ${
                                                  link.isEnabled ? "var(--brand-500)" : "var(--line-2)"
                                                }`,
                                                background: link.isEnabled
                                                  ? "var(--accent-tint)"
                                                  : "var(--canvas)",
                                                color: link.isEnabled ? "var(--ink)" : "var(--muted)",
                                                textDecoration: link.isEnabled ? "none" : "line-through",
                                                cursor: disabled ? "not-allowed" : "pointer",
                                                font: "inherit",
                                                fontSize: 12,
                                              }}
                                            >
                                              {link.name}
                                              {!link.inherited ? " •" : ""}
                                            </button>
                                          ))}
                                        </div>
                                      ) : (
                                        <span style={{ color: "var(--faint)" }}>—</span>
                                      )}
                                    </td>
                                    <td>
                                      <div
                                        style={{
                                          display: "flex",
                                          gap: 6,
                                          justifyContent: "flex-end",
                                          flexWrap: "wrap",
                                        }}
                                      >
                                        <ToggleVisibilityButton
                                          label={item.name}
                                          isEnabled={item.isEnabled}
                                          disabled={disabled}
                                          onClick={() =>
                                            onSave(
                                              {
                                                type: "item",
                                                subCategoryId: item.subCategoryId,
                                                entityId: item.subCategoryId,
                                                isEnabled: !item.isEnabled,
                                              },
                                              item.isEnabled
                                                ? `"${item.name}" hidden in this zone`
                                                : `"${item.name}" visible in this zone`
                                            )
                                          }
                                        />
                                        {!item.inherited ? (
                                          <ResetButton
                                            disabled={disabled}
                                            onClick={() =>
                                              onReset(
                                                { type: "item", entityId: item.subCategoryId },
                                                `"${item.name}" reset to master`
                                              )
                                            }
                                          />
                                        ) : null}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </DirectoryTableWrap>
  );
}

/* ------------------------------------------------------------------ */
/* Add-ons + repairs (zone-wide, not per service)                       */
/* ------------------------------------------------------------------ */

function CollapsibleSection({ title, hint, count, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section
      style={{
        border: "1px solid var(--line)",
        borderRadius: "var(--r-lg)",
        background: "var(--surface)",
        marginTop: 16,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 16px",
          background: "transparent",
          border: 0,
          cursor: "pointer",
          font: "inherit",
          textAlign: "left",
          color: "var(--ink)",
        }}
      >
        {open ? <TbChevronDown size={18} /> : <TbChevronRight size={18} />}
        <span style={{ fontWeight: 700 }}>{title}</span>
        <span style={{ color: "var(--muted)", fontSize: 13 }}>{hint}</span>
        <span style={{ marginLeft: "auto" }}>
          <DirectoryDotPill tone="neutral">{count}</DirectoryDotPill>
        </span>
      </button>
      {open ? <div style={{ padding: "0 16px 16px" }}>{children}</div> : null}
    </section>
  );
}

function PriceGroupTable({ groups, groupKey, groupType, rowKey, rowType, disabled, onSave, onReset }) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {groups.map((group) => {
        const rows = group.rows || [];
        return (
          <div
            key={group[groupKey]}
            style={{
              border: "1px solid var(--line)",
              borderRadius: "var(--r-md)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 8,
                padding: "10px 12px",
                background: "var(--canvas)",
                borderBottom: "1px solid var(--line)",
              }}
            >
              <span style={{ fontWeight: 600 }}>{group.name}</span>
              <ZoneVisibilityPill isEnabled={group.isEnabled} />
              <ZoneSourcePill inherited={group.inherited} />
              <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                <ToggleVisibilityButton
                  label={group.name}
                  isEnabled={group.isEnabled}
                  disabled={disabled}
                  onClick={() =>
                    onSave(
                      {
                        type: groupType,
                        [groupKey]: group[groupKey],
                        entityId: group[groupKey],
                        isEnabled: !group.isEnabled,
                      },
                      group.isEnabled
                        ? `"${group.name}" hidden in this zone`
                        : `"${group.name}" visible in this zone`
                    )
                  }
                />
                {!group.inherited ? (
                  <ResetButton
                    disabled={disabled}
                    onClick={() =>
                      onReset(
                        { type: groupType, entityId: group[groupKey] },
                        `"${group.name}" reset to master`
                      )
                    }
                  />
                ) : null}
              </div>
            </div>
            {rows.length ? (
              <table className="jd-tbl">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Zone price</th>
                    <th>Visibility</th>
                    <th style={{ textAlign: "right" }}>Zone actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row[rowKey]} style={{ opacity: row.isEnabled ? 1 : 0.7 }}>
                      <td style={{ fontWeight: 500 }}>{row.name}</td>
                      <td>
                        <ZonePriceEditor
                          price={row.price}
                          zonePrice={row.zonePrice}
                          masterPrice={row.masterPrice}
                          priceInherited={row.priceInherited}
                          staged={row.staged}
                          disabled={disabled}
                          onSave={(price) =>
                            onSave(
                              {
                                type: rowType,
                                [rowKey]: row[rowKey],
                                entityId: row[rowKey],
                                price,
                              },
                              `Zone price saved for "${row.name}"`
                            )
                          }
                        />
                      </td>
                      <td>
                        <ZoneVisibilityPill
                          isEnabled={row.isEnabled}
                          parentHidden={!group.isEnabled}
                        />
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <ToggleVisibilityButton
                            label={row.name}
                            isEnabled={row.isEnabled}
                            disabled={disabled}
                            onClick={() =>
                              onSave(
                                {
                                  type: rowType,
                                  [rowKey]: row[rowKey],
                                  entityId: row[rowKey],
                                  isEnabled: !row.isEnabled,
                                },
                                row.isEnabled
                                  ? `"${row.name}" hidden in this zone`
                                  : `"${row.name}" visible in this zone`
                              )
                            }
                          />
                          {!row.inherited ? (
                            <ResetButton
                              disabled={disabled}
                              onClick={() =>
                                onReset(
                                  { type: rowType, entityId: row[rowKey] },
                                  `"${row.name}" reset to master`
                                )
                              }
                            />
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ margin: 0, padding: 12, color: "var(--faint)", fontSize: 13 }}>
                Nothing under this group in the master catalog.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ZoneAddOnsSection({ addOnCategories, disabled, onSave, onReset }) {
  const groups = useMemo(
    () => (addOnCategories || []).map((c) => ({ ...c, rows: c.addOns || [] })),
    [addOnCategories]
  );
  const total = groups.reduce((n, g) => n + g.rows.length, 0);
  return (
    <CollapsibleSection
      title="Add-ons in this zone"
      hint="Zone-wide visibility and prices for add-on services"
      count={`${total} add-ons`}
    >
      {groups.length ? (
        <PriceGroupTable
          groups={groups}
          groupKey="addOnCategoryId"
          groupType="addOnCategory"
          rowKey="addOnServiceId"
          rowType="addOn"
          disabled={disabled}
          onSave={onSave}
          onReset={onReset}
        />
      ) : (
        <EmptyHint>No add-ons in the master catalog.</EmptyHint>
      )}
    </CollapsibleSection>
  );
}

export function ZoneRepairSection({ repair, disabled, onSave, onReset }) {
  const groups = useMemo(
    () => (repair || []).map((g) => ({ ...g, rows: g.options || [] })),
    [repair]
  );
  const total = groups.reduce((n, g) => n + g.rows.length, 0);
  return (
    <CollapsibleSection
      title="Repairs in this zone"
      hint="Zone-wide visibility and prices for repair garments and options"
      count={`${total} options`}
    >
      {groups.length ? (
        <PriceGroupTable
          groups={groups}
          groupKey="repairGarmentId"
          groupType="repairGarment"
          rowKey="repairOptionId"
          rowType="repairOption"
          disabled={disabled}
          onSave={onSave}
          onReset={onReset}
        />
      ) : (
        <EmptyHint>No repair catalog in master.</EmptyHint>
      )}
    </CollapsibleSection>
  );
}

/* ------------------------------------------------------------------ */
/* Copy overlays from another zone                                     */
/* ------------------------------------------------------------------ */

export function ZoneCopyOverlays({ zoneId, zones }) {
  const { success, error: toastError } = useToaster();
  const [fromZoneId, setFromZoneId] = useState("");
  const [copyFrom, { isLoading: copying }] = useCopyZoneCatalogOverridesMutation();

  const options = useMemo(
    () =>
      (zones || [])
        .filter((z) => String(z.id) !== String(zoneId))
        .map((z) => ({ value: String(z.id), label: z.name || `Zone ${z.id}` })),
    [zones, zoneId]
  );

  const handleCopy = async () => {
    if (!fromZoneId || !zoneId) return;
    try {
      await copyFrom({ zoneId, body: { fromZoneId, replace: false } }).unwrap();
      success("Overlays copied. Existing overrides in this zone were kept.");
      setFromZoneId("");
    } catch (err) {
      toastError(getApiErrorMessage(err, "Copy failed."));
    }
  };

  if (!options.length) return null;

  return (
    <div style={{ padding: 12, borderTop: "1px solid var(--line)" }}>
      <Field
        label="Copy overlays from"
        hint="Fills gaps only; overrides already set here are not replaced."
      >
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Select
              aria-label="Copy overlays from zone"
              value={fromZoneId}
              onChange={setFromZoneId}
              options={options}
              placeholder="Another zone"
            />
          </div>
          <Button
            size="sm"
            variant="secondary"
            disabled={!fromZoneId || copying}
            onClick={handleCopy}
          >
            {copying ? "Copying…" : "Copy"}
          </Button>
        </div>
      </Field>
    </div>
  );
}
