import { Button, Modal } from "../../../design-system";
import InvoiceDocument from "./InvoiceDocument";
import { shopReceiptHtml } from "./shopReceipt";
import styles from "./invoiceDocument.module.css";

export default function InvoiceDetailModal({
  open,
  view,
  format = "receipt",
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
        {format === "receipt" && view?.receipt ? (
          <div style={{ display: "flex", justifyContent: "center", background: "#F1F3F7", borderRadius: 12, padding: 16 }}>
            <iframe
              title="Shop receipt"
              srcDoc={shopReceiptHtml(view.receipt)}
              style={{ width: 340, height: 640, border: "1px solid #DDE3EE", background: "#fff", borderRadius: 6 }}
            />
          </div>
        ) : (
          <InvoiceDocument view={view} />
        )}
        <div className={styles.formatRow}>
          <div>
            <p className={styles.formatLabel}>Print format</p>
            <div className={styles.formatBtns}>
              <Button
                size="sm"
                variant={format === "receipt" ? "primary" : "secondary"}
                onClick={() => onFormatChange?.("receipt")}
              >
                Shop receipt
              </Button>
              <Button
                size="sm"
                variant={format === "a4" ? "primary" : "secondary"}
                onClick={() => onFormatChange?.("a4")}
              >
                A4
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
