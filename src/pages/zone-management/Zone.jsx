import { useState, useRef } from "react";
import { Box, Button, IconButton, Typography } from "@mui/material";
import Layout from "../../components/shared/Layout";
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
  useAddZoneMutation,
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
  });
  console.log("🚀 ~ ZoneManagement ~ add:", add);
  const { success, error: showError } = useToaster();
  const { isLoading, refetch: refetchZones } = useGetAllZonesQuery();
  const { isLoading: _countriesLoading } = useGetAllCountriesQuery();
  const [addZone, { isLoading: isAddingZone }] = useAddZoneMutation();
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
      // Format coordinates as: [[[lng, lat], [lng, lat], ...]]
      const formattedCoordinates = _coordinates.length > 0
        ? [_coordinates] // Wrap coordinates array in another array
        : [];

      // Find the selected currency to get its ID
      const selectedCurrency = Array.isArray(currencies)
        ? currencies.find((currency) => currency.name === add.zoneCurrency)
        : null;
      const currencyUnitId = selectedCurrency ? selectedCurrency.id : null;

      const zoneData = {
        name: add.zoneName,
        coordinates: formattedCoordinates,
        cityId: parseInt(add.cityId) || 1,
        zoneMinimumAmount: parseFloat(add.zoneMinimumAmount) || 0,
        serviceCharge: parseFloat(add.deliveryCharges) || 0,
        currencyUnitId: currencyUnitId,
        distanceUnitId: 3,
        zoneCommission: parseFloat(add.zoneCommission) || 0,
        paymentMethod: add.paymentMethod || "",
        expressDeliveryCharges: parseFloat(add.ExDeliveryCharges) || 0,
      };

      console.log("Zone data being sent:", zoneData);
      const result = await addZone(zoneData).unwrap();
      console.log("Zone added successfully:", result);

      // Reset coordinates state
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

  const handlePlaceChanged = () => {
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
    // Remove all polygons from the map
    if (map) {
      map.setOptions({ draggableCursor: "pointer" });
    }
    console.log("Polygon cleared");
  };

  const onMapLoad = (mapInstance) => {
    setMap(mapInstance);
  };

  return (
    <Layout
      content={
        isLoading ? (
          <Delay />
        ) : (
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
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-full px-4 max-w-[500px] mx-auto z-[100]">
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
        )
      }
    />
  );
}
