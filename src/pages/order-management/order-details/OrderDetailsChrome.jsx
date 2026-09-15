import { Button } from "../../../design-system";
import { Link } from "react-router-dom";
import { INVOICE_PHASE, invoicePhaseLabel } from "../../../shared/invoiceLifecycle";
import styles from "./orderDetails.module.css";

export function OdSectionTitle({ children }) {
  return (
    <div className={styles.sectionHead}>
      <p className={styles.sectionLabel}>{children}</p>
    </div>
  );
}

export function OdCard({ children, className = "" }) {
  return <div className={`${styles.card} ${className}`.trim()}>{children}</div>;
}

export function OdMetaRow({ label, value, valueTo }) {
  return (
    <div className={styles.metaRow}>
      <p className={styles.metaLabel}>{label}</p>
      {valueTo ? (
        <Link
          to={valueTo}
          className={styles.metaValue}
          style={{ color: "#2563EB", textDecoration: "none", fontWeight: 500 }}
        >
          {value}
        </Link>
      ) : (
        <p className={styles.metaValue}>{value}</p>
      )}
    </div>
  );
}

export function OdStatCell({ label, value, warnZero = false }) {
  const n = Number(value) || 0;
  const warn = warnZero && n === 0;
  return (
    <div className={styles.statCell}>
      <p className={styles.statLabel}>{label}</p>
      <p className={warn ? styles.statValueWarn : styles.statValue}>{n}</p>
    </div>
  );
}

export function OdProofMeta({ label, value, muted = false }) {
  return (
    <div className={styles.proofMeta}>
      <p className={styles.proofMetaLabel}>{label}</p>
      <p className={muted ? styles.proofMetaMuted : styles.proofMetaValue}>{value}</p>
    </div>
  );
}

export function OdEmptyInvoice({ invoiceGenerated }) {
  return (
    <div className={styles.emptyInvoice}>
      <p className={styles.emptyInvoiceTitle}>
        {!invoiceGenerated ? "Invoice not generated yet" : "No agent invoice lines"}
      </p>
      <p className={styles.emptyInvoiceBody}>
        Agent invoice appears here only after the agent creates a draft or
        finalized invoice. Customer selected services stay frozen on the left.
      </p>
    </div>
  );
}

/** Header money: never treat the booking-time minimum as the order total. */
export function OdInvoiceTotal({
  phase,
  amountLabel,
  hint,
}) {
  const pending = phase === INVOICE_PHASE.PENDING;
  const draft = phase === INVOICE_PHASE.DRAFT;
  return (
    <div className={styles.totalBlock}>
      <p className={styles.sectionLabel}>
        {pending || draft ? "Invoice" : "Order Total"}
      </p>
      {pending ? (
        <p className={styles.totalPending}>{invoicePhaseLabel(phase)}</p>
      ) : (
        <p className={styles.totalValue}>{amountLabel}</p>
      )}
      {hint ? <p className={styles.totalHint}>{hint}</p> : null}
    </div>
  );
}

export function OdTimeline({ rows }) {
  return (
    <div className={styles.timeline}>
      {rows.map((activity, idx) => {
        const toneClass =
          activity.tone === "completed"
            ? styles.dotSuccess
            : activity.tone === "error"
              ? styles.dotDanger
              : activity.tone === "system"
                ? styles.dotBrand
                : styles.dotNeutral;
        return (
          <div key={`${activity.text}-${idx}`} className={styles.timelineRow}>
            <div className={styles.timelineRail}>
              <span className={`${styles.timelineDot} ${toneClass}`} />
              {idx < rows.length - 1 ? <span className={styles.timelineLine} /> : null}
            </div>
            <div>
              <p className={styles.timelineText}>{activity.text}</p>
              <p className={styles.timelineTime}>{activity.time}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function OdMoreCategories({ hidden, onExpand }) {
  if (!hidden) return null;
  return (
    <Button
      size="sm"
      variant="secondary"
      className={styles.moreBtn}
      onClick={onExpand}
    >
      + {hidden} more categories
    </Button>
  );
}
