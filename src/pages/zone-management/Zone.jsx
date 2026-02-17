import { useState, useRef } from "react";
import { Box, Button, IconButton, Typography } from "@mui/material";
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
  useGetAllCountriesQuery,
  useGetCitiesByCountryIdQuery,
  useGetUnitsDistanceAndCurrencyQuery,
  useAddZoneByPostcodesMutation,
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
  Autocomplete,
  DrawingManager,
  Marker,
  Polygon,
} from "@react-google-maps/api";
import { LiaHandPointerSolid } from "react-icons/lia";
import { TbLassoPolygon } from "react-icons/tb";
import { RxCross2 } from "react-icons/rx";
import InputFieldModal from "../../components/ui/InputFieldModal";
import useToaster from "../../components/ui/Toaster";

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
  const autocompleteRef = useRef(null);

  // Postal code highlight state
  const [postalCodeHighlight, setPostalCodeHighlight] = useState(null);
  const [postalCodeMarkers, setPostalCodeMarkers] = useState([]);
  const [multiplePostcodeHighlights, setMultiplePostcodeHighlights] = useState([]); // Store multiple postal code polygons
  const [addedPostcodes, setAddedPostcodes] = useState([]); // Store list of added postal codes with their data
  const [newPostcodeInput, setNewPostcodeInput] = useState("");
  const [isAddingPostcode, setIsAddingPostcode] = useState(false);
  const [showPostcodeInput, setShowPostcodeInput] = useState(false);

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
    paymentMethod: "",
    deliveryCharges: "",
    ExDeliveryCharges: " ",
    zoneAdminId: "",
  });
  console.log("🚀 ~ ZoneManagement ~ add:", add);
  const { success, error: showError } = useToaster();
  const { isLoading, refetch: refetchZones } = useGetAllZonesQuery();
  const { isLoading: _countriesLoading } = useGetAllCountriesQuery();
  const [addZoneByPostcodes, { isLoading: isAddingZone }] = useAddZoneByPostcodesMutation();
  const zones = useSelector((state) => state?.apiData?.zones);
  const countries = useSelector((state) => state?.apiData?.countries);
  const cities = useSelector((state) => state?.apiData?.cities);
  const units = useSelector((state) => state?.apiData?.units);

  // Fetch currencies and payment methods
  const { data: currenciesData } = useGetUnitsDistanceAndCurrencyQuery("currency", {
    skip: false,
  });
  const { data: paymentMethodsData } = useGetUnitsDistanceAndCurrencyQuery("paymentMethod", {
    skip: false,
  });

  const currencies = currenciesData?.data || units?.currency || [];
  const paymentMethods = paymentMethodsData?.data || units?.paymentMethod || [];

  // Fetch cities when a country is selected
  const { isLoading: _citiesLoading } = useGetCitiesByCountryIdQuery(
    add.countryId,
    {
      skip: !add.countryId, // Skip the query if no country is selected
    }
  );

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
      paymentMethod: "N/A",
      deliveryCharges: zone.serviceCharge || 0,
      noOfShops: "N/A",
      expressDelivery: "N/A",
      zoneAssign: zone.zoneAdminId ? `Admin ${zone.zoneAdminId}` : "Unassigned",
      commission: zone.zoneAdminComission || 0,
      status: zone.status,
      createdAt: zone.createdAt,
      updatedAt: zone.updatedAt,
    };
  });

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
          onView={() => navigate(`/zone-management/details/${params?.row?.id}`)}
          onEdit={() => alert(`Edit ${params.row.zoneName}`)}
          onDelete={() => alert(`Delete ${params.row.zoneName}`)}
        />
      ),
    },
  ];

  // Modal handlers
  const handleToggle = () => {
    if (add.open) {
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
        paymentMethod: "",
        deliveryCharges: "",
        ExDeliveryCharges: "",
      });
      // Clear coordinates and reset map
      setCoordinates([]);
      setDrawingMode(null);
      setPostalCodeHighlight(null);
      setPostalCodeMarkers([]);
      setMultiplePostcodeHighlights([]);
      setAddedPostcodes([]);
      setNewPostcodeInput("");
      setShowPostcodeInput(false);
      if (map) {
        map.setOptions({ draggableCursor: "pointer" });
      }
    } else {
      // Just open the modal for add
      setAdd((prev) => ({ ...prev, open: true }));
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
      // Validate that at least one postal code is added
      if (!addedPostcodes || addedPostcodes.length === 0) {
        showError("Please add at least one postal code before creating a zone");
        return;
      }

      // Extract postcodes array from addedPostcodes
      const postcodes = addedPostcodes.map((pc) => pc.postcode);

      // Find the selected currency to get its ID
      const selectedCurrency = Array.isArray(currencies)
        ? currencies.find((currency) => currency.name === add.zoneCurrency)
        : null;
      const currencyUnitId = selectedCurrency ? selectedCurrency.id : null;

      // Get distanceUnitId - using default value of 2 as per API example
      const distanceUnitId = 2;

      const zoneData = {
        name: add.zoneName,
        postcodes: postcodes,
        cityId: parseInt(add.cityId) || 1,
        zoneMinimumAmount: parseFloat(add.zoneMinimumAmount) || 0,
        currencyUnitId: currencyUnitId || 1,
        distanceUnitId: distanceUnitId,
        serviceCharge: parseFloat(add.deliveryCharges) || 0,
        zoneAdminComission: parseFloat(add.zoneCommission) || 0,
        zoneAdminId: add.zoneAdminId && add.zoneAdminId.trim() !== "" ? parseInt(add.zoneAdminId) : null,
        status: true, // Default to active
      };

      console.log("Zone data being sent:", zoneData);
      const result = await addZoneByPostcodes(zoneData).unwrap();
      console.log("Zone added successfully:", result);

      // Reset state
      setAddedPostcodes([]);
      setMultiplePostcodeHighlights([]);
      setPostalCodeMarkers([]);
      setCoordinates([]);
      handleToggle();
      success("Zone added successfully!");

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
      ? countries.find((country) => country.id === selectedCountryId)
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
      ? cities.find((city) => city.id === selectedCityId)
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
        // Navigate to edit zone page or open edit modal
        console.log("Editing zone:", rowData.zoneName);
        break;
      case "delete":
        // Show confirmation dialog and delete zone
        console.log("Deleting zone:", rowData.zoneName);
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

  const handlePlaceChanged = async () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();

      if (place && place.geometry) {
        const location = place.geometry.location;
        const newCenter = { lat: location.lat(), lng: location.lng() };
        setCenter(newCenter);

        if (map) {
          map.setCenter(location);
          map.setZoom(15);
        }

        // Check if the place contains a postal code (UK postcode)
        const postalCodeComponent = place.address_components?.find(
          (component) => component.types.includes("postal_code")
        );

        if (postalCodeComponent) {
          const postalCode = postalCodeComponent.long_name || postalCodeComponent.short_name;
          await highlightPostalCodeArea(postalCode, location);
        } else {
          // Clear postal code highlights if no postal code found
          setPostalCodeHighlight(null);
          setPostalCodeMarkers([]);
        }
      }
    }
  };

  // Helper function to fetch actual postal code boundary
  const fetchPostalCodeBoundary = async (postalCode) => {
    try {
      const cleanPostcode = postalCode.replace(/\s+/g, "");

      // Try Google Geocoding API first (matches Google Maps display)
      try {
        const geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(postalCode)}&key=${googleApiKey}`;
        const geocodingResponse = await fetch(geocodingUrl);
        
        if (geocodingResponse.ok) {
          const geocodingData = await geocodingResponse.json();
          
          if (geocodingData.results && geocodingData.results.length > 0) {
            const result = geocodingData.results[0];
            const geometry = result.geometry;
            
            const centerPoint = {
              lat: geometry.location.lat,
              lng: geometry.location.lng,
            };

            // Get boundary from bounds or viewport
            let polygonPath = null;

            if (geometry.bounds) {
              const bounds = geometry.bounds;
              polygonPath = [
                { lat: bounds.northeast.lat, lng: bounds.southwest.lng },
                { lat: bounds.northeast.lat, lng: bounds.northeast.lng },
                { lat: bounds.southwest.lat, lng: bounds.northeast.lng },
                { lat: bounds.southwest.lat, lng: bounds.southwest.lng },
                { lat: bounds.northeast.lat, lng: bounds.southwest.lng },
              ];
            } else if (geometry.viewport) {
              const viewport = geometry.viewport;
              polygonPath = [
                { lat: viewport.northeast.lat, lng: viewport.southwest.lng },
                { lat: viewport.northeast.lat, lng: viewport.northeast.lng },
                { lat: viewport.southwest.lat, lng: viewport.northeast.lng },
                { lat: viewport.southwest.lat, lng: viewport.southwest.lng },
                { lat: viewport.northeast.lat, lng: viewport.southwest.lng },
              ];
            }

            if (polygonPath) {
              return { centerPoint, polygonPath, postcode: postalCode };
            }
          }
        }
      } catch (geocodingError) {
        console.log("Google Geocoding API failed, trying postcode.io:", geocodingError);
      }

      // Fallback to postcode.io boundary endpoint
      try {
        const boundaryResponse = await fetch(
          `https://api.postcodes.io/postcodes/${encodeURIComponent(cleanPostcode)}/boundary`
        );

        if (boundaryResponse.ok) {
          const boundaryData = await boundaryResponse.json();
          if (boundaryData.result && boundaryData.result.length > 0) {
            // Get center point
            const centerResponse = await fetch(
              `https://api.postcodes.io/postcodes/${encodeURIComponent(cleanPostcode)}`
            );
            let centerPoint = null;
            if (centerResponse.ok) {
              const centerData = await centerResponse.json();
              if (centerData.result) {
                centerPoint = {
                  lat: centerData.result.latitude,
                  lng: centerData.result.longitude,
                };
              }
            }

            // Convert GeoJSON coordinates to Google Maps format
            const polygonPath = boundaryData.result.map((coord) => ({
              lat: coord[1],
              lng: coord[0],
            }));
            // Close the polygon
            if (polygonPath.length > 0) {
              polygonPath.push(polygonPath[0]);
            }

            if (centerPoint) {
              // Get postcode from center data or use the input
              const postcode = centerData.result?.postcode || postalCode;
              return { centerPoint, polygonPath, postcode };
            }
          }
        }
      } catch (boundaryError) {
        console.log("postcode.io boundary endpoint failed:", boundaryError);
      }

      // Final fallback: get center and create hexagon
      const response = await fetch(
        `https://api.postcodes.io/postcodes/${encodeURIComponent(cleanPostcode)}`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.result) {
          const centerPoint = {
            lat: data.result.latitude,
            lng: data.result.longitude,
          };
          const polygonPath = createHexagon(centerPoint.lat, centerPoint.lng, 0.005);
          return { centerPoint, polygonPath, postcode: data.result.postcode };
        }
      }
    } catch (error) {
      console.error(`Error fetching postal code boundary for ${postalCode}:`, error);
    }

    return null;
  };

  // Highlight postal code area using Google Geocoding API for accurate boundaries
  const highlightPostalCodeArea = async (postalCode, fallbackLocation) => {
    try {
      // Use helper function to get actual boundary
      const boundaryData = await fetchPostalCodeBoundary(postalCode);

      if (boundaryData) {
        setPostalCodeHighlight({
          paths: boundaryData.polygonPath,
          postcode: boundaryData.postcode,
          center: boundaryData.centerPoint,
        });

        setPostalCodeMarkers([
          {
            position: boundaryData.centerPoint,
            postcode: boundaryData.postcode,
            label: boundaryData.postcode,
          },
        ]);

        if (map) {
          map.setCenter(boundaryData.centerPoint);
          map.setZoom(14);
        }
        setCenter(boundaryData.centerPoint);
        return;
      }

      // Final fallback: use Google Places location with hexagon
      if (fallbackLocation) {
        const centerPoint = { lat: fallbackLocation.lat(), lng: fallbackLocation.lng() };
        const polygonPath = createHexagon(centerPoint.lat, centerPoint.lng, 0.005);
        setPostalCodeHighlight({
          paths: polygonPath,
          center: centerPoint,
          postcode: postalCode,
        });
        setPostalCodeMarkers([
          {
            position: centerPoint,
            postcode: postalCode,
            label: postalCode,
          },
        ]);
      }
    } catch (error) {
      console.error("Error fetching postal code data:", error);
      // Fallback to Google Places location
      if (fallbackLocation) {
        const centerPoint = { lat: fallbackLocation.lat(), lng: fallbackLocation.lng() };
        const polygonPath = createHexagon(centerPoint.lat, centerPoint.lng, 0.005);
        setPostalCodeHighlight({
          paths: polygonPath,
          center: centerPoint,
          postcode: postalCode,
        });
        setPostalCodeMarkers([
          {
            position: centerPoint,
            postcode: postalCode,
            label: postalCode,
          },
        ]);
      }
    }
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
    setShowPostcodeInput(false);
    setNewPostcodeInput("");
    // Remove all polygons from the map
    if (map) {
      map.setOptions({ draggableCursor: "pointer" });
    }
    console.log("Polygon cleared");
  };


  // Handle adding postal codes (supports multiple)
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

    try {
      const newHighlights = [];
      const newMarkers = [];
      const newPostcodeDataList = [];
      let lastCenterPoint = null;

      // Validate and fetch each postal code
      for (const postcode of postcodes) {
        // Check if postal code already exists
        if (addedPostcodes.some((pc) => pc.postcode === postcode)) {
          continue; // Skip already added postal codes
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

        // Close input and clear
        setShowPostcodeInput(false);
        setNewPostcodeInput("");
        success(`Successfully added ${newHighlights.length} postal code(s)`);
      } else {
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

  if (isLoading) return <Delay />;

  return (
    <div className="!space-y-11">
            <ModalComponent
              open={add.open}
              title="ADD ZONE"
              onClose={handleToggle}
              secondaryAction={{ label: "Cancel", onClick: handleToggle }}
              primaryAction={{
                label: "Add Zone",
                onClick: handleAddZone,
                isLoading: isAddingZone,
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
                          value: country.id,
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
                          value: city.id,
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
                    {/* Search bar at the top */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-full px-4 max-w-[500px] mx-auto z-[100] flex flex-col gap-2">
                      <style>
                        {`
                          .pac-container {
                            z-index: 9999 !important;
                            border-radius: 8px;
                            margin-top: 4px;
                            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
                          }
                          .pac-item {
                            padding: 12px;
                            cursor: pointer;
                          }
                          .pac-item:hover {
                            background-color: #f3f4f6;
                          }
                        `}
                      </style>
                      <Autocomplete
                        onLoad={(autocomplete) => {
                          autocompleteRef.current = autocomplete;
                        }}
                        onPlaceChanged={handlePlaceChanged}
                      >
                        <div className="w-full relative">
                          <input
                            type="text"
                            placeholder="Search location"
                            className="bg-white rounded-md w-full h-12 !pl-4 px-4 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </Autocomplete>

                      {/* Added Postal Codes Display */}
                      {!showPostcodeInput && (
                        <div className="flex flex-wrap gap-2 items-center z-[101]">
                          {/* Display added postal codes as removable buttons */}
                          {addedPostcodes.map((postcodeData, index) => (
                            <div
                              key={index}
                              onClick={() => handlePostcodeClick(postcodeData)}
                              className="flex items-center justify-center gap-1 bg-white rounded-lg px-4 py-2 shadow-md min-w-[120px] h-[40px] cursor-pointer hover:bg-gray-50 transition-colors"
                            >
                              <span className="text-sm font-medium text-gray-800">
                                {postcodeData.postcode}
                              </span>
                              <button
                                onClick={(e) => handleRemovePostcode(postcodeData.postcode, e)}
                                className="text-gray-500 hover:text-red-600 transition-colors ml-1"
                                title="Remove postal code"
                              >
                                <RxCross2 size={16} />
                              </button>
                            </div>
                          ))}

                          {/* Add Postal Code button */}
                          <button
                            onClick={() => setShowPostcodeInput(true)}
                            className="flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-4 py-2 shadow-md min-w-[120px] h-[40px] text-sm font-medium transition-colors"
                          >
                            + Post Code
                          </button>
                        </div>
                      )}

                      {/* Postcode Input Textarea (shown when button is clicked) */}
                      {showPostcodeInput && (
                        <div className="w-full z-[101]">
                          <textarea
                            value={newPostcodeInput}
                            onChange={(e) => setNewPostcodeInput(e.target.value)}
                            placeholder="Enter postal codes separated by comma: SW1A 1AA, SW1A 1AB, SW1A 1AC"
                            className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm bg-white"
                            rows={4}
                          />
                          <div className="flex gap-3 mt-3">
                            <button
                              onClick={handleAddPostcode}
                              disabled={isAddingPostcode || !newPostcodeInput.trim()}
                              className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-md min-w-[120px] h-[40px] flex items-center justify-center"
                            >
                              {isAddingPostcode ? "Adding..." : "Add Postal Codes"}
                            </button>
                            <button
                              onClick={() => {
                                setShowPostcodeInput(false);
                                setNewPostcodeInput("");
                              }}
                              className="bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-md min-w-[120px] h-[40px] flex items-center justify-center"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
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
                      {/* Single postal code highlight polygon */}
                      {postalCodeHighlight && postalCodeHighlight.paths && (
                        <Polygon
                          paths={postalCodeHighlight.paths}
                          options={{
                            fillColor: "#87CEEB",
                            fillOpacity: 0.3,
                            strokeColor: "#808080",
                            strokeOpacity: 0.6,
                            strokeWeight: 1,
                            clickable: false,
                          }}
                        />
                      )}
                      {/* Multiple postal code highlight polygons */}
                      {multiplePostcodeHighlights.map((highlight, index) => (
                        <Polygon
                          key={`highlight-${index}`}
                          paths={highlight.paths}
                          options={{
                            fillColor: "#87CEEB",
                            fillOpacity: 0.3,
                            strokeColor: "#808080",
                            strokeOpacity: 0.6,
                            strokeWeight: 1,
                            clickable: false,
                          }}
                        />
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
                      setAdd((prev) => ({
                        ...prev,
                        zoneCurrency: e.target.value,
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
                    options={
                      Array.isArray(paymentMethods)
                        ? paymentMethods.map((method) => ({
                          value: method.name,
                          label: method.name,
                        }))
                        : []
                    }
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

