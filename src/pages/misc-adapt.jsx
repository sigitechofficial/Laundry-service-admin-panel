import { useState } from "react";
import dayjs from "dayjs";
import {
  Badge,
  Button as DsButton,
  Field,
  Input,
  Modal as DsModal,
  Select,
  Table,
} from "../design-system";
import { PaginationBar, Toggle } from "./misc-kit";

export function Box({ children, className = "", sx, component, display, ...props }) {
  const Tag = component === "button" ? "button" : "div";
  const hidden = sx?.display === "none";
  return (
    <Tag
      className={className}
      style={{ display: hidden ? "none" : display || undefined }}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function Typography({ children, className = "", variant, component, color, sx: _sx, ...props }) {
  const Tag = component === "span" ? "span" : variant === "h4" || variant === "h5" || variant === "h6" ? "h3" : "p";
  return (
    <Tag
      className={className}
      style={{
        margin: 0,
        color: color === "error.main" || color === "text.secondary" ? "var(--muted)" : undefined,
      }}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function Divider() {
  return <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "16px 0" }} />;
}

export function Button({ children, onClick, variant, startIcon, disabled, className, size, sx: _sx, ...props }) {
  const tone = variant === "contained" ? "primary" : variant === "outlined" || variant === "text" ? "secondary" : "secondary";
  return (
    <DsButton
      variant={tone}
      size={size === "small" ? "sm" : undefined}
      onClick={onClick}
      disabled={disabled}
      className={className}
      {...props}
    >
      {startIcon}
      {children}
    </DsButton>
  );
}

export function Tooltip({ title, children }) {
  return <span title={typeof title === "string" ? title : undefined}>{children}</span>;
}

export function CircularProgress() {
  return <span className="jd-field__hint">Loading…</span>;
}

export function Menu({ anchorEl, open, onClose, children }) {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        zIndex: 40,
        minWidth: 220,
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 8,
        boxShadow: "var(--e-2)",
        padding: 6,
        top: anchorEl?.getBoundingClientRect?.().bottom + 8 || 80,
        left: Math.max(12, (anchorEl?.getBoundingClientRect?.().right || 240) - 220),
      }}
    >
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "transparent", border: 0 }}
      />
      <div style={{ position: "relative", zIndex: 1, display: "grid" }}>{children}</div>
    </div>
  );
}

export function MenuItem({ children, onClick, selected }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: "left",
        padding: "8px 10px",
        border: 0,
        background: selected ? "var(--accent-bg)" : "transparent",
        borderRadius: 6,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

export function LocalizationProvider({ children }) {
  return children;
}

export function AdapterDayjs() {
  return null;
}

export function DatePicker({ value, onChange, slotProps }) {
  const str = value && dayjs(value).isValid() ? dayjs(value).format("YYYY-MM-DD") : "";
  return (
    <Input
      type="date"
      value={str}
      placeholder={slotProps?.textField?.placeholder}
      onChange={(e) => onChange(e.target.value ? dayjs(e.target.value) : null)}
    />
  );
}

export function TimePicker({ value, onChange }) {
  const str = value && dayjs(value).isValid() ? dayjs(value).format("HH:mm") : "";
  return (
    <Input
      type="time"
      value={str}
      onChange={(e) => onChange(e.target.value ? dayjs(`2000-01-01T${e.target.value}`) : null)}
    />
  );
}

export function ModalComponent({
  open,
  title,
  onClose,
  children,
  primaryAction,
  secondaryAction,
  width,
}) {
  const size = width >= 760 ? "xl" : width >= 640 ? "lg" : width >= 500 ? "md" : "sm";
  return (
    <DsModal
      open={open}
      title={title}
      onClose={onClose}
      primaryLabel={primaryAction?.label || "Confirm"}
      secondaryLabel={secondaryAction?.label || "Cancel"}
      onPrimary={primaryAction?.onClick}
      primaryDisabled={Boolean(primaryAction?.disabled || primaryAction?.isLoading)}
      secondaryDisabled={Boolean(secondaryAction?.disabled)}
      danger={/delete/i.test(String(primaryAction?.label || "")) || /delete/i.test(String(title || ""))}
      size={size}
    >
      {children}
    </DsModal>
  );
}

export function DataTable({
  data = [],
  columns = [],
  searchPlaceholder,
  searchValue,
  onSearchChange,
  onSearch,
  serverSidePagination,
  totalRows,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  empty,
}) {
  const [localSearch, setLocalSearch] = useState("");
  const q = (searchValue ?? localSearch).toLowerCase();
  const filtered = q
    ? data.filter((row) =>
        Object.values(row).some((v) => String(v ?? "").toLowerCase().includes(q))
      )
    : data;

  const dsColumns = columns.map((c) => ({
    key: c.field,
    header: c.headerName,
    render: c.renderCell ? (row) => c.renderCell(row?.row ? row.row : row) : undefined,
  }));

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {(onSearchChange || onSearch || searchPlaceholder) && (
        <Field label="Search" htmlFor={`dt-${columns[0]?.field || "q"}`}>
          <Input
            id={`dt-${columns[0]?.field || "q"}`}
            placeholder={searchPlaceholder || "Search…"}
            value={searchValue ?? localSearch}
            onChange={(e) => {
              setLocalSearch(e.target.value);
              onSearchChange?.(e.target.value);
              onSearch?.(e.target.value);
            }}
            style={{ maxWidth: 320 }}
          />
        </Field>
      )}
      <Table
        columns={dsColumns}
        rows={filtered}
        rowKey={(row, i) => row.id ?? row.sl ?? i}
        empty={empty || "No rows"}
      />
      {serverSidePagination ? (
        <PaginationBar
          page={currentPage || 1}
          limit={pageSize || 10}
          total={totalRows || 0}
          onPageChange={onPageChange}
          onLimitChange={onPageSizeChange}
        />
      ) : null}
    </div>
  );
}

