import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function CountriesAndCities() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to countries by default
    navigate("/countries-cities/countries", { replace: true });
  }, [navigate]);

  return null;
  const [countryModal, setCountryModal] = useState({ open: false, data: null, isEdit: false });
  const [cityModal, setCityModal] = useState({ open: false, data: null, isEdit: false });
  const [deleteModal, setDeleteModal] = useState({ open: false, data: null, type: null });
  const [flagPreview, setFlagPreview] = useState(null);

  // Google Places API
  const libraries = ["places"];
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: googleApiKey,
    libraries,
  });

  const countryAutocompleteRef = useRef(null);
  const countryInputRef = useRef(null);
  const cityAutocompleteRef = useRef(null);
  const cityInputRef = useRef(null);
  const [selectedCountryCode, setSelectedCountryCode] = useState(null);

  // API calls
  const { data: countriesResponse, isLoading: isLoadingCountries, refetch: refetchCountries } = useGetAllCountriesQuery();
  const { data: citiesResponse, isLoading: isLoadingCities, refetch: refetchCities } = useGetAllCitiesQuery();
  const [addCountry, { isLoading: isAddingCountry }] = useAddCountryMutation();
  const [editCountry, { isLoading: isEditingCountry }] = useEditCountryMutation();
  const [addCity, { isLoading: isAddingCity }] = useAddCityMutation();
  const [editCity, { isLoading: isEditingCity }] = useEditCityMutation();
  const [deleteCountry, { isLoading: isDeletingCountry }] = useDeleteCountryMutation();
  const [deleteCity, { isLoading: isDeletingCity }] = useDeleteCityMutation();

  const countries = countriesResponse?.data || [];
  const cities = citiesResponse?.data || [];

  const { control, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    defaultValues: {
      name: "",
      shortName: "",
      flag: "",
      countryId: "",
      lat: "",
      lng: "",
    },
  });

  // Prepare countries data for table
  const countriesData = Array.isArray(countries) ? countries.map((country, index) => ({
    id: country.id,
    sl: index + 1,
    countryId: country.id,
    countryName: country.name,
    countryFlag: country.image || "",
    status: country.status !== undefined && country.status !== null ? country.status : false,
    changeStatus: country.status !== undefined && country.status !== null ? country.status : false,
  })) : [];

  // Prepare cities data for table
  const citiesData = Array.isArray(cities) ? cities.map((city, index) => {
    return {
      id: city.id,
      sl: index + 1,
      cityId: city.id,
      cityName: city.name,
      countryName: city.country?.name || "N/A",
      countryFlag: city.country?.image || "",
      countryId: city.countryId,
      status: city.status !== undefined && city.status !== null ? city.status : false,
      changeStatus: city.status !== undefined && city.status !== null ? city.status : false,
    };
  }) : [];

  // Countries table columns
  const countryColumns = [
    {
      field: "sl",
      headerName: "Serial No",
      flex: 0.1,
      minWidth: 100,
      sortable: true,
    },
    {
      field: "countryId",
      headerName: "Id",
      flex: 0.1,
      minWidth: 80,
      sortable: true,
    },
    {
      field: "countryName",
      headerName: "Country Name",
      flex: 0.2,
      minWidth: 150,
      sortable: true,
    },
    {
      field: "countryFlag",
      headerName: "Country Flag",
      flex: 0.15,
      minWidth: 120,
      sortable: false,
      renderCell: (row) => (
        <Box sx={{ display: "flex", alignItems: "center" }}>
          {row.countryFlag ? (
            <img
              src={row.countryFlag.startsWith('http') ? row.countryFlag : `${BASE_URL}${row.countryFlag}`}
              alt={row.countryName}
              style={{ width: "40px", height: "30px", objectFit: "cover", borderRadius: "4px" }}
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          ) : (
            <Typography variant="body2" color="text.secondary">No Flag</Typography>
          )}
        </Box>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      flex: 0.1,
      minWidth: 100,
      renderCell: (row) => (
        <StatusPill status={row.status ? "active" : "block"} />
      ),
      sortable: false,
    },
    {
      field: "actions",
      headerName: "Action",
      flex: 0.15,
      minWidth: 150,
      renderCell: (row) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <ChangeStatus
            width="45px"
            checked={row.changeStatus}
            onChange={(e) => handleToggleStatus(row.id, "country", e.target.checked)}
          />
          <ActionButtons
            showView={false}
            onEdit={() => handleEditCountry(row)}
            onDelete={() => setDeleteModal({ open: true, data: row, type: "country" })}
          />
        </Box>
      ),
      sortable: false,
    },
  ];

  // Cities table columns
  const cityColumns = [
    {
      field: "sl",
      headerName: "Serial No",
      flex: 0.1,
      minWidth: 100,
      sortable: true,
    },
    {
      field: "cityId",
      headerName: "Id",
      flex: 0.1,
      minWidth: 80,
      sortable: true,
    },
    {
      field: "cityName",
      headerName: "City Name",
      flex: 0.15,
      minWidth: 120,
      sortable: true,
    },
    {
      field: "countryName",
      headerName: "Country Name",
      flex: 0.15,
      minWidth: 120,
      sortable: true,
    },
    {
      field: "countryFlag",
      headerName: "Country Flag",
      flex: 0.15,
      minWidth: 120,
      sortable: false,
      renderCell: (row) => (
        <Box sx={{ display: "flex", alignItems: "center" }}>
          {row.countryFlag ? (
            <img
              src={row.countryFlag.startsWith('http') ? row.countryFlag : `${BASE_URL}${row.countryFlag}`}
              alt={row.countryName}
              style={{ width: "40px", height: "30px", objectFit: "cover", borderRadius: "4px" }}
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          ) : (
            <Typography variant="body2" color="text.secondary">No Flag</Typography>
          )}
        </Box>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      flex: 0.1,
      minWidth: 100,
      renderCell: (row) => (
        <StatusPill status={row.status ? "active" : "block"} />
      ),
      sortable: false,
    },
    {
      field: "actions",
      headerName: "Action",
      flex: 0.15,
      minWidth: 150,
      renderCell: (row) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <ChangeStatus
            width="45px"
            checked={row.changeStatus}
            onChange={(e) => handleToggleStatus(row.id, "city", e.target.checked)}
          />
          <ActionButtons
            showView={false}
            onEdit={() => handleEditCity(row)}
            onDelete={() => setDeleteModal({ open: true, data: row, type: "city" })}
          />
        </Box>
      ),
      sortable: false,
    },
  ];

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const fetchCountryFlag = async (countryCode) => {
    try {
      // Using flagcdn.com API to get country flag
      const flagUrl = `https://flagcdn.com/w320/${countryCode.toLowerCase()}.png`;
      
      // Fetch the flag image
      const response = await fetch(flagUrl);
      if (response.ok) {
        const blob = await response.blob();
        // Convert blob to File object
        const file = new File([blob], `${countryCode.toLowerCase()}_flag.png`, { type: blob.type });
        return file;
      }
    } catch (error) {
      console.error("Error fetching country flag:", error);
    }
    return null;
  };

  const handleCountryPlaceChanged = async () => {
    if (countryAutocompleteRef.current) {
      const place = countryAutocompleteRef.current.getPlace();
      if (place) {
        // Only accept if it's a country (check place types)
        const isCountry = place.types && (
          place.types.includes("country") || 
          place.types.some(type => type === "country")
        );
        
        let countryName = "";
        let countryShortName = "";
        let countryCode = "";
        
        if (place.address_components) {
          const countryComponent = place.address_components.find(
            (component) => component.types.includes("country")
          );
          if (countryComponent) {
            countryName = countryComponent.long_name;
            countryShortName = countryComponent.short_name; // ISO 3166-1 alpha-2 code (e.g., "PK", "US")
            countryCode = countryComponent.short_name.toLowerCase();
          }
        }
        
        // If no country component found, use place name
        if (!countryName) {
          countryName = place.name;
        }
        
        // Update form values
        if (countryName) {
          setValue("name", countryName);
          if (countryInputRef.current) {
            countryInputRef.current.value = countryName;
          }
        }
        
        if (countryShortName) {
          setValue("shortName", countryShortName);
        }
        
        // Fetch and set country flag
        if (countryCode) {
          const flagFile = await fetchCountryFlag(countryCode);
          if (flagFile) {
            setValue("flag", flagFile);
            // Create preview URL for the flag image
            const previewUrl = URL.createObjectURL(flagFile);
            setFlagPreview(previewUrl);
          }
        }
      }
    }
  };

  const handleAddCountry = () => {
    reset({ name: "", shortName: "", flag: "", countryId: "" });
    setFlagPreview(null);
    setCountryModal({ open: true, data: null, isEdit: false });
  };

  const handleEditCountry = (country) => {
    reset({
      name: country.countryName,
      flag: country.countryFlag,
      countryId: country.countryId,
    });
    setCountryModal({ open: true, data: country, isEdit: true });
  };

  const handleAddCity = () => {
    reset({ name: "", flag: "", countryId: "" });
    setSelectedCountryCode(null);
    setCityModal({ open: true, data: null, isEdit: false });
  };

  const handleCityPlaceChanged = () => {
    if (cityAutocompleteRef.current) {
      const place = cityAutocompleteRef.current.getPlace();
      if (place) {
        // Extract city name from place
        let cityName = place.name || place.formatted_address;
        
        // Try to get city from address_components
        if (place.address_components) {
          const cityComponent = place.address_components.find(
            (component) => component.types.includes("locality") || component.types.includes("administrative_area_level_2")
          );
          if (cityComponent) {
            cityName = cityComponent.long_name;
          }
        }
        
        // Extract latitude and longitude from place geometry
        let lat = "";
        let lng = "";
        if (place.geometry && place.geometry.location) {
          lat = place.geometry.location.lat().toString();
          lng = place.geometry.location.lng().toString();
        }
        
        // Update form values
        if (cityName) {
          setValue("name", cityName);
          if (cityInputRef.current) {
            cityInputRef.current.value = cityName;
          }
        }
        if (lat) {
          setValue("lat", lat);
        }
        if (lng) {
          setValue("lng", lng);
        }
      }
    }
  };

  const handleEditCity = (city) => {
    reset({
      name: city.cityName,
      countryId: city.countryId || "",
      lat: city.lat || "",
      lng: city.lng || "",
    });
    // Set the country code for the selected country
    const selectedCountry = countries.find(c => c.id === city.countryId);
    setSelectedCountryCode(selectedCountry?.shortName?.toLowerCase() || null);
    setCityModal({ open: true, data: city, isEdit: true });
  };

  const handleToggleStatus = (id, type, newStatus) => {
    // TODO: Implement API call to update status
    // For now, refetch data after status change
    if (type === "country") {
      refetchCountries();
    } else {
      refetchCities();
    }
  };

  const onSubmitCountry = async (data) => {
    try {
      // Prepare FormData for API (same for add and edit)
      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("shortName", data.shortName || "");
      if (data.flag) {
        formData.append("flagImg", data.flag);
      }
      
      if (countryModal.isEdit) {
        // Edit country
        await editCountry({
          id: countryModal.data.countryId,
          body: formData,
        }).unwrap();
        
        success("Country updated successfully!");
      } else {
        // Add country
        await addCountry(formData).unwrap();
        
        success("Country added successfully!");
      }
      
      // Refetch countries list
      refetchCountries();
      setCountryModal({ open: false, data: null, isEdit: false });
      if (flagPreview) {
        URL.revokeObjectURL(flagPreview);
      }
      setFlagPreview(null);
      reset();
    } catch (error) {
      console.error("Error saving country:", error);
      showError(error?.data?.message || "Failed to add country. Please try again.");
    }
  };

  const onSubmitCity = async (data) => {
    try {
      // Prepare body for API (simple JSON, not FormData)
      const body = {
        name: data.name,
        lat: data.lat || "",
        lng: data.lng || "",
        countryId: parseInt(data.countryId),
      };
      
      if (cityModal.isEdit) {
        // Edit city
        await editCity({
          id: cityModal.data.cityId,
          body: body,
        }).unwrap();
        
        success("City updated successfully!");
      } else {
        // Add city
        await addCity(body).unwrap();
        
        success("City added successfully!");
      }
      
      // Refetch cities list
      refetchCities();
      
      setCityModal({ open: false, data: null, isEdit: false });
      setSelectedCountryCode(null);
      reset();
    } catch (error) {
      console.error("Error saving city:", error);
      showError(error?.data?.message || `Failed to ${cityModal.isEdit ? 'update' : 'add'} city. Please try again.`);
    }
  };

  const handleDelete = () => {
    // Mock delete - will be replaced with API call later
    if (deleteModal.type === "country") {
      setCountries(countries.filter(c => c.id !== deleteModal.data.countryId));
    } else {
      setCities(cities.filter(c => c.id !== deleteModal.data.cityId));
    }
    setDeleteModal({ open: false, data: null, type: null });
  };

  const totalCountries = countriesData.length;
  const totalCities = citiesData.length;

  return (
    <Box>
          {/* Header Section with Title and Buttons */}
          <Box className="flex items-center gap-x-5 justify-between" sx={{ mb: "44px" }}>
            <Box className="flex items-center gap-x-5">
              <Typography color="blue.50">
                <BsCardList size="24px" color="blue.50" />
              </Typography>
              <Typography variant="h4" fontFamily={"Switzer"} color="grey.20">
                Countries & Cities
              </Typography>
            </Box>

            <Box className="flex items-center gap-x-3">
              <ButtonBlueLight
                variant="outlined"
                bgColor="blue.200"
                color="white"
                radius="8px"
                startIcon={<TbPlus size={"24px"} />}
                onClick={handleAddCountry}
              >
                Add Country
              </ButtonBlueLight>
              <ButtonBlueLight
                variant="outlined"
                bgColor="blue.200"
                color="white"
                radius="8px"
                startIcon={<TbPlus size={"24px"} />}
                onClick={handleAddCity}
              >
                Add City
              </ButtonBlueLight>
            </Box>
          </Box>

          {/* Stat Cards */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 3,
              mb: 4,
            }}
          >
            <StatCard
              title="TOTAL COUNTRY"
              value={totalCountries}
              bgColor="bg-blue-100"
              titleColor="#3B82F6"
            />
            <StatCard
              title="TOTAL CITY"
              value={totalCities}
              bgColor="bg-pink-100"
              titleColor="#EC4899"
            />
          </Box>

          {/* Tabs and Table Container */}
          <Box sx={{ position: "relative" }}>
            <Box sx={{ position: "relative", zIndex: 1 }}>
              <Tabs
                value={activeTab}
                onChange={handleTabChange}
                sx={{
                  "& .MuiTab-root": {
                    textTransform: "none",
                    fontFamily: "Switzer",
                    fontSize: "16px",
                    fontWeight: 500,
                    color: "#6B7280",
                    borderRadius: "8px 8px 0 0",
                    "&.Mui-selected": {
                      color: "#0000A0",
                      fontWeight: 600,
                      backgroundColor: "white",
                    },
                  },
                  "& .MuiTabs-indicator": {
                    display: "none",
                  },
                }}
              >
                <Tab label="Countries" />
                <Tab label="Cities" />
              </Tabs>
            </Box>

            {/* Table */}
            <Box sx={{ mt: "-1px", position: "relative", zIndex: 0 }}>
              {activeTab === 0 ? (
                isLoadingCountries ? (
                  <Delay />
                ) : (
                  <DataTable
                    data={countriesData}
                    columns={countryColumns}
                  />
                )
              ) : (
                isLoadingCities ? (
                  <Delay />
                ) : (
                  <DataTable
                    data={citiesData}
                    columns={cityColumns}
                  />
                )
              )}
            </Box>
          </Box>

          {/* Add/Edit Country Modal */}
          <ModalComponent
            open={countryModal.open}
            title={countryModal.isEdit ? "Edit Country" : "Add Country"}
            onClose={() => {
              setCountryModal({ open: false, data: null, isEdit: false });
              if (flagPreview) {
                URL.revokeObjectURL(flagPreview);
              }
              setFlagPreview(null);
              reset();
            }}
            primaryAction={{
              label: countryModal.isEdit ? "Update" : "Add Country",
              onClick: handleSubmit(onSubmitCountry),
              isLoading: isAddingCountry || isEditingCountry,
            }}
            secondaryAction={{
              label: "Cancel",
              onClick: () => {
                setCountryModal({ open: false, data: null, isEdit: false });
                if (flagPreview) {
                  URL.revokeObjectURL(flagPreview);
                }
                setFlagPreview(null);
                reset();
              },
            }}
          >
            <Box className="flex flex-col gap-5">
              <Box className="flex flex-col gap-y-3">
                <label htmlFor="countryName" className="text-grey40">
                  Country Name*
                </label>
                {isLoaded ? (
                  <div className="relative">
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
                        countryAutocompleteRef.current = autocomplete;
                        // Restrict to countries only using types filter
                        if (autocomplete) {
                          // Set types to only show countries
                          autocomplete.setTypes(["country"]);
                        }
                      }}
                      onPlaceChanged={handleCountryPlaceChanged}
                      types={["country"]}
                    >
                      <div className="w-full relative">
                        <Controller
                          name="name"
                          control={control}
                          rules={{ required: "Country name is required" }}
                          render={({ field: { onChange, value } }) => (
                            <input
                              ref={countryInputRef}
                              id="countryName"
                              type="text"
                              placeholder="Enter country name"
                              defaultValue={value || ""}
                              onChange={(e) => {
                                onChange(e.target.value);
                                if (countryInputRef.current) {
                                  countryInputRef.current.value = e.target.value;
                                }
                              }}
                              className="w-full h-[52px] outline-none bg-[#F4F7FF] rounded-lg !px-4 font-[Switzer] !font-normal !text-base"
                              autoComplete="off"
                            />
                          )}
                        />
                      </div>
                    </Autocomplete>
                  </div>
                ) : (
                  <input
                    id="countryName"
                    type="text"
                    placeholder="Loading Google Maps..."
                    disabled
                    className="w-full h-[52px] outline-none bg-[#F4F7FF] rounded-lg !px-4 font-[Switzer] !font-normal !text-base opacity-50"
                  />
                )}
              </Box>
              {errors.name && (
                <Typography variant="caption" sx={{ color: "error.main", mt: -4 }}>
                  {errors.name.message}
                </Typography>
              )}

              <Controller
                name="shortName"
                control={control}
                rules={{ required: "Country short name is required" }}
                render={({ field: { onChange, value } }) => (
                  <InputFieldModal
                    title="Country Short Name*"
                    placeholder="Auto-filled from Google Places"
                    value={value || ""}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={true}
                  />
                )}
              />
              {errors.shortName && (
                <Typography variant="caption" sx={{ color: "error.main", mt: -4 }}>
                  {errors.shortName.message}
                </Typography>
              )}

              <Controller
                name="flag"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Box>
                    <Typography variant="body2" sx={{ mb: "8px", color: "#374151" }}>
                      Country Flag {value ? "(Auto-filled from Google Places)" : ""}
                    </Typography>
                    {flagPreview && (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <img
                          src={flagPreview}
                          alt="Country Flag"
                          style={{
                            width: "80px",
                            height: "60px",
                            objectFit: "cover",
                            borderRadius: "8px",
                            border: "1px solid #E5E7EB",
                          }}
                        />
                        <Typography variant="caption" sx={{ color: "success.main" }}>
                          Flag automatically fetched from Google Places API
                        </Typography>
                      </Box>
                    )}
                    {!flagPreview && (
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        Flag will be automatically fetched when you select a country
                      </Typography>
                    )}
                  </Box>
                )}
              />
            </Box>
          </ModalComponent>

          {/* Add/Edit City Modal */}
          <ModalComponent
            open={cityModal.open}
            title={cityModal.isEdit ? "Edit City" : "Add City"}
            onClose={() => {
              setCityModal({ open: false, data: null, isEdit: false });
              setSelectedCountryCode(null);
              reset();
            }}
            primaryAction={{
              label: cityModal.isEdit ? "Update" : "Add City",
              onClick: handleSubmit(onSubmitCity),
              isLoading: isAddingCity || isEditingCity,
            }}
            secondaryAction={{
              label: "Cancel",
              onClick: () => {
                setCityModal({ open: false, data: null, isEdit: false });
                setSelectedCountryCode(null);
                reset();
              },
            }}
          >
            <Box className="flex flex-col gap-5">
              <Controller
                name="countryId"
                control={control}
                rules={{ required: "Please select a country" }}
                render={({ field: { onChange, value } }) => {
                  // Find the selected country to get its short name (country code)
                  const selectedCountry = countries.find(c => c.id === parseInt(value));
                  const countryCode = selectedCountry?.shortName?.toLowerCase() || null;
                  
                  // Update selected country code when country changes
                  if (countryCode !== selectedCountryCode) {
                    setSelectedCountryCode(countryCode);
                  }
                  
                  // Disable country field when editing
                  const isEditMode = cityModal.isEdit;
                  
                  return (
                    <SelectField
                      title="Country*"
                      value={value}
                      onChange={(e) => {
                        if (!isEditMode) {
                          onChange(e.target.value);
                          // Reset city name, lat, and lng when country changes
                          setValue("name", "");
                          setValue("lat", "");
                          setValue("lng", "");
                          if (cityInputRef.current) {
                            cityInputRef.current.value = "";
                          }
                        }
                      }}
                      options={countries.map((country) => ({
                        value: country.id,
                        label: country.name,
                      }))}
                      placeholder="Select Country"
                      fullWidth
                      disabled={isEditMode}
                    />
                  );
                }}
              />
              {errors.countryId && (
                <Typography variant="caption" sx={{ color: "error.main", mt: -4 }}>
                  {errors.countryId.message}
                </Typography>
              )}

              <Controller
                name="name"
                control={control}
                rules={{ required: "City name is required" }}
                render={({ field: { onChange, value } }) => (
                  <Box className="flex flex-col gap-y-3">
                    <label htmlFor="cityName" className="text-grey40">
                      City Name*
                    </label>
                    {isLoaded && selectedCountryCode ? (
                      <div className="relative">
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
                            cityAutocompleteRef.current = autocomplete;
                            // Restrict to cities in the selected country
                            if (autocomplete && selectedCountryCode) {
                              autocomplete.setComponentRestrictions({ country: selectedCountryCode });
                              autocomplete.setTypes(["(cities)"]);
                            }
                          }}
                          onPlaceChanged={handleCityPlaceChanged}
                          key={selectedCountryCode} // Re-initialize when country changes
                        >
                          <div className="w-full relative">
                            <input
                              ref={cityInputRef}
                              id="cityName"
                              type="text"
                              placeholder="Enter city name"
                              defaultValue={value || ""}
                              onChange={(e) => {
                                onChange(e.target.value);
                                if (cityInputRef.current) {
                                  cityInputRef.current.value = e.target.value;
                                }
                              }}
                              className="w-full h-[52px] outline-none bg-[#F4F7FF] rounded-lg !px-4 font-[Switzer] !font-normal !text-base"
                              autoComplete="off"
                            />
                          </div>
                        </Autocomplete>
                      </div>
                    ) : (
                      <input
                        id="cityName"
                        type="text"
                        placeholder={selectedCountryCode ? "Loading Google Maps..." : "Please select a country first"}
                        disabled
                        className="w-full h-[52px] outline-none bg-[#F4F7FF] rounded-lg !px-4 font-[Switzer] !font-normal !text-base opacity-50"
                      />
                    )}
                  </Box>
                )}
              />
              {errors.name && (
                <Typography variant="caption" sx={{ color: "error.main", mt: -4 }}>
                  {errors.name.message}
                </Typography>
              )}
            </Box>
          </ModalComponent>

          {/* Delete Confirmation Modal */}
          <ModalComponent
            open={deleteModal.open}
            title={`Delete ${deleteModal.type === "country" ? "Country" : "City"}`}
            onClose={() => setDeleteModal({ open: false, data: null, type: null })}
            primaryAction={{
              label: "Delete",
              onClick: handleDelete,
              isLoading: false,
              sx: { bgcolor: "error.main", "&:hover": { bgcolor: "error.dark" } },
            }}
            secondaryAction={{
              label: "Cancel",
              onClick: () => setDeleteModal({ open: false, data: null, type: null }),
            }}
          >
            <Typography>
              Are you sure you want to delete this {deleteModal.type}? This action cannot be undone.
            </Typography>
          </ModalComponent>
        </Box>
  );
}

