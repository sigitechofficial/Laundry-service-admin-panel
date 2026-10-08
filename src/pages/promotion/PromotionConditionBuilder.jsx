import { useState } from "react";
import { Button, Input, Select } from "../../design-system";
import ZoneMultiSelect from "./ZoneMultiSelect";
import CatalogMultiSelect from "./CatalogMultiSelect";
import {
  WEEKDAYS, OPERATOR_LABELS, LOGIC_GROUPS, CUSTOMER_TYPES, PAYMENT_METHODS,
  CONDITION_DEFS, CONDITION_TYPE_OPTIONS, newCondition, conditionError,
} from "./promotionConditions";

/* ─── Small editors ──────────────────────────────────────────────────────── */

function toggleIn(list, item) {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

export function DayPicker({ value = [], onChange }) {
  return (
    <div className="flex flex-wrap gap-1">
      {WEEKDAYS.map((d) => {
        const on = value.includes(d.value);
        return (
          <button
            key={d.value}
            type="button"
            onClick={() => onChange(toggleIn(value, d.value))}
            className={`text-xs px-2.5 py-1.5 rounded-md border font-medium ${
              on ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-gray-300 text-gray-600"
            }`}
          >
            {d.label}
          </button>
        );
      })}
    </div>
  );
}

function CheckGroup({ options, value = [], onChange }) {
  return (
    <div className="flex flex-wrap gap-3">
      {options.map((o) => (
        <label key={o.value} className="inline-flex items-center gap-1.5 text-sm text-gray-700">
          <input type="checkbox" checked={value.includes(o.value)} onChange={() => onChange(toggleIn(value, o.value))} />
          {o.label}
        </label>
      ))}
    </div>
  );
}

function CodeChips({ value = [], onChange }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const code = draft.trim().toUpperCase();
    if (!code || value.some((c) => c.toUpperCase() === code)) {
      setDraft("");
      return;
    }
    onChange([...value, code]);
    setDraft("");
  };
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="Code"
        />
        <Button variant="secondary" size="sm" onClick={add}>Add</Button>
      </div>
      <div className="flex flex-wrap gap-1">
        {value.map((c) => (
          <span key={c} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-semibold px-2 py-1 rounded-full">
            {c}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== c))} className="hover:text-red-600">✕</button>
          </span>
        ))}
      </div>
    </div>
  );
}

