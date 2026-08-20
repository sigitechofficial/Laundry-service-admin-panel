import { Badge, Table } from "../../../design-system";
import styles from "./invoiceDocument.module.css";
import { formatInvoiceMoney, invoiceStatusTone } from "./invoiceView";

function money(view, amount) {
  return formatInvoiceMoney(amount, view?.currencySymbol, view?.currencyCode);
}

function dash(value) {
  const text = String(value ?? "").trim();
  return text || "—";
}

export default function InvoiceDocument({ view }) {
  if (!view) {
    return <p className={styles.empty}>Invoice details are not available.</p>;
  }

  const rows = (view.items || []).map((item, index) => ({
    ...item,
    index,
  }));

  return (
    <div className={styles.doc}>
      <header className={styles.masthead}>
        <div>
          <p className={styles.kicker}>Invoice</p>
          <h2 className={styles.invoiceNo}>{view.invoiceNo || "—"}</h2>
          <p className={styles.metaLine}>
            {dash(view.dateText)}
            {view.timeText && view.timeText !== "N/A" ? ` · ${view.timeText}` : ""}
            {view.shopName ? ` · ${view.shopName}` : ""}
          </p>
          <div className={styles.badges}>
            {view.statusLabel ? (
              <Badge tone={invoiceStatusTone(view.statusLabel)}>{view.statusLabel}</Badge>
            ) : null}
            {view.paymentStatus ? (
              <Badge tone={invoiceStatusTone(view.paymentStatus)}>{view.paymentStatus}</Badge>
            ) : null}
            <Badge tone="neutral">{view.totalItems || 0} items</Badge>
          </div>
        </div>
        <div className={styles.totalBlock}>
          <p className={styles.totalLabel}>Amount due</p>
          <p className={styles.totalValue}>{money(view, view.grandTotal)}</p>
        </div>
      </header>

      <div className={styles.parties}>
        <section className={styles.panel}>
          <p className={styles.panelLabel}>Bill to</p>
          <p className={styles.panelTitle}>{dash(view.customerName)}</p>
          <p className={styles.panelRow}>{dash(view.customerPhone || view.emailOrPhone)}</p>
          {view.customerEmail ? <p className={styles.panelRow}>{view.customerEmail}</p> : null}
          <p className={styles.panelRow}>{dash(view.customerAddress || view.addressText)}</p>
        </section>
        <section className={styles.panel}>
          <p className={styles.panelLabel}>Shop & schedule</p>
          <p className={styles.panelTitle}>{dash(view.shopName || view.agentName)}</p>
          <p className={styles.panelRow}>
            Pickup {dash(view.collectionDateText)} · {dash(view.pickupWindow)}
          </p>
          <p className={styles.panelRow}>
            Delivery {dash(view.deliveryDateText)} · {dash(view.deliveryWindow)}
          </p>
          <p className={styles.panelRow}>
            {view.bags || 0} bags · {dash(view.frequency)}
          </p>
        </section>
        <section className={styles.panel}>
          <p className={styles.panelLabel}>Summary</p>
          <p className={styles.panelTitle}>{money(view, view.grandTotal)}</p>
          <p className={styles.panelRow}>Services {money(view, view.servicesSubtotal)}</p>
          <p className={styles.panelRow}>Subtotal {money(view, view.subtotal)}</p>
          <p className={styles.panelRow}>Discount {money(view, view.discount)}</p>
        </section>
      </div>

      <div>
        <p className={styles.sectionTitle}>Line items</p>
        <Table
          empty="No line items on this invoice."
          rowKey={(row) => `${row.id}-${row.index}`}
          columns={[
            { key: "index", header: "#", render: (row) => row.index + 1 },
            {
              key: "name",
              header: "Item",
              render: (row) => (
                <div className={styles.itemName}>
                  <span className={styles.itemTitle}>
                    {row.serviceName ? `${row.serviceName} — ` : ""}
                    {row.name}
                  </span>
                  {(row.addOns || []).map((addon, addonIndex) => (
                    <span key={`${row.id}-addon-${addonIndex}`} className={styles.itemMeta}>
                      + {addon.qty}× {addon.name} ({money(view, addon.qty * addon.price)})
                    </span>
                  ))}
                  {(row.preferences || []).length > 0 ? (
                    <span className={styles.itemMeta}>Pref: {row.preferences.join(", ")}</span>
                  ) : null}
                  {row.instruction ? (
                    <span className={styles.itemMeta}>{row.instruction}</span>
                  ) : null}
                </div>
              ),
            },
            {
              key: "qty",
              header: "Qty",
              render: (row) => <span className={styles.num}>{row.qty}</span>,
            },
            {
              key: "rate",
              header: "Rate",
              render: (row) => <span className={styles.num}>{money(view, row.rate)}</span>,
            },
            {
              key: "line",
              header: "Line total",
              render: (row) => (
                <span className={styles.num}>{money(view, row.qty * row.rate)}</span>
              ),
            },
          ]}
          rows={rows}
        />
      </div>

      <div className={styles.breakdown}>
        <div className={styles.breakRow}>
          <span>Services subtotal</span>
          <strong>{money(view, view.servicesSubtotal)}</strong>
        </div>
        <div className={styles.breakRow}>
          <span>Minimum order fee</span>
          <strong>-{money(view, Math.abs(view.minimumOrderFee || 0))}</strong>
        </div>
        <div className={styles.breakRow}>
          <span>Service charge</span>
          <strong>{money(view, view.serviceCharge)}</strong>
        </div>
        {Number(view.tip) > 0 ? (
          <div className={styles.breakRow}>
            <span>Tip</span>
            <strong>{money(view, view.tip)}</strong>
          </div>
        ) : null}
        {view.tax != null && Number(view.tax) !== 0 ? (
          <div className={styles.breakRow}>
            <span>Tax</span>
            <strong>{money(view, view.tax)}</strong>
          </div>
        ) : null}
        <div className={styles.breakRow}>
          <span>Subtotal</span>
          <strong>{money(view, view.subtotal)}</strong>
        </div>
        <div className={styles.breakRow}>
          <span>Discount</span>
          <strong>{money(view, view.discount)}</strong>
        </div>
        <div className={styles.grandRow}>
          <span>Grand total</span>
          <span>{money(view, view.grandTotal)}</span>
        </div>
      </div>
    </div>
  );
}
