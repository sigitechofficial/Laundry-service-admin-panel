import { useState, useEffect, useMemo, Fragment, useRef, useCallback } from "react";
import { Box, Button, CircularProgress, IconButton, Typography } from "@mui/material";
import { BsCardList, TbPlus } from "../../shared/icons/index";
import Search from "../../components/ui/Search";
import FiltersButton from "../../components/ui/FiltersButton";
import DateRangeSelector from "../../components/ui/DateRangeSelector";
import DataTable from "../../components/ui/DataTable";
import StatusPill from "../../components/ui/StatusPill";
import ChangeStatus from "../../components/ui/Switch";
import ActionButtons from "../../components/ui/ActionButtons";
import ModalComponent from "../../components/shared/Modal";
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
import ButtonBlueLight from "../../components/ui/ButtonBlueLight";
import { dateTimeFormat } from "../../shared/constants";
import SelectField from "../../components/ui/SelectField";
import { googleApiKey } from "../../utilities/URL";
import {
  GoogleMap,
  useLoadScript,
  DrawingManager,
  Marker,
  Polygon,
  Polyline,
} from "@react-google-maps/api";
import { LiaHandPointerSolid } from "react-icons/lia";
import { TbLassoPolygon, TbChevronLeft, TbChevronRight, TbChevronUp, TbChevronDown } from "react-icons/tb";
import { RxCross2 } from "react-icons/rx";
import InputFieldModal from "../../components/ui/InputFieldModal";
import useToaster from "../../components/ui/Toaster";

/**
 * UK postcode **sector** polygons (e.g. SW1A — not a single unit like SW1A 1AA).
 * Matching on outcode draws the whole sector; do not use when postcodes.io returns a unit `incode`.
 * @see https://github.com/missinglink/uk-postcode-polygons
 */
const UK_POSTCODE_AREA_GEOJSON_BASE =
  "https://cdn.jsdelivr.net/gh/missinglink/uk-postcode-polygons@master/geojson";
const ukPostcodeAreaGeojsonCache = new Map();

/** Fixed zone payment methods sent to add/edit zone APIs (`paymentMethod`). */
const ZONE_PAYMENT_METHOD_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "strip", label: "Stripe" },
  { value: "paypal", label: "PayPal" },
];

