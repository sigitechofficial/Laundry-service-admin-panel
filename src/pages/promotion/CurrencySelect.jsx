import { useMemo } from "react";
import { Select } from "../../design-system";
import { useCurrencyUnits } from "../../hooks/useCurrency";

/**
 * Pick a currency (ISO code) from the platform's currency units — the list the zone form
 * uses (admin/getUnitsDistanceAndCurrency). `value` is the ISO code ("" = none chosen).
 * A saved code that is no longer in the list (an inactive unit) still shows as chosen.
 */
export default function CurrencySelect({ value, onChange, placeholder = "Choose currency", error, disabled, "aria-label": ariaLabel = "Currency" }) {
  const { options: units, isLoading } = useCurrencyUnits();
  const options = useMemo(() => {
    const list = units.map((unit) => {
      const code = String(unit.name ?? unit.code ?? "").trim().toUpperCase();
      const symbol = String(unit.symbol ?? "").trim();
      return { value: code, label: symbol && symbol !== code ? `${code} (${symbol})` : code };
    });
    const current = String(value || "").trim().toUpperCase();
    if (current && !list.some((o) => o.value === current)) list.unshift({ value: current, label: current });
    return list;
  }, [units, value]);

  return (
    <Select
      aria-label={ariaLabel}
      value={value || ""}
      onChange={(v) => onChange(v ?? "")}
      options={options}
      placeholder={isLoading ? "Loading currencies…" : placeholder}
      error={error}
      disabled={disabled}
    />
  );
}
