import { useState, useRef } from "react";
import { Box, Typography } from "@mui/material";
import { TbPlus, BsCardList } from "../../shared/icons/index";
import DataTable from "../../components/ui/DataTable";
import StatusPill from "../../components/ui/StatusPill";
import ChangeStatus from "../../components/ui/Switch";
import ActionButtons from "../../components/ui/ActionButtons";
import StatCard from "../../components/ui/StatCard";
import ButtonBlueLight from "../../components/ui/ButtonBlueLight";
import ModalComponent from "../../components/shared/Modal";
import { useForm, Controller } from "react-hook-form";
import { BASE_URL, googleApiKey } from "../../utilities/URL";
import SelectField from "../../components/ui/SelectField";
import {
  useGetAllCountriesQuery,
  useGetAllCitiesQuery,
  useAddCityMutation,
  useEditCityMutation,
  useDeleteCityMutation,
} from "../../store/services/api";
import { Delay } from "../../components/shared/Loaders";
import { useLoadScript, Autocomplete } from "@react-google-maps/api";
import useToaster from "../../components/ui/Toaster";

export default function CitiesPage() {
  const { success, error: showError } = useToaster();
  const [cityModal, setCityModal] = useState({ open: false, data: null, isEdit: false });
  const [deleteModal, setDeleteModal] = useState({ open: false, data: null });
  const [selectedCountryCode, setSelectedCountryCode] = useState(null);

  // Google Places API
  const libraries = ["places"];
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: googleApiKey,
    libraries,
  });

  const cityAutocompleteRef = useRef(null);
  const cityInputRef = useRef(null);

  // API calls
  const { data: countriesResponse } = useGetAllCountriesQuery();
  const { data: citiesResponse, isLoading: isLoadingCities, refetch: refetchCities } = useGetAllCitiesQuery();
  const [addCity, { isLoading: isAddingCity }] = useAddCityMutation();
  const [editCity, { isLoading: isEditingCity }] = useEditCityMutation();
  const [deleteCity, { isLoading: isDeletingCity }] = useDeleteCityMutation();

  const countries = countriesResponse?.data || [];
  const cities = citiesResponse?.data || [];

  const { control, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    defaultValues: {
      name: "",
      countryId: "",
      lat: "",
      lng: "",
    },
  });

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
            onChange={(e) => handleToggleStatus(row.id, e.target.checked)}
          />
          <ActionButtons
            showView={false}
            onEdit={() => handleEditCity(row)}
            onDelete={() => setDeleteModal({ open: true, data: row })}
          />
        </Box>
      ),
      sortable: false,
    },
  ];

  const handleCityPlaceChanged = () => {
    if (cityAutocompleteRef.current) {
      const place = cityAutocompleteRef.current.getPlace();
      if (place) {
        let cityName = place.name || place.formatted_address;
        
        if (place.address_components) {
          const cityComponent = place.address_components.find(
            (component) => component.types.includes("locality") || component.types.includes("administrative_area_level_2")
          );
          if (cityComponent) {
            cityName = cityComponent.long_name;
          }
        }
        
        let lat = "";
        let lng = "";
        if (place.geometry && place.geometry.location) {
          lat = place.geometry.location.lat().toString();
          lng = place.geometry.location.lng().toString();
        }
        
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

  const handleAddCity = () => {
    reset({ name: "", countryId: "", lat: "", lng: "" });
    setSelectedCountryCode(null);
    setCityModal({ open: true, data: null, isEdit: false });
  };

  const handleEditCity = (city) => {
    reset({
      name: city.cityName,
      countryId: city.countryId || "",
      lat: city.lat || "",
      lng: city.lng || "",
    });
    const selectedCountry = countries.find(c => c.id === city.countryId);
    setSelectedCountryCode(selectedCountry?.shortName?.toLowerCase() || null);
    setCityModal({ open: true, data: city, isEdit: true });
  };

  const handleToggleStatus = (id, newStatus) => {
    refetchCities();
  };

  const onSubmitCity = async (data) => {
    try {
      const body = {
        name: data.name,
        lat: data.lat || "",
        lng: data.lng || "",
        countryId: parseInt(data.countryId),
      };
      
      if (cityModal.isEdit) {
        await editCity({
          id: cityModal.data.cityId,
          body: body,
        }).unwrap();
        success("City updated successfully!");
      } else {
        await addCity(body).unwrap();
        success("City added successfully!");
      }
      
      refetchCities();
      setCityModal({ open: false, data: null, isEdit: false });
      setSelectedCountryCode(null);
      reset();
    } catch (error) {
      console.error("Error saving city:", error);
      showError(error?.data?.message || `Failed to ${cityModal.isEdit ? 'update' : 'add'} city. Please try again.`);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCity(deleteModal.data.cityId).unwrap();
      success("City deleted successfully!");
      refetchCities();
      setDeleteModal({ open: false, data: null });
    } catch (error) {
      showError(error?.data?.message || "Failed to delete city. Please try again.");
    }
  };

  const totalCities = citiesData.length;

  return (
    <Box>
          {/* Header Section with Title and Button */}
          <Box className="flex items-center gap-x-5 justify-between" sx={{ mb: "44px" }}>
            <Box className="flex items-center gap-x-5">
              <Typography color="blue.50">
                <BsCardList size="24px" color="blue.50" />
              </Typography>
              <Typography variant="h4" fontFamily={"Switzer"} color="grey.20">
                Cities
              </Typography>
            </Box>

            <Box className="flex items-center gap-x-3">
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

          {/* Stat Card */}
          <Box sx={{ mb: 4 }}>
            <StatCard
              title="TOTAL CITY"
              value={totalCities}
              bgColor="bg-pink-100"
              titleColor="#EC4899"
            />
          </Box>

          {/* Table */}
          <Box>
            {isLoadingCities ? (
              <Delay />
            ) : (
              <DataTable
                data={citiesData}
                columns={cityColumns}
              />
            )}
          </Box>

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
                  const selectedCountry = countries.find(c => c.id === parseInt(value));
                  const countryCode = selectedCountry?.shortName?.toLowerCase() || null;
                  
                  if (countryCode !== selectedCountryCode) {
                    setSelectedCountryCode(countryCode);
                  }
                  
                  const isEditMode = cityModal.isEdit;
                  
                  return (
                    <SelectField
                      title="Country*"
                      value={value}
                      onChange={(e) => {
                        if (!isEditMode) {
                          onChange(e.target.value);
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
                            if (autocomplete && selectedCountryCode) {
                              autocomplete.setComponentRestrictions({ country: selectedCountryCode });
                              autocomplete.setTypes(["(cities)"]);
                            }
                          }}
                          onPlaceChanged={handleCityPlaceChanged}
                          key={selectedCountryCode}
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
            title="Delete City"
            onClose={() => setDeleteModal({ open: false, data: null })}
            primaryAction={{
              label: "Delete",
              onClick: handleDelete,
              isLoading: isDeletingCity,
              sx: { bgcolor: "error.main", "&:hover": { bgcolor: "error.dark" } },
            }}
            secondaryAction={{
              label: "Cancel",
              onClick: () => setDeleteModal({ open: false, data: null }),
            }}
          >
            <Typography>
              Are you sure you want to delete this city? This action cannot be undone.
            </Typography>
          </ModalComponent>
        </Box>
  );
}

