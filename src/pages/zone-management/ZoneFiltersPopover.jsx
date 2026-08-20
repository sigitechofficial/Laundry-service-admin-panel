import { useMemo, useState } from "react";
import { Button, Field, Select } from "../../design-system";
import { TbFilter } from "../../shared/icons/index";

export default function ZoneFiltersPopover({
  city,
  onCityChange,
  paymentMethod,
  onPaymentMethodChange,
  assignment,
  onAssignmentChange,
  cityOptions = [],
  paymentOptions = [],
  onClearFilters,
  hasActiveFilters = false,
}) {
  const [open, setOpen] = useState(false);

  const cities = useMemo(
    () =>
      (cityOptions || [])
        .map((c) => ({
          value: String(c.value ?? c),
          label: String(c.label ?? c.value ?? c),
        }))
        .filter((o) => o.value && o.value !== "—"),
    [cityOptions]
  );

  const payments = useMemo(
    () =>
      (paymentOptions || [])
        .map((p) => ({
          value: String(p.value ?? p),
          label: String(p.label ?? p.value ?? p),
        }))
        .filter((o) => o.value && o.value !== "N/A"),
    [paymentOptions]
  );

  const assignmentOptions = [
    { value: "assigned", label: "Assigned" },
    { value: "unassigned", label: "Unassigned" },
  ];

  return (
    <div style={{ position: "relative" }}>
      <Button variant="secondary" onClick={() => setOpen((v) => !v)}>
        <TbFilter size={18} />
        {hasActiveFilters ? "Filters •" : "Filters"}
      </Button>
      {open ? (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            zIndex: 20,
            minWidth: 280,
            padding: 16,
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-md)",
            boxShadow: "var(--e-2)",
            display: "grid",
            gap: 12,
          }}
        >
          <strong>Filter zones</strong>
          <Field label="City">
            <Select
              aria-label="City"
              value={city || ""}
              onChange={(value) => onCityChange?.(value)}
              options={cities}
              placeholder="All cities"
            />
          </Field>
          <Field label="Payment method">
            <Select
              aria-label="Payment method"
              value={paymentMethod || ""}
              onChange={(value) => onPaymentMethodChange?.(value)}
              options={payments}
              placeholder="All payment methods"
            />
          </Field>
          <Field label="Zone assign">
            <Select
              aria-label="Zone assign"
              value={assignment || ""}
              onChange={(value) => onAssignmentChange?.(value)}
              options={assignmentOptions}
              placeholder="All"
            />
          </Field>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                onClearFilters?.();
                setOpen(false);
              }}
            >
              Clear all
            </Button>
            <Button size="sm" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
