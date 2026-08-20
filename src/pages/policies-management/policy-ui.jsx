import dirStyles from "./PoliciesDirectory.module.css";

export function PolicyIdentity({ primary, secondary }) {
  return (
    <div className={dirStyles.identity}>
      <span className={dirStyles.primary}>{primary || "—"}</span>
      {secondary ? <span className={dirStyles.secondary}>{secondary}</span> : null}
    </div>
  );
}

export function PolicyMoney({ children }) {
  return <span className={dirStyles.money}>{children}</span>;
}

export function PolicyMeta({ children }) {
  return <span className={dirStyles.meta}>{children}</span>;
}

export function PolicyDetailRow({ label, value }) {
  return (
    <div className={dirStyles.detailRow}>
      <span className={dirStyles.detailLabel}>{label}</span>
      <span className={dirStyles.detailValue}>{value ?? "—"}</span>
    </div>
  );
}

export function PolicyDetailSection({ title, children }) {
  return (
    <div className={dirStyles.detailSection}>
      <h4 className={dirStyles.detailTitle}>{title}</h4>
      <div className={dirStyles.detailBody}>{children}</div>
    </div>
  );
}

export function PolicyDetailStack({ children }) {
  return <div className={dirStyles.detailStack}>{children}</div>;
}
