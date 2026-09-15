import { formatDate } from "../../utilities/formatters";

/**
 * Shop report — a single, print-ready A4 document that summarises everything
 * an admin needs about one shop: orders, ratings, punctuality, earnings,
 * payment mix, tips, and cancellations. Rendered to an isolated iframe and
 * sent to the browser print dialog, where the operator can "Save as PDF".
 */

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function money(symbol, value) {
  const sym = symbol || "£";
  return `${sym}${num(value).toFixed(2)}`;
}

function safe(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pct(part, whole) {
  const p = num(part);
  const w = num(whole);
  if (w <= 0) return "0%";
  return `${Math.round((p / w) * 100)}%`;
}

/**
 * Normalise the many data sources on the ShopDetail page into one flat model.
 */
export function buildShopReportModel({
  shop,
  revenue,
  ratings,
  currencySymbol,
  ordersTotal,
  pendingCount,
  completionRate,
}) {
  const period = revenue?.period || {};
  const punctuality =
    revenue?.lifetimePunctuality || revenue?.punctuality || {};
  const balances = revenue?.balances || null;

  const bookingTips = num(period.bookingTips);
  const extraTips = num(period.extraTips);
  const totalTips = bookingTips + extraTips;

  const completed = num(period.ordersCompleted);
  const cancelled = num(period.cancelledOrders);
  const refunded = num(period.refundedOrders);
  const open = num(period.openOrders);

  return {
    shop: {
      name: shop?.name || shop?.shopName || "Shop",
      id: shop?.id ?? "—",
      owner: shop?.owner || "—",
      address: shop?.address || "—",
      phone: shop?.phone || "—",
      email: shop?.email || "—",
      zone: shop?.zone || revenue?.shop?.zoneName || "—",
      established: shop?.established || "—",
    },
    currencySymbol: currencySymbol || revenue?.currency?.symbol || "£",
    generatedAt: formatDate(new Date(), "DD MMM YYYY, HH:mm"),
    orders: {
      total: num(ordersTotal),
      pending: num(pendingCount),
      completed,
      open,
      cancelled,
      refunded,
      completionRate: num(completionRate),
    },
    ratings: {
      avg: num(ratings?.avg),
      count: num(ratings?.count),
      histogram: ratings?.histogram || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    },
    punctuality: {
      pickupsCompleted: num(punctuality.pickupsCompleted),
      earlyPickups: num(punctuality.earlyPickups),
      onTimePickups: num(punctuality.onTimePickups),
      latePickups: num(punctuality.latePickups),
      deliveriesCompleted: num(punctuality.deliveriesCompleted),
      earlyDeliveries: num(punctuality.earlyDeliveries),
      onTimeDeliveries: num(punctuality.onTimeDeliveries),
      lateDeliveries: num(punctuality.lateDeliveries),
    },
    earnings: {
      grossRevenue: num(period.grossRevenue),
      shopNet: num(period.shopNet),
      platformTake: num(period.platformTake),
      avgOrderValue: num(period.avgOrderValue),
      cardGross: num(period.cardGross),
      cashGross: num(period.cashGross),
      cardOrders: num(period.cardOrders),
      cashOrders: num(period.cashOrders),
      cancelledValue: num(period.cancelledValue),
      refundedValue: num(period.refundedValue),
      bookingTips,
      extraTips,
      totalTips,
      cashTips: num(period.cashTips),
      cardTips: num(period.cardTips),
    },
    wallet: balances
      ? {
          totalEarnings: num(balances.totalEarnings),
          totalEarningsCash: num(balances.totalEarningsCash),
          totalEarningsCard: num(balances.totalEarningsCard),
          availableWallet: num(balances.availableWallet),
          withdrawnToBank: num(balances.withdrawnToBank),
          cashRemitted: num(balances.cashRemitted),
        }
      : null,
  };
}

function metricCard(label, value, hint) {
  return `<div class="card">
    <div class="cardLabel">${safe(label)}</div>
    <div class="cardValue">${safe(value)}</div>
    ${hint ? `<div class="cardHint">${safe(hint)}</div>` : ""}
  </div>`;
}

function ratingBars(hist, count) {
  return [5, 4, 3, 2, 1]
    .map((star) => {
      const n = num(hist?.[star]);
      const width = count > 0 ? Math.round((n / count) * 100) : 0;
      return `<div class="barRow">
        <span class="barStar">${star}★</span>
        <span class="barTrack"><span class="barFill" style="width:${width}%"></span></span>
        <span class="barNum">${n}</span>
      </div>`;
    })
    .join("");
}

export function shopReportHtml(model) {
  if (!model) return "";
  const s = model.currencySymbol;
  const o = model.orders;
  const p = model.punctuality;
  const e = model.earnings;
  const r = model.ratings;

  const walletRows = model.wallet
    ? `
      <tr><td>Total shop earnings (lifetime)</td><td class="right">${money(s, model.wallet.totalEarnings)}</td></tr>
      <tr><td>— Card earnings</td><td class="right">${money(s, model.wallet.totalEarningsCard)}</td></tr>
      <tr><td>— Cash earnings</td><td class="right">${money(s, model.wallet.totalEarningsCash)}</td></tr>
      <tr><td>Available in wallet</td><td class="right">${money(s, model.wallet.availableWallet)}</td></tr>
      <tr><td>Withdrawn to bank</td><td class="right">${money(s, model.wallet.withdrawnToBank)}</td></tr>
      <tr><td>Cash remitted to platform</td><td class="right">${money(s, model.wallet.cashRemitted)}</td></tr>`
    : `<tr><td colspan="2" class="muted">Wallet summary unavailable for this shop.</td></tr>`;

  return `<!doctype html><html><head><meta charset="utf-8"/>
  <title>${safe(model.shop.name)} — Shop Report</title>
  <style>
    *{box-sizing:border-box}
    body{font-family:'Segoe UI',Arial,sans-serif;color:#0f172a;margin:0;padding:28px;background:#f1f5f9}
    .sheet{max-width:900px;margin:0 auto;background:#fff;padding:34px 38px;border-radius:14px;box-shadow:0 6px 24px rgba(15,23,42,.08)}
    .head{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;border-bottom:2px solid #e2e8f0;padding-bottom:18px;margin-bottom:22px}
    .brand{font-size:13px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#4338ca}
    .shopName{font-size:28px;font-weight:800;margin:6px 0 2px}
    .shopMeta{font-size:12.5px;color:#475569;line-height:1.55}
    .headRight{text-align:right;font-size:12px;color:#64748b;min-width:190px}
    .headRight b{color:#0f172a}
    .section{margin:24px 0}
    .sectionTitle{font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#334155;margin:0 0 12px;display:flex;align-items:center;gap:10px}
    .sectionTitle:before{content:"";width:5px;height:16px;background:#4338ca;border-radius:3px;display:inline-block}
    .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
    .grid3{grid-template-columns:repeat(3,1fr)}
    .card{border:1px solid #e2e8f0;border-radius:11px;padding:13px 14px;background:#f8fafc}
    .cardLabel{font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#64748b}
    .cardValue{font-size:22px;font-weight:800;margin-top:5px;color:#0f172a}
    .cardHint{font-size:10.5px;color:#94a3b8;margin-top:3px}
    table{width:100%;border-collapse:collapse;font-size:13px}
    th,td{padding:9px 12px;border-bottom:1px solid #eef2f7;text-align:left}
    th{background:#f8fafc;font-size:10.5px;letter-spacing:.05em;text-transform:uppercase;color:#64748b}
    td.right,th.right{text-align:right}
    .muted{color:#94a3b8}
    .twoCol{display:grid;grid-template-columns:1fr 1fr;gap:22px}
    .panel{border:1px solid #e2e8f0;border-radius:12px;overflow:hidden}
    .panel h4{margin:0;padding:11px 14px;background:#f8fafc;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#475569;border-bottom:1px solid #eef2f7}
    .panelBody{padding:4px 0}
    .ratingWrap{display:flex;align-items:center;gap:22px;padding:14px}
    .ratingBig{font-size:44px;font-weight:800;line-height:1;color:#0f172a}
    .ratingStars{color:#f59e0b;font-size:15px}
    .ratingCount{font-size:12px;color:#64748b;margin-top:4px}
    .bars{flex:1}
    .barRow{display:flex;align-items:center;gap:8px;margin:3px 0}
    .barStar{font-size:11px;color:#64748b;width:22px}
    .barTrack{flex:1;height:8px;background:#eef2f7;border-radius:6px;overflow:hidden}
    .barFill{display:block;height:100%;background:#f59e0b}
    .barNum{font-size:11px;color:#475569;width:22px;text-align:right}
    .foot{margin-top:26px;padding-top:14px;border-top:1px solid #e2e8f0;font-size:10.5px;color:#94a3b8;text-align:center}
    @media print{body{background:#fff;padding:0}.sheet{box-shadow:none;border-radius:0;max-width:none}}
  </style></head>
  <body><div class="sheet">
    <div class="head">
      <div>
        <div class="brand">Just Dry Cleaners · Shop Report</div>
        <div class="shopName">${safe(model.shop.name)}</div>
        <div class="shopMeta">
          ID ${safe(model.shop.id)} · Owner: ${safe(model.shop.owner)}<br/>
          ${safe(model.shop.address)}<br/>
          ${safe(model.shop.phone)} · ${safe(model.shop.email)}
        </div>
      </div>
      <div class="headRight">
        <div>Zone: <b>${safe(model.shop.zone)}</b></div>
        <div>Established: <b>${safe(model.shop.established)}</b></div>
        <div style="margin-top:8px">Generated<br/><b>${safe(model.generatedAt)}</b></div>
      </div>
    </div>

    <div class="section">
      <div class="sectionTitle">Orders overview</div>
      <div class="grid">
        ${metricCard("All orders", o.total)}
        ${metricCard("Pending", o.pending)}
        ${metricCard("Completed", o.completed)}
        ${metricCard("Completion rate", `${o.completionRate}%`)}
        ${metricCard("Open / in progress", o.open)}
        ${metricCard("Cancelled", o.cancelled, money(s, e.cancelledValue))}
        ${metricCard("Refunded", o.refunded, money(s, e.refundedValue))}
        ${metricCard("Avg. order value", money(s, e.avgOrderValue))}
      </div>
    </div>

    <div class="section">
      <div class="twoCol">
        <div>
          <div class="sectionTitle">Ratings &amp; reviews</div>
          <div class="panel">
            <div class="ratingWrap">
              <div>
                <div class="ratingBig">${r.count > 0 ? r.avg.toFixed(1) : "—"}</div>
                <div class="ratingStars">${"★".repeat(Math.round(r.avg))}${"☆".repeat(Math.max(0, 5 - Math.round(r.avg)))}</div>
                <div class="ratingCount">${r.count} review${r.count === 1 ? "" : "s"}</div>
              </div>
              <div class="bars">${ratingBars(r.histogram, r.count)}</div>
            </div>
          </div>
        </div>
        <div>
          <div class="sectionTitle">Payment mix</div>
          <div class="panel"><div class="panelBody">
            <table>
              <tr><th>Channel</th><th class="right">Orders</th><th class="right">Collected</th></tr>
              <tr><td>Card</td><td class="right">${e.cardOrders}</td><td class="right">${money(s, e.cardGross)}</td></tr>
              <tr><td>Cash</td><td class="right">${e.cashOrders}</td><td class="right">${money(s, e.cashGross)}</td></tr>
              <tr><td><b>Total</b></td><td class="right"><b>${e.cardOrders + e.cashOrders}</b></td><td class="right"><b>${money(s, e.cardGross + e.cashGross)}</b></td></tr>
            </table>
          </div></div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="sectionTitle">Pickup &amp; delivery punctuality</div>
      <div class="twoCol">
        <div class="panel">
          <h4>Pickups (${p.pickupsCompleted} completed)</h4>
          <div class="panelBody"><table>
            <tr><td>Early</td><td class="right">${p.earlyPickups}</td><td class="right muted">${pct(p.earlyPickups, p.pickupsCompleted)}</td></tr>
            <tr><td>On time</td><td class="right">${p.onTimePickups}</td><td class="right muted">${pct(p.onTimePickups, p.pickupsCompleted)}</td></tr>
            <tr><td>Late</td><td class="right">${p.latePickups}</td><td class="right muted">${pct(p.latePickups, p.pickupsCompleted)}</td></tr>
          </table></div>
        </div>
        <div class="panel">
          <h4>Deliveries (${p.deliveriesCompleted} completed)</h4>
          <div class="panelBody"><table>
            <tr><td>Early</td><td class="right">${p.earlyDeliveries}</td><td class="right muted">${pct(p.earlyDeliveries, p.deliveriesCompleted)}</td></tr>
            <tr><td>On time</td><td class="right">${p.onTimeDeliveries}</td><td class="right muted">${pct(p.onTimeDeliveries, p.deliveriesCompleted)}</td></tr>
            <tr><td>Late</td><td class="right">${p.lateDeliveries}</td><td class="right muted">${pct(p.lateDeliveries, p.deliveriesCompleted)}</td></tr>
          </table></div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="sectionTitle">Earnings</div>
      <div class="grid grid3">
        ${metricCard("Gross revenue", money(s, e.grossRevenue), "Collected orders, net of refunds")}
        ${metricCard("Shop net", money(s, e.shopNet), "After commission, fees & driver pay")}
        ${metricCard("Platform take", money(s, e.platformTake), "Service fee + zone commission")}
      </div>
      <div style="height:12px"></div>
      <div class="twoCol">
        <div class="panel"><div class="panelBody"><table>
          <tr><th>Collected by channel</th><th class="right">Amount</th></tr>
          <tr><td>Card collected</td><td class="right">${money(s, e.cardGross)}</td></tr>
          <tr><td>Cash collected</td><td class="right">${money(s, e.cashGross)}</td></tr>
        </table></div></div>
        <div class="panel"><div class="panelBody"><table>
          <tr><th>Shop earnings ledger</th><th class="right">Amount</th></tr>
          ${walletRows}
        </table></div></div>
      </div>
    </div>

    <div class="section">
      <div class="sectionTitle">Tips</div>
      <div class="grid">
        ${metricCard("Total tips", money(s, e.totalTips))}
        ${metricCard("Card tips", money(s, e.cardTips))}
        ${metricCard("Cash tips", money(s, e.cashTips))}
        ${metricCard("Extra (post-order) tips", money(s, e.extraTips))}
      </div>
    </div>

    <div class="foot">
      This report reflects lifetime collected activity for this shop. Figures exclude fully refunded and pending orders from revenue.
      Generated by the Just Dry Cleaners admin panel on ${safe(model.generatedAt)}.
    </div>
  </div></body></html>`;
}
