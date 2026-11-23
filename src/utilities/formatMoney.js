/**
 * Single currency formatter for the admin panel.
 *
 * A currency comes from data only, in this order:
 *   1. The payload's own currency (currencySymbol / currencyCode / feeCurrency / paymentSummary)
 *   2. Its zone's currency unit (currencyUnitZ, or currencyUnitId looked up in the units list)
 *   3. For a country-level view: the currency every zone of that country shares
 *
 * Symbols for ISO codes come from the `units` table (admin/getUnitsDistanceAndCurrency),
 * never from a table in this file. When none of the above gives an answer — no zone, or
 * zones in different currencies (the backend sends currencySymbol/currencyCode as "") —
 * the currency is unknown and amounts are shown as plain numbers. Nothing here invents a
 * currency: there is no platform default and no country → currency guess.
 */

const EMPTY = Object.freeze({ symbol: "", code: "" });

const ISO_CODE = /^[A-Za-z]{3}$/;

function trimStr(value) {
  return value == null ? "" : String(value).trim();
}

function isoCodeOf(value) {
  const text = trimStr(value);
  return ISO_CODE.test(text) ? text.toUpperCase() : "";
}

function normalizeOptions(currencyUnitsOrOptions, maybeOptions) {
  if (Array.isArray(currencyUnitsOrOptions)) {
    return {
      currencyUnits: currencyUnitsOrOptions,
      ...(maybeOptions && typeof maybeOptions === "object" ? maybeOptions : {}),
    };
  }
  if (currencyUnitsOrOptions && typeof currencyUnitsOrOptions === "object") {
    return {
      currencyUnits: currencyUnitsOrOptions.currencyUnits || [],
      ...currencyUnitsOrOptions,
    };
  }
  return { currencyUnits: [] };
}

function lookupUnitByCode(code, currencyUnits = []) {
  const needle = trimStr(code).toUpperCase();
  if (!needle || !Array.isArray(currencyUnits) || !currencyUnits.length) return null;
  return (
    currencyUnits.find((unit) => {
      const name = trimStr(unit?.name).toUpperCase();
      const unitCode = trimStr(unit?.code).toUpperCase();
      return name === needle || unitCode === needle;
    }) || null
  );
}

function lookupUnitById(id, currencyUnits = []) {
  if (id == null || id === "" || !Array.isArray(currencyUnits) || !currencyUnits.length) {
    return null;
  }
  return currencyUnits.find((unit) => String(unit?.id) === String(id)) || null;
}

/**
 * Display symbol of an ISO code: its units row's symbol, else the code itself ("CHF"),
 * '' when there is no code. Same rule as the backend (utils/currencySymbols).
 */
export function currencySymbolForCode(code, currencyUnits = []) {
  const needle = trimStr(code).toUpperCase();
  if (!needle) return "";
  return trimStr(lookupUnitByCode(needle, currencyUnits)?.symbol) || needle;
}

function currencyFromUnit(unit) {
  if (!unit || typeof unit !== "object") return null;
  const symbol = trimStr(unit.symbol);
  const code = trimStr(unit.name ?? unit.code).toUpperCase();
  if (!symbol && !code) return null;
  return {
    symbol: symbol || code,
    code: code || "",
  };
}

function zoneUnit(zone) {
  if (!zone || typeof zone !== "object") return null;
  return (
    zone.currencyUnitZ ??
    zone.currencyUnit ??
    zone.currency_unit ??
    zone.currency_unit_z ??
    zone.CurrencyUnitZ ??
    zone.CurrencyUnit ??
    null
  );
}

function currencyFromZone(zone, currencyUnits = []) {
  if (!zone || typeof zone !== "object") return null;
  const fromUnit = currencyFromUnit(zoneUnit(zone));
  if (fromUnit) return fromUnit;

  const id =
    zone.currencyUnitId ??
    zone.currency_unit_id ??
    zone.currencyUnitID ??
    zoneUnit(zone)?.id;
  const looked = lookupUnitById(id, currencyUnits);
  if (looked) return currencyFromUnit(looked);

  for (const field of [zone.currencyCode, zone.currency_code, zone.zoneCurrency, zone.currency]) {
    const code = isoCodeOf(field);
    if (code) return { symbol: currencySymbolForCode(code, currencyUnits), code };
  }
  return null;
}

/** A zone row's currency `{ symbol, code }`; empty when the zone has none. */
export function zoneDisplayCurrency(zone, currencyUnits = []) {
  return currencyFromZone(zone, currencyUnits) || { ...EMPTY };
}

/**
 * The currency every zone in `zones` shares (compared by ISO code), or empty when the list
 * is empty, any zone has no currency, or they differ — the same rule as the backend's
 * sharedCurrencyOfZones.
 */
export function sharedZoneCurrency(zones = [], currencyUnits = []) {
  if (!Array.isArray(zones) || !zones.length) return { ...EMPTY };
  let shared = null;
  for (const zone of zones) {
    const c = currencyFromZone(zone, currencyUnits);
    if (!c?.code) return { ...EMPTY };
    if (!shared) shared = c;
    else if (shared.code !== c.code) return { ...EMPTY };
  }
  return { ...shared };
}

