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
import InputFieldModal from "../../components/ui/InputFieldModal";
import { useForm, Controller } from "react-hook-form";
import { BASE_URL, googleApiKey } from "../../utilities/URL";
import {
  useGetAllCountriesQuery,
  useAddCountryMutation,
  useEditCountryMutation,
  useDeleteCountryMutation,
} from "../../store/services/api";
import { Delay } from "../../components/shared/Loaders";
import { useLoadScript, Autocomplete } from "@react-google-maps/api";
import useToaster from "../../components/ui/Toaster";

export default function CountriesPage() {
  const { success, error: showError } = useToaster();
  const [countryModal, setCountryModal] = useState({ open: false, data: null, isEdit: false });
  const [deleteModal, setDeleteModal] = useState({ open: false, data: null });
  const [flagPreview, setFlagPreview] = useState(null);

  // Google Places API
  const libraries = ["places"];
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: googleApiKey,
    libraries,
  });

  const countryAutocompleteRef = useRef(null);
  const countryInputRef = useRef(null);

  // API calls
  const { data: countriesResponse, isLoading: isLoadingCountries, refetch: refetchCountries } = useGetAllCountriesQuery();
  const [addCountry, { isLoading: isAddingCountry }] = useAddCountryMutation();
  const [editCountry, { isLoading: isEditingCountry }] = useEditCountryMutation();
  const [deleteCountry, { isLoading: isDeletingCountry }] = useDeleteCountryMutation();

  const countries = countriesResponse?.data || [];

  const { control, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    defaultValues: {
      name: "",
      shortName: "",
      flag: "",
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
            onChange={(e) => handleToggleStatus(row.id, e.target.checked)}
          />
          <ActionButtons
            showView={false}
            onEdit={() => handleEditCountry(row)}
            onDelete={() => setDeleteModal({ open: true, data: row })}
          />
        </Box>
      ),
      sortable: false,
    },
  ];

  const fetchCountryFlag = async (countryCode) => {
    try {
      const flagUrl = `https://flagcdn.com/w320/${countryCode.toLowerCase()}.png`;
      const response = await fetch(flagUrl);
      if (response.ok) {
        const blob = await response.blob();
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
        let countryName = "";
        let countryShortName = "";
        let countryCode = "";
        
        if (place.address_components) {
          const countryComponent = place.address_components.find(
            (component) => component.types.includes("country")
          );
          if (countryComponent) {
            countryName = countryComponent.long_name;
            countryShortName = countryComponent.short_name;
            countryCode = countryComponent.short_name.toLowerCase();
          }
        }
        
        if (!countryName) {
          countryName = place.name;
        }
        
        if (countryName) {
          setValue("name", countryName);
          if (countryInputRef.current) {
            countryInputRef.current.value = countryName;
          }
        }
        
        if (countryShortName) {
          setValue("shortName", countryShortName);
        }
        
        if (countryCode) {
          const flagFile = await fetchCountryFlag(countryCode);
          if (flagFile) {
            setValue("flag", flagFile);
            const previewUrl = URL.createObjectURL(flagFile);
            setFlagPreview(previewUrl);
          }
        }
      }
    }
  };

  const handleAddCountry = () => {
    reset({ name: "", shortName: "", flag: "" });
    setFlagPreview(null);
    setCountryModal({ open: true, data: null, isEdit: false });
  };

  const handleEditCountry = (country) => {
    reset({
      name: country.countryName,
      flag: country.countryFlag,
    });
    if (country.countryFlag) {
      setFlagPreview(country.countryFlag.startsWith('http') ? country.countryFlag : `${BASE_URL}${country.countryFlag}`);
    }
    setCountryModal({ open: true, data: country, isEdit: true });
  };

  const handleToggleStatus = (id, newStatus) => {
    refetchCountries();
  };

  const onSubmitCountry = async (data) => {
    try {
      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("shortName", data.shortName || "");
      if (data.flag) {
        formData.append("flagImg", data.flag);
      }
      
      if (countryModal.isEdit) {
        await editCountry({
          id: countryModal.data.countryId,
          body: formData,
        }).unwrap();
        success("Country updated successfully!");
      } else {
        await addCountry(formData).unwrap();
        success("Country added successfully!");
      }
      
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

  const handleDelete = async () => {
    try {
      await deleteCountry(deleteModal.data.countryId).unwrap();
      success("Country deleted successfully!");
      refetchCountries();
      setDeleteModal({ open: false, data: null });
    } catch (error) {
      showError(error?.data?.message || "Failed to delete country. Please try again.");
    }
  };

  const totalCountries = countriesData.length;

  return (
    <Box>
          {/* Header Section with Title and Button */}
          <Box className="flex items-center gap-x-5 justify-between" sx={{ mb: "44px" }}>
            <Box className="flex items-center gap-x-5">
              <Typography color="blue.50">
                <BsCardList size="24px" color="blue.50" />
              </Typography>
              <Typography variant="h4" fontFamily={"Switzer"} color="grey.20">
                Countries
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
            </Box>
          </Box>

          {/* Stat Card */}
          <Box sx={{ mb: 4 }}>
            <StatCard
              title="TOTAL COUNTRY"
              value={totalCountries}
              bgColor="bg-blue-100"
              titleColor="#3B82F6"
            />
          </Box>

          {/* Table */}
          <Box>
            {isLoadingCountries ? (
              <Delay />
            ) : (
              <DataTable
                data={countriesData}
                columns={countryColumns}
              />
            )}
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
                        if (autocomplete) {
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

          {/* Delete Confirmation Modal */}
          <ModalComponent
            open={deleteModal.open}
            title="Delete Country"
            onClose={() => setDeleteModal({ open: false, data: null })}
            primaryAction={{
              label: "Delete",
              onClick: handleDelete,
              isLoading: isDeletingCountry,
              sx: { bgcolor: "error.main", "&:hover": { bgcolor: "error.dark" } },
            }}
            secondaryAction={{
              label: "Cancel",
              onClick: () => setDeleteModal({ open: false, data: null }),
            }}
          >
            <Typography>
              Are you sure you want to delete this country? This action cannot be undone.
            </Typography>
          </ModalComponent>
        </Box>
  );
}