function normalizeZonePaymentMethod(raw) {
  const s = String(raw ?? "").trim().toLowerCase();
  if (!s) return "";
  if (s === "cash") return "cash";
  if (s === "stripe" || s === "strip") return "strip";
  if (s === "paypal") return "paypal";
  return "";
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
      const res = await fetch(
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

export default function ZoneManagement() {
  const navigate = useNavigate();
  const libraries = ["places", "drawing"];
  const { isLoaded: _isLoaded } = useLoadScript({
    googleMapsApiKey: googleApiKey,
    libraries,
  });

  const [_dateRange, setDateRange] = useState(null);
  const [_searchTerm, setSearchTerm] = useState("");

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
    serviceCharge: "",
    zoneMinimumAmount: "",
    zoneCommission: "",
    zoneCurrency: "",
    currencyUnitId: "",
    paymentMethod: "",
    deliveryCharges: "",
    ExDeliveryCharges: " ",
    zoneAdminId: "",
    distanceUnitId: "",
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingZoneId, setEditingZoneId] = useState(null);
  console.log("🚀 ~ ZoneManagement ~ add:", add);
  const { success, error: showError } = useToaster();
  const { isLoading, refetch: refetchZones } = useGetAllZonesQuery();
  const { isLoading: _countriesLoading } = useGetAllCountriesQuery();
  const { data: allCitiesData } = useGetAllCitiesQuery();
  const [addZoneByPostcodes, { isLoading: isAddingZone }] = useAddZoneByPostcodesMutation();
  const [editZoneByPostcodes, { isLoading: isEditingZone }] = useEditZoneByPostcodesMutation();
  const [deleteZone] = useDeleteZoneMutation();
  const [fetchZoneById] = useLazyGetZoneByIdQuery();
  const zones = useSelector((state) => state?.apiData?.zones);
  const countries = useSelector((state) => state?.apiData?.countries);
  const cities = useSelector((state) => state?.apiData?.cities);
  const units = useSelector((state) => state?.apiData?.units);

  // Fetch currencies and payment methods
  const { data: currenciesData } = useGetUnitsDistanceAndCurrencyQuery("currency", {
    skip: false,
  });

  const currencies = currenciesData?.data || units?.currency || [];
  const allCities = Array.isArray(allCitiesData?.data)
    ? allCitiesData.data
    : Array.isArray(allCitiesData?.data?.cities)
      ? allCitiesData.data.cities
      : [];

  // Fetch cities when a country is selected
  const { isLoading: _citiesLoading } = useGetCitiesByCountryIdQuery(
    add.countryId,
    {
      skip: !add.countryId, // Skip the query if no country is selected
    }
  );

  // In edit mode, if city is known but country isn't, derive country from full city list
  useEffect(() => {
    if (!add.open || !isEditMode || add.countryId || !add.cityId) return;
    const matchedCity = Array.isArray(allCities)
      ? allCities.find((city) => String(city.id) === String(add.cityId))
      : null;
    const derivedCountryId = matchedCity?.countryId || matchedCity?.country?.id;
    if (derivedCountryId) {
      setAdd((prev) => ({
        ...prev,
        countryId: String(derivedCountryId),
      }));
    }
  }, [add.open, isEditMode, add.cityId, add.countryId, allCities]);

  useEffect(() => {
    if (!editPendingMapCenter || !map || !add.open) return;
    map.setCenter(editPendingMapCenter);
    map.setZoom(14);
    setEditPendingMapCenter(null);
  }, [editPendingMapCenter, map, add.open]);

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

  console.log("🚀 ~ ZoneManagement ~ countries:", countries);
  console.log("🚀 ~ ZoneManagement ~ cities:", cities);

  // Map zone data
  const zonesData = zones?.zones?.map((zone, index) => {
    return {
      id: zone.id,
      sl: index + 1,
      zoneId: zone.id,
      zoneName: zone.name,
      zoneDistance: zone.distanceUnitId || "N/A",
      radius: "N/A",
      coordinates: zone.coordinates?.coordinates?.[0]?.[0]?.[0]
        ? `${zone.coordinates.coordinates[0][0][0].toFixed(
          2
        )}, ${zone.coordinates.coordinates[0][0][1].toFixed(2)}`
        : "N/A",
      currency: zone.currencyUnitId || "N/A",
      paymentMethod: zone.paymentMethod || "N/A",
      deliveryCharges: zone.serviceCharge || 0,
      noOfShops: "N/A",
      expressDelivery: "N/A",
      zoneAssign: zone.zoneAdminId ? `Admin ${zone.zoneAdminId}` : "Unassigned",
      commission: zone.zoneAdminComission || 0,
      status: zone.status,
      createdAt: zone.createdAt,
      updatedAt: zone.updatedAt,
      rawZone: zone,
    };
  });

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
        const response = await fetch(
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
      if (!googleApiKey) return "";
      try {
        const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${googleApiKey}`;
        const response = await fetch(geoUrl);
        if (!response.ok) return "";
        const data = await response.json();
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

    if (results.length === 0 && googleApiKey) {
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
      setEditingZoneId(zoneId);
      // Open modal first, then hydrate edit values
      setAdd((prev) => ({ ...prev, open: true }));

      // Explicitly fetch zone details from /admin/getZoneById/:id for edit prefill
      let zone = rowZone;
      if (zoneId) {
        try {
          const zoneResponse = await fetchZoneById(zoneId, true).unwrap();
          zone = zoneResponse?.data || rowZone;
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

      setAdd((prev) => ({
        ...prev,
        countryId: derivedCountryId ? String(derivedCountryId) : "",
        cityId: derivedCityId ? String(derivedCityId) : "",
        coordinates: "",
        zoneName: zone.name || "",
        serviceCharge: zone.serviceCharge ?? "",
        zoneMinimumAmount: zone.zoneMinimumAmount ?? "",
        zoneCommission: zone.zoneAdminComission ?? "",
        zoneCurrency: selectedCurrency?.name || "",
        currencyUnitId: zone.currencyUnitId ? String(zone.currencyUnitId) : "",
        paymentMethod: normalizeZonePaymentMethod(
          zone.paymentMethod ?? zone.payment_method
        ),
        deliveryCharges: zone.serviceCharge ?? "",
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
          const boundaryData = await fetchPostalCodeBoundary(postcode);
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
      refetchZones();
    } catch (err) {
      showError(err?.data?.message || "Failed to delete zone.");
    }
  };

  // Column configuration for zone table
  const zoneColumns = [
    {
      field: "sl",
      headerName: "SL",
      flex: 0.15,
      minWidth: 100,
      align: "center",
    },
    {
      field: "zoneName",
      headerName: "Zone Name",
      flex: 0.19,
      minWidth: 200,
      align: "center",
    },
    {
      field: "zoneDistance",
      headerName: "Zone Distance (km)",
      flex: 0.18,
      minWidth: 250,
      align: "center",
    },
    {
      field: "radius",
      headerName: "Radius (km)",
      flex: 0.18,
      minWidth: 200,
      align: "center",
    },
    {
      field: "coordinates",
      headerName: "Coordinates",
      flex: 0.15,
      minWidth: 200,
      align: "center",
    },
    {
      field: "currency",
      headerName: "Currency",
      flex: 0.1,
      minWidth: 130,
      type: "number",
      align: "center",
    },
    {
      field: "paymentMethod",
      headerName: "Payment Method",
      flex: 0.12,
      minWidth: 200,
      align: "center",
    },
    {
      field: "deliveryCharges",
      headerName: "Deliver Charges",
      flex: 0.12,
      minWidth: 200,
      align: "center",
    },
    {
      field: "noOfShops",
      headerName: "No of Shops",
      flex: 0.12,
      minWidth: 200,
      align: "center",
    },
    {
      field: "expressDelivery",
      headerName: "Express Delivery",
      flex: 0.12,
      minWidth: 200,
      align: "center",
    },
    {
      field: "zoneAssign",
      headerName: "Zone Assign",
      flex: 0.12,
      minWidth: 200,
      align: "center",
    },
    {
      field: "commission",
      headerName: "Commission %",
      flex: 0.12,
      minWidth: 200,
      align: "center",
    },

    {
      field: "actions",
      headerName: "Actions",
      flex: 0.15,
      minWidth: 200,
      sortable: false,
      align: "center",
      renderCell: (params) => (
        <ActionButtons
          showView={false}
          onEdit={() => handleEditZone(params)}
          onDelete={() => handleDeleteZone(params)}
        />
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
        serviceCharge: "",
        zoneMinimumAmount: "",
        countryId: "",
        cityId: "",
        zoneCommission: "",
        zoneCurrency: "",
        currencyUnitId: "",
        paymentMethod: "",
        deliveryCharges: "",
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
      if (map) {
        map.setOptions({ draggableCursor: "pointer" });
      }
    } else {
      // Just open the modal for add
      setIsEditMode(false);
      setEditingZoneId(null);
      setAdd((prev) => ({
        ...prev,
        open: true,
        distanceUnitId: "2",
        currencyUnitId: "",
      }));
    }
  };

  const handleChange = (e) => {
    setAdd((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
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
      const commRaw = add.zoneCommission;
      if (commRaw === "" || commRaw === null || commRaw === undefined) {
        showError("Zone commission is required.");
        return;
      }
      const zoneCommissionNum = parseFloat(String(commRaw).trim());
      if (!Number.isFinite(zoneCommissionNum) || zoneCommissionNum < 0) {
        showError("Enter a valid zone commission percentage.");
        return;
      }
      if (!add.paymentMethod || String(add.paymentMethod).trim() === "") {
        showError("Please select a payment method.");
        return;
      }

      // Extract postcodes array from addedPostcodes
      const postcodes = addedPostcodes.map((pc) => pc.postcode);

      // Find the selected currency to get its ID
      const selectedCurrency = Array.isArray(currencies)
        ? currencies.find((currency) => currency.name === add.zoneCurrency)
        : null;
      const currencyUnitId = selectedCurrency ? selectedCurrency.id : null;

      // Keep existing distance unit in edit mode; default to 2 for new zones
      const distanceUnitId = parseInt(add.distanceUnitId) || 2;

      const zoneData = {
        name: zoneNameTrimmed,
        postcodes: postcodes,
        cityId: parseInt(add.cityId, 10),
        zoneMinimumAmount: zoneMinimumNum,
        currencyUnitId: currencyUnitId || parseInt(add.currencyUnitId) || 1,
        distanceUnitId: distanceUnitId,
        serviceCharge: parseFloat(add.deliveryCharges) || 0,
        zoneAdminComission: zoneCommissionNum,
        zoneAdminId: add.zoneAdminId && add.zoneAdminId.trim() !== "" ? parseInt(add.zoneAdminId) : null,
        status: true, // Default to active
        paymentMethod: add.paymentMethod,
      };

      console.log("Zone data being sent:", zoneData);
      if (isEditMode && editingZoneId) {
        const result = await editZoneByPostcodes({
          id: editingZoneId,
          body: zoneData,
        }).unwrap();
        console.log("Zone updated successfully:", result);
        success("Zone updated successfully!");
      } else {
        const result = await addZoneByPostcodes(zoneData).unwrap();
        console.log("Zone added successfully:", result);
        success("Zone added successfully!");
      }

      // Reset state
      setAddedPostcodes([]);
      setMultiplePostcodeHighlights([]);
      setPostalCodeMarkers([]);
      setCoordinates([]);
      handleToggle();

      // Refetch zones to show the updated list
      refetchZones();

    } catch (err) {
      console.error("Error adding zone:", err);
      showError(err?.data?.message || "Failed to add zone. Please try again.");
    }
  };


  const handleDateChange = (selectedRange) => {
    console.log("Selected Date Range:", selectedRange);
    setDateRange(selectedRange);

    // You can use the date range for filtering zones
    if (selectedRange) {
      console.log(
        "Start Date:",
        selectedRange.startDate.format(dateTimeFormat)
      );
      console.log("End Date:", selectedRange.endDate.format(dateTimeFormat));
      console.log("Label:", selectedRange.label);
      console.log("Type:", selectedRange.type);
    }
  };

  const handleSearchChange = (searchTerm) => {
    setSearchTerm(searchTerm);
    console.log("Search term:", searchTerm);
    // Implement search logic here - filter the zonesData
  };

  const handleFilter = () => {
    console.log("Filter button clicked");
    // Open filter modal or apply filters
  };

  const handleDownload = (data) => {
    console.log("Download zones data:", data);
    // Implement download functionality (CSV, Excel, etc.)
  };
  const handelCountryChange = (e) => {
    const selectedCountryId = e.target.value;
    const selectedCountry = Array.isArray(countries)
      ? countries.find((country) => String(country.id) === String(selectedCountryId))
      : null;

    console.log("Country selected:", {
      id: selectedCountryId,
      name: selectedCountry?.name,
      country: selectedCountry,
    });

    // Reset city when country changes and update country
    setAdd((prev) => ({
      ...prev,
      countryId: selectedCountryId,
      cityId: "", // Reset city when country changes
    }));
  };

  const handleCityChange = (e) => {
    const selectedCityId = e.target.value;
    const selectedCity = Array.isArray(cities)
      ? cities.find((city) => String(city.id) === String(selectedCityId))
      : null;

    console.log("City selected:", {
      id: selectedCityId,
      name: selectedCity?.name,
      city: selectedCity,
    });

    setAdd((prev) => ({
      ...prev,
      cityId: selectedCityId,
    }));
  };

  const handleRowAction = (actionType, rowData) => {
    console.log("🚀 ~ handleRowAction ~ rowData:", rowData);
    switch (actionType) {
      case "view":
        navigate(`/zone-management/details/${rowData.id}`);
        break;
      case "edit":
        handleEditZone(rowData);
        break;
      case "delete":
        handleDeleteZone(rowData);
        break;
      case "toggle-status":
        // Toggle zone status
        console.log("Toggling status for zone:", rowData.zoneName);
        break;
      default:
        break;
    }
  };

  // Create polygon from nearby postcodes or create a hexagon
  const createPolygonFromNearbyPostcodes = (centerLat, centerLng, nearbyPostcodes) => {
    if (!nearbyPostcodes || nearbyPostcodes.length === 0) {
      // If no nearby postcodes, create a hexagon around the center point
      return createHexagon(centerLat, centerLng, 0.005); // ~500m radius
    }

    // Collect all coordinates from nearby postcodes
    const coordinates = nearbyPostcodes
      .filter((pc) => pc.latitude && pc.longitude)
      .map((pc) => ({ lat: pc.latitude, lng: pc.longitude }));

    if (coordinates.length === 0) {
      return createHexagon(centerLat, centerLng, 0.005);
    }

    // Add center point
    coordinates.push({ lat: centerLat, lng: centerLng });

    // Create bounding polygon
    return createBoundingPolygon(coordinates);
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

  // Create a bounding polygon from coordinates
  const createBoundingPolygon = (coordinates) => {
    if (coordinates.length === 1) {
      return createHexagon(coordinates[0].lat, coordinates[0].lng, 0.005);
    }

    // Calculate bounding box
    const lats = coordinates.map((c) => c.lat);
    const lngs = coordinates.map((c) => c.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    // Add padding
    const latPadding = (maxLat - minLat) * 0.2 || 0.005;
    const lngPadding = (maxLng - minLng) * 0.2 || 0.005;

    // Create rounded rectangle polygon
    return [
      { lat: minLat - latPadding, lng: minLng - lngPadding },
      { lat: maxLat + latPadding, lng: minLng - lngPadding },
      { lat: maxLat + latPadding, lng: maxLng + lngPadding },
      { lat: minLat - latPadding, lng: maxLng + lngPadding },
      { lat: minLat - latPadding, lng: minLng - lngPadding }, // Close polygon
    ];
  };

  // Helper function to fetch postal code boundary for the map.
  // UK full unit (e.g. SW1A 1AA): postcodes.io gives outcode SW1A + incode — open GeoJSON is **sector** SW1A
  // (huge, wrong vs Google’s unit outline). Skip GeoJSON for those; use Geocoding viewport if tight enough,
  // else a small hex at the official centroid.
  //
  // Sector-only / resolved without incode: keep GeoJSON sector polygon when available.
  //
  // Note: api.postcodes.io /postcodes/{pc}/boundary returns 404 — not used here.
  const fetchPostalCodeBoundary = async (postalCode) => {
    try {
      const cleanPostcode = postalCode.replace(/\s+/g, "");

      const centerRes = await fetch(
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

      // ── 2. Google Geocoding bounding-box ──
      try {
        const geocodingRes = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(postalCode)}&key=${googleApiKey}`
        );

        if (geocodingRes.ok) {
          const geocodingData = await geocodingRes.json();

          if (geocodingData.results && geocodingData.results.length > 0) {
            const result = geocodingData.results[0];
            const geometry = result.geometry;
            const gCenter = {
              lat: geometry.location.lat,
              lng: geometry.location.lng,
            };

            const box = geometry.bounds || geometry.viewport;
            if (box) {
              const diagKm = googleBoundsDiagonalKm(box);
              const viewportTooLooseForUnit =
                hasFullUkUnit && diagKm > FULL_UNIT_MAX_VIEWPORT_DIAGONAL_KM;
              if (!viewportTooLooseForUnit) {
                const polygonPath = [
                  { lat: box.northeast.lat, lng: box.southwest.lng },
                  { lat: box.northeast.lat, lng: box.northeast.lng },
                  { lat: box.southwest.lat, lng: box.northeast.lng },
                  { lat: box.southwest.lat, lng: box.southwest.lng },
                  { lat: box.northeast.lat, lng: box.southwest.lng },
                ];
                return {
                  centerPoint: centerPoint || gCenter,
                  polygonPath,
                  postcode: normalizedPostcode,
                };
              }
            }
          }
        }
      } catch (geocodingError) {
        console.log("Google Geocoding failed, trying hexagon fallback:", geocodingError);
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
    console.log("Polygon coordinates saved:", coordinatesArray);
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
    console.log("Polygon cleared");
  };


  // Handle adding postal codes (supports multiple)
  // Returns true if the postcode belongs to the given city name (case-insensitive partial match)
  const validatePostcodeCity = async (postcode, cityName) => {
    try {
      const cleanPostcode = postcode.replace(/\s+/g, "");
      const response = await fetch(
        `https://api.postcodes.io/postcodes/${encodeURIComponent(cleanPostcode)}`
      );
      if (!response.ok) return true; // Can't validate → allow
      const data = await response.json();
      if (!data.result) return true;

      const { admin_district, admin_county, region, nuts } = data.result;
      const candidates = [admin_district, admin_county, region, nuts]
        .filter(Boolean)
        .map((f) => f.toLowerCase());
      const city = cityName.toLowerCase();

      // Pass if any candidate contains the city name OR city name contains the candidate
      return candidates.some((f) => f.includes(city) || city.includes(f));
    } catch {
      return true; // Network error → allow gracefully
    }
  };

  const handleAddPostcode = async () => {
    if (!newPostcodeInput.trim()) {
      showError("Please enter at least one postal code");
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

    try {
      const newHighlights = [];
      const newMarkers = [];
      const newPostcodeDataList = [];
      let lastCenterPoint = null;
      let cityRejectedCount = 0;

      // Validate and fetch each postal code
      for (const postcode of postcodes) {
        // Check if postal code already exists
        if (addedPostcodes.some((pc) => pc.postcode === postcode)) {
          continue; // Skip already added postal codes
        }

        // City validation: reject postcodes outside the selected city
        if (selectedCityName) {
          const belongsToCity = await validatePostcodeCity(postcode, selectedCityName);
          if (!belongsToCity) {
            showError(
              `"${postcode}" is outside of ${selectedCityName}. Only postal codes within the selected city can be added.`
            );
            cityRejectedCount++;
            continue;
          }
        }

        try {
          // Use helper function to get actual boundary
          const boundaryData = await fetchPostalCodeBoundary(postcode);

          if (boundaryData) {
            lastCenterPoint = boundaryData.centerPoint; // Keep track of the last valid postcode

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
          }
        } catch (error) {
          console.error(`Error fetching postal code ${postcode}:`, error);
        }
      }

      if (newHighlights.length > 0) {
        // Add to added postcodes list
        setAddedPostcodes((prev) => [...prev, ...newPostcodeDataList]);

        // Add to highlights and markers
        setMultiplePostcodeHighlights((prev) => [...prev, ...newHighlights]);
        setPostalCodeMarkers((prev) => [...prev, ...newMarkers]);

        // Navigate map to the last highlighted area
        if (map && lastCenterPoint) {
          map.setCenter(lastCenterPoint);
          map.setZoom(14);
        }
        if (lastCenterPoint) {
          setCenter(lastCenterPoint);
        }

        setNewPostcodeInput("");
        success(`Successfully added ${newHighlights.length} postal code(s)`);
      } else if (cityRejectedCount === 0) {
        // Only show the generic fallback if nothing was rejected by city validation
        // (city rejections already showed their own specific toast)
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

    const commRaw = add.zoneCommission;
    if (commRaw === "" || commRaw === null || commRaw === undefined) return false;
    const zoneCommissionNum = parseFloat(String(commRaw).trim());
    if (!Number.isFinite(zoneCommissionNum) || zoneCommissionNum < 0) return false;

    if (!add.paymentMethod || String(add.paymentMethod).trim() === "") return false;
    if (!add.zoneCurrency || String(add.zoneCurrency).trim() === "") return false;

    return true;
  }, [
    add.countryId,
    add.cityId,
    add.zoneName,
    add.zoneMinimumAmount,
    add.zoneCommission,
    add.paymentMethod,
    add.zoneCurrency,
    addedPostcodes.length,
  ]);

  if (isLoading) return <Delay />;

  return (
    <div className="!space-y-11">
            <ModalComponent
              open={add.open}
              title={isEditMode ? "EDIT ZONE" : "ADD ZONE"}
              onClose={handleToggle}
              secondaryAction={{ label: "Cancel", onClick: handleToggle }}
              primaryAction={{
                label: isEditMode ? "Update Zone" : "Add Zone",
                onClick: handleAddZone,
                isLoading: isAddingZone || isEditingZone,
                disabled: !canSubmitZone,
              }}
            >
              <Box className="flex flex-col gap-5">
                <Box className="flex flex-col gap-y-3">
                  <label htmlFor="zoneName" className="text-grey40">
                    Country
                  </label>

                  <SelectField
                    title=""
                    value={add.countryId || ""}
                    onChange={(e) => handelCountryChange(e)}
                    options={
                      Array.isArray(countries)
                        ? countries.map((country) => ({
                          value: String(country.id),
                          label: country.name,
                        }))
                        : []
                    }
                    placeholder="Select country"
                    fullWidth
                    bgcolor={"grey.200"}
                  />
                </Box>
                <Box className="flex flex-col gap-y-3">
                  <label htmlFor="cityId" className="text-grey40">
                    City
                  </label>

                  <SelectField
                    title=""
                    value={add.cityId || ""}
                    onChange={(e) => handleCityChange(e)}
                    options={
                      Array.isArray(cities)
                        ? cities.map((city) => ({
                          value: String(city.id),
                          label: city.name,
                        }))
                        : []
                    }
                    placeholder={add.countryId ? "Select city" : "Select country first"}
                    fullWidth
                    bgcolor={"grey.200"}
                    disabled={!add.countryId}
                  />
                </Box>
                <Box className="flex flex-col gap-y-3">
                  <div className="mt-4 relative">
                    {isEditPostcodesLoading && (
                      <div
                        className="absolute inset-0 z-[200] flex items-center justify-center bg-white/75 backdrop-blur-[1px] pointer-events-auto"
                        aria-live="polite"
                        aria-busy="true"
                      >
                        <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                          <CircularProgress size={40} />
                          <Typography variant="body2" color="text.secondary">
                            Loading postcodes…
                          </Typography>
                        </Box>
                      </div>
                    )}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-full px-4 max-w-[500px] mx-auto z-[100] flex flex-col gap-2 min-w-0">
                      {addedPostcodes.length > 0 && (
                        <div className="z-[101] w-full min-w-0 flex flex-col gap-1">
                          <div
                            ref={postcodeChipsScrollRef}
                            onScroll={updateChipsScrollState}
                            className="flex flex-nowrap gap-2 items-center overflow-x-auto overflow-y-hidden w-full min-w-0 py-0.5 [scrollbar-width:thin]"
                          >
                            {addedPostcodes.map((postcodeData, index) => (
                              <div
                                key={index}
                                onClick={() => handlePostcodeClick(postcodeData)}
                                className="flex flex-shrink-0 items-center justify-center gap-1 bg-white rounded-lg px-4 py-2 shadow-md min-w-[120px] h-[40px] cursor-pointer hover:bg-gray-50 transition-colors"
                              >
                                <span className="text-sm font-medium text-gray-800">
                                  {postcodeData.postcode}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => handleRemovePostcode(postcodeData.postcode, e)}
                                  className="text-gray-500 hover:text-red-600 transition-colors ml-1"
                                  title="Remove postal code"
                                >
                                  <RxCross2 size={16} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {addedPostcodes.length > 4 && (
                        <div className="flex w-full min-w-0 items-center justify-between gap-2 z-[101]">
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            <div className="flex shrink-0 items-center gap-2">
                              <button
                                type="button"
                                onClick={() => scrollPostcodeChips("left")}
                                disabled={!chipsCanScrollLeft}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30"
                                title="Scroll postcodes left"
                                aria-label="Scroll postcodes left"
                              >
                                <TbChevronLeft size={20} />
                              </button>
                              <button
                                type="button"
                                onClick={() => scrollPostcodeChips("right")}
                                disabled={!chipsCanScrollRight}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30"
                                title="Scroll postcodes right"
                                aria-label="Scroll postcodes right"
                              >
                                <TbChevronRight size={20} />
                              </button>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPostcodeAddSectionVisible((v) => !v)}
                            className="inline-flex h-9 min-w-24 shrink-0 items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-6 text-xs font-semibold text-gray-800 shadow-sm transition-colors hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-1"
                            title={
                              postcodeAddSectionVisible
                                ? "Hide postal code field and add/clear actions"
                                : "Show postal code field and add/clear actions"
                            }
                            aria-expanded={postcodeAddSectionVisible}
                            aria-label={
                              postcodeAddSectionVisible
                                ? "Hide postal code input"
                                : "Show postal code input"
                            }
                          >
                            {postcodeAddSectionVisible ? (
                              <>
                                <TbChevronUp className="size-3.5 shrink-0 opacity-80" aria-hidden />
                                <span className="whitespace-nowrap">Hide</span>
                              </>
                            ) : (
                              <>
                                <TbChevronDown className="size-3.5 shrink-0 opacity-80" aria-hidden />
                                <span className="whitespace-nowrap">Show</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      <div className="w-full z-[101] flex flex-col gap-2">
                        {postcodeAddSectionVisible && (
                          <>
                            <textarea
                              value={newPostcodeInput}
                              onChange={(e) => setNewPostcodeInput(e.target.value)}
                              placeholder="Enter postal codes separated by comma: SW1A 1AA, SW1A 1AB, SW1A 1AC"
                              className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm bg-white"
                              rows={4}
                            />
                            <div className="flex gap-3">
                              <button
                                type="button"
                                onClick={handleAddPostcode}
                                disabled={isAddingPostcode || !newPostcodeInput.trim()}
                                className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-md min-w-[120px] h-[40px] flex items-center justify-center"
                              >
                                {isAddingPostcode ? "Adding..." : "Add Postal Codes"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setNewPostcodeInput("")}
                                disabled={!newPostcodeInput.trim()}
                                className="bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-md min-w-[120px] h-[40px] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Clear
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Action buttons at bottom left */}
                    <div className="absolute bottom-4 left-4 z-30 flex flex-col !space-y-4">
                      <button
                        onClick={() => {
                          setDrawingMode(null);
                          map.setOptions({ draggableCursor: "grab" });
                        }}
                        className="bg-white rounded-md p-4 shadow-lg hover:bg-gray-50 transition-colors"
                        title="Grab/Pan tool"
                      >
                        <LiaHandPointerSolid size={24} />
                      </button>
                      <button
                        onClick={() => setDrawingMode("polygon")}
                        className="bg-white rounded-md p-4 shadow-lg hover:bg-gray-50 transition-colors"
                        title="Draw polygon"
                      >
                        <TbLassoPolygon size={24} />
                      </button>
                      <button
                        className="bg-white rounded-md p-4 shadow-lg hover:bg-gray-50 transition-colors"
                        onClick={clearPolygons}
                        title="Clear polygons"
                      >
                        <RxCross2 size={24} />
                      </button>
                    </div>
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
                        styles: [
                          {
                            featureType: "poi",
                            elementType: "labels",
                            stylers: [{ visibility: "off" }],
                          },
                        ],
                      }}
                    >
                      {drawingMode && (
                        <DrawingManager
                          options={{
                            drawingControl: false,
                            drawingMode: drawingMode,
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
                      )}
                      {/* Single postal code highlight: fill + red dotted border */}
                      {postalCodeHighlight && postalCodeHighlight.paths && (
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
                          <Polyline
                            path={postalCodeHighlight.paths}
                            options={getPostcodeDottedRedOutlineOptions()}
                          />
                        </>
                      )}
                      {/* Multiple postal code highlight polygons */}
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
                          <Polyline
                            path={highlight.paths}
                            options={getPostcodeDottedRedOutlineOptions()}
                          />
                        </Fragment>
                      ))}
                      {/* Postal code markers */}
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
                  </div>
                </Box>

                <Box className="flex flex-col gap-y-3">
                  <label htmlFor="description" className="text-grey40">
                    Zone Name
                  </label>
                  <InputFieldModal
                    name="zoneName"
                    value={add.zoneName}
                    onChange={handleChange}
                    placeholder="Enter zone name"
                  />
                </Box>
                <Box className="flex flex-col gap-y-3">
                  <label htmlFor="zoneMinimumAmount" className="text-grey40">
                    Zone Minimum Amount
                  </label>
                  <InputFieldModal
                    name="zoneMinimumAmount"
                    type="number"
                    value={add.zoneMinimumAmount}
                    onChange={handleChange}
                    placeholder="Enter zone minimum amount"
                  />
                </Box>
                <Box className="flex flex-col gap-y-3">
                  <label htmlFor="description" className="text-grey40">
                    Zone commission%
                  </label>
                  <InputFieldModal
                    name="zoneCommission"
                    value={add.zoneCommission}
                    onChange={handleChange}
                    placeholder="Zone commission%"
                  />
                </Box>

                <Box className="flex flex-col gap-y-3">
                  <label htmlFor="zoneCurrency" className="text-grey40">
                    Zone Currency
                  </label>
                  <SelectField
                    title=""
                    value={add.zoneCurrency || ""}
                    onChange={(e) => {
                      const selectedName = e.target.value;
                      const selectedCurrencyId = Array.isArray(currencies)
                        ? currencies.find((currency) => currency.name === selectedName)?.id
                        : "";
                      setAdd((prev) => ({
                        ...prev,
                        zoneCurrency: selectedName,
                        currencyUnitId: selectedCurrencyId
                          ? String(selectedCurrencyId)
                          : prev.currencyUnitId,
                      }));
                    }}
                    options={
                      Array.isArray(currencies)
                        ? currencies.map((currency) => ({
                          value: currency.name,
                          label: `${currency.name} (${currency.symbol})`,
                        }))
                        : []
                    }
                    placeholder="Select currency"
                    fullWidth
                    bgcolor={"grey.200"}
                  />
                </Box>

                <Box className="flex flex-col gap-y-3">
                  <label htmlFor="paymentMethod" className="text-grey40">
                    Payment Method
                  </label>
                  <SelectField
                    title=""
                    value={add.paymentMethod || ""}
                    onChange={(e) => {
                      setAdd((prev) => ({
                        ...prev,
                        paymentMethod: e.target.value,
                      }));
                    }}
                    options={ZONE_PAYMENT_METHOD_OPTIONS}
                    placeholder="Select payment method"
                    fullWidth
                    bgcolor={"grey.200"}
                  />
                </Box>

                <Box className="flex flex-col gap-y-3">
                  <label htmlFor="deliveryCharges" className="text-grey40">
                    Delivery Charges
                  </label>
                  <InputFieldModal
                    name="deliveryCharges"
                    value={add.deliveryCharges}
                    onChange={handleChange}
                    placeholder="Enter delivery charges"
                  />
                </Box>

                <Box className="flex flex-col gap-y-3">
                  <label htmlFor="ExDeliveryCharges" className="text-grey40">
                    Express-Delivery Charges
                  </label>
                  <InputFieldModal
                    name="ExDeliveryCharges"
                    value={add.ExDeliveryCharges}
                    onChange={handleChange}
                    placeholder="Enter express-delivery charges"
                  />
                </Box>

                <Box className="flex flex-col gap-y-3">
                  <label htmlFor="zoneAdminId" className="text-grey40">
                    Zone Admin ID
                  </label>
                  <InputFieldModal
                    name="zoneAdminId"
                    type="number"
                    value={add.zoneAdminId}
                    onChange={handleChange}
                    placeholder="Enter zone admin ID"
                  />
                </Box>
              </Box>
            </ModalComponent>
            <Box className="flex items-center gap-x-5 justify-between">
              <Box className="flex items-center gap-x-5">
                <Typography color="blue.50">
                  <BsCardList size="24px" color="blue.50" />
                </Typography>

                <Typography variant="h4" fontFamily={"Switzer"} color="grey.20">
                  All Zones
                </Typography>
              </Box>

              <ButtonBlueLight
                variant="outlined"
                bgColor="blue.200"
                color="white"
                radius="8px"
                startIcon={<TbPlus size={"24px"} />}
                onClick={handleToggle}
              >
                Add Zone
              </ButtonBlueLight>
            </Box>

            <div className="grid grid-cols-4 gap-7 font-Inter">
              <div className="rounded-lg !px-3.5 !py-5 bg-green50">
                <h6 className="font-Inter font-semibold text-lg uppercase">
                  Total Cities
                </h6>
                <p className="font-Inter font-medium text-[22px] !pt-10">
                  {zones?.totalCities || 0}
                </p>
              </div>

              <div className="rounded-lg !px-3.5 !py-5 bg-red50">
                <h6 className="font-Inter font-semibold text-lg uppercase">
                  Total Zone
                </h6>
                <p className="font-Inter font-medium text-[22px] !pt-10">
                  {zones?.totalZones || 0}
                </p>
              </div>

              <div className="rounded-lg !px-3.5 !py-5 bg-purple50">
                <h6 className="font-Inter font-semibold text-lg uppercase">
                  Total SHOPS
                </h6>
                <p className="font-Inter font-medium text-[22px] !pt-10">
                  {zones?.totalShops || 0}
                </p>
              </div>
            </div>

            <div className="w-full overflow-auto">
              <DataTable
                data={zonesData}
                columns={zoneColumns}
                searchPlaceholder="Search by zone name, city, area..."
                onSearch={handleSearchChange}
                onFilter={handleFilter}
                onDateRangeChange={handleDateChange}
                onDownload={handleDownload}
                onRowAction={handleRowAction}
                height={600}
              />
            </div>
          </div>
  );
}

