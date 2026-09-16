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
  const settlement = view.settlement || {};
  const paid = settlement.paidAtBooking || {};
  const statusLabel =
    settlement.amountDueNow > 0
      ? "Outstanding"
      : settlement.paymentStatus && /paid|complete/i.test(settlement.paymentStatus)
        ? "Settled"
        : settlement.isCash
          ? "Collect at delivery"
          : "Nothing due";

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
          <p className={styles.totalLabel}>Total order amount</p>
          <p className={styles.totalValue}>{money(view, view.grandTotal)}</p>
          <p className={styles.panelRow} style={{ marginTop: 4 }}>
            Amount due now <strong>{money(view, view.amountDue)}</strong>
          </p>
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
          <p className={styles.panelLabel}>Summary · {settlement.isCash ? "Cash" : "Card"}</p>
          <p className={styles.panelTitle}>{money(view, view.grandTotal)}</p>
          <p className={styles.panelRow}>Laundry {money(view, settlement.laundrySubtotal)}</p>
          <p className={styles.panelRow}>Service fee {money(view, settlement.serviceFee)}</p>
          {paid.totalPaid > 0 ? (
            <p className={styles.panelRow}>Paid at booking {money(view, paid.totalPaid)}</p>
          ) : null}
          <p className={styles.panelRow}>
            Due now <strong>{money(view, settlement.amountDueNow)}</strong>
          </p>
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
              render: (row) => (
                <span className={styles.num} style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end" }}>
                  {money(view, row.rate)}
                  {row.zonePriced ? (
                    <span
                      className={styles.itemMeta}
                      title="This zone has a price override in Zone Catalog. The master catalog price differs."
                    >
                      Zone price · master {money(view, row.masterRate)}
                    </span>
                  ) : null}
                </span>
              ),
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

      <div className={styles.settlement}>
        <div className={styles.breakdown}>
          <div className={styles.blockHead}>
            <span>Order summary</span>
            <Badge tone="neutral">{settlement.isCash ? "Cash" : "Card"}</Badge>
          </div>
          {settlement.isCash && settlement.minimumAdjustment > 0 ? (
            <p className={styles.blockNote}>
              Laundry is below the zone minimum, so the minimum order amount is charged instead.
            </p>
          ) : !settlement.isCash && paid.minimumOrderPayment > 0 ? (
            <p className={styles.blockNote}>
              The minimum order payment is not added again as a separate charge.
            </p>
          ) : null}
          <div className={styles.breakRow}>
            <span>Laundry subtotal</span>
            <strong>{money(view, settlement.laundrySubtotal)}</strong>
          </div>
          {settlement.isCash && settlement.minimumAdjustment > 0 ? (
            <div className={styles.breakRow}>
              <span>Minimum order top-up</span>
              <strong>{money(view, settlement.minimumAdjustment)}</strong>
            </div>
          ) : null}
          <div className={styles.breakRow}>
            <span>Service fee</span>
            <strong>{money(view, settlement.serviceFee)}</strong>
          </div>
          {settlement.driverTip > 0 ? (
            <div className={styles.breakRow}>
              <span>Tip</span>
              <strong>{money(view, settlement.driverTip)}</strong>
            </div>
          ) : null}
          {settlement.discount > 0 ? (
            <div className={styles.breakRow}>
              <span>Discount</span>
              <strong>-{money(view, settlement.discount)}</strong>
            </div>
          ) : null}
          {view.tax != null && Number(view.tax) !== 0 ? (
            <div className={styles.breakRow}>
              <span>Tax</span>
              <strong>{money(view, view.tax)}</strong>
            </div>
          ) : null}
          <div className={styles.grandRow}>
            <span>Total order amount</span>
            <span>{money(view, settlement.totalOrderAmount)}</span>
          </div>
        </div>

        {paid.totalPaid > 0 ? (
          <div className={`${styles.breakdown} ${styles.paidBlock}`}>
            <div className={styles.blockHead}>
              <span>Paid at booking</span>
            </div>
            {paid.minimumOrderPayment > 0 ? (
              <div className={styles.breakRow}>
                <span>
                  Minimum order payment
                  <span className={styles.rowHint}>Applied to laundry subtotal</span>
                </span>
                <strong>{money(view, paid.minimumOrderPayment)}</strong>
              </div>
            ) : null}
            {paid.serviceFee > 0 ? (
              <div className={styles.breakRow}>
                <span>Service fee</span>
                <strong>{money(view, paid.serviceFee)}</strong>
              </div>
            ) : null}
            {paid.driverTip > 0 ? (
              <div className={styles.breakRow}>
                <span>Tip</span>
                <strong>{money(view, paid.driverTip)}</strong>
              </div>
            ) : null}
            <div className={styles.grandRow}>
              <span>Total paid</span>
              <span>{money(view, paid.totalPaid)}</span>
            </div>
          </div>
        ) : null}

        <div className={`${styles.breakdown} ${styles.dueBlock}`}>
          <div className={styles.blockHead}>
            <span>Amount due now</span>
            <span className={styles.dueValue}>
              <span className={styles.duePill}>{money(view, settlement.amountDueNow)}</span>
              <Badge tone={settlement.amountDueNow > 0 ? "warning" : "success"}>{statusLabel}</Badge>
            </span>
          </div>
          <p className={styles.blockNote}>
            {paid.totalPaid > 0
              ? `${money(view, settlement.totalOrderAmount)} actual total − ${money(view, paid.totalPaid)} already paid`
              : settlement.isCash
                ? "Full bill is collected in cash at delivery."
                : "Nothing was paid at booking; full total is due."}
          </p>
        </div>
      </div>
    </div>
  );
}
