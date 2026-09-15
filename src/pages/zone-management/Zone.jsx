import { useState, useEffect, useMemo, Fragment, useRef, useCallback } from "react";
import { TbPlus } from "../../shared/icons/index";
import { useNavigate } from "react-router-dom";
import {
  useGetAllZonesQuery,
  useLazyGetZoneByIdQuery,
  useGetAllCountriesQuery,
  useGetCitiesByCountryIdQuery,
  useGetAllCitiesQuery,
  useGetUnitsDistanceAndCurrencyQuery,
  useAddZoneByPostcodesMutation,
  useEditZoneByPostcodesMutation,
  useDeleteZoneMutation,
} from "../../store/services/api";
import { useSelector } from "react-redux";
import { Delay } from "../../components/shared/Loaders";
import { MapsUnavailableNotice } from "../../utilities/GoogleMapsProvider";
import { adminGeocode } from "../../utilities/adminGeocode";
import { triggerGoogleMapResize, useGoogleMaps } from "../../utilities/googleMapsConfig";
import {
  formatAmount,
  formatMoney,
  findCurrencyUnitForCountry,
  currencyMetaForCountry,
  resolveCurrencySymbol,
  resolveDisplayCurrency,
} from "../../utilities/formatters";
import {
  isUkCountry,
  normalizeCountryIso,
  postalCodePlaceholderForCountry,
  validatePostalCodeForCountry,
  validatePostalCodesForCountry,
} from "../../utilities/postalCodeValidation";
import {
  buildCurrencyUnitsList,
  uniqueCurrencyUnitsByName,
} from "../../utilities/zonesList";
import ZoneFiltersPopover from "./ZoneFiltersPopover";
import { Button, Field, Input, Modal, PageHeader, Select, Table, Textarea } from "../../design-system";
import { CheckRow } from "../misc-kit";
import {
  DirectoryActionDelete,
  DirectoryActionEdit,
  DirectoryActions,
  DirectoryActionView,
  DirectoryIdentity,
  DirectoryMetric,
  DirectoryMetrics,
  DirectoryMoney,
  DirectorySearch,
  DirectoryStatusPill,
  DirectoryTableWrap,
  DirectoryToolbar,
} from "../directory-table/directoryTable";
import { joinMeta } from "../directory-table/directoryTableUtils";
import {
  GoogleMap,
  DrawingManager,
  Marker,
  Polygon,
  Polyline,
} from "@react-google-maps/api";
import { LiaHandPointerSolid } from "react-icons/lia";
import { TbLassoPolygon, TbChevronLeft, TbChevronRight, TbChevronUp, TbChevronDown } from "react-icons/tb";
import { RxCross2 } from "react-icons/rx";
import useToaster from "../../components/ui/Toaster";
import { fetchWithTimeout } from "../../store/services/fetchWithTimeout";
import { getApiErrorMessage } from "../../store/services/apiErrors";

/**
 * UK postcode **sector** polygons (e.g. SW1A — not a single unit like SW1A 1AA).
 * Matching on outcode draws the whole sector; do not use when postcodes.io returns a unit `incode`.
 * @see https://github.com/missinglink/uk-postcode-polygons
 */
const UK_POSTCODE_AREA_GEOJSON_BASE =
  "https://cdn.jsdelivr.net/gh/missinglink/uk-postcode-polygons@master/geojson";
const ukPostcodeAreaGeojsonCache = new Map();

/** Zone payment methods (PayPal excluded). */
const ZONE_PAYMENT_METHOD_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "strip", label: "Stripe" },
];

function normalizeZonePaymentMethod(raw) {
  const s = String(raw ?? "").trim().toLowerCase();
  if (!s) return "";
  if (s === "cash") return "cash";
  if (s === "stripe" || s === "strip") return "strip";
  return "";
}

function parseZonePaymentMethods(raw) {
  const normalized = normalizeZonePaymentMethod(raw);
  return normalized ? [normalized] : [];
}

function paymentMethodsToZonePayload(methods) {
  const selected = Array.isArray(methods) ? methods : [];
  if (!selected.length) return {};

  const hasCash = selected.includes("cash");
  const hasStrip = selected.includes("strip");

  let paymentMethod = "";
  let paymentMehtod = null;

  if (hasStrip) {
    paymentMethod = "strip";
    paymentMehtod = "Stripe";
  } else if (hasCash) {
    paymentMethod = "cash";
    paymentMehtod = "Cash";
  }

  if (!paymentMethod) return {};

  return { paymentMethod, paymentMehtod };
}

function formatPaymentMethodsLabel(methods) {
  const labels = ZONE_PAYMENT_METHOD_OPTIONS
    .filter((opt) => methods?.includes(opt.value))
    .map((opt) => opt.label);
  return labels.length ? labels.join(", ") : "N/A";
}

function postcodesFingerprint(list) {
  const normalized = (Array.isArray(list) ? list : [])
    .map((pc) => String(pc ?? "").trim().replace(/\s+/g, "").toUpperCase())
    .filter(Boolean);
  return [...new Set(normalized)].sort().join("|");
}

function normalizeZonePostcodeList(raw) {
  let list = raw;
  if (typeof list === "string") {
    const trimmed = list.trim();
    if (!trimmed) return [];
    try {
      list = JSON.parse(trimmed);
    } catch {
      list = trimmed.split(/[\n,;]+/).map((p) => p.trim()).filter(Boolean);
    }
  }
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const pc = String(item ?? "").trim();
    if (!pc) continue;
    const key = pc.replace(/\s+/g, "").toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(pc);
  }
  return out;
}

function asCityList(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.cities)) return raw.cities;
  if (Array.isArray(raw?.data)) return raw.data;
  return [];
}

function formatZonePostcodesLabel(raw) {
  const list = normalizeZonePostcodeList(raw);
  if (!list.length) return "—";
  if (list.length <= 3) return list.join(", ");
  return `${list.slice(0, 3).join(", ")} +${list.length - 3}`;
}

function zoneCountryRef(zone) {
  return (
    zone?.city?.country ||
    zone?.country ||
    zone?.city?.Country ||
    null
  );
}

function formatZoneCurrencyLabel(zone, currencyUnits = []) {
  const resolved = resolveDisplayCurrency(zone, {
    currencyUnits,
    country: zoneCountryRef(zone),
    countryId: zone?.city?.countryId ?? zoneCountryRef(zone)?.id,
    applyDefault: false,
  });
  if (resolved.code && resolved.symbol) return `${resolved.code} (${resolved.symbol})`;
  if (resolved.code) return resolved.code;
  if (resolved.symbol) return resolved.symbol;

  const unit = zone?.currencyUnitZ;
  if (unit?.name && unit?.symbol) return `${unit.name} (${unit.symbol})`;
  if (unit?.name) return unit.name;
  if (unit?.symbol) return unit.symbol;
  return "—";
}

function formatZoneAdminLabel(zone) {
  const admin = zone?.zoneAdmin;
  if (admin) {
    const name = [admin.firstName, admin.lastName].filter(Boolean).join(" ").trim();
    if (name) return name;
    if (admin.email) return admin.email;
  }
  if (zone?.zoneAdminId) return `Admin #${zone.zoneAdminId}`;
  return "Unassigned";
}

function formatMoneyCell(value, zone, currencyUnits = []) {
  return formatAmount(value, zone, {
    currencyUnits,
    country: zoneCountryRef(zone),
    countryId: zone?.city?.countryId ?? zoneCountryRef(zone)?.id,
  });
}

/** Fields to merge into zone form when country implies a currency (US→USD, GB→GBP, …). */
function currencyFieldsForCountry(country, currencyUnits) {
  const unit = findCurrencyUnitForCountry(country, currencyUnits);
  if (!unit?.name) return null;
  return {
    zoneCurrency: unit.name,
    currencyUnitId: unit.id != null && unit.id !== "" ? String(unit.id) : "",
  };
}

function currencyMatchesCountry(currencyName, country) {
  const meta = currencyMetaForCountry(country);
  if (!meta) return true;
  return String(currencyName || "").trim().toUpperCase() === meta.code;
}

