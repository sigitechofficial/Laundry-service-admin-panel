import { Button, Modal } from "../../../design-system";
import InvoiceDocument from "./InvoiceDocument";
import styles from "./invoiceDocument.module.css";

export default function InvoiceDetailModal({
  open,
  view,
  format = "a4",
  onFormatChange,
  onClose,
  onPrint,
  onEdit,
  printLabel = "Print",
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={view?.invoiceNo ? `Invoice ${view.invoiceNo}` : "Invoice"}
      description="Review line items, fees, and totals from the live invoice."
      size="xl"
      hideFooter
    >
      <div className={styles.doc}>
        <InvoiceDocument view={view} />
        <div className={styles.formatRow}>
          <div>
            <p className={styles.formatLabel}>Print format</p>
            <div className={styles.formatBtns}>
              <Button
                size="sm"
                variant={format === "a4" ? "primary" : "secondary"}
                onClick={() => onFormatChange?.("a4")}
              >
                A4
              </Button>
              <Button
                size="sm"
                variant={format === "thermal" ? "primary" : "secondary"}
                onClick={() => onFormatChange?.("thermal")}
              >
                58mm thermal
              </Button>
            </div>
          </div>
          <div className={styles.actions}>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            {onEdit ? (
              <Button variant="secondary" onClick={onEdit}>
                Edit invoice
              </Button>
            ) : null}
            <Button onClick={onPrint} disabled={!view}>
              {printLabel}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
