/**
 * Normalise zones array from `useGetAllZonesQuery` / add-shop style responses.
 * Handles `data` as an array or `{ zones: [...] }`.
 */
export function zonesArrayFromGetZonesResponse(zonesResponse) {
  if (zonesResponse == null) return [];
  const d =
    zonesResponse.data !== undefined && zonesResponse.data !== null
      ? zonesResponse.data
      : zonesResponse;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.zones)) return d.zones;
  if (Array.isArray(zonesResponse.zones)) return zonesResponse.zones;
  return [];
}

/** Redux `apiData.zones` is `payload.data` from getZones — array or `{ zones }`. */
function zonesArrayFromRedux(zonesNode) {
  if (zonesNode == null) return [];
  if (Array.isArray(zonesNode)) return zonesNode;
  if (Array.isArray(zonesNode.zones)) return zonesNode.zones;
  return [];
}

export function mergedZonesList(zonesResponse, zonesReduxNode) {
  const fromQuery = zonesArrayFromGetZonesResponse(zonesResponse);
  if (fromQuery.length) return fromQuery;
  return zonesArrayFromRedux(zonesReduxNode);
}

function normalizeCurrencyUnitsList(source) {
  if (source == null) return [];
  if (Array.isArray(source)) return source;
  if (Array.isArray(source?.data)) return source.data;
  if (Array.isArray(source?.units)) return source.units;
  if (Array.isArray(source?.currencies)) return source.currencies;
  if (Array.isArray(source?.currency)) return source.currency;
  if (Array.isArray(source?.rows)) return source.rows;
  return [];
}

/**
 * Merge currency rows from RTK `getUnitsDistanceAndCurrency` response + Redux `units.currency`.
 */
export function buildCurrencyUnitsList(currencyQueryPayload, reduxCurrency) {
  const parts = [
    ...normalizeCurrencyUnitsList(currencyQueryPayload),
    ...normalizeCurrencyUnitsList(reduxCurrency),
  ];
  const byId = new Map();
  for (const u of parts) {
    if (!u || u.id == null) continue;
    const key = String(u.id);
    if (!byId.has(key)) byId.set(key, u);
  }
  return Array.from(byId.values());
}

/**
 * Unique currency units for Select options (label = name + symbol).
 * Dev/stage DBs often re-seed `units` so the same currency name exists under many ids.
 * Keep the lowest id per normalized name/code.
 */
export function uniqueCurrencyUnitsByName(currencyUnits = []) {
  const list = Array.isArray(currencyUnits) ? currencyUnits : [];
  const sorted = [...list].sort((a, b) => Number(a?.id ?? 0) - Number(b?.id ?? 0));
  const seen = new Set();
  const unique = [];
  for (const unit of sorted) {
    const key = String(unit?.name ?? unit?.code ?? "")
      .trim()
      .toUpperCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(unit);
  }
  return unique;
}

/** Unwrap zone entity from `getZoneById` (or similar) JSON. */
export function unwrapZoneFromApiResponse(res) {
  if (res == null) return null;
  let d = res.data !== undefined && res.data !== null ? res.data : res;
  if (d && typeof d === "object") {
    if (d.zone && typeof d.zone === "object") return d.zone;
    if (d.data && typeof d.data === "object" && (d.data.id != null || d.data.name != null)) {
      return d.data;
    }
    if (d.id != null || d.name != null || d.coordinates != null) return d;
  }
  return typeof d === "object" ? d : null;
}

/**
 * ISO-style currency code for policy forms (USD, GBP, …).
 * Uses nested unit on zone when present; otherwise resolves `currencyUnitId` via `currencyUnits`.
 */
export function currencyCodeFromZone(zone, currencyUnits = []) {
  if (!zone) return null;

  const stringFields = [
    zone.currency,
    zone.zoneCurrency,
    zone.currencyCode,
    zone.currency_code,
  ];
  for (const v of stringFields) {
    if (typeof v === "string" && v.trim()) return v.trim().toUpperCase();
  }

  const unit =
    zone.currencyUnitZ ??
    zone.currencyUnit ??
    zone.currency_unit ??
    zone.currency_unit_z ??
    zone.CurrencyUnitZ ??
    zone.CurrencyUnit;

  const fromUnit = unit?.name ?? unit?.code;
  if (fromUnit != null && String(fromUnit).trim() !== "") {
    return String(fromUnit).trim().toUpperCase();
  }

  const id = zone.currencyUnitId ?? zone.currency_unit_id ?? zone.currencyUnitID;
  if (id != null && id !== "" && Array.isArray(currencyUnits) && currencyUnits.length) {
    const c = currencyUnits.find((u) => String(u?.id) === String(id));
    const n = c?.name ?? c?.code;
    if (n != null && String(n).trim() !== "") return String(n).trim().toUpperCase();
  }

  return null;
}
