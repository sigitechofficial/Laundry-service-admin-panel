import React, { useEffect } from "react";
import { Box, Typography, Checkbox, Divider, Alert } from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import ModalComponent from "../../../components/shared/Modal";
import SelectField from "../../../components/ui/SelectField";
import useToaster from "../../../components/ui/Toaster";
import { useSelector } from "react-redux";
import {
  useAddServiceWithPreferencesMutation,
  useAddServiceWithCategoriesMutation,
  useGetServiceWitPreferencesQuery,
} from "../../../store/services/api";
import ButtonBlue from "../../../components/ui/ButtonBlue";

export default function ConfigureModal({ open, onClose, selectedServiceId }) {
  const { success, error } = useToaster();
  const services = useSelector((state) => state.apiData.services);
  const categories = useSelector((state) => state.apiData.categories);
  const preferences = useSelector((state) => state.apiData.preferences);

  const [addServiceWithPreferences, { isLoading: configServiceLoading }] =
    useAddServiceWithPreferencesMutation();
  const [addServiceWithCategories, { isLoading: categoriesLoading }] =
    useAddServiceWithCategoriesMutation();

  const {
    control,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      serviceId: selectedServiceId || "",
      selectedCategories: [],
      selectedPreferences: [],
    },
    mode: "onChange",
  });

  const watchedServiceId = watch("serviceId");
  const watchedCategories = watch("selectedCategories");
  const watchedPreferences = watch("selectedPreferences");

  const { data: existingServiceData } = useGetServiceWitPreferencesQuery(
    watchedServiceId,
    {
      skip: !watchedServiceId,
    }
  );

  const SERVICE_OPTIONS = services?.map((service) => ({
    label: service.name,
    value: service.id,
  }));

  const selectedService = services?.find(
    (service) => service.id === watchedServiceId
  );

  const handleClose = () => {
    reset({
      serviceId: "",
      selectedCategories: [],
      selectedPreferences: [],
    });
    onClose();
  };

  const handleCategoryToggle = (categoryId) => {
    const currentCategories = watchedCategories || [];
    const updatedCategories = currentCategories.includes(categoryId)
      ? currentCategories.filter((id) => id !== categoryId)
      : [...currentCategories, categoryId];
    setValue("selectedCategories", updatedCategories);
  };

  const handlePreferenceToggle = (preferenceId) => {
    const currentPreferences = watchedPreferences || [];
    const updatedPreferences = currentPreferences.includes(preferenceId)
      ? currentPreferences.filter((id) => id !== preferenceId)
      : [...currentPreferences, preferenceId];
    setValue("selectedPreferences", updatedPreferences);
  };

  const handleCategoriesSubmit = async () => {
    if (!watchedServiceId || watchedCategories?.length === 0) {
      error(
        watchedCategories?.length === 0
          ? "Select atleast one category"
          : "Please select a service first"
      );
      return;
    }

    try {
      const apiBody = {
        serviceId: watchedServiceId,
        categoryId: watchedCategories || [],
      };

      const res = await addServiceWithCategories(apiBody).unwrap();

      if (res?.status === "1") {
        success("Categories saved successfully!");
        // serviceRefetch();
      } else {
        error(res?.message);
      }
    } catch (err) {
      error(err?.message);
    }
  };

  const handlePreferencesSubmit = async () => {
    if (!watchedServiceId || watchedPreferences?.length === 0) {
      error(
        watchedPreferences?.length === 0
          ? "Select atleast one preference"
          : "Please select a service first"
      );
      return;
    }

    try {
      const apiBody = {
        serviceId: watchedServiceId,
        preferenceTypeId: watchedPreferences || [],
      };

      const res = await addServiceWithPreferences(apiBody).unwrap();
      if (res?.status === "1") {
        success("Preferences saved successfully!");
        // preferenceRefetch();
      } else {
        error(res?.message || "Something went wrong");
      }
    } catch (err) {
      error(err?.data?.message || "Failed to save preferences");
    }
  };

  useEffect(() => {
    if (watchedServiceId && existingServiceData?.data) {
      const { serviceCategoriesData, preferencesData } =
        existingServiceData.data;

      const linkedCategoryIds =
        serviceCategoriesData?.map((cat) => cat?.categoryId) || [];
      const linkedPreferenceIds =
        preferencesData?.map((pref) => pref?.preferenceTypeId) || [];

      // Update form with merged selections
      setValue("selectedCategories", linkedCategoryIds);
      setValue("selectedPreferences", linkedPreferenceIds);
    }
  }, [watchedServiceId, existingServiceData, setValue]);

  return (
    <ModalComponent open={open} title="Configure Service" onClose={handleClose}>
      <Box className="flex flex-col gap-5">
        <Controller
          name="serviceId"
          control={control}
          rules={{ required: "Please select a service" }}
          render={({ field: { onChange, value } }) => (
            <Box>
              <SelectField
                title="Select Service*"
                value={value}
                onChange={(e) => {
                  onChange(e.target.value);
                }}
                options={SERVICE_OPTIONS}
                placeholder="Choose a service to configure"
                fullWidth
                bgcolor="grey.60"
              />
              {errors.serviceId && (
                <Typography
                  variant="caption"
                  sx={{ color: "error.main", mt: 1, display: "block" }}
                >
                  {errors.serviceId.message}
                </Typography>
              )}
            </Box>
          )}
        />

        {selectedService && (
          <Alert severity="info" sx={{ borderRadius: "8px" }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Configuring: {selectedService.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {selectedService.description}
            </Typography>
          </Alert>
        )}

        {categories?.length > 0 && (
          <Box>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 600,
                fontSize: "16px",
                color: "#101828",
                fontFamily: "Inter, sans-serif",
                mb: 2,
              }}
            >
              Item Categories ({categories.length} available)
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "#667085",
                mb: 2,
                fontSize: "14px",
              }}
            >
              Select which item categories this service applies to. Already
              linked categories are checked by default.
            </Typography>
            <Box
              sx={{
                maxHeight: "200px",
                overflowY: "auto",
                border: "1px solid #E4E7EC",
                borderRadius: "8px",
              }}
            >
              {categories.map((category) => {
                const isLinked =
                  watchedCategories?.includes(category.id) || false;
                return (
                  <Box
                    key={category.id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      py: "8px",
                      px: "4px",
                      borderRadius: "4px",
                      "&:hover": {
                        bgcolor: "#F3F4F6",
                      },
                      // Highlight linked categories
                      bgcolor: isLinked ? "#EFF6FF" : "transparent",
                      border: isLinked
                        ? "1px solid #BFDBFE"
                        : "1px solid transparent",
                    }}
                  >
                    <Controller
                      name="selectedCategories"
                      control={control}
                      render={() => (
                        <Checkbox
                          checked={isLinked}
                          onChange={() => handleCategoryToggle(category.id)}
                          size="medium"
                          sx={{
                            color: "#D1D5DB",
                            "&.Mui-checked": { color: "blue.100" },
                          }}
                        />
                      )}
                    />
                    <Box className="flex-1">
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: "14px",
                          color: isLinked ? "#1E40AF" : "#374151",
                          fontFamily: "Inter, sans-serif",
                          fontWeight: isLinked ? 600 : 500,
                        }}
                      >
                        {category.name}
                        {isLinked && (
                          <Typography
                            component="span"
                            sx={{
                              ml: 1,
                              color: "#10B981",
                              fontSize: "12px",
                              fontWeight: 600,
                            }}
                          >
                            (Linked)
                          </Typography>
                        )}
                      </Typography>
                      {category.description && (
                        <Typography
                          variant="caption"
                          sx={{
                            color: isLinked ? "#60A5FA" : "#9CA3AF",
                            fontSize: "12px",
                            display: "block",
                          }}
                        >
                          {category.description}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Box>

            <Box className="flex justify-end !mt-4">
              <ButtonBlue
                size="medium"
                text="Save"
                onClick={handleCategoriesSubmit}
                disabled={categoriesLoading}
              />
            </Box>
          </Box>
        )}

        {preferences?.length > 0 && (
          <Box>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 600,
                fontSize: "16px",
                color: "#101828",
                fontFamily: "Inter, sans-serif",
                mb: 2,
              }}
            >
              Available Preferences ({preferences.length} total)
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "#667085",
                mb: 2,
                fontSize: "14px",
              }}
            >
              Choose preferences that customers can select for this service.
              Already linked preferences are checked by default.
            </Typography>
            <Box
              sx={{
                maxHeight: "250px",
                overflowY: "auto",
                border: "1px solid #E4E7EC",
                borderRadius: "8px",
              }}
            >
              {preferences.map((preference) => {
                const isLinked =
                  watchedPreferences?.includes(preference?.id) || false;
                return (
                  <Box
                    key={preference.id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      py: "8px",
                      px: "4px",
                      borderRadius: "4px",
                      "&:hover": {
                        bgcolor: "#F3F4F6",
                      },
                      // Highlight linked preferences
                      bgcolor: isLinked ? "#EFF6FF" : "transparent",
                      border: isLinked
                        ? "1px solid #BFDBFE"
                        : "1px solid transparent",
                    }}
                  >
                    <Controller
                      name="selectedPreferences"
                      control={control}
                      render={() => (
                        <Checkbox
                          checked={isLinked}
                          onChange={() => handlePreferenceToggle(preference.id)}
                          size="medium"
                          sx={{
                            color: "#D1D5DB",
                            "&.Mui-checked": { color: "blue.100" },
                          }}
                        />
                      )}
                    />
                    <Box className="flex-1">
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: "14px",
                          color: isLinked ? "#1E40AF" : "#374151",
                          fontFamily: "Inter, sans-serif",
                          fontWeight: isLinked ? 600 : 500,
                        }}
                      >
                        {preference.name}
                        {isLinked && (
                          <Typography
                            component="span"
                            sx={{
                              ml: 1,
                              color: "#10B981",
                              fontSize: "12px",
                              fontWeight: 600,
                            }}
                          >
                            (Linked)
                          </Typography>
                        )}
                      </Typography>
                      {preference.preferenceValues?.length > 0 && (
                        <Typography
                          variant="caption"
                          sx={{
                            color: isLinked ? "#60A5FA" : "#9CA3AF",
                            fontSize: "12px",
                            display: "block",
                          }}
                        >
                          Options:{" "}
                          {preference.preferenceValues
                            .map((val) => val.value)
                            .join(", ")}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}

        {/* Selection Summary */}
        {(watchedCategories?.length > 0 || watchedPreferences?.length > 0) && (
          <Box
            sx={{
              bgcolor: "#EFF6FF",
              border: "1px solid #BFDBFE",
              borderRadius: "8px",
              p: 2,
            }}
          >
            <Typography variant="subtitle2" sx={{ color: "#1E40AF", mb: 1 }}>
              Configuration Summary
            </Typography>
            {watchedCategories?.length > 0 && (
              <Typography variant="caption" sx={{ color: "#1E40AF" }}>
                Categories: {watchedCategories.length} selected
              </Typography>
            )}
            {watchedPreferences?.length > 0 && (
              <Typography
                variant="caption"
                sx={{ color: "#1E40AF", display: "block" }}
              >
                Preferences: {watchedPreferences.length} selected
              </Typography>
            )}
          </Box>
        )}

        <Box className="flex justify-end">
          <ButtonBlue
            size="medium"
            text="Save"
            onClick={handlePreferencesSubmit}
            disabled={configServiceLoading}
          />
        </Box>
      </Box>
    </ModalComponent>
  );
}