function countryIdFromSource(source, explicitCountryId) {
  if (explicitCountryId != null && explicitCountryId !== "") return explicitCountryId;
  if (!source || typeof source !== "object") return null;
  return (
    source.countryId ??
    source.country_id ??
    source.country?.id ??
    source.Country?.id ??
    source.city?.countryId ??
    source.city?.country?.id ??
    source.zone?.city?.countryId ??
    source.zone?.city?.country?.id ??
    source.addressDb?.countryId ??
    source.addressDb?.country?.id ??
    null
  );
}

/** Currency shared by every zone of a country (from the zones list), or null. */
function currencyFromCountryZones(countryId, zones = [], currencyUnits = []) {
  if (countryId == null || countryId === "" || !Array.isArray(zones) || !zones.length) {
    return null;
  }
  const needle = String(countryId);
  const matched = zones.filter((z) => {
    const id =
      z?.city?.countryId ??
      z?.city?.country?.id ??
      z?.countryId ??
      z?.country?.id;
    return id != null && String(id) === needle;
  });
  const shared = sharedZoneCurrency(matched, currencyUnits);
  return shared.code ? shared : null;
}

function currencyFromString(raw, currencyUnits = []) {
  const text = trimStr(raw);
  if (!text) return null;
  const code = isoCodeOf(text);
  if (code) return { symbol: currencySymbolForCode(code, currencyUnits), code };
  return { symbol: text, code: "" };
}

/**
 * Currency of a payload, for display.
 *
 * @param {string|object|null|undefined} source
 * @param {{ currencyUnits?: Array, zones?: Array, countryId?: * }} [options]
 * @returns {{ symbol: string, code: string }} empty strings when the currency is unknown
 */
export function resolveDisplayCurrency(source, options = {}) {
  const {
    currencyUnits = [],
    zones = [],
    countryId: optionCountryId,
  } = normalizeOptions(options);

  let found = null;

  if (typeof source === "string") {
    found = currencyFromString(source, currencyUnits);
  } else if (source && typeof source === "object") {
    const directSymbol = trimStr(
      source.currencySymbol ?? source.symbol ?? source.currency_symbol
    );
    const codeCandidates = [
      source.feeCurrency,
      source.currencyCode,
      source.currency_code,
      source.currency,
      // `code` / `name` are a currency only on a units row ({ name: "GBP", symbol: "£" }).
      // Elsewhere they are coupon codes or zone names ("SEP24", "Ely"), never a currency.
      ...(source.symbol != null ? [source.code, source.name] : []),
    ];
    let directCode = "";
    for (const candidate of codeCandidates) {
      directCode = isoCodeOf(candidate);
      if (directCode) break;
    }

    if (directSymbol) {
      const codeFromSymbol = isoCodeOf(directSymbol);
      found = {
        symbol: codeFromSymbol ? currencySymbolForCode(codeFromSymbol, currencyUnits) : directSymbol,
        code: directCode || codeFromSymbol,
      };
    } else if (directCode) {
      found = { symbol: currencySymbolForCode(directCode, currencyUnits), code: directCode };
    }

    if (!found) {
      found =
        currencyFromZone(source.zone ?? source, currencyUnits) ||
        currencyFromZone(source.addressDb?.zone, currencyUnits) ||
        currencyFromZone(source.paymentSummary?.zone, currencyUnits);
    }

    if (!found && source.paymentSummary) {
      const ps = source.paymentSummary;
      const psSymbol = trimStr(ps.currencySymbol ?? ps.symbol);
      const psCode = trimStr(ps.currency ?? ps.currencyCode).toUpperCase();
      if (psSymbol || psCode) {
        found = {
          symbol: psSymbol || currencySymbolForCode(psCode, currencyUnits),
          code: psCode,
        };
      }
    }
  }

  if (!found) {
    found = currencyFromCountryZones(
      countryIdFromSource(source, optionCountryId),
      zones,
      currencyUnits
    );
  }

  if (found?.symbol || found?.code) {
    return {
      symbol: found.symbol || found.code || "",
      code: found.code || "",
    };
  }
  return { ...EMPTY };
}

/**
 * Display symbol of a payload's currency; '' when unknown.
 *
 * @param {string|object|null|undefined} source
 * @param {Array|{currencyUnits?: Array, zones?: Array, countryId?: *}} [currencyUnitsOrOptions]
 * @param {object} [maybeOptions]
 */
export function resolveCurrencySymbol(source, currencyUnitsOrOptions, maybeOptions) {
  return resolveDisplayCurrency(source, normalizeOptions(currencyUnitsOrOptions, maybeOptions)).symbol;
}

/**
 * Format an amount with the API currency symbol (or ISO code if no symbol). With neither
 * (unknown currency) the amount is shown on its own.
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

/**
 * Format an amount in the currency of `source` (see resolveDisplayCurrency).
 *
 * @param {number|string|null|undefined} amount
 * @param {string|object|null|undefined} source
 * @param {object} [options] same as resolveDisplayCurrency
 */
export function formatAmount(amount, source, options) {
  const { symbol, code } = resolveDisplayCurrency(source, options);
  return formatMoney(amount, symbol, code);
}

/**
 * A field label with the currency it is entered in: "Budget (£)", "Budget (CHF)"; just
 * "Budget" while the currency is unknown.
 */
export function labelWithCurrency(label, symbol) {
  const sym = trimStr(symbol);
  return sym ? `${label} (${sym})` : label;
}
