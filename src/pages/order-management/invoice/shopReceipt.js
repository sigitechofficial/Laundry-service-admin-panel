/**
 * The customer receipt exactly as the shop app prints it
 * (justlaundryAgent: lib/Data/Printing/builders/receipt_document_builder.dart).
 * Keep the two in step: same order of lines, same wording, same totals.
 */

const BRAND = "Just Dry Cleans";

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const money = (symbol, v) => `${symbol}${num(v).toFixed(2)}`;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-11-24" (or a full date) -> { y, m, d } without time-zone shifts. */
function calendarDay(value) {
  if (!value) return null;
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return null;
  return { y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate() };
}
const dd = (n) => String(n).padStart(2, "0");

/** "16:00" -> "4:00 PM" (shop app _timeTo12h). */
function timeTo12h(t) {
  if (!t || !String(t).trim()) return "";
  const p = String(t).split(":");
  if (p.length < 2) return String(t);
  const h = parseInt(p[0], 10) || 0;
  const m = parseInt(p[1], 10) || 0;
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${dd(m)} ${h >= 12 ? "PM" : "AM"}`;
}

function timeWindow(from, to) {
  const a = timeTo12h(from);
  const b = timeTo12h(to);
  if (!a && !b) return "—";
  if (!a) return b;
  if (!b) return a;
  return `${a}–${b}`;
}

/** "24 Nov, 4:00 PM–5:00 PM" (shop app _receiptPickupLine / _receiptDeliveryLine). */
function slotLine(date, from, to) {
  const day = calendarDay(date);
  const win = timeWindow(from, to);
  return day ? `${dd(day.d)} ${MONTHS[day.m - 1]}, ${win}` : win;
}

/** Date parts of [value] in the order's own time zone (the shop's clock). */
function zonedParts(value, timeZone) {
  const dt = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dt.getTime())) return null;
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timeZone || undefined,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(dt);
    const get = (t) => Number(parts.find((x) => x.type === t)?.value);
    return { y: get("year"), m: get("month"), d: get("day"), h: get("hour"), min: get("minute") };
  } catch {
    return { y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate(), h: dt.getHours(), min: dt.getMinutes() };
  }
}

/** "23 Nov 2026, 14:05" in the shop's time zone (shop app _orderCreatedLabel). */
function createdLabel(createdAt, timeZone) {
  if (!createdAt) return null;
  const p = zonedParts(createdAt, timeZone);
  if (!p) return null;
  return `${dd(p.d)} ${MONTHS[p.m - 1]} ${p.y}, ${dd(p.h)}:${dd(p.min)}`;
}

/** Street, postcode (or city), country (shop app _receiptShortAddress). */
function shortAddress(a) {
  if (!a) return "—";
  const bits = [];
  const street = String(a.streetAddress || "").trim();
  const pc = String(a.postalcode || "").trim();
  const city = String(a.city?.name || a.cityName || "").trim();
  if (street) bits.push(street);
  if (pc) bits.push(pc);
  else if (city) bits.push(city);
  const co = String(a.country?.name || "").trim();
  if (co) bits.push(co);
  return bits.length ? bits.join(", ") : "—";
}

function titleCase(s) {
  const t = String(s || "").trim();
  return t ? t[0].toUpperCase() + t.slice(1).toLowerCase() : t;
}

/** "Dry Clean - Suit 2 Pc (2)" (shop app _catalogLineForReceipt + unit count). */
function lineLabel(item) {
  const svc = String(item.serviceName || "").trim();
  const sub = String(item.name || "").trim();
  const base = svc && sub ? `${svc} - ${sub}` : sub || svc || "Service";
  const u = num(item.unitCount) || 1;
  return u > 1 ? `${base} (${u})` : base;
}

/**
 * Receipt data from the admin invoice view and the raw invoice details.
 * Money comes from the same server payment summary the shop app uses.
 */
export function buildShopReceipt(view, invoiceDetails) {
  if (!view) return null;
  const s = view.settlement || {};
  const symbol = view.currencySymbol || "";
  const paid = s.paidAtBooking || {};
  const tips = num(view.tip);
  const minimumOrderPayment = num(paid.minimumOrderPayment);
  const serviceFeePaid = num(paid.serviceFee);
  const tipsPaid = num(paid.driverTip);
  const totalPaid = paid.totalPaid != null ? num(paid.totalPaid) : minimumOrderPayment + serviceFeePaid + tipsPaid;
  const totalOrderAmount = num(s.totalOrderAmount);
  const balanceDue = s.amountDueNow != null ? num(s.amountDueNow) : totalOrderAmount - totalPaid;
  const discount = num(s.discount ?? view.discount);
  const hasDiscount = discount > 0.004;
  const items = (view.items || [])
    .filter((it) => num(it.qty) > 0)
    .map((it) => ({
      qty: num(it.qty),
      label: lineLabel(it),
      unitBreakdown: `${money(symbol, it.rate)} × ${num(it.qty)}`,
      lineTotal: num(it.rate) * num(it.qty),
      addons: (it.addOns || []).map((a) => {
        const q = num(a.qty) || 1;
        return {
          title: q > 1 ? `+ ${q}x ${a.name}` : `+ ${a.name}`,
          breakdown: `${money(symbol, a.price)} × ${q}`,
          total: num(a.price) * q,
        };
      }),
    }));
  const unitCount = items.reduce((sum, it, i) => sum + it.qty * (num(view.items[i]?.unitCount) || 1), 0);
  return {
    symbol,
    invoiceId: view.invoiceNo,
    customerName: view.customerName || "-",
    address: shortAddress(invoiceDetails?.pickupAddress),
    // Σ qty × tags per item, as the shop app counts; else the order's own count.
    itemCount: unitCount > 0 ? unitCount : num(view.totalItems),
    paymentType: invoiceDetails?.paymentSummary?.paymentType || invoiceDetails?.paymentType || null,
    pickupLine: slotLine(invoiceDetails?.collectionDate, invoiceDetails?.collectionTimeFrom, invoiceDetails?.collectionTimeTo),
    deliveryLine: slotLine(invoiceDetails?.deliveryDate, invoiceDetails?.deliveryTimeFrom, invoiceDetails?.deliveryTimeTo),
    createdLabel: createdLabel(invoiceDetails?.createdAt, invoiceDetails?.operationalTimeZone),
    printedLabel: (() => {
      const p = zonedParts(new Date(), invoiceDetails?.operationalTimeZone);
      return p ? `${dd(p.d)} ${MONTHS[p.m - 1]} ${p.y}` : null;
    })(),
    items,
    money: {
      laundrySubtotal: num(s.laundrySubtotal ?? view.servicesSubtotal),
      minimumAdjustment: num(s.minimumAdjustment),
      serviceFee: num(s.serviceFee ?? view.serviceCharge),
      tips,
      discount,
      hasDiscount,
      before: totalOrderAmount,
      after: hasDiscount ? Math.max(0, totalOrderAmount - discount) : totalOrderAmount,
      minimumOrderPayment,
      serviceFeePaid,
      tipsPaid,
      totalPaid,
      balanceDue,
      paidInFull: balanceDue <= 0.009,
    },
  };
}

/** Receipt lines in the shop app's order. Kinds mirror PrintLine. */
export function shopReceiptLines(r) {
  if (!r) return [];
  const $ = (v) => money(r.symbol, v);
  const m = r.money;
  const L = [];
  const text = (t, o = {}) => L.push({ kind: "text", text: t, ...o });
  L.push({ kind: "logo" });
  text("Customer Receipt", { align: "center" });
  text(m.paidInFull ? "PAID" : "BALANCE DUE", { align: "center", bold: true });
  L.push({ kind: "feed" });
  L.push({ kind: "band", text: r.invoiceId });
  L.push({ kind: "feed" });
  text(r.customerName, { bold: true });
  text(r.address);
  L.push({ kind: "totalItems", text: `Total Items: ${r.itemCount}` });
  if (r.paymentType && String(r.paymentType).trim()) text(`Payment: ${titleCase(r.paymentType)}`);
  L.push({ kind: "feed" });
  text(`Pickup: ${r.pickupLine}`);
  text(`Delivery: ${r.deliveryLine}`);
  if (r.createdLabel) text(`Created: ${r.createdLabel}`);
  L.push({ kind: "divider" });
  text("Services", { bold: true });
  for (const it of r.items) {
    text(`${it.qty}x ${it.label}`, { bold: true });
    if (it.unitBreakdown) text(it.unitBreakdown);
    text($(it.lineTotal), { align: "right" });
    for (const a of it.addons) {
      text(`  ${a.title}`);
      if (a.breakdown) text(`  ${a.breakdown}`);
      text($(a.total), { align: "right" });
    }
  }
  L.push({ kind: "divider" });
  text("Services Subtotal", { trailing: $(m.laundrySubtotal) });
  if (m.minimumAdjustment > 0) text("Min. order adjustment", { trailing: `+${$(m.minimumAdjustment)}` });
  text("Service Fee", { trailing: $(m.serviceFee) });
  if (m.tips > 0) text("Driver Tip", { trailing: $(m.tips) });
  if (m.hasDiscount) {
    L.push({ kind: "divider" });
    text("Total before discount", { trailing: $(m.before), bold: true });
    text("Discount", { trailing: `-${$(m.discount)}` });
  }
  L.push({ kind: "doubleDivider" });
  text(m.hasDiscount ? "Total after discount" : "Total Order Amount", { trailing: $(m.after), bold: true });
  if (m.totalPaid > 0) {
    L.push({ kind: "feed" });
    text("Payments Received", { bold: true });
    text("Booking payment (laundry)", { trailing: `-${$(m.minimumOrderPayment)}` });
    text("Service fee paid at booking", { trailing: `-${$(m.serviceFeePaid)}` });
    if (m.tipsPaid > 0) text("Driver tip paid at booking", { trailing: `-${$(m.tipsPaid)}` });
    L.push({ kind: "divider" });
    text("Total Paid", { trailing: `-${$(m.totalPaid)}`, bold: true });
  }
  L.push({ kind: "feed" });
  text("BALANCE DUE", { trailing: $(m.balanceDue), bold: true });
  if (m.paidInFull) text("*** PAID IN FULL ***", { align: "center", bold: true });
  L.push({ kind: "feed" });
  text(`Thank you for choosing ${BRAND}`, { align: "center" });
  if (r.printedLabel) text(`Printed: ${r.printedLabel}`, { align: "center" });
  return L;
}

/** A full HTML page of the receipt, 80 mm wide, for screen and print. */
export function shopReceiptHtml(r, { origin = typeof window !== "undefined" ? window.location.origin : "" } = {}) {
  const rows = shopReceiptLines(r)
    .map((l) => {
      switch (l.kind) {
        case "logo":
          return `<div class="logo"><img src="${origin}/images/receipt-logo.png" alt="${esc(BRAND.toUpperCase())}"/></div>`;
        case "feed":
          return `<div class="feed"></div>`;
        case "band":
          return `<div class="band">${esc(l.text)}</div>`;
        case "totalItems":
          return `<div class="total-items">${esc(l.text)}</div>`;
        case "divider":
          return `<div class="rule"></div>`;
        case "doubleDivider":
          return `<div class="rule double"></div>`;
        default: {
          const cls = ["ln", l.bold ? "b" : "", l.align === "center" ? "c" : "", l.align === "right" ? "r" : ""]
            .filter(Boolean)
            .join(" ");
          if (l.trailing != null) {
            return `<div class="${cls} kv"><span>${esc(l.text)}</span><span>${esc(l.trailing)}</span></div>`;
          }
          return `<div class="${cls}">${esc(l.text)}</div>`;
        }
      }
    })
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"/><title>Receipt ${esc(r?.invoiceId || "")}</title>
<style>
  @font-face { font-family: "Nunito Receipt"; src: url("${origin}/fonts/nunito/Nunito-Variable.ttf") format("truetype"); font-weight: 200 1000; }
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; background: #fff; color: #000; }
  .paper { width: 72mm; margin: 0 auto; padding: 4mm 0 6mm; font-family: "Courier New", Courier, monospace; font-size: 12.5px; line-height: 1.35; }
  .logo { text-align: center; }
  .logo img { width: 46mm; max-width: 100%; height: auto; image-rendering: pixelated; }
  .ln { white-space: pre-wrap; word-break: break-word; }
  .b { font-weight: 700; }
  .c { text-align: center; }
  .r { text-align: right; }
  .kv { display: flex; justify-content: space-between; gap: 8px; }
  .kv span:last-child { white-space: nowrap; }
  .feed { height: 1.35em; }
  .band { background: #000; color: #fff; text-align: center; font-family: "Nunito Receipt", "Nunito", Arial, sans-serif; font-weight: 800; font-size: 26px; line-height: 1.25; padding: 2px 6px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .total-items { text-align: right; font-family: "Nunito Receipt", "Nunito", Arial, sans-serif; font-weight: 800; font-size: 17px; margin-top: 2px; }
  .rule { border-top: 1.5px dashed #000; margin: 5px 0; }
  .rule.double { border-top: 4px double #000; }
</style></head><body><div class="paper">${rows}</div></body></html>`;
}