function ValueEditor({ condition, onChange, zones, catalogOptions }) {
  const def = CONDITION_DEFS[condition.conditionType];
  const v = condition.value;
  switch (def.kind) {
    case "boolean":
      return (
        <Select
          aria-label="First order"
          options={[{ value: "true", label: "Yes — first order only" }, { value: "false", label: "No — repeat orders only" }]}
          value={String(v)}
          onChange={(next) => onChange(next === "true")}
        />
      );
    case "integer":
    case "money": {
      const step = def.kind === "money" ? "0.01" : "1";
      const placeholder = def.kind === "money" ? "£" : "Qty";
      if (condition.operator === "between") {
        const [min = "", max = ""] = Array.isArray(v) ? v : [];
        return (
          <div className="flex items-center gap-2">
            <Input type="number" min="0" step={step} value={min} placeholder="Min" onChange={(e) => onChange([e.target.value, max])} />
            <span className="text-xs text-gray-500">and</span>
            <Input type="number" min="0" step={step} value={max} placeholder="Max" onChange={(e) => onChange([min, e.target.value])} />
          </div>
        );
      }
      return (
        <Input type="number" min="0" step={step} value={v ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      );
    }
    case "zones":
      return (
        <ZoneMultiSelect
          zones={zones}
          selectedIds={(v || []).map(String)}
          onChange={(ids) => onChange(ids)}
        />
      );
    case "catalog":
      return (
        <CatalogMultiSelect
          options={catalogOptions[def.catalog] || []}
          selectedIds={(v || []).map(String)}
          onChange={(ids) => onChange(ids)}
          placeholder="Select…"
        />
      );
    case "days":
      return <DayPicker value={v || []} onChange={onChange} />;
    case "timeRange":
      return (
        <div className="flex items-center gap-2">
          <Input type="time" value={v?.start || ""} onChange={(e) => onChange({ ...v, start: e.target.value })} />
          <span className="text-xs text-gray-500">to</span>
          <Input type="time" value={v?.end || ""} onChange={(e) => onChange({ ...v, end: e.target.value })} />
        </div>
      );
    case "schedule":
      return (
        <div className="space-y-2">
          <DayPicker value={v?.days || []} onChange={(days) => onChange({ ...v, days })} />
          <div className="flex items-center gap-2">
            <Input type="time" value={v?.startTime || ""} onChange={(e) => onChange({ ...v, startTime: e.target.value })} />
            <span className="text-xs text-gray-500">to</span>
            <Input type="time" value={v?.endTime || ""} onChange={(e) => onChange({ ...v, endTime: e.target.value })} />
          </div>
        </div>
      );
    case "customerType":
      return <CheckGroup options={CUSTOMER_TYPES} value={v || []} onChange={onChange} />;
    case "payment":
      return <CheckGroup options={PAYMENT_METHODS} value={v || []} onChange={onChange} />;
    case "codes":
      return <CodeChips value={v || []} onChange={onChange} />;
    default:
      return null;
  }
}

/* ─── Builder ────────────────────────────────────────────────────────────── */

export default function PromotionConditionBuilder({ conditions, onChange, zones = [], catalogOptions = {} }) {
  const add = () => onChange([...conditions, newCondition()]);
  const remove = (idx) => onChange(conditions.filter((_, i) => i !== idx));
  const patch = (idx, next) => onChange(conditions.map((c, i) => (i === idx ? { ...c, ...next } : c)));

  // Changing the type resets operator + value so stale shapes are never sent.
  const changeType = (idx, conditionType) => {
    const fresh = newCondition(conditionType);
    patch(idx, { conditionType, operator: fresh.operator, value: fresh.value });
  };

  const changeOperator = (idx, c, operator) => {
    const def = CONDITION_DEFS[c.conditionType];
    if (def.kind !== "integer" && def.kind !== "money") return patch(idx, { operator });
    // between ↔ single value: reshape the number(s)
    if (operator === "between" && !Array.isArray(c.value)) return patch(idx, { operator, value: [c.value ?? "", ""] });
    if (operator !== "between" && Array.isArray(c.value)) return patch(idx, { operator, value: c.value[0] ?? "" });
    return patch(idx, { operator });
  };

  return (
    <div className="space-y-3">
      {conditions.map((c, i) => {
        const def = CONDITION_DEFS[c.conditionType];
        const error = conditionError(c);
        return (
          <div key={i} className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-3">
                <Select aria-label="Logic group" options={LOGIC_GROUPS} value={c.logicGroup || "ALL"} onChange={(v) => patch(i, { logicGroup: v })} />
              </div>
              <div className="col-span-5">
                <Select
                  aria-label="Condition type"
                  options={def ? CONDITION_TYPE_OPTIONS : [{ value: c.conditionType, label: c.conditionType }, ...CONDITION_TYPE_OPTIONS]}
                  value={c.conditionType}
                  onChange={(v) => changeType(i, v)}
                />
              </div>
              <div className="col-span-3">
                {def && (
                  <Select
                    aria-label="Operator"
                    options={def.operators.map((op) => ({ value: op, label: OPERATOR_LABELS[op] || op }))}
                    value={c.operator}
                    onChange={(v) => changeOperator(i, c, v)}
                  />
                )}
              </div>
              <div className="col-span-1 text-right">
                <button type="button" onClick={() => remove(i)} className="text-red-500 hover:text-red-700 text-sm font-medium px-2" title="Remove condition">✕</button>
              </div>
            </div>
            {def && (
              <ValueEditor
                condition={c}
                onChange={(value) => patch(i, { value })}
                zones={zones}
                catalogOptions={catalogOptions}
              />
            )}
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
        );
      })}
      <button type="button" onClick={add} className="text-blue-600 text-sm font-medium hover:text-blue-800">
        + Add Condition
      </button>
    </div>
  );
}
