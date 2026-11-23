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
 * Currency of the master catalogue (prices not tied to a zone): the one every active zone
 * shares — the backend's rule for unzoned prices (resolveDisplayCurrency({})). Empty while
 * loading, or when active zones are in different currencies: the master prices then have
 * no single currency and are shown as plain numbers.
 */
export function useMasterCatalogCurrency() {
  const { data } = useGetAllZonesQuery();
  const { units } = useCurrencyUnits();
  return useMemo(
    () => sharedZoneCurrency(zonesArrayFromGetZonesResponse(data), units),
    [data, units]
  );
}

/** Formatter for master-catalogue prices (see useMasterCatalogCurrency). */
export function useMasterCatalogMoney() {
  const { symbol, code } = useMasterCatalogCurrency();
  return useCallback((amount) => formatMoney(amount, symbol, code), [symbol, code]);
}
