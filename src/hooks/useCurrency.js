import { useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import { useGetAllZonesQuery, useGetUnitsDistanceAndCurrencyQuery } from "../store/services/api";
import {
  buildCurrencyUnitsList,
  uniqueCurrencyUnitsByName,
  zonesArrayFromGetZonesResponse,
} from "../utilities/zonesList";
import { currencySymbolForCode, formatMoney, sharedZoneCurrency } from "../utilities/formatMoney";

/**
 * The platform's currencies: the `units` rows of type "currency"
 * (admin/getUnitsDistanceAndCurrency — the list the zone form picks from).
 *
 *   units    – every row (zones may point at any id), for lookups
 *   options  – one row per ISO code, active ones only, for selects
 *   symbolOf – ISO code → its symbol ("GBP" → "£"); the code itself when it has no row
 */
export function useCurrencyUnits() {
  const { data, isLoading, isError } = useGetUnitsDistanceAndCurrencyQuery("currency");
  const reduxCurrency = useSelector((state) => state?.apiData?.units?.currency);
  const units = useMemo(() => buildCurrencyUnitsList(data, reduxCurrency), [data, reduxCurrency]);
  const options = useMemo(
    () => uniqueCurrencyUnitsByName(units.filter((unit) => unit?.status !== false)),
    [units]
  );
  const symbolOf = useCallback((code) => currencySymbolForCode(code, units), [units]);
  return { units, options, symbolOf, isLoading, isError };
}

/**
 * The currency every active zone shares `{ symbol, code }` — the backend's
 * resolveDisplayCurrency({}). Empty while loading, or when active zones are in different
 * currencies: then there is no single platform currency.
 */
export function useActiveZonesCurrency() {
  const { data } = useGetAllZonesQuery();
  const { units } = useCurrencyUnits();
  return useMemo(
    () => sharedZoneCurrency(zonesArrayFromGetZonesResponse(data), units),
    [data, units]
  );
}

/**
 * Formatter for master-catalogue prices (not tied to a zone). They are in the currency every
 * active zone shares — the backend's rule for unzoned prices; with zones in different
 * currencies they have no single currency and show as plain numbers.
 */
export function useMasterCatalogMoney() {
  const { symbol, code } = useActiveZonesCurrency();
  return useCallback((amount) => formatMoney(amount, symbol, code), [symbol, code]);
}
