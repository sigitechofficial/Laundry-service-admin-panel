/**
 * Single currency formatter for the admin panel.
 * Always pass the API symbol (paymentSummary.currencySymbol, zone.currencyUnitZ.symbol, etc.).
 * Do not hardcode £ or $.
 */

function trimStr(value) {
  return value == null ? "" : String(value).trim();
}

function lookupSymbolByCode(code, currencyUnits = []) {
  const needle = trimStr(code).toUpperCase();
  if (!needle || !Array.isArray(currencyUnits) || !currencyUnits.length) return "";
  const match = currencyUnits.find((unit) => {
    const name = trimStr(unit?.name).toUpperCase();
    const unitCode = trimStr(unit?.code).toUpperCase();
    return name === needle || unitCode === needle;
  });
  return trimStr(match?.symbol);
}

function lookupSymbolByUnitId(id, currencyUnits = []) {
  if (id == null || id === "" || !Array.isArray(currencyUnits) || !currencyUnits.length) {
    return "";
  }
  const match = currencyUnits.find((unit) => String(unit?.id) === String(id));
  return trimStr(match?.symbol);
}

function symbolFromZone(zone, currencyUnits = []) {
  if (!zone || typeof zone !== "object") return "";
  const unit =
    zone.currencyUnitZ ??
    zone.currencyUnit ??
    zone.currency_unit ??
    zone.currency_unit_z ??
    zone.CurrencyUnitZ ??
    zone.CurrencyUnit;
  const fromUnit = trimStr(unit?.symbol);
  if (fromUnit) return fromUnit;
  return lookupSymbolByUnitId(
    zone.currencyUnitId ?? zone.currency_unit_id ?? zone.currencyUnitID ?? unit?.id,
    currencyUnits
  );
}

/**
 * Pick a display symbol from common API payloads. Never invent £/$.
 *
 * @param {string|object|null|undefined} source
 *   String symbol/code, or an object such as paymentSummary, a zone, or a currency unit.
 * @param {Array<{id?: *, name?: string, code?: string, symbol?: string}>} [currencyUnits]
 */
export function resolveCurrencySymbol(source, currencyUnits = []) {
  if (source == null || source === "") return "";

  if (typeof source === "string") {
    const raw = trimStr(source);
    if (!raw) return "";
    if (/^[A-Za-z]{3}$/.test(raw)) {
      return lookupSymbolByCode(raw, currencyUnits) || raw.toUpperCase();
    }
    return raw;
  }

  if (typeof source !== "object") return "";

  const direct = trimStr(
    source.currencySymbol ?? source.symbol ?? source.currency_symbol
  );
  if (direct) return direct;

  const fromZone = symbolFromZone(source.zone ?? source, currencyUnits);
  if (fromZone) return fromZone;

  const code =
    source.feeCurrency ??
    source.currency ??
    source.currencyCode ??
    source.currency_code ??
    source.code ??
    source.name;
  return lookupSymbolByCode(code, currencyUnits);
}

/**
 * Format an amount with the API currency symbol (or ISO code if no symbol).
 *
 * @param {number|string|null|undefined} amount
 * @param {string} [symbol] API symbol, e.g. "£"
 * @param {string} [code] ISO code used only when symbol is missing, e.g. "GBP"
 */
export function formatMoney(amount, symbol, code) {
  if (amount == null || amount === "") return "—";
  const n = Number(amount);
  const num = Number.isFinite(n)
    ? n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : String(amount);

  const sym = trimStr(symbol);
  if (sym) {
    const sep = sym.length > 1 && !/[\s$£€¥₹]/.test(sym.slice(-1)) ? " " : "";
    return `${sym}${sep}${num}`;
  }

  const iso = trimStr(code);
  if (iso) return `${iso} ${num}`;
  return num;
}
