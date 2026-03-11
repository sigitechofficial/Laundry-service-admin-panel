import { useEffect, useState } from "react";
import { Box, Typography, Checkbox, Divider, Alert, Button } from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import ModalComponent from "../../../components/shared/Modal";
import SelectField from "../../../components/ui/SelectField";
import useToaster from "../../../components/ui/Toaster";
import { useSelector } from "react-redux";
import {
  useAddServiceWithPreferencesMutation,
  useAddServiceWithCategoriesMutation,
  useUnAssignServiceFromCategoriesMutation,
  useGetServiceWitPreferencesQuery,
  useUnAssignServiceFromPreferencesMutation,
  useGetCategoriesQuery,
  useGetPreferencesQuery,
  useGetAllServicesQuery,
} from "../../../store/services/api";
import ButtonBlue from "../../../components/ui/ButtonBlue";

export default function ConfigureModal({ open, onClose, selectedServiceId }) {
  const { success, error } = useToaster();
  const servicesFromRedux = useSelector((state) => state.apiData.services);
  const categoriesFromRedux = useSelector((state) => state.apiData.categories);
  const preferencesFromRedux = useSelector((state) => state.apiData.preferences);
  const { data: servicesResponse } = useGetAllServicesQuery(undefined, {
    skip: !open,
  });
  const services = servicesResponse?.data?.services || servicesFromRedux || [];

  // Fetch categories and preferences when modal opens
  const { data: categoriesResponse, isLoading: isLoadingCategories } = useGetCategoriesQuery(undefined, {
    skip: !open, // Only fetch when modal is open
  });
  const { data: preferencesResponse, isLoading: isLoadingPreferences } = useGetPreferencesQuery(undefined, {
    skip: !open, // Only fetch when modal is open
  });

  // Use response data directly, fallback to Redux state
  const categories = categoriesResponse?.data || categoriesFromRedux || [];
  const preferences = preferencesResponse?.data || preferencesFromRedux || [];

  // Debug logging
  useEffect(() => {
    if (open) {
      console.log("Modal opened - Categories from Redux:", categoriesFromRedux);
      console.log("Categories Response:", categoriesResponse);
      console.log("Final Categories:", categories);
      console.log("Categories Loading:", isLoadingCategories);
    }
  }, [open, categoriesFromRedux, categoriesResponse, categories, isLoadingCategories]);

  const [addServiceWithPreferences, { isLoading: configServiceLoading }] =
    useAddServiceWithPreferencesMutation();
  const [addServiceWithCategories, { isLoading: categoriesLoading }] =
    useAddServiceWithCategoriesMutation();
  const [unAssignServiceFromCategories, { isLoading: categoriesUnassignLoading }] =
    useUnAssignServiceFromCategoriesMutation();
  const [unAssignServiceFromPreferences, { isLoading: unassignLoading }] =
    useUnAssignServiceFromPreferencesMutation();

  // Track originally linked items to detect changes
  const [originalLinkedCategories, setOriginalLinkedCategories] = useState([]);
  const [originalLinkedPreferences, setOriginalLinkedPreferences] = useState([]);

  // Step state: 1 for categories, 2 for preferences
  const [currentStep, setCurrentStep] = useState(1);

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

  const { data: existingServiceData, refetch: refetchServiceConfig } = useGetServiceWitPreferencesQuery(
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
    setOriginalLinkedCategories([]);
    setOriginalLinkedPreferences([]);
    setCurrentStep(1); // Reset to step 1
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

  const handleCategoriesSubmit = async (moveToNextStep = false) => {
    if (!watchedServiceId) {
      error("Please select a service first");
      return;
    }

    try {
      const currentCategories = watchedCategories || [];
      const removedCategoryIds = originalLinkedCategories.filter(
        (id) => !currentCategories.includes(id)
      );
      const addedCategoryIds = currentCategories.filter(
        (id) => !originalLinkedCategories.includes(id)
      );

      // Check if there are any changes
      const hasChanges =
        currentCategories.length !== originalLinkedCategories.length ||
        currentCategories.some(id => !originalLinkedCategories.includes(id)) ||
        originalLinkedCategories.some(id => !currentCategories.includes(id));

      // If moving to next step, always save (even if no changes) or at least validate
      if (!moveToNextStep && !hasChanges) {
        success("No changes to save");
        return;
      }

      // Unassign removed categories first
      if (removedCategoryIds.length > 0) {
        await unAssignServiceFromCategories({
          serviceId: watchedServiceId,
          categoryIds: removedCategoryIds,
        }).unwrap();
      }

      // Assign only newly added categories
      if (addedCategoryIds.length > 0) {
        const apiBody = {
          serviceId: watchedServiceId,
          categoryId: addedCategoryIds,
        };

        const res = await addServiceWithCategories(apiBody).unwrap();

        if (res?.status === "1") {
        } else {
          error(res?.message);
          return;
        }
      }

      // Update original linked categories after successful delta sync
      setOriginalLinkedCategories([...currentCategories]);
      refetchServiceConfig();
      if (moveToNextStep) {
        success("Categories saved! Now configure preferences.");
        setCurrentStep(2);
      } else if (removedCategoryIds.length > 0 || addedCategoryIds.length > 0) {
        success("Categories updated successfully!");
      }
    } catch (err) {
      error(err?.data?.message || err?.message || "Failed to update categories");
    }
  };

  const handlePreferencesSubmit = async () => {
    if (!watchedServiceId) {
      error("Please select a service first");
      return;
    }

    try {
      const currentPreferences = watchedPreferences || [];

      // Check if there are any changes
      const hasChanges =
        currentPreferences.length !== originalLinkedPreferences.length ||
        currentPreferences.some(id => !originalLinkedPreferences.includes(id)) ||
        originalLinkedPreferences.some(id => !currentPreferences.includes(id));

      if (!hasChanges) {
        success("No changes to save");
        return;
      }

      // If preferences were removed or changed, unassign all first, then reassign current selection
      // This ensures clean state
      const hasRemovedPreferences = originalLinkedPreferences.some(
        (id) => !currentPreferences.includes(id)
      );

      if (hasRemovedPreferences || originalLinkedPreferences.length > 0) {
        try {
          await unAssignServiceFromPreferences(watchedServiceId).unwrap();
        } catch (unassignErr) {
          console.error("Error unassigning preferences:", unassignErr);
          // Continue with adding preferences even if unassign fails
        }
      }

      // Add current preferences if any
      if (currentPreferences.length > 0) {
        const apiBody = {
          serviceId: watchedServiceId,
          preferenceTypeId: currentPreferences,
        };

        const res = await addServiceWithPreferences(apiBody).unwrap();
        if (res?.status === "1") {
          // Update original linked preferences after successful save
          setOriginalLinkedPreferences([...currentPreferences]);
          refetchServiceConfig();
          success("Preferences updated successfully!");
        } else {
          error(res?.message || "Something went wrong");
        }
      } else {
        // All preferences were removed
        setOriginalLinkedPreferences([]);
        refetchServiceConfig();
        success("Preferences unassigned successfully!");
      }
    } catch (err) {
      error(err?.data?.message || err?.message || "Failed to update preferences");
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

      // Store original linked items
      setOriginalLinkedCategories(linkedCategoryIds);
      setOriginalLinkedPreferences(linkedPreferenceIds);

      // Update form with merged selections
      setValue("selectedCategories", linkedCategoryIds);
      setValue("selectedPreferences", linkedPreferenceIds);
    } else {
      // Reset when service changes
      setOriginalLinkedCategories([]);
      setOriginalLinkedPreferences([]);
    }
  }, [watchedServiceId, existingServiceData, setValue]);

  return (
    <ModalComponent
      open={open}
      title={`Configure Service - Step ${currentStep} of 2`}
      onClose={handleClose}
    >
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

        {/* Step 1: Categories */}
        {currentStep === 1 && (
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
              Item Categories {categories?.length > 0 ? `(${categories.length} available)` : "(No categories available)"}
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
            {categories?.length > 0 ? (
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
            ) : (
              <Box
                sx={{
                  border: "1px solid #E4E7EC",
                  borderRadius: "8px",
                  p: 3,
                  textAlign: "center",
                  bgcolor: "#F9FAFB",
                }}
              >
                <Typography variant="body2" sx={{ color: "#667085" }}>
                  No categories available. Please add categories first.
                </Typography>
              </Box>
            )}

            <Box className="flex justify-end gap-3 !mt-4">
              <ButtonBlue
                size="medium"
                text="Next →"
                onClick={() => handleCategoriesSubmit(true)}
                disabled={
                  categoriesLoading ||
                  categoriesUnassignLoading ||
                  !watchedServiceId
                }
              />
            </Box>
          </Box>
        )}

        {/* Step 2: Preferences */}
        {currentStep === 2 && (
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
              Available Preferences {preferences?.length > 0 ? `(${preferences.length} total)` : "(No preferences available)"}
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
            {preferences?.length > 0 ? (
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
            ) : (
              <Box
                sx={{
                  border: "1px solid #E4E7EC",
                  borderRadius: "8px",
                  p: 3,
                  textAlign: "center",
                  bgcolor: "#F9FAFB",
                }}
              >
                <Typography variant="body2" sx={{ color: "#667085" }}>
                  No preferences available. Please add preferences first.
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Selection Summary - Show relevant info based on current step */}
        {currentStep === 1 && watchedCategories?.length > 0 && (
          <Box
            sx={{
              bgcolor: "#EFF6FF",
              border: "1px solid #BFDBFE",
              borderRadius: "8px",
              p: 2,
            }}
          >
            <Typography variant="subtitle2" sx={{ color: "#1E40AF", mb: 1 }}>
              Step 1 Summary
            </Typography>
            <Typography variant="caption" sx={{ color: "#1E40AF" }}>
              Categories: {watchedCategories.length} selected
            </Typography>
          </Box>
        )}

        {currentStep === 2 && watchedPreferences?.length > 0 && (
          <Box
            sx={{
              bgcolor: "#EFF6FF",
              border: "1px solid #BFDBFE",
              borderRadius: "8px",
              p: 2,
            }}
          >
            <Typography variant="subtitle2" sx={{ color: "#1E40AF", mb: 1 }}>
              Step 2 Summary
            </Typography>
            <Typography variant="caption" sx={{ color: "#1E40AF", display: "block" }}>
              Categories: {watchedCategories?.length || 0} selected
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: "#1E40AF", display: "block" }}
            >
              Preferences: {watchedPreferences.length} selected
            </Typography>
          </Box>
        )}

        {currentStep === 2 && (
          <Box className="flex justify-end gap-3 !mt-4">
            <Button
              variant="outlined"
              size="medium"
              onClick={() => setCurrentStep(1)}
              disabled={configServiceLoading || unassignLoading}
              sx={{
                textTransform: "none",
                px: 3,
                py: 1,
                borderColor: "#D0D5DD",
                color: "#374151",
                "&:hover": {
                  borderColor: "#98A2B3",
                  bgcolor: "#F9FAFB",
                },
              }}
            >
              ← Back
            </Button>
            <ButtonBlue
              size="medium"
              text="Save Preferences"
              onClick={() => {
                handlePreferencesSubmit();
                // Optionally close modal after saving
                setTimeout(() => {
                  handleClose();
                }, 1500);
              }}
              disabled={configServiceLoading || unassignLoading}
            />
          </Box>
        )}
      </Box>
    </ModalComponent>
  );
}