function csvEscape(value) {
  const s = String(value ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadZonesCsv(rows, columns) {
  const exportCols = (columns || []).filter(
    (c) => c.field && c.field !== "actions" && c.headerName
  );
  const header = exportCols.map((c) => csvEscape(c.headerName)).join(",");
  const lines = (rows || []).map((row) =>
    exportCols.map((c) => csvEscape(row[c.field])).join(",")
  );
  const csv = [header, ...lines].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `zones-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** If Google’s viewport is larger than this for a full unit postcode, it’s closer to sector than unit — use tight hex. */
const FULL_UNIT_MAX_VIEWPORT_DIAGONAL_KM = 1.15;
/** ~100 m in latitude degrees — approximate unit footprint when no tighter polygon exists. */
const UK_UNIT_POSTCODE_HEX_RADIUS_DEG = 0.0009;

function extractUkPostcodeAreaLetters(outcode) {
  const cleaned = String(outcode || "").replace(/\s+/g, "").toUpperCase();
  const m = cleaned.match(/^([A-Z]+)\d/);
  return m ? m[1] : null;
}

function geoJsonRingToGoogleMapsPath(ring) {
  if (!Array.isArray(ring) || ring.length < 3) return null;
  const path = ring.map(([lng, lat]) => ({
    lat: Number(lat),
    lng: Number(lng),
  }));
  const first = path[0];
  const last = path[path.length - 1];
  if (first.lat !== last.lat || first.lng !== last.lng) {
    path.push({ lat: first.lat, lng: first.lng });
  }
  return path;
}

function googleBoundsDiagonalKm(box) {
  if (!box?.northeast || !box?.southwest) return Infinity;
  const { northeast, southwest } = box;
  const midLat = (southwest.lat + northeast.lat) / 2;
  const dyKm = (northeast.lat - southwest.lat) * 111.32;
  const dxKm = (northeast.lng - southwest.lng) * 111.32 * Math.cos((midLat * Math.PI) / 180);
  return Math.sqrt(dxKm * dxKm + dyKm * dyKm);
}

/** Red dotted outline (Polygon has no dash support — use invisible-stroke Polyline + symbol icons). */
function getPostcodeDottedRedOutlineOptions() {
  if (typeof google !== "undefined" && google?.maps) {
    return {
      strokeOpacity: 0,
      icons: [
        {
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: "#D32F2F",
            fillOpacity: 1,
            strokeWeight: 0,
            scale: 1.75,
          },
          offset: "0",
          repeat: "6px",
        },
      ],
      zIndex: 2,
    };
  }
  return { strokeColor: "#D32F2F", strokeOpacity: 1, strokeWeight: 1 };
}

async function fetchUkPostcodeDistrictPolygon(outcode) {
  const area = extractUkPostcodeAreaLetters(outcode);
  if (!area) return null;
  try {
    let fc = ukPostcodeAreaGeojsonCache.get(area);
    if (!fc) {
      const res = await fetchWithTimeout(
        `${UK_POSTCODE_AREA_GEOJSON_BASE}/${encodeURIComponent(area)}.geojson`
      );
      if (!res.ok) return null;
      fc = await res.json();
      if (!fc?.features) return null;
      ukPostcodeAreaGeojsonCache.set(area, fc);
    }
    const target = String(outcode).replace(/\s+/g, "").toUpperCase();
    const feature = fc.features.find(
      (f) =>
        String(f.properties?.name || "")
          .replace(/\s+/g, "")
          .toUpperCase() === target
    );
    if (!feature?.geometry) return null;
    const { geometry } = feature;
    let ring = null;
    if (geometry.type === "Polygon" && geometry.coordinates?.[0]) {
      ring = geometry.coordinates[0];
    } else if (
      geometry.type === "MultiPolygon" &&
      geometry.coordinates?.[0]?.[0]
    ) {
      ring = geometry.coordinates[0][0];
    }
    return geoJsonRingToGoogleMapsPath(ring);
  } catch {
    return null;
  }
}

/** Map postcodes.io jargon to user-facing copy (API says "outcode"; UI should say "postcode"). */
function userFacingPostcodesIoError(message) {
  if (typeof message !== "string") return message;
  return message.replace(/\boutcode\b/gi, "postcode");
}

/**
 * postcodes.io `/postcodes/{pc}` accepts full UK postcodes; `/outcodes/{oc}` accepts outward codes (e.g. NW1).
 */
async function lookupPostcodesIoPostcodeOrOutcode(cleanPostcode) {
  const encoded = encodeURIComponent(cleanPostcode);
  const read = async (url) => {
    const response = await fetchWithTimeout(url);
    let body;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    return { response, body };
  };

  const first = await read(`https://api.postcodes.io/postcodes/${encoded}`);
  if (first.response.ok && first.body?.result) {
    return { ok: true, result: first.body.result };
  }
  const postcodeError = first.body?.error;

  const second = await read(`https://api.postcodes.io/outcodes/${encoded}`);
  if (second.response.ok && second.body?.result) {
    return { ok: true, result: second.body.result };
  }

  const errText =
    typeof second.body?.error === "string"
      ? second.body.error
      : typeof postcodeError === "string"
        ? postcodeError
        : second.body?.error != null
          ? String(second.body.error)
          : postcodeError != null
            ? String(postcodeError)
            : "";
  return { ok: false, errText };
}

/**
 * `/outcodes/{code}` results omit `region` (e.g. NW4 → Barnet only). City matching uses substring
 * checks against "London", so enrich from the outcode centroid via reverse lookup.
 */
async function enrichPostcodesIoResultForCityCheck(result) {
  if (!result) return result;
  const hasRegion = typeof result.region === "string" && result.region.trim() !== "";
  if (hasRegion) return result;
  const lat = result.latitude;
  const lng = result.longitude;
  if (lat == null || lng == null) return result;
  try {
    const url = `https://api.postcodes.io/postcodes?lon=${encodeURIComponent(
      String(lng)
    )}&lat=${encodeURIComponent(String(lat))}&limit=1`;
    const response = await fetchWithTimeout(url);
    if (!response.ok) return result;
    const data = await response.json();
    const nearest = data?.result?.[0];
    if (!nearest) return result;
    return {
      ...result,
      region: nearest.region ?? result.region,
      european_electoral_region:
        nearest.european_electoral_region ?? result.european_electoral_region,
    };
  } catch {
    return result;
  }
}

export default function ZoneManagement() {
  const navigate = useNavigate();
  const { isLoaded: isMapsLoaded } = useGoogleMaps();

  const [filterCity, setFilterCity] = useState("");
  const [filterPaymentMethod, setFilterPaymentMethod] = useState("");
  const [filterAssignment, setFilterAssignment] = useState("");
  const [zoneSearch, setZoneSearch] = useState("");

  // Map state
  const [center, setCenter] = useState({ lat: 31.5497, lng: 74.3436 }); // Lahore coordinates
  const [map, setMap] = useState(null);
  const [drawingMode, setDrawingMode] = useState(null);
  const [_coordinates, setCoordinates] = useState([]);

  // Postal code highlight state
  const [postalCodeHighlight, setPostalCodeHighlight] = useState(null);
  const [postalCodeMarkers, setPostalCodeMarkers] = useState([]);
  const [multiplePostcodeHighlights, setMultiplePostcodeHighlights] = useState([]); // Store multiple postal code polygons
  const [addedPostcodes, setAddedPostcodes] = useState([]); // Store list of added postal codes with their data
  const [newPostcodeInput, setNewPostcodeInput] = useState("");
  const [isAddingPostcode, setIsAddingPostcode] = useState(false);
  /** Set when edit modal hydrates postcodes; effect pans map once instance is ready */
  const [editPendingMapCenter, setEditPendingMapCenter] = useState(null);
  /** True while edit flow fetches zone + postcode boundaries (many postcodes = noticeable delay) */
  const [isEditPostcodesLoading, setIsEditPostcodesLoading] = useState(false);
  /** Toggles the manual postcode textarea + Add/Clear row on the map overlay */
  const [postcodeAddSectionVisible, setPostcodeAddSectionVisible] = useState(true);
  const postcodeChipsScrollRef = useRef(null);
  const [chipsCanScrollLeft, setChipsCanScrollLeft] = useState(false);
  const [chipsCanScrollRight, setChipsCanScrollRight] = useState(false);

  // Map container style
  const containerStyle = {
    width: "100%",
    height: "400px",
  };

  // Modal state
  const [add, setAdd] = useState({
    countryId: "",
    cityId: "",
    open: false,
    coordinates: "",
    zoneName: "",
    serviceCharge: "20",
    zoneMinimumAmount: "",
    zoneCommission: "",
    zoneCurrency: "",
    currencyUnitId: "",
    paymentMethods: [],
    deliveryCharges: "20",
    ExDeliveryCharges: " ",
    zoneAdminId: "",
    distanceUnitId: "",
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingZoneId, setEditingZoneId] = useState(null);
  /** Normalized postcode set when edit modal opened — omit postcodes on save if unchanged. */
  const [editBaselinePostcodesKey, setEditBaselinePostcodesKey] = useState("");
  const { success, error: showError } = useToaster();
  const { data: zonesQueryData, isLoading } = useGetAllZonesQuery();
  const { isLoading: _countriesLoading } = useGetAllCountriesQuery();
  const { data: allCitiesData } = useGetAllCitiesQuery();
  const [addZoneByPostcodes, { isLoading: isAddingZone }] = useAddZoneByPostcodesMutation();
  const [editZoneByPostcodes, { isLoading: isEditingZone }] = useEditZoneByPostcodesMutation();
  const [deleteZone] = useDeleteZoneMutation();
  const [fetchZoneById] = useLazyGetZoneByIdQuery();
  // Single source: RTK Query. Mutations invalidate Zones tags → list/detail refetch.
  const zones = zonesQueryData?.data;
  const countries = useSelector((state) => state?.apiData?.countries);
  const cities = useSelector((state) => state?.apiData?.cities);
  const units = useSelector((state) => state?.apiData?.units);

  // Fetch currencies and payment methods
  const { data: currenciesData } = useGetUnitsDistanceAndCurrencyQuery("currency", {
    skip: false,
  });

  // Full list (unique by id) for lookups — zone FKs may point at any seeded duplicate id.
  const currencies = useMemo(
    () => buildCurrencyUnitsList(currenciesData, units?.currency),
    [currenciesData, units?.currency]
  );
  // Select options: one row per currency name (DB often has dozens of re-seeded GBP/USD rows).
  const currenciesForSelect = useMemo(
    () => uniqueCurrencyUnitsByName(currencies),
    [currencies]
  );
  const allCities = useMemo(
    () =>
      Array.isArray(allCitiesData?.data)
        ? allCitiesData.data
        : Array.isArray(allCitiesData?.data?.cities)
          ? allCitiesData.data.cities
          : [],
    [allCitiesData?.data]
  );

  const {
    data: citiesByCountryResponse,
    isLoading: citiesLoading,
    isFetching: citiesFetching,
  } = useGetCitiesByCountryIdQuery(add.countryId, {
    skip: !add.countryId,
  });

  const countryCities = useMemo(() => {
    const fromCountry = asCityList(citiesByCountryResponse?.data);
    if (fromCountry.length) return fromCountry;
    if (!add.countryId) return [];
    return allCities.filter(
      (city) => String(city.countryId ?? city.country?.id) === String(add.countryId)
    );
  }, [citiesByCountryResponse, allCities, add.countryId]);

  const cityOptions = useMemo(() => {
    const opts = countryCities
      .filter((city) => city?.id != null && city?.name)
      .map((city) => ({ value: String(city.id), label: city.name }));
    if (add.cityId && !opts.some((option) => option.value === String(add.cityId))) {
      const extra =
        allCities.find((city) => String(city.id) === String(add.cityId)) ||
        (Array.isArray(cities)
          ? cities.find((city) => String(city.id) === String(add.cityId))
          : null);
      if (extra?.id && extra?.name) {
        opts.unshift({ value: String(extra.id), label: extra.name });
      }
    }
    return opts;
  }, [countryCities, add.cityId, allCities, cities]);

  const selectedCountry = useMemo(() => {
    if (!add.countryId || !Array.isArray(countries)) return null;
    return countries.find((c) => String(c.id) === String(add.countryId)) || null;
  }, [countries, add.countryId]);

  const selectedCountryIso = useMemo(
    () => normalizeCountryIso(selectedCountry),
    [selectedCountry]
  );

  const postcodeInputPlaceholder = useMemo(
    () => postalCodePlaceholderForCountry(selectedCountry),
    [selectedCountry]
  );

  // In edit mode, if city is known but country isn't, derive country from full city list
  // and align currency to that country when missing / mismatched (e.g. GBP on a US city).
  useEffect(() => {
    if (!add.open || !isEditMode || add.countryId || !add.cityId) return;
    const matchedCity = Array.isArray(allCities)
      ? allCities.find((city) => String(city.id) === String(add.cityId))
      : null;
    const derivedCountryId = matchedCity?.countryId || matchedCity?.country?.id;
    if (!derivedCountryId) return;
    const country =
      Array.isArray(countries) &&
      countries.find((c) => String(c.id) === String(derivedCountryId));
    const currencyPatch =
      country && !currencyMatchesCountry(add.zoneCurrency, country)
        ? currencyFieldsForCountry(country, currenciesForSelect)
        : null;
    setAdd((prev) => ({
      ...prev,
      countryId: String(derivedCountryId),
      ...(currencyPatch || {}),
    }));
  }, [
    add.open,
    isEditMode,
    add.cityId,
    add.countryId,
    add.zoneCurrency,
    allCities,
    countries,
    currenciesForSelect,
  ]);

  // After currency units load, fill currency when country is set but name/id still empty
  // (does not overwrite a user-chosen ISO code).
  useEffect(() => {
    if (!add.open || !add.countryId || !currenciesForSelect.length) return;
    const hasName = String(add.zoneCurrency || "").trim() !== "";
    const hasId = String(add.currencyUnitId || "").trim() !== "";
    if (hasName && hasId) return;
    const country =
      Array.isArray(countries) &&
      countries.find((c) => String(c.id) === String(add.countryId));
    if (!country) return;
    const patch = currencyFieldsForCountry(country, currenciesForSelect);
    if (!patch) return;
    setAdd((prev) => {
      const prevHasName = String(prev.zoneCurrency || "").trim() !== "";
      const prevHasId = String(prev.currencyUnitId || "").trim() !== "";
      if (prevHasName && prevHasId) return prev;
      return {
        ...prev,
        zoneCurrency: prevHasName ? prev.zoneCurrency : patch.zoneCurrency,
        currencyUnitId: prevHasId ? prev.currencyUnitId : patch.currencyUnitId,
      };
    });
  }, [
    add.open,
    add.countryId,
    add.zoneCurrency,
    add.currencyUnitId,
    countries,
    currenciesForSelect,
  ]);

  useEffect(() => {
    if (!editPendingMapCenter || !map || !add.open) return;
    map.setCenter(editPendingMapCenter);
    map.setZoom(14);
    triggerGoogleMapResize(map, editPendingMapCenter);
    setEditPendingMapCenter(null);
  }, [editPendingMapCenter, map, add.open]);

  useEffect(() => {
    if (!map || !add.open || !isMapsLoaded) return undefined;
    const timer = window.setTimeout(() => {
      triggerGoogleMapResize(map, center);
    }, 220);
    return () => window.clearTimeout(timer);
  }, [map, add.open, isMapsLoaded, center]);

  const updateChipsScrollState = useCallback(() => {
    const el = postcodeChipsScrollRef.current;
    if (!el) {
      setChipsCanScrollLeft(false);
      setChipsCanScrollRight(false);
      return;
    }
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setChipsCanScrollLeft(scrollLeft > 2);
    setChipsCanScrollRight(scrollLeft < scrollWidth - clientWidth - 2);
  }, []);

  useEffect(() => {
    updateChipsScrollState();
  }, [addedPostcodes, isEditPostcodesLoading, updateChipsScrollState]);

  useEffect(() => {
    const el = postcodeChipsScrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(updateChipsScrollState);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateChipsScrollState, addedPostcodes.length]);

  /** Arrows + hide/show live only for 5+ chips; re-expand input when count drops so it cannot stay stuck hidden */
  useEffect(() => {
    if (addedPostcodes.length <= 4) {
      setPostcodeAddSectionVisible(true);
    }
  }, [addedPostcodes.length]);

  const scrollPostcodeChips = (dir) => {
    const el = postcodeChipsScrollRef.current;
    if (!el) return;
    const amount = Math.min(240, el.clientWidth * 0.85);
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  // Map zone data
  const zonesData = useMemo(
    () =>
      (zones?.zones || []).map((zone, index) => {
        const postcodes = normalizeZonePostcodeList(zone.postcodes);
        const isAssigned = Boolean(zone.zoneAdminId || zone.zoneAdmin);
        const moneyOpts = {
          currencyUnits: currencies,
          country: zoneCountryRef(zone),
          countryId: zone?.city?.countryId ?? zoneCountryRef(zone)?.id,
          applyDefault: true,
        };
        return {
          id: zone.id,
          sl: index + 1,
          zoneId: zone.id,
          zoneName: zone.name,
          city: zone?.city?.name || "—",
          postcodes: formatZonePostcodesLabel(postcodes),
          postcodeCount: postcodes.length,
          currency: formatZoneCurrencyLabel(zone, currencies),
          currencySymbol: resolveCurrencySymbol(zone, moneyOpts),
          paymentMethod: formatPaymentMethodsLabel(
            parseZonePaymentMethods(
              zone.paymentMethod ??
                zone.paymentMehtod ??
                zone.payment_method ??
                zone.paymentMethods
            )
          ),
          zoneMinimumAmount: formatMoneyCell(zone.zoneMinimumAmount, zone, currencies),
          serviceFee: formatMoneyCell(zone.serviceCharge, zone, currencies),
          zoneMinimumAmountRaw: zone.zoneMinimumAmount,
          serviceChargeRaw: zone.serviceCharge,
          noOfShops: (() => {
            const n = Number(zone.shopCount ?? zone.shops);
            return Number.isFinite(n) ? n : 0;
          })(),
          zoneAssign: formatZoneAdminLabel(zone),
          _isAssigned: isAssigned,
          commission:
            zone.agentCommissionPercent ??
            (zone.zoneAdminComission != null
              ? 100 - zone.zoneAdminComission
              : "—"),
          status: zone.status,
          createdAt: zone.createdAt,
          updatedAt: zone.updatedAt,
          rawZone: zone,
        };
      }),
    [zones?.zones, currencies]
  );

  const zoneFilterCityOptions = useMemo(() => {
    const seen = new Set();
    const opts = [];
    for (const row of zonesData) {
      const name = String(row.city || "").trim();
      if (!name || name === "—" || seen.has(name)) continue;
      seen.add(name);
      opts.push({ value: name, label: name });
    }
    return opts.sort((a, b) => a.label.localeCompare(b.label));
  }, [zonesData]);

  const zoneFilterPaymentOptions = useMemo(() => {
    const seen = new Set();
    const opts = [];
    for (const row of zonesData) {
      const label = String(row.paymentMethod || "").trim();
      if (!label || label === "N/A" || seen.has(label)) continue;
      seen.add(label);
      opts.push({ value: label, label });
    }
    return opts;
  }, [zonesData]);

  const hasZoneFilters = Boolean(
    filterCity || filterPaymentMethod || filterAssignment
  );

  const filteredZonesData = useMemo(() => {
    let rows = zonesData;
    if (filterCity) {
      rows = rows.filter((r) => String(r.city) === filterCity);
    }
    if (filterPaymentMethod) {
      rows = rows.filter((r) => String(r.paymentMethod) === filterPaymentMethod);
    }
    if (filterAssignment === "assigned") {
      rows = rows.filter((r) => r._isAssigned);
    } else if (filterAssignment === "unassigned") {
      rows = rows.filter((r) => !r._isAssigned);
    }
    const q = zoneSearch.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) =>
        [r.zoneName, r.city, r.postcodes, r.paymentMethod, r.zoneAssign]
          .some((v) => String(v ?? "").toLowerCase().includes(q))
      );
    }
    return rows.map((row, index) => ({ ...row, sl: index + 1 }));
  }, [zonesData, filterCity, filterPaymentMethod, filterAssignment, zoneSearch]);

  const extractZonePostcodes = (zone) => {
    const postcodeRegex = /\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/i;
    const collectFromUnknownShape = (value, keyHint = "", acc = []) => {
      if (value == null) return acc;

      if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return acc;

        // Handle JSON-stringified arrays
        if (
          (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
          (trimmed.startsWith("{") && trimmed.endsWith("}"))
        ) {
          try {
            const parsed = JSON.parse(trimmed);
            return collectFromUnknownShape(parsed, keyHint, acc);
          } catch {
            // ignore JSON parse errors and continue with plain text parsing
          }
        }

        trimmed
          .split(/[\n,;]+/)
          .map((token) => token.trim())
          .filter(Boolean)
          .forEach((token) => {
            if (/(post|postal|zip)/i.test(keyHint) || postcodeRegex.test(token)) {
              acc.push(token);
            }
          });

        return acc;
      }

      if (Array.isArray(value)) {
        value.forEach((item) => collectFromUnknownShape(item, keyHint, acc));
        return acc;
      }

      if (typeof value === "object") {
        Object.entries(value).forEach(([key, nested]) =>
          collectFromUnknownShape(nested, key, acc)
        );
      }

      return acc;
    };

    const rawCandidates = [
      zone?.postcodes,
      zone?.postCodes,
      zone?.postalCodes,
      zone?.postalCodeList,
      zone?.zonePostcodes,
      zone?.zonePostCodes,
      zone?.zone_postcodes,
      zone?.postcodeList,
      zone?.postcode,
      zone?.postalCode,
      zone?.postal_code,
      zone?.post_codes,
    ];

    const firstNonEmpty = rawCandidates.find((value) => {
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === "string") return value.trim().length > 0;
      return false;
    });

    let parsed = [];
    if (Array.isArray(firstNonEmpty)) {
      parsed = firstNonEmpty
        .map((item) => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object") {
            return (
              item.postcode ||
              item.postCode ||
              item.postalCode ||
                item.zipCode ||
                item.zip ||
              item.code ||
              item.name ||
              ""
            );
          }
          return "";
        })
        .filter(Boolean);
    } else if (typeof firstNonEmpty === "string") {
      const raw = firstNonEmpty.trim();
      if (raw.startsWith("[") && raw.endsWith("]")) {
        try {
          const jsonArray = JSON.parse(raw);
          parsed = Array.isArray(jsonArray)
            ? jsonArray.map((code) => String(code).trim()).filter(Boolean)
            : [];
        } catch {
          parsed = raw
            .split(/[\n,;]+/)
            .map((code) => code.trim())
            .filter(Boolean);
        }
      } else {
        parsed = raw
          .split(/[\n,;]+/)
          .map((code) => code.trim())
          .filter(Boolean);
      }
    }

    if (parsed.length === 0) {
      parsed = collectFromUnknownShape(zone);
    }

    // Normalize + dedupe while preserving order
    const unique = [];
    const seen = new Set();
    parsed.forEach((code) => {
      const normalized = String(code).trim();
      if (!normalized) return;
      const key = normalized.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      unique.push(normalized);
    });

    return unique;
  };

  const extractRingCoordinates = (zone) => {
    const ring = zone?.coordinates?.coordinates?.[0];
    return Array.isArray(ring) ? ring : [];
  };

  /** Rough max distance across ring bbox (km). Used to detect compact “one postcode” shapes. */
  const ringBoundingDiagonalKm = (lngLatPoints) => {
    if (!Array.isArray(lngLatPoints) || lngLatPoints.length === 0) return Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;
    for (const pt of lngLatPoints) {
      const [lng, lat] = pt || [];
      if (typeof lng !== "number" || typeof lat !== "number") continue;
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    }
    if (!Number.isFinite(minLat)) return Infinity;
    const midLat = (minLat + maxLat) / 2;
    const dyKm = (maxLat - minLat) * 111.32;
    const dxKm = (maxLng - minLng) * 111.32 * Math.cos((midLat * Math.PI) / 180);
    return Math.sqrt(dxKm * dxKm + dyKm * dyKm);
  };

  /** Above this, polygon is treated as a larger / hand-drawn zone → sample perimeter. */
  const POLYGON_DERIVED_SINGLE_POSTCODE_MAX_DIAGONAL_KM = 6;

  const getPostcodesFromCoordinates = async (ringCoordinates) => {
    if (!Array.isArray(ringCoordinates) || ringCoordinates.length === 0) return [];

    const extractPostcodeFromPostcodesIo = (payload) => {
      const result = payload?.result;
      if (Array.isArray(result)) {
        return result?.[0]?.postcode || "";
      }
      if (result && typeof result === "object") {
        return result?.postcode || "";
      }
      return "";
    };

    const lookupPostcodePostcodesIo = async (lng, lat) => {
      try {
        const response = await fetchWithTimeout(
          `https://api.postcodes.io/postcodes?lon=${lng}&lat=${lat}`
        );
        if (!response.ok) return "";
        const data = await response.json();
        return extractPostcodeFromPostcodesIo(data);
      } catch {
        return "";
      }
    };

    const lookupPostcodeGoogle = async (lng, lat) => {
      try {
        const data = await adminGeocode({ latlng: `${lat},${lng}` });
        const postcodeComponent = data?.results
          ?.flatMap((result) => result?.address_components || [])
          ?.find((component) => component?.types?.includes("postal_code"));
        return postcodeComponent?.long_name || postcodeComponent?.short_name || "";
      } catch {
        return "";
      }
    };

    const validPoints = ringCoordinates.filter(
      (p) => Array.isArray(p) && typeof p[0] === "number" && typeof p[1] === "number"
    );
    if (validPoints.length === 0) return [];

    const ringNoClose =
      validPoints.length > 1 &&
      validPoints[0][0] === validPoints[validPoints.length - 1][0] &&
      validPoints[0][1] === validPoints[validPoints.length - 1][1]
        ? validPoints.slice(0, -1)
        : validPoints;

    let sumLng = 0;
    let sumLat = 0;
    for (const [lng, lat] of ringNoClose) {
      sumLng += lng;
      sumLat += lat;
    }
    const centroidLng = sumLng / ringNoClose.length;
    const centroidLat = sumLat / ringNoClose.length;

    const diagonalKm = ringBoundingDiagonalKm(ringNoClose);

    // Single-postcode zones (hex / geocode bbox) are small; perimeter sampling lands in *neighbouring* postcodes.
    if (diagonalKm <= POLYGON_DERIVED_SINGLE_POSTCODE_MAX_DIAGONAL_KM) {
      let pc = await lookupPostcodePostcodesIo(centroidLng, centroidLat);
      if (!pc) pc = await lookupPostcodeGoogle(centroidLng, centroidLat);
      const normalized = String(pc || "").trim();
      return normalized ? [normalized] : [];
    }

    // Larger polygons: sample perimeter (legacy behaviour)
    const sampleStep = Math.max(1, Math.floor(ringCoordinates.length / 8));
    const sampled = ringCoordinates
      .filter((_, index) => index % sampleStep === 0)
      .slice(0, 10);

    const results = [];
    for (const point of sampled) {
      const [lng, lat] = point || [];
      if (typeof lng !== "number" || typeof lat !== "number") continue;
      const postcode = await lookupPostcodePostcodesIo(lng, lat);
      if (postcode) results.push(postcode);
    }

    if (results.length === 0) {
      for (const point of sampled.slice(0, 5)) {
        const [lng, lat] = point || [];
        if (typeof lng !== "number" || typeof lat !== "number") continue;
        const postcode = await lookupPostcodeGoogle(lng, lat);
        if (postcode) results.push(postcode);
      }
    }

    const unique = [];
    const seen = new Set();
    results.forEach((postcode) => {
      const normalized = String(postcode).trim();
      if (!normalized) return;
      const key = normalized.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      unique.push(normalized);
    });
    return unique;
  };

  const handleEditZone = async (row) => {
    setIsEditPostcodesLoading(true);
    try {
      setEditPendingMapCenter(null);
      const rowZone = row?.rawZone || row || {};
      const zoneId = rowZone.id || row?.id || null;

      setIsEditMode(true);
      setEditingZoneId(zoneId != null ? String(zoneId) : null);
      // Open modal first, then hydrate edit values
      setAdd((prev) => ({ ...prev, open: true }));

      // Explicitly fetch zone details from /admin/getZoneById/:id for edit prefill
      let zone = rowZone;
      if (zoneId) {
        try {
          // Force network fetch for edit form (avoid stale detail after list edits).
          const zoneResponse = await fetchZoneById(String(zoneId), false).unwrap();
          // Prefer fresh API fields; keep row only for nested/optional fallbacks.
          zone = {
            ...(rowZone || {}),
            ...(zoneResponse?.data || {}),
          };
        } catch (error) {
          console.error("Failed to fetch zone by id for edit:", error);
        }
      }

      const selectedCurrency = Array.isArray(currencies)
        ? currencies.find((currency) => String(currency.id) === String(zone.currencyUnitId))
        : null;

      const derivedCityId = zone.cityId || zone?.city?.id || "";
      const cityFromAllCities = Array.isArray(allCities)
        ? allCities.find((city) => String(city.id) === String(derivedCityId))
        : null;
      const derivedCountryId =
        zone.countryId ||
        zone?.city?.countryId ||
        zone?.city?.country?.id ||
        cityFromAllCities?.countryId ||
        cityFromAllCities?.country?.id ||
        "";

      const countryForCurrency =
        (Array.isArray(countries) &&
          countries.find((c) => String(c.id) === String(derivedCountryId))) ||
        zone?.city?.country ||
        cityFromAllCities?.country ||
        null;

      let zoneCurrency = selectedCurrency?.name || "";
      let currencyUnitId = zone.currencyUnitId ? String(zone.currencyUnitId) : "";
      // Prefer country-default when stored currency is missing or does not match country (US≠GBP).
      if (
        countryForCurrency &&
        (!zoneCurrency || !currencyMatchesCountry(zoneCurrency, countryForCurrency))
      ) {
        const patch = currencyFieldsForCountry(
          countryForCurrency,
          currenciesForSelect.length ? currenciesForSelect : currencies
        );
        if (patch) {
          zoneCurrency = patch.zoneCurrency;
          currencyUnitId = patch.currencyUnitId || currencyUnitId;
        }
      }

      setAdd((prev) => ({
        ...prev,
        countryId: derivedCountryId ? String(derivedCountryId) : "",
        cityId: derivedCityId ? String(derivedCityId) : "",
        coordinates: "",
        zoneName: zone.name || "",
        serviceCharge: zone.serviceCharge != null && zone.serviceCharge !== ""
          ? String(zone.serviceCharge)
          : "20",
        zoneMinimumAmount: zone.zoneMinimumAmount ?? "",
        zoneCommission: zone.agentCommissionPercent ?? (100 - (zone.zoneAdminComission ?? 20)),
        zoneCurrency,
        currencyUnitId,
        paymentMethods: parseZonePaymentMethods(
          zone.paymentMethod ??
            zone.paymentMehtod ??
            zone.payment_method ??
            zone.paymentMethods ??
            rowZone?.paymentMethod ??
            rowZone?.payment_method
        ),
        deliveryCharges: zone.serviceCharge != null && zone.serviceCharge !== ""
          ? String(zone.serviceCharge)
          : "20",
        ExDeliveryCharges: "",
        zoneAdminId: zone.zoneAdminId ? String(zone.zoneAdminId) : "",
        distanceUnitId: zone.distanceUnitId ? String(zone.distanceUnitId) : "2",
      }));

      // 1) try direct postcodes from zone detail response
      let postcodes = extractZonePostcodes(zone);
      // 2) if not present, derive postcodes from polygon coordinates
      if (postcodes.length === 0) {
        const ringCoordinates = extractRingCoordinates(zone);
        postcodes = await getPostcodesFromCoordinates(ringCoordinates);
      }

      setPostalCodeHighlight(null);
      setNewPostcodeInput("");

      const seenPc = new Set();
      const uniquePostcodes = [];
      for (const p of postcodes) {
        const norm = String(p || "").trim();
        if (!norm) continue;
        const key = norm.toLowerCase().replace(/\s+/g, "");
        if (seenPc.has(key)) continue;
        seenPc.add(key);
        uniquePostcodes.push(norm);
      }

      if (uniquePostcodes.length === 0) {
        setAddedPostcodes([]);
        setPostalCodeMarkers([]);
        setMultiplePostcodeHighlights([]);
        showError("No postcode found from this zone's coordinates.");
        return;
      }

      const newHighlights = [];
      const newMarkers = [];
      const newPostcodeDataList = [];
      let lastCenterPoint = null;

      for (const postcode of uniquePostcodes) {
        try {
          const boundaryData = await fetchPostalCodeBoundary(postcode, {
            countryIso: normalizeCountryIso(countryForCurrency) || selectedCountryIso,
            cityName: cityFromAllCities?.name || zone?.city?.name || null,
          });
          if (boundaryData) {
            lastCenterPoint = boundaryData.centerPoint;
            newPostcodeDataList.push({
              postcode: boundaryData.postcode,
              center: boundaryData.centerPoint,
              paths: boundaryData.polygonPath,
            });
            newHighlights.push({
              paths: boundaryData.polygonPath,
              postcode: boundaryData.postcode,
              center: boundaryData.centerPoint,
            });
            newMarkers.push({
              position: boundaryData.centerPoint,
              postcode: boundaryData.postcode,
              label: boundaryData.postcode,
            });
          } else {
            newPostcodeDataList.push({ postcode });
          }
        } catch (e) {
          console.error(`Edit zone: boundary fetch failed for ${postcode}:`, e);
          newPostcodeDataList.push({ postcode });
        }
      }

      setAddedPostcodes(newPostcodeDataList);
      setMultiplePostcodeHighlights(newHighlights);
      setPostalCodeMarkers(newMarkers);
      setEditBaselinePostcodesKey(
        postcodesFingerprint(newPostcodeDataList.map((pc) => pc.postcode))
      );

      if (lastCenterPoint) {
        setCenter(lastCenterPoint);
        setEditPendingMapCenter(lastCenterPoint);
      }
    } catch (error) {
      console.error("Error opening edit modal:", error);
      showError("Failed to open edit modal.");
    } finally {
      setIsEditPostcodesLoading(false);
    }
  };

  const handleDeleteZone = async (row) => {
    const rowZone = row?.rawZone || row || {};
    const zoneId = rowZone.id || row?.id;

    if (!zoneId) {
      showError("Unable to delete zone: missing zone id.");
      return;
    }

    try {
      const res = await deleteZone(zoneId).unwrap();
      if (res?.status === "1") {
        success("Zone deleted successfully.");
      } else {
        showError(res?.message || "Failed to delete zone.");
      }
      // LIST tag invalidation refreshes useGetAllZonesQuery
    } catch (err) {
      showError(getApiErrorMessage(err, "Failed to delete zone."));
    }
  };

  // Column configuration for zone table
  const zoneExportColumns = [
    { field: "sl", headerName: "SL" },
    { field: "zoneName", headerName: "Zone Name" },
    { field: "city", headerName: "City" },
    { field: "postcodes", headerName: "Postcodes" },
    { field: "currency", headerName: "Currency" },
    { field: "paymentMethod", headerName: "Payment Method" },
    { field: "zoneMinimumAmount", headerName: "Zone Minimum" },
    { field: "serviceFee", headerName: "Service Fee" },
    { field: "commission", headerName: "Agent commission %" },
    { field: "noOfShops", headerName: "No of Shops" },
    { field: "zoneAssign", headerName: "Zone Assign" },
  ];

  const zoneColumns = [
    {
      key: "zoneName",
      header: "Zone",
      render: (row) => (
        <DirectoryIdentity
          name={row.zoneName}
          meta={joinMeta(row.city, row.postcodes)}
          id={row.zoneId}
        />
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <DirectoryStatusPill
          active={row._isAssigned}
          activeLabel="Assigned"
          inactiveLabel="Unassigned"
        />
      ),
    },
    {
      key: "city",
      header: "City",
      render: (row) => row.city || "—",
    },
    {
      key: "postcodeCount",
      header: "Postcodes",
      render: (row) => {
        const n = Number(row.postcodeCount);
        if (!Number.isFinite(n) || n <= 0) {
          return <span title={row.postcodes}>—</span>;
        }
        return (
          <span title={row.postcodes}>
            <DirectoryMetric value={`${n} ${n === 1 ? "code" : "codes"}`} />
          </span>
        );
      },
    },
    {
      key: "noOfShops",
      header: "Shops",
      render: (row) => (
        <DirectoryMetric value={row.noOfShops} hint={row.zoneAssign} />
      ),
    },
    {
      key: "zoneMinimumAmount",
      header: "Minimum",
      align: "right",
      render: (row) => (
        <DirectoryMoney>
          {formatMoney(row.zoneMinimumAmountRaw, row.currencySymbol)}
        </DirectoryMoney>
      ),
    },
    {
      key: "serviceFee",
      header: "Service fee",
      align: "right",
      render: (row) => (
        <DirectoryMoney>
          {formatMoney(row.serviceChargeRaw, row.currencySymbol)}
        </DirectoryMoney>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <DirectoryActions>
          <DirectoryActionView onClick={() => handleRowAction("view", row)} />
          <DirectoryActionEdit onClick={() => handleEditZone(row)} />
          <DirectoryActionDelete onClick={() => handleDeleteZone(row)} />
        </DirectoryActions>
      ),
    },
  ];

  // Modal handlers
  const handleToggle = () => {
    if (add.open) {
      setIsEditMode(false);
      setEditingZoneId(null);
      // Reset form when closing
      setAdd({
        open: false,
        zoneName: "",
        description: "",
        coordinates: "",
        serviceCharge: "20",
        zoneMinimumAmount: "",
        countryId: "",
        cityId: "",
        zoneCommission: "",
        zoneCurrency: "",
        currencyUnitId: "",
        paymentMethods: [],
        deliveryCharges: "20",
        ExDeliveryCharges: "",
        zoneAdminId: "",
        distanceUnitId: "",
      });
      // Clear coordinates and reset map
      setCoordinates([]);
      setDrawingMode(null);
      setPostalCodeHighlight(null);
      setPostalCodeMarkers([]);
      setMultiplePostcodeHighlights([]);
      setAddedPostcodes([]);
      setNewPostcodeInput("");
      setEditPendingMapCenter(null);
      setIsEditPostcodesLoading(false);
      setPostcodeAddSectionVisible(true);
      setEditBaselinePostcodesKey("");
      if (map) {
        map.setOptions({ draggableCursor: "pointer" });
      }
    } else {
      // Just open the modal for add
      setIsEditMode(false);
      setEditingZoneId(null);
      setEditBaselinePostcodesKey("");
      setAdd((prev) => ({
        ...prev,
        open: true,
        distanceUnitId: "2",
        currencyUnitId: "",
        zoneCurrency: "",
        serviceCharge: "20",
        deliveryCharges: "20",
      }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setAdd((prev) => {
      const next = { ...prev, [name]: value };
      // Keep serviceCharge / deliveryCharges in sync (API uses serviceCharge).
      if (name === "serviceCharge" || name === "deliveryCharges") {
        next.serviceCharge = value;
        next.deliveryCharges = value;
      }
      return next;
    });
  };

  const handleAddZone = async () => {
    try {
      if (!add.countryId || String(add.countryId).trim() === "") {
        showError("Please select a country.");
        return;
      }
      if (!add.cityId || String(add.cityId).trim() === "") {
        showError("Please select a city.");
        return;
      }
      if (!addedPostcodes || addedPostcodes.length === 0) {
        showError("Please add at least one postal code before creating a zone.");
        return;
      }
      const zoneNameTrimmed = String(add.zoneName ?? "").trim();
      if (!zoneNameTrimmed) {
        showError("Zone name is required.");
        return;
      }
      const minRaw = add.zoneMinimumAmount;
      if (minRaw === "" || minRaw === null || minRaw === undefined) {
        showError("Zone minimum amount is required.");
        return;
      }
      const zoneMinimumNum = parseFloat(String(minRaw).trim());
      if (!Number.isFinite(zoneMinimumNum) || zoneMinimumNum < 0) {
        showError("Enter a valid zone minimum amount.");
        return;
      }
      const feeRaw = add.serviceCharge ?? add.deliveryCharges;
      if (feeRaw === "" || feeRaw === null || feeRaw === undefined) {
        showError("Service fee is required.");
        return;
      }
      const serviceFeeNum = parseFloat(String(feeRaw).trim());
      if (!Number.isFinite(serviceFeeNum) || serviceFeeNum < 0) {
        showError("Enter a valid service fee.");
        return;
      }
      const commRaw = add.zoneCommission;
      if (commRaw === "" || commRaw === null || commRaw === undefined) {
        showError("Agent commission % is required.");
        return;
      }
      const zoneCommissionNum = parseFloat(String(commRaw).trim());
      if (!Number.isFinite(zoneCommissionNum) || zoneCommissionNum < 0 || zoneCommissionNum > 100) {
        showError("Enter a valid agent commission percentage (0–100).");
        return;
      }
      // Extract postcodes array from addedPostcodes
      const postcodes = addedPostcodes.map((pc) => pc.postcode);

      const countryForPostcodes =
        Array.isArray(countries) &&
        countries.find((c) => String(c.id) === String(add.countryId));
      const postcodeBatch = validatePostalCodesForCountry(
        postcodes,
        countryForPostcodes
      );
      if (!postcodeBatch.ok && postcodeBatch.invalid.length) {
        const first = postcodeBatch.invalid[0];
        showError(
          first.message ||
            `One or more postal codes do not match ${
              countryForPostcodes?.name || "the selected country"
            }.`
        );
        return;
      }

      // Find the selected currency to get its ID (canonical lowest id per name)
      const selectedCurrency = currenciesForSelect.find(
        (currency) => currency.name === add.zoneCurrency
      );
      const countryForCurrency = countryForPostcodes;
      const countryCurrency = countryForCurrency
        ? findCurrencyUnitForCountry(countryForCurrency, currenciesForSelect)
        : null;
      const fromSelect =
        selectedCurrency?.id != null ? Number(selectedCurrency.id) : NaN;
      const fromForm = add.currencyUnitId
        ? parseInt(String(add.currencyUnitId), 10)
        : NaN;
      const fromCountry =
        countryCurrency?.id != null ? Number(countryCurrency.id) : NaN;
      const currencyUnitId = [fromSelect, fromForm, fromCountry].find(
        (n) => Number.isFinite(n) && n > 0
      );
      if (!currencyUnitId) {
        showError("Please select a valid zone currency for this country.");
        return;
      }

      // Keep existing distance unit in edit mode; default to 2 for new zones
      const distanceUnitId = parseInt(add.distanceUnitId) || 2;

      const paymentPayload = paymentMethodsToZonePayload(add.paymentMethods);
      const zoneData = {
        name: zoneNameTrimmed,
        postcodes: postcodes,
        cityId: parseInt(add.cityId, 10),
        zoneMinimumAmount: zoneMinimumNum,
        currencyUnitId,
        distanceUnitId: distanceUnitId,
        serviceCharge: serviceFeeNum,
        agentCommissionPercent: zoneCommissionNum,
        zoneAdminComission: 100 - zoneCommissionNum,
        zoneAdminId: add.zoneAdminId && add.zoneAdminId.trim() !== "" ? parseInt(add.zoneAdminId) : null,
        status: true, // create as active
        ...paymentPayload,
      };

      if (isEditMode && editingZoneId) {
        // Any edit should reactivate the zone.
        const editPayload = {
          ...zoneData,
          status: true,
          isActive: true,
        };
        // If postcodes were not changed in the form, omit them so fee/min/commission
        // updates are not blocked by London postcode re-validation / geocode.
        const currentKey = postcodesFingerprint(postcodes);
        if (editBaselinePostcodesKey && currentKey === editBaselinePostcodesKey) {
          delete editPayload.postcodes;
        }
        await editZoneByPostcodes({
          id: editingZoneId,
          body: editPayload,
        }).unwrap();
        success("Zone updated successfully!");
      } else {
        await addZoneByPostcodes(zoneData).unwrap();
        success("Zone added successfully!");
      }

      // Reset state
      setAddedPostcodes([]);
      setMultiplePostcodeHighlights([]);
      setPostalCodeMarkers([]);
      setCoordinates([]);
      setEditBaselinePostcodesKey("");
      handleToggle();
      // Zones LIST + detail tags invalidated by the mutation — no manual refetch.
    } catch (err) {
      showError(getApiErrorMessage(err, "Failed to add zone. Please try again."));
    }
  };


  const handleDownload = () => {
    if (!filteredZonesData?.length) {
      showError("No zones to download.");
      return;
    }
    downloadZonesCsv(filteredZonesData, zoneExportColumns);
    success("Zones CSV downloaded.");
  };

  const clearZoneFilters = () => {
    setFilterCity("");
    setFilterPaymentMethod("");
    setFilterAssignment("");
  };

  const handelCountryChange = (selectedCountryId) => {
    const country =
      Array.isArray(countries) &&
      countries.find((c) => String(c.id) === String(selectedCountryId));
    const currencyPatch = country
      ? currencyFieldsForCountry(country, currenciesForSelect)
      : null;

    // Drop postcodes that are invalid for the newly selected country (e.g. UK codes on US).
    const kept = [];
    const removed = [];
    for (const pc of addedPostcodes) {
      const code = pc?.postcode ?? pc;
      const check = validatePostalCodeForCountry(code, country);
      if (check.ok) kept.push(pc);
      else removed.push(code);
    }
    if (removed.length) {
      setAddedPostcodes(kept);
      setMultiplePostcodeHighlights((prev) =>
        prev.filter((h) =>
          kept.some((k) => String(k.postcode) === String(h.postcode))
        )
      );
      setPostalCodeMarkers((prev) =>
        prev.filter((m) =>
          kept.some((k) => String(k.postcode) === String(m.postcode))
        )
      );
      showError(
        `Removed ${removed.length} postal code(s) that do not match ${
          country?.name || "the selected country"
        }: ${removed.slice(0, 5).join(", ")}${removed.length > 5 ? "…" : ""}`
      );
    }

    setAdd((prev) => ({
      ...prev,
      countryId: selectedCountryId,
      cityId: "",
      ...(currencyPatch || { zoneCurrency: "", currencyUnitId: "" }),
    }));
  };

  const handleCityChange = (selectedCityId) => {
    setAdd((prev) => ({
      ...prev,
      cityId: selectedCityId,
    }));
  };

  const handleRowAction = (actionType, rowData) => {
    if (actionType === "view") {
      navigate(`/zone-management/details/${rowData.id}`);
    }
  };

  // Create a hexagon shape
  const createHexagon = (centerLat, centerLng, radius) => {
    const points = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      points.push({
        lat: centerLat + radius * Math.cos(angle),
        lng: centerLng + radius * Math.sin(angle),
      });
    }
    // Close the polygon
    points.push(points[0]);
    return points;
  };

  /** Google geocode with country bias; returns center + optional viewport polygon. */
  const geocodePostalBoundary = async (postalCode, countryIso, cityName) => {
    const addressParts = [String(postalCode).trim()];
    if (cityName) addressParts.push(String(cityName).trim());
    const geocodingData = await adminGeocode({
      address: addressParts.join(", "),
      country: countryIso || undefined,
    });
    if (!geocodingData.results?.length) return null;

    const result = geocodingData.results[0];
    const geometry = result.geometry;
    if (!geometry?.location) return null;

    const gCenter = {
      lat: geometry.location.lat,
      lng: geometry.location.lng,
    };

    const countryComp = (result.address_components || []).find(
      (c) => Array.isArray(c.types) && c.types.includes("country")
    );
    const resultIso = normalizeCountryIso(countryComp?.short_name);
    if (countryIso && resultIso && resultIso !== countryIso) {
      return null;
    }

    const box = geometry.bounds || geometry.viewport;
    let polygonPath = null;
    if (box) {
      polygonPath = [
        { lat: box.northeast.lat, lng: box.southwest.lng },
        { lat: box.northeast.lat, lng: box.northeast.lng },
        { lat: box.southwest.lat, lng: box.northeast.lng },
        { lat: box.southwest.lat, lng: box.southwest.lng },
        { lat: box.northeast.lat, lng: box.southwest.lng },
      ];
    } else {
      polygonPath = createHexagon(gCenter.lat, gCenter.lng, 0.005);
    }

    return {
      centerPoint: gCenter,
      polygonPath,
      bounds: box || null,
      postcode: String(postalCode).trim().toUpperCase(),
      formattedAddress: result.formatted_address || "",
      addressComponents: result.address_components || [],
    };
  };

  // Helper function to fetch postal code boundary for the map.
  // UK: postcodes.io + optional sector GeoJSON; other countries: Google with country bias.
  const fetchPostalCodeBoundary = async (postalCode, options = {}) => {
    const countryIso =
      normalizeCountryIso(options.countryIso || selectedCountryIso) || "";
    const cityName = options.cityName || null;

    try {
      // Non-UK: never hit postcodes.io (would accept RM8 for a US zone).
      if (countryIso && !isUkCountry(countryIso)) {
        return await geocodePostalBoundary(postalCode, countryIso, cityName);
      }

      const cleanPostcode = postalCode.replace(/\s+/g, "");

      const centerRes = await fetchWithTimeout(
        `https://api.postcodes.io/postcodes/${encodeURIComponent(cleanPostcode)}`
      );

      let centerPoint = null;
      let outcode = null;
      let normalizedPostcode = postalCode;
      /** True when lookup is a specific UK unit (has incode) — not whole sector SW1A. */
      let hasFullUkUnit = false;

      if (centerRes.ok) {
        const centerData = await centerRes.json();
        if (centerData.result) {
          centerPoint = {
            lat: centerData.result.latitude,
            lng: centerData.result.longitude,
          };
          outcode = centerData.result.outcode;
          normalizedPostcode = centerData.result.postcode || postalCode;
          const inc = centerData.result.incode;
          hasFullUkUnit = Boolean(inc != null && String(inc).trim() !== "");
        }
      }

      if (!centerPoint) {
        const outcodeRes = await fetchWithTimeout(
          `https://api.postcodes.io/outcodes/${encodeURIComponent(cleanPostcode)}`
        );
        if (outcodeRes.ok) {
          const outcodeData = await outcodeRes.json();
          const r = outcodeData?.result;
          if (r) {
            centerPoint = {
              lat: r.latitude,
              lng: r.longitude,
            };
            outcode = r.outcode || cleanPostcode;
            normalizedPostcode = r.outcode || postalCode.trim();
            hasFullUkUnit = false;
          }
        }
      }

      // ── 1. Sector polygon (only when we are not targeting one specific unit) ──
      if (outcode && centerPoint && !hasFullUkUnit) {
        const districtPath = await fetchUkPostcodeDistrictPolygon(outcode);
        if (districtPath?.length) {
          return {
            centerPoint,
            polygonPath: districtPath,
            postcode: normalizedPostcode,
          };
        }
      }

      // ── 2. Google Geocoding bounding-box (admin API; country-biased) ──
      try {
        const geocoded = await geocodePostalBoundary(
          postalCode,
          countryIso || "GB",
          cityName
        );
        if (geocoded?.polygonPath?.length) {
          const diagKm = googleBoundsDiagonalKm(geocoded.bounds);
          const viewportTooLooseForUnit =
            hasFullUkUnit && diagKm > FULL_UNIT_MAX_VIEWPORT_DIAGONAL_KM;
          if (!viewportTooLooseForUnit) {
            return {
              centerPoint: centerPoint || geocoded.centerPoint,
              polygonPath: geocoded.polygonPath,
              postcode: normalizedPostcode,
            };
          }
        }
      } catch {
        // Geocoding failures fall back to the local polygon approximation.
      }

      // ── 3. Centroid + hexagon (tighter radius for full UK units) ──
      if (centerPoint) {
        const radiusDeg = hasFullUkUnit ? UK_UNIT_POSTCODE_HEX_RADIUS_DEG : 0.005;
        const polygonPath = createHexagon(centerPoint.lat, centerPoint.lng, radiusDeg);
        return { centerPoint, polygonPath, postcode: normalizedPostcode };
      }
    } catch (error) {
      console.error(`Error fetching postal code boundary for ${postalCode}:`, error);
    }

    return null;
  };

  const onPolygonComplete = (polygon) => {
    const path = polygon.getPath();
    const coordinatesArray = [];
    for (let i = 0; i < path.getLength(); i++) {
      const point = path.getAt(i);
      coordinatesArray.push([point.lng(), point.lat()]); // GeoJSON format: [lng, lat]
    }
    // Close the polygon by adding the first point at the end
    if (coordinatesArray.length > 0) {
      coordinatesArray.push(coordinatesArray[0]);
    }

    setCoordinates(coordinatesArray);

    // Update form state with coordinates
    setAdd((prev) => ({
      ...prev,
      coordinates: coordinatesArray.length > 0 ? JSON.stringify(coordinatesArray) : "",
    }));

    setDrawingMode(null);
  };

  const clearPolygons = () => {
    setCoordinates([]);
    // Clear coordinates from form state
    setAdd((prev) => ({
      ...prev,
      coordinates: "",
    }));
    // Clear postal code highlights
    setPostalCodeHighlight(null);
    setPostalCodeMarkers([]);
    setMultiplePostcodeHighlights([]);
    setAddedPostcodes([]);
    setNewPostcodeInput("");
    // Remove all polygons from the map
    if (map) {
      map.setOptions({ draggableCursor: "pointer" });
    }
  };


  /** Full UK postcode via `/postcodes/…`, else UK outward code via `/outcodes/…` (e.g. NW1). */
  const lookupPostcodesIoStrict = async (postcode) => {
    const cleanPostcode = postcode.replace(/\s+/g, "");
    try {
      const { ok, result, errText } = await lookupPostcodesIoPostcodeOrOutcode(cleanPostcode);
      if (ok && result) {
        return { ok: true, result };
      }
      const friendlyErr = userFacingPostcodesIoError(errText);
      const message = friendlyErr
        ? `"${postcode}" — ${friendlyErr}`
        : `Could not validate "${postcode}". Use a full UK postcode (e.g. HP1 1AA) or a valid postcode area (e.g. NW1).`;
      return { ok: false, message };
    } catch {
      return {
        ok: false,
        message: `Network error while validating "${postcode}". Please try again.`,
      };
    }
  };

  /** City check using a postcodes.io postcode or outcode result. */
  const postcodeResultBelongsToCity = (result, cityName) => {
    if (!cityName || !result) return true;
    const city = cityName.toLowerCase().trim();
    if (!city) return true;

    const rawFields = [
      result.admin_district,
      result.admin_county,
      result.region,
      result.nuts,
      result.parliamentary_constituency,
      result.admin_ward,
      result.parish,
    ];
    const candidates = [];
    for (const field of rawFields) {
      if (field == null) continue;
      if (Array.isArray(field)) {
        for (const item of field) {
          if (typeof item === "string" && item.trim()) {
            candidates.push(item.toLowerCase());
          }
        }
      } else if (typeof field === "string" && field.trim()) {
        candidates.push(field.toLowerCase());
      }
    }
    if (candidates.length === 0) return true;
    return candidates.some((f) => f.includes(city) || city.includes(f));
  };

  /** Soft city match from Google address_components / formatted_address. */
  const googleResultBelongsToCity = (boundaryData, cityName) => {
    if (!cityName || !boundaryData) return true;
    const city = cityName.toLowerCase().trim();
    if (!city) return true;
    const haystacks = [];
    if (boundaryData.formattedAddress) {
      haystacks.push(String(boundaryData.formattedAddress).toLowerCase());
    }
    for (const comp of boundaryData.addressComponents || []) {
      if (comp?.long_name) haystacks.push(String(comp.long_name).toLowerCase());
      if (comp?.short_name) haystacks.push(String(comp.short_name).toLowerCase());
    }
    if (!haystacks.length) return true;
    return haystacks.some((h) => h.includes(city) || city.includes(h));
  };

  const handleAddPostcode = async () => {
    if (!newPostcodeInput.trim()) {
      showError("Please enter at least one postal code");
      return;
    }

    if (!selectedCountryIso) {
      showError("Please select a country before adding postal codes.");
      return;
    }

    setIsAddingPostcode(true);

    // Parse postal codes (split by comma only, trim spaces)
    const postcodes = newPostcodeInput
      .split(",")
      .map((pc) => pc.trim())
      .filter((pc) => pc.length > 0);

    if (postcodes.length === 0) {
      showError("No valid postal codes found");
      setIsAddingPostcode(false);
      return;
    }

    // Resolve selected city name for validation
    const selectedCity = add.cityId
      ? (Array.isArray(cities)
          ? cities.find((c) => String(c.id) === String(add.cityId))
          : null) ||
        (Array.isArray(allCities)
          ? allCities.find((c) => String(c.id) === String(add.cityId))
          : null)
      : null;
    const selectedCityName = selectedCity?.name || null;
    const useUkLookup = isUkCountry(selectedCountry);

    try {
      const newHighlights = [];
      const newMarkers = [];
      const newPostcodeDataList = [];
      let lastCenterPoint = null;
      let cityRejectedCount = 0;
      let formatRejectedCount = 0;
      let lookupRejectedCount = 0;

      // Validate and fetch each postal code
      for (const postcode of postcodes) {
        // Check if postal code already exists
        if (
          addedPostcodes.some(
            (pc) =>
              String(pc.postcode || "")
                .replace(/\s+/g, "")
                .toUpperCase() ===
              String(postcode)
                .replace(/\s+/g, "")
                .toUpperCase()
          )
        ) {
          continue; // Skip already added postal codes
        }

        // Country format gate — blocks UK RM8 on US, US ZIP on GB, etc.
        const formatCheck = validatePostalCodeForCountry(postcode, selectedCountry);
        if (!formatCheck.ok) {
          showError(formatCheck.message || `"${postcode}" is not valid for the selected country.`);
          formatRejectedCount++;
          continue;
        }

        if (useUkLookup) {
          const ioLookup = await lookupPostcodesIoStrict(postcode);
          if (!ioLookup.ok) {
            showError(ioLookup.message);
            lookupRejectedCount++;
            continue;
          }

          const ioResultForCity = selectedCityName
            ? await enrichPostcodesIoResultForCityCheck(ioLookup.result)
            : ioLookup.result;

          if (selectedCityName && !postcodeResultBelongsToCity(ioResultForCity, selectedCityName)) {
            showError(
              `"${postcode}" is outside of ${selectedCityName}. Only postal codes within the selected city can be added.`
            );
            cityRejectedCount++;
            continue;
          }
        }

        try {
          const boundaryData = await fetchPostalCodeBoundary(postcode, {
            countryIso: selectedCountryIso,
            cityName: selectedCityName,
          });

          if (!boundaryData) {
            showError(
              `"${postcode}" could not be located in ${
                selectedCountry?.name || selectedCountryIso
              }. Check the postal code and try again.`
            );
            lookupRejectedCount++;
            continue;
          }

          if (
            !useUkLookup &&
            selectedCityName &&
            !googleResultBelongsToCity(boundaryData, selectedCityName)
          ) {
            showError(
              `"${postcode}" is outside of ${selectedCityName}. Only postal codes within the selected city can be added.`
            );
            cityRejectedCount++;
            continue;
          }

          lastCenterPoint = boundaryData.centerPoint;

          const newPostcodeData = {
            postcode: boundaryData.postcode,
            center: boundaryData.centerPoint,
            paths: boundaryData.polygonPath,
          };

          newPostcodeDataList.push(newPostcodeData);
          newHighlights.push({
            paths: boundaryData.polygonPath,
            postcode: boundaryData.postcode,
            center: boundaryData.centerPoint,
          });

          newMarkers.push({
            position: boundaryData.centerPoint,
            postcode: boundaryData.postcode,
            label: boundaryData.postcode,
          });
        } catch (error) {
          console.error(`Error fetching postal code ${postcode}:`, error);
          showError(`Failed to map postal code "${postcode}". Please try again.`);
          lookupRejectedCount++;
        }
      }

      if (newHighlights.length > 0) {
        setAddedPostcodes((prev) => [...prev, ...newPostcodeDataList]);
        setMultiplePostcodeHighlights((prev) => [...prev, ...newHighlights]);
        setPostalCodeMarkers((prev) => [...prev, ...newMarkers]);

        if (map && lastCenterPoint) {
          map.setCenter(lastCenterPoint);
          map.setZoom(14);
        }
        if (lastCenterPoint) {
          setCenter(lastCenterPoint);
        }

        setNewPostcodeInput("");
        success(`Successfully added ${newHighlights.length} postal code(s)`);
      } else if (
        cityRejectedCount === 0 &&
        formatRejectedCount === 0 &&
        lookupRejectedCount === 0
      ) {
        showError("No valid postal codes could be found or all are already added");
      }
    } catch (error) {
      console.error("Error adding postal codes:", error);
      showError("Failed to add postal codes. Please try again.");
    } finally {
      setIsAddingPostcode(false);
    }
  };

  // Handle clicking on a postal code button to navigate/highlight
  const handlePostcodeClick = (postcodeData) => {
    // Navigate map to the postal code area
    if (map && postcodeData.center) {
      map.setCenter(postcodeData.center);
      map.setZoom(14);
    }
    if (postcodeData.center) {
      setCenter(postcodeData.center);
    }
  };

  // Handle removing a postal code
  const handleRemovePostcode = (postcodeToRemove, e) => {
    e.stopPropagation(); // Prevent triggering the click event on the parent
    // Remove from added postcodes list
    setAddedPostcodes((prev) => prev.filter((pc) => pc.postcode !== postcodeToRemove));

    // Remove from highlights
    setMultiplePostcodeHighlights((prev) =>
      prev.filter((highlight) => highlight.postcode !== postcodeToRemove)
    );

    // Remove from markers
    setPostalCodeMarkers((prev) =>
      prev.filter((marker) => marker.postcode !== postcodeToRemove)
    );

    success(`Postal code ${postcodeToRemove} removed`);
  };

  const onMapLoad = (mapInstance) => {
    setMap(mapInstance);
    window.requestAnimationFrame(() => {
      triggerGoogleMapResize(mapInstance, center);
    });
  };

  /** Same rules as `handleAddZone` — primary button stays disabled until all required fields are valid. */
  const canSubmitZone = useMemo(() => {
    if (!add.countryId || String(add.countryId).trim() === "") return false;
    if (!add.cityId || String(add.cityId).trim() === "") return false;
    if (!addedPostcodes?.length) return false;
    if (!String(add.zoneName ?? "").trim()) return false;

    const minRaw = add.zoneMinimumAmount;
    if (minRaw === "" || minRaw === null || minRaw === undefined) return false;
    const zoneMinimumNum = parseFloat(String(minRaw).trim());
    if (!Number.isFinite(zoneMinimumNum) || zoneMinimumNum < 0) return false;

    const feeRaw = add.serviceCharge ?? add.deliveryCharges;
    if (feeRaw === "" || feeRaw === null || feeRaw === undefined) return false;
    const serviceFeeNum = parseFloat(String(feeRaw).trim());
    if (!Number.isFinite(serviceFeeNum) || serviceFeeNum < 0) return false;

    const commRaw = add.zoneCommission;
    if (commRaw === "" || commRaw === null || commRaw === undefined) return false;
    const zoneCommissionNum = parseFloat(String(commRaw).trim());
    if (!Number.isFinite(zoneCommissionNum) || zoneCommissionNum < 0) return false;

    if (!add.zoneCurrency || String(add.zoneCurrency).trim() === "") return false;

    const country =
      Array.isArray(countries) &&
      countries.find((c) => String(c.id) === String(add.countryId));
    const codes = addedPostcodes.map((pc) => pc.postcode);
    const batch = validatePostalCodesForCountry(codes, country);
    if (!batch.ok) return false;

    return true;
  }, [
    add.countryId,
    add.cityId,
    add.zoneName,
    add.zoneMinimumAmount,
    add.serviceCharge,
    add.deliveryCharges,
    add.zoneCommission,
    add.zoneCurrency,
    addedPostcodes,
    countries,
  ]);

  if (isLoading) return <Delay />;

  const countryOptions = Array.isArray(countries)
    ? countries.map((country) => ({ value: String(country.id), label: country.name }))
    : [];
  const currencyOptions = currenciesForSelect.map((currency) => ({
    value: currency.name,
    label: `${currency.name} (${currency.symbol})`,
  }));

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <PageHeader
        title="Zones"
        description="Service areas, postcodes, and zone fees."
        actions={
          <>
            <Button variant="secondary" onClick={handleDownload} disabled={!filteredZonesData.length}>
              Export CSV
            </Button>
            <Button onClick={handleToggle}>
              <TbPlus size={18} />
              Add Zone
            </Button>
          </>
        }
      />

      <DirectoryMetrics
        items={[
          { label: "Total cities", value: zones?.totalCities || 0, tone: "brand" },
          { label: "Total zones", value: zones?.totalZones || 0, tone: "navy" },
          { label: "Total shops", value: zones?.totalShops || 0, tone: "success" },
        ]}
      />

      <DirectoryTableWrap
        toolbar={
          <DirectoryToolbar>
            <DirectorySearch
              id="zone-search"
              value={zoneSearch}
              onChange={setZoneSearch}
              placeholder="Search by zone name, city, postcode…"
            />
            <ZoneFiltersPopover
              city={filterCity}
              onCityChange={setFilterCity}
              paymentMethod={filterPaymentMethod}
              onPaymentMethodChange={setFilterPaymentMethod}
              assignment={filterAssignment}
              onAssignmentChange={setFilterAssignment}
              cityOptions={zoneFilterCityOptions}
              paymentOptions={zoneFilterPaymentOptions}
              onClearFilters={clearZoneFilters}
              hasActiveFilters={hasZoneFilters}
            />
          </DirectoryToolbar>
        }
      >
        <Table
          columns={zoneColumns}
          rows={filteredZonesData}
          rowKey={(row) => row.id}
          empty="No zones match these filters."
        />
      </DirectoryTableWrap>

      <Modal
        open={add.open}
        title={isEditMode ? "Edit zone" : "Add zone"}
        onClose={handleToggle}
        size="xl"
        primaryLabel={
          isAddingZone || isEditingZone
            ? isEditMode
              ? "Updating…"
              : "Adding…"
            : isEditMode
              ? "Update zone"
              : "Add zone"
        }
        secondaryLabel="Cancel"
        onPrimary={handleAddZone}
        primaryDisabled={!canSubmitZone || isAddingZone || isEditingZone}
      >
        <div style={{ display: "grid", gap: 16 }}>
          <Field label="Country">
            <Select
              aria-label="Country"
              value={add.countryId || ""}
              onChange={handelCountryChange}
              options={countryOptions}
              placeholder="Select country"
            />
          </Field>
          <Field
            label="City"
            hint={
              add.countryId && !citiesLoading && !citiesFetching && cityOptions.length === 0
                ? "No cities found for this country. Add a city under Countries & Cities first."
                : undefined
            }
          >
            <Select
              aria-label="City"
              value={add.cityId || ""}
              onChange={handleCityChange}
              options={cityOptions}
              placeholder={
                !add.countryId
                  ? "Select country first"
                  : citiesLoading || citiesFetching
                    ? "Loading cities…"
                    : "Select city"
              }
              disabled={!add.countryId || citiesLoading}
            />
          </Field>

          <div className="jd-modal-map" style={{ position: "relative" }}>
            {isEditPostcodesLoading ? (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  zIndex: 200,
                  display: "grid",
                  placeItems: "center",
                  background: "rgba(255,255,255,0.75)",
                }}
                aria-live="polite"
                aria-busy="true"
              >
                <span className="jd-field__hint">Loading postcodes…</span>
              </div>
            ) : null}

            <div
              style={{
                position: "absolute",
                top: 16,
                left: "50%",
                transform: "translateX(-50%)",
                width: "100%",
                maxWidth: 500,
                padding: "0 16px",
                zIndex: 100,
                display: "grid",
                gap: 8,
              }}
            >
              {addedPostcodes.length > 0 ? (
                <div
                  ref={postcodeChipsScrollRef}
                  onScroll={updateChipsScrollState}
                  style={{ display: "flex", gap: 8, overflowX: "auto", padding: "2px 0" }}
                >
                  {addedPostcodes.map((postcodeData, index) => (
                    <button
                      key={`${postcodeData.postcode}-${index}`}
                      type="button"
                      onClick={() => handlePostcodeClick(postcodeData)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        flexShrink: 0,
                        background: "var(--surface)",
                        border: "1px solid var(--line)",
                        borderRadius: 8,
                        padding: "8px 12px",
                        cursor: "pointer",
                      }}
                    >
                      <span>{postcodeData.postcode}</span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => handleRemovePostcode(postcodeData.postcode, e)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleRemovePostcode(postcodeData.postcode, e);
                          }
                        }}
                        title="Remove postal code"
                        style={{ color: "var(--muted)" }}
                      >
                        <RxCross2 size={16} />
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}

              {addedPostcodes.length > 4 ? (
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => scrollPostcodeChips("left")}
                      disabled={!chipsCanScrollLeft}
                      aria-label="Scroll postcodes left"
                    >
                      <TbChevronLeft size={18} />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => scrollPostcodeChips("right")}
                      disabled={!chipsCanScrollRight}
                      aria-label="Scroll postcodes right"
                    >
                      <TbChevronRight size={18} />
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setPostcodeAddSectionVisible((v) => !v)}
                    aria-expanded={postcodeAddSectionVisible}
                  >
                    {postcodeAddSectionVisible ? <TbChevronUp size={16} /> : <TbChevronDown size={16} />}
                    {postcodeAddSectionVisible ? "Hide" : "Show"}
                  </Button>
                </div>
              ) : null}

              {postcodeAddSectionVisible ? (
                <div style={{ display: "grid", gap: 8 }}>
                  <Textarea
                    value={newPostcodeInput}
                    onChange={(e) => setNewPostcodeInput(e.target.value)}
                    placeholder={postcodeInputPlaceholder}
                    rows={4}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <Button onClick={handleAddPostcode} disabled={isAddingPostcode || !newPostcodeInput.trim()}>
                      {isAddingPostcode ? "Adding…" : "Add postal codes"}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setNewPostcodeInput("")}
                      disabled={!newPostcodeInput.trim()}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>

            <div
              style={{
                position: "absolute",
                bottom: 16,
                left: 16,
                zIndex: 30,
                display: "grid",
                gap: 8,
              }}
            >
              <Button
                variant="secondary"
                disabled={!isMapsLoaded}
                onClick={() => {
                  setDrawingMode(null);
                  map?.setOptions({ draggableCursor: "grab" });
                }}
                title="Grab/Pan tool"
              >
                <LiaHandPointerSolid size={20} />
              </Button>
              <Button
                variant="secondary"
                disabled={!isMapsLoaded}
                onClick={() => setDrawingMode("polygon")}
                title="Draw polygon"
              >
                <TbLassoPolygon size={20} />
              </Button>
              <Button variant="secondary" onClick={clearPolygons} title="Clear polygons">
                <RxCross2 size={20} />
              </Button>
            </div>

            {isMapsLoaded ? (
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={center}
              zoom={10}
              onLoad={onMapLoad}
              options={{
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
                zoomControl: true,
                styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }],
              }}
            >
              {drawingMode ? (
                <DrawingManager
                  options={{
                    drawingControl: false,
                    drawingMode,
                    polygonOptions: {
                      fillColor: "#2196F3",
                      fillOpacity: 0.5,
                      strokeWeight: 2,
                      clickable: true,
                      editable: true,
                      draggable: true,
                    },
                  }}
                  onPolygonComplete={onPolygonComplete}
                />
              ) : null}
              {postalCodeHighlight?.paths ? (
                <>
                  <Polygon
                    paths={postalCodeHighlight.paths}
                    options={{
                      fillColor: "#87CEEB",
                      fillOpacity: 0.3,
                      strokeOpacity: 0,
                      strokeWeight: 0,
                      clickable: false,
                    }}
                  />
                  <Polyline path={postalCodeHighlight.paths} options={getPostcodeDottedRedOutlineOptions()} />
                </>
              ) : null}
              {multiplePostcodeHighlights.map((highlight, index) => (
                <Fragment key={`highlight-${index}`}>
                  <Polygon
                    paths={highlight.paths}
                    options={{
                      fillColor: "#87CEEB",
                      fillOpacity: 0.3,
                      strokeOpacity: 0,
                      strokeWeight: 0,
                      clickable: false,
                    }}
                  />
                  <Polyline path={highlight.paths} options={getPostcodeDottedRedOutlineOptions()} />
                </Fragment>
              ))}
              {postalCodeMarkers.map((marker, index) => (
                <Marker
                  key={`marker-${index}`}
                  position={marker.position}
                  label={{
                    text: marker.postcode,
                    color: "#ffffff",
                    fontSize: "11px",
                    fontWeight: "bold",
                  }}
                />
              ))}
            </GoogleMap>
            ) : (
              <MapsUnavailableNotice minHeight={400} />
            )}
          </div>

          <Field label="Zone name" htmlFor="zoneName">
            <Input
              id="zoneName"
              name="zoneName"
              value={add.zoneName}
              onChange={handleChange}
              placeholder="Enter zone name"
            />
          </Field>
          <Field label="Zone minimum amount" htmlFor="zoneMinimumAmount">
            <Input
              id="zoneMinimumAmount"
              name="zoneMinimumAmount"
              type="number"
              value={add.zoneMinimumAmount}
              onChange={handleChange}
              placeholder="Enter zone minimum amount"
            />
          </Field>
          <Field label="Service fee" htmlFor="serviceCharge">
            <Input
              id="serviceCharge"
              name="serviceCharge"
              type="number"
              value={add.serviceCharge}
              onChange={handleChange}
              placeholder="e.g. 20"
            />
          </Field>
          <Field label="Agent commission % (paid to agent)" htmlFor="zoneCommission">
            <Input
              id="zoneCommission"
              name="zoneCommission"
              type="number"
              value={add.zoneCommission}
              onChange={handleChange}
              placeholder="e.g. 80 — percent the agent/shop receives"
            />
          </Field>
          <Field label="Zone currency">
            <Select
              aria-label="Zone currency"
              value={add.zoneCurrency || ""}
              onChange={(selectedName) => {
                const selectedCurrencyId = currenciesForSelect.find(
                  (currency) => currency.name === selectedName
                )?.id;
                setAdd((prev) => ({
                  ...prev,
                  zoneCurrency: selectedName,
                  currencyUnitId: selectedCurrencyId ? String(selectedCurrencyId) : prev.currencyUnitId,
                }));
              }}
              options={currencyOptions}
              placeholder="Select currency"
            />
          </Field>
          <Field label="Payment method">
            <div style={{ display: "grid", gap: 8 }}>
              {ZONE_PAYMENT_METHOD_OPTIONS.map((option) => (
                <CheckRow
                  key={option.value}
                  label={option.label}
                  checked={(add.paymentMethods || []).includes(option.value)}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setAdd((prev) => {
                      const current = new Set(prev.paymentMethods || []);
                      if (checked) current.add(option.value);
                      else current.delete(option.value);
                      return { ...prev, paymentMethods: [...current] };
                    });
                  }}
                />
              ))}
            </div>
          </Field>

          <div style={{ display: "none" }}>
            <Field label="Express-delivery charges" htmlFor="ExDeliveryCharges">
              <Input
                id="ExDeliveryCharges"
                name="ExDeliveryCharges"
                value={add.ExDeliveryCharges}
                onChange={handleChange}
                placeholder="Enter express-delivery charges"
              />
            </Field>
            <Field label="Zone admin ID" htmlFor="zoneAdminId">
              <Input
                id="zoneAdminId"
                name="zoneAdminId"
                type="number"
                value={add.zoneAdminId}
                onChange={handleChange}
                placeholder="Enter zone admin ID"
              />
            </Field>
          </div>
        </div>
      </Modal>
    </div>
  );
}