export function InputFieldModal({
  title,
  placeholder,
  value,
  onChange,
  disabled,
  type = "text",
  tooltipText,
  name,
}) {
  return (
    <Field label={title} hint={tooltipText} htmlFor={name || title}>
      <Input
        id={name || title}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value ?? ""}
        onChange={onChange}
        disabled={disabled}
      />
    </Field>
  );
}

export function SelectField({
  title,
  value,
  onChange,
  options = [],
  placeholder,
  disabled,
  tooltipText,
}) {
  return (
    <Field label={title} hint={tooltipText}>
      <Select
        aria-label={title || placeholder || "Select"}
        value={value ?? ""}
        onChange={(next) => onChange?.({ target: { value: next } })}
        options={options}
        placeholder={placeholder || "Select…"}
        disabled={disabled}
      />
    </Field>
  );
}

export function ButtonBlueLight({ children, onClick, startIcon, disabled, sx: _sx }) {
  return (
    <DsButton onClick={onClick} disabled={disabled}>
      {startIcon}
      {children}
    </DsButton>
  );
}

export function ButtonBlue({ children, text, onClick, disabled, isLoading }) {
  return (
    <DsButton onClick={onClick} disabled={disabled || isLoading}>
      {children || (isLoading ? "Saving…" : text)}
    </DsButton>
  );
}

export function ChangeStatus({ checked, onChange, disabled }) {
  return <Toggle checked={checked} onChange={onChange} disabled={disabled} />;
}

export function StyledCheckbox({ checked, onChange }) {
  return <input type="checkbox" checked={Boolean(checked)} onChange={onChange} />;
}

export function LabelWithTooltip({ label, tooltipText }) {
  return <span title={tooltipText}>{label}</span>;
}

export function StatusPill({ status }) {
  const on = String(status).toLowerCase() === "active";
  return <Badge tone={on ? "success" : "neutral"}>{on ? "Active" : "Blocked"}</Badge>;
}

export function ActionButtons({ showView = true, onView, onEdit, onDelete }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {showView && onView ? (
        <DsButton size="sm" variant="secondary" onClick={onView}>
          View
        </DsButton>
      ) : null}
      {onEdit ? (
        <DsButton size="sm" variant="secondary" onClick={onEdit}>
          Edit
        </DsButton>
      ) : null}
      {onDelete ? (
        <DsButton size="sm" variant="danger" onClick={onDelete}>
          Delete
        </DsButton>
      ) : null}
    </div>
  );
}

export function FormControlLabel({ control, label }) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 8, margin: 0 }}>
      {control}
      <span>{label}</span>
    </label>
  );
}

export function Checkbox({ checked, onChange, disabled, size: _size }) {
  return (
    <input type="checkbox" checked={Boolean(checked)} onChange={onChange} disabled={disabled} />
  );
}

export function Chip({ label, children }) {
  return <Badge>{label || children}</Badge>;
}

export function IconButton({ children, onClick, title }) {
  return (
    <button type="button" onClick={onClick} title={title} style={{ background: "none", border: 0, cursor: "pointer" }}>
      {children}
    </button>
  );
}

export function FiltersButton({ text, onClick, Icon }) {
  return (
    <DsButton variant="secondary" onClick={onClick}>
      {Icon}
      {text || "Filters"}
    </DsButton>
  );
}

export function Search({ placeholder, onChange, value }) {
  return (
    <Input
      placeholder={placeholder || "Search"}
      value={value || ""}
      onChange={(e) => onChange?.(e.target.value)}
    />
  );
}

export function DateRangeSelector({ value, onChange, placeholder }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <Input
        type="date"
        value={value?.startDate ? dayjs(value.startDate).format("YYYY-MM-DD") : ""}
        onChange={(e) =>
          onChange?.({
            startDate: e.target.value || null,
            endDate: value?.endDate || null,
            type: "custom",
          })
        }
        aria-label={placeholder || "Start date"}
      />
      <Input
        type="date"
        value={value?.endDate ? dayjs(value.endDate).format("YYYY-MM-DD") : ""}
        onChange={(e) =>
          onChange?.({
            startDate: value?.startDate || null,
            endDate: e.target.value || null,
            type: "custom",
          })
        }
        aria-label="End date"
      />
    </div>
  );
}
