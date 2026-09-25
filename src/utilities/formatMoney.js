/**
 * Single currency formatter for the admin panel.
 *
 * Resolution order (enterprise):
 *   1. Explicit payload (currencySymbol / paymentSummary / feeCurrency / ISO code)
 *   2. Zone currency (currencyUnitZ / currencyUnitId via units lookup)
 *   3. Country currency (zones under that country if unanimous; else ISO shortName map)
 *   4. Platform default GBP / £
 *
 * Always prefer API-provided symbols. Do not scatter hard-coded £ / $ in call sites.
 */

export const DEFAULT_CURRENCY = Object.freeze({
  code: "GBP",
  symbol: "£",
});

/** Soft fallback when a country has no zones with currency yet. */
export const COUNTRY_ISO_TO_CURRENCY = Object.freeze({
  GB: { code: "GBP", symbol: "£" },
  UK: { code: "GBP", symbol: "£" },
  US: { code: "USD", symbol: "$" },
  AE: { code: "AED", symbol: "د.إ" },
  SA: { code: "SAR", symbol: "﷼" },
  PK: { code: "PKR", symbol: "Rs" },
  IN: { code: "INR", symbol: "₹" },
  EU: { code: "EUR", symbol: "€" },
  IE: { code: "EUR", symbol: "€" },
  DE: { code: "EUR", symbol: "€" },
  FR: { code: "EUR", symbol: "€" },
  CA: { code: "CAD", symbol: "$" },
  AU: { code: "AUD", symbol: "$" },
});

/**
 * ISO country → currency meta (code + symbol).
 * Accepts a country row, shortName string, or any object with shortName/code/iso/iso2.
 * @returns {{ code: string, symbol: string } | null}
 */
export function currencyMetaForCountry(countryLike) {
  if (!countryLike) return null;
  const short =
    typeof countryLike === "string"
      ? countryLike
      : countryLike.shortName ?? countryLike.code ?? countryLike.iso ?? countryLike.iso2;
  const key = trimStr(short).toUpperCase();
  if (!key) return null;
  const mapped = COUNTRY_ISO_TO_CURRENCY[key];
  return mapped ? { code: mapped.code, symbol: mapped.symbol } : null;
}

/**
 * Resolve a currency `units` row for a country (lowest-id match preferred by caller list).
 * @returns {object|null} unit row from currencyUnits, or a synthetic { name, symbol, code } without id
 */
export function findCurrencyUnitForCountry(countryLike, currencyUnits = []) {
  const meta = currencyMetaForCountry(countryLike);
  if (!meta) return null;
  const unit = lookupUnitByCode(meta.code, currencyUnits);
  if (unit) return unit;
  return { name: meta.code, symbol: meta.symbol, code: meta.code };
}

/** When API sends ISO code only (e.g. "GBP") and units list is unavailable. */
const CODE_TO_SYMBOL = Object.freeze(
  Object.fromEntries(
    Object.values(COUNTRY_ISO_TO_CURRENCY).map((c) => [c.code, c.symbol])
  )
);

function symbolForIsoCode(code, currencyUnits = []) {
  const needle = trimStr(code).toUpperCase();
  if (!needle) return "";
  return lookupSymbolByCode(needle, currencyUnits) || CODE_TO_SYMBOL[needle] || "";
}

function trimStr(value) {
  return value == null ? "" : String(value).trim();
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

function lookupSymbolByCode(code, currencyUnits = []) {
  return trimStr(lookupUnitByCode(code, currencyUnits)?.symbol);
}

function lookupUnitById(id, currencyUnits = []) {
  if (id == null || id === "" || !Array.isArray(currencyUnits) || !currencyUnits.length) {
    return null;
  }
  return currencyUnits.find((unit) => String(unit?.id) === String(id)) || null;
}

function lookupSymbolByUnitId(id, currencyUnits = []) {
  return trimStr(lookupUnitById(id, currencyUnits)?.symbol);
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
    if (typeof field === "string" && /^[A-Za-z]{3}$/.test(field.trim())) {
      const code = field.trim().toUpperCase();
      const symbol = symbolForIsoCode(code, currencyUnits) || code;
      return { symbol, code };
    }
  }
  return null;
}

function countryRefFromSource(source) {
  if (!source || typeof source !== "object") return null;
  return (
    source.country ??
    source.Country ??
    source.city?.country ??
    source.city?.Country ??
    source.zone?.city?.country ??
    source.zone?.city?.Country ??
    source.addressDb?.country ??
    source.address?.country ??
    null
  );
}

function countryIdFromSource(source, explicitCountryId) {
  if (explicitCountryId != null && explicitCountryId !== "") return explicitCountryId;
  if (!source || typeof source !== "object") return null;
  return (
    source.countryId ??
    source.country_id ??
    countryRefFromSource(source)?.id ??
    source.city?.countryId ??
    source.zone?.city?.countryId ??
    source.addressDb?.countryId ??
    null
  );
}

function currencyFromCountryIso(countryLike, currencyUnits = []) {
  const mapped = currencyMetaForCountry(countryLike);
  if (!mapped) return null;
  const symbol =
    symbolForIsoCode(mapped.code, currencyUnits) || mapped.symbol || mapped.code;
  return { symbol, code: mapped.code };
}

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
  if (!matched.length) return null;

  const currencies = matched
    .map((z) => currencyFromZone(z, currencyUnits))
    .filter((c) => c && (c.symbol || c.code));
  if (!currencies.length) return null;

  const keys = new Set(
    currencies.map((c) => `${trimStr(c.code).toUpperCase()}|${trimStr(c.symbol)}`)
  );
  // Mixed currencies under one country → do not invent a single symbol.
  if (keys.size !== 1) return null;
  return currencies[0];
}

function currencyFromString(raw, currencyUnits = []) {
  const text = trimStr(raw);
  if (!text) return null;
  if (/^[A-Za-z]{3}$/.test(text)) {
    const code = text.toUpperCase();
    const symbol = symbolForIsoCode(code, currencyUnits) || code;
    return { symbol, code };
  }
  return { symbol: text, code: "" };
}

/**
 * Full currency resolution for display.
 *
 * @param {string|object|null|undefined} source
 * @param {{
 *   currencyUnits?: Array,
 *   zones?: Array,
 *   countryId?: *,
 *   country?: *,
 *   applyDefault?: boolean
 * }} [options]
 * @returns {{ symbol: string, code: string }}
 */
export function resolveDisplayCurrency(source, options = {}) {
  const {
    currencyUnits = [],
    zones = [],
    countryId: optionCountryId,
    country: optionCountry,
    applyDefault = true,
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
      typeof source.currency === "string" && /^[A-Za-z]{3}$/.test(source.currency.trim())
        ? source.currency
        : null,
      // Only ISO-4217-like codes (GBP). Never treat coupon/shop `code` strings
      // like "SEP24" as a currency — that produced "SEP24 20.00" in promo UI.
      typeof source.code === "string" && /^[A-Za-z]{3}$/.test(source.code.trim())
        ? source.code
        : null,
      typeof source.name === "string" && /^[A-Za-z]{3}$/.test(source.name.trim())
        ? source.name
        : null,
    ];
    let directCode = "";
    for (const candidate of codeCandidates) {
      const text = trimStr(candidate).toUpperCase();
      if (/^[A-Z]{3}$/.test(text)) {
        directCode = text;
        break;
      }
    }

    if (directSymbol) {
      const symbolLooksLikeCode = /^[A-Za-z]{3}$/.test(directSymbol);
      const codeFromSymbol = symbolLooksLikeCode ? directSymbol.toUpperCase() : "";
      found = {
        symbol:
          (codeFromSymbol ? symbolForIsoCode(codeFromSymbol, currencyUnits) : "") ||
          directSymbol,
        code: directCode || codeFromSymbol,
      };
    } else if (directCode) {
      found = {
        symbol: symbolForIsoCode(directCode, currencyUnits) || directCode,
        code: directCode,
      };
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
          symbol: psSymbol || symbolForIsoCode(psCode, currencyUnits) || psCode,
          code: psCode,
        };
      }
    }
  }

  if (!found) {
    const countryId = countryIdFromSource(source, optionCountryId);
    found =
      currencyFromCountryZones(countryId, zones, currencyUnits) ||
      currencyFromCountryIso(optionCountry ?? countryRefFromSource(source), currencyUnits) ||
      currencyFromCountryIso(
        typeof optionCountryId === "string" && /^[A-Za-z]{2}$/.test(optionCountryId)
          ? optionCountryId
          : null,
        currencyUnits
      );
  }

  if (found?.symbol || found?.code) {
    return {
      symbol: found.symbol || found.code || "",
      code: found.code || "",
    };
  }

  if (!applyDefault) return { symbol: "", code: "" };
  return { symbol: DEFAULT_CURRENCY.symbol, code: DEFAULT_CURRENCY.code };
}

/**
 * Pick a display symbol from common API payloads.
 *
 * @param {string|object|null|undefined} source
 * @param {Array|{currencyUnits?: Array, zones?: Array, countryId?: *, country?: *, applyDefault?: boolean}} [currencyUnitsOrOptions]
 * @param {object} [maybeOptions]
 */
export function resolveCurrencySymbol(source, currencyUnitsOrOptions, maybeOptions) {
  const options = normalizeOptions(currencyUnitsOrOptions, maybeOptions);
  // Preserve historical behaviour: bare resolve without options does not invent £.
  // Pass `{ applyDefault: true }` (or use resolveDisplayCurrency / formatAmount) for defaults.
  if (options.applyDefault == null) {
    options.applyDefault = Boolean(
      options.zones?.length ||
        options.countryId != null ||
        options.country != null ||
        options.forceDefault
    );
  }
  return resolveDisplayCurrency(source, options).symbol;
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

/**
 * Format using zone → country → default resolution.
 *
 * @param {number|string|null|undefined} amount
 * @param {string|object|null|undefined} source
 * @param {object} [options] same as resolveDisplayCurrency
 */
export function formatAmount(amount, source, options) {
  const { symbol, code } = resolveDisplayCurrency(source, options);
  return formatMoney(amount, symbol, code);
}
