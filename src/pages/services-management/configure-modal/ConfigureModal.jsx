import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useSelector } from "react-redux";
import { Badge, Button, Field, Select, Modal } from "../../../design-system";
import useToaster from "../../../components/ui/Toaster";
import { getApiErrorMessage } from "../../../store/services/apiErrors";
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

export default function ConfigureModal({ open, onClose, selectedServiceId }) {
  const { success, error } = useToaster();
  const servicesFromRedux = useSelector((state) => state.apiData.services);
  const categoriesFromRedux = useSelector((state) => state.apiData.categories);
  const preferencesFromRedux = useSelector((state) => state.apiData.preferences);
  const { data: servicesResponse } = useGetAllServicesQuery(undefined, {
    skip: !open,
  });
  const services = servicesResponse?.data?.services || servicesFromRedux || [];

  const { data: preferencesResponse } = useGetPreferencesQuery(undefined, {
    skip: !open,
  });

  const preferences = preferencesResponse?.data || preferencesFromRedux || [];

  const [addServiceWithPreferences, { isLoading: configServiceLoading }] =
    useAddServiceWithPreferencesMutation();
  const [addServiceWithCategories, { isLoading: categoriesLoading }] =
    useAddServiceWithCategoriesMutation();
  const [unAssignServiceFromCategories, { isLoading: categoriesUnassignLoading }] =
    useUnAssignServiceFromCategoriesMutation();
  const [unAssignServiceFromPreferences, { isLoading: unassignLoading }] =
    useUnAssignServiceFromPreferencesMutation();

  const [originalLinkedCategories, setOriginalLinkedCategories] = useState([]);
  const [originalLinkedPreferences, setOriginalLinkedPreferences] = useState([]);
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

  const serviceIdNum = useMemo(() => {
    if (watchedServiceId === "" || watchedServiceId == null) return undefined;
    const numericId = Number(watchedServiceId);
    return Number.isNaN(numericId) ? undefined : numericId;
  }, [watchedServiceId]);

  const { data: categoriesResponse } = useGetCategoriesQuery(serviceIdNum, {
    skip: !open || !serviceIdNum,
  });

  const allCategories = useMemo(
    () => categoriesResponse?.data || categoriesFromRedux || [],
    [categoriesFromRedux, categoriesResponse?.data]
  );

  const { data: existingServiceData } = useGetServiceWitPreferencesQuery(
    serviceIdNum,
    {
      skip: !open || !serviceIdNum,
    }
  );

  const SERVICE_OPTIONS = services?.map((service) => ({
    label: service.name,
    value: service.id,
  }));

  const selectedService = services?.find(
    (service) => Number(service.id) === serviceIdNum
  );

  const categoriesForSelectedService = useMemo(() => {
    if (!serviceIdNum) return [];
    return allCategories.filter(
      (cat) => Number(cat.serviceId) === serviceIdNum
    );
  }, [allCategories, serviceIdNum]);

  useEffect(() => {
    if (open && selectedServiceId) {
      setValue("serviceId", Number(selectedServiceId));
    }
  }, [open, selectedServiceId, setValue]);

  const handleClose = () => {
    reset({
      serviceId: "",
      selectedCategories: [],
      selectedPreferences: [],
    });
    setOriginalLinkedCategories([]);
    setOriginalLinkedPreferences([]);
    setCurrentStep(1);
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
    if (!serviceIdNum) {
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

      const hasChanges =
        currentCategories.length !== originalLinkedCategories.length ||
        currentCategories.some((id) => !originalLinkedCategories.includes(id)) ||
        originalLinkedCategories.some((id) => !currentCategories.includes(id));

      if (!moveToNextStep && !hasChanges) {
        success("No changes to save");
        return;
      }

      if (removedCategoryIds.length > 0) {
        await unAssignServiceFromCategories({
          serviceId: serviceIdNum,
          categoryIds: removedCategoryIds,
        }).unwrap();
      }

      if (addedCategoryIds.length > 0) {
        const apiBody = {
          serviceId: serviceIdNum,
          categoryId: addedCategoryIds,
        };

        const res = await addServiceWithCategories(apiBody).unwrap();

        if (res?.status !== "1") {
          error(res?.message);
          return;
        }
      }

      setOriginalLinkedCategories([...currentCategories]);
      if (moveToNextStep) {
        success("Categories saved! Now configure preferences.");
        setCurrentStep(2);
      } else if (removedCategoryIds.length > 0 || addedCategoryIds.length > 0) {
        success("Categories updated successfully!");
      }
    } catch (err) {
      error(getApiErrorMessage(err, "Failed to update categories"));
    }
  };

  const handlePreferencesSubmit = async () => {
    if (!serviceIdNum) {
      error("Please select a service first");
      return;
    }

    try {
      const currentPreferences = watchedPreferences || [];

      const hasChanges =
        currentPreferences.length !== originalLinkedPreferences.length ||
        currentPreferences.some((id) => !originalLinkedPreferences.includes(id)) ||
        originalLinkedPreferences.some((id) => !currentPreferences.includes(id));

      if (!hasChanges) {
        success("No changes to save");
        return;
      }

      const hasRemovedPreferences = originalLinkedPreferences.some(
        (id) => !currentPreferences.includes(id)
      );

      if (hasRemovedPreferences || originalLinkedPreferences.length > 0) {
        try {
          await unAssignServiceFromPreferences(serviceIdNum).unwrap();
        } catch (unassignErr) {
          error(
            getApiErrorMessage(
              unassignErr,
              "Failed to clear existing preferences. Retry save if the list looks wrong."
            )
          );
        }
      }

      if (currentPreferences.length > 0) {
        const apiBody = {
          serviceId: serviceIdNum,
          preferenceTypeId: currentPreferences,
        };

        const res = await addServiceWithPreferences(apiBody).unwrap();
        if (res?.status === "1") {
          setOriginalLinkedPreferences([...currentPreferences]);
          success("Preferences updated successfully!");
          handleClose();
        } else {
          error(res?.message || "Something went wrong");
        }
      } else {
        setOriginalLinkedPreferences([]);
        success("Preferences unassigned successfully!");
        handleClose();
      }
    } catch (err) {
      error(getApiErrorMessage(err, "Failed to update preferences"));
    }
  };

  useEffect(() => {
    if (serviceIdNum && existingServiceData?.data) {
      const { serviceCategoriesData, preferencesData } =
        existingServiceData.data;

      const linkedFromJunction =
        serviceCategoriesData?.map((cat) => cat?.categoryId) || [];
      const linkedFromServiceId = allCategories
        .filter((cat) => Number(cat.serviceId) === serviceIdNum)
        .map((cat) => cat.id);
      const linkedCategoryIds = [
        ...new Set([...linkedFromJunction, ...linkedFromServiceId]),
      ];

      const linkedPreferenceIds =
        preferencesData?.map((pref) => pref?.preferenceTypeId ?? pref?.id) || [];

      setOriginalLinkedCategories(linkedCategoryIds);
      setOriginalLinkedPreferences(linkedPreferenceIds);
      setValue("selectedCategories", linkedCategoryIds);
      setValue("selectedPreferences", linkedPreferenceIds);
    } else {
      setOriginalLinkedCategories([]);
      setOriginalLinkedPreferences([]);
    }
  }, [serviceIdNum, existingServiceData, allCategories, setValue]);

  const stepBusy =
    currentStep === 1
      ? categoriesLoading || categoriesUnassignLoading
      : configServiceLoading || unassignLoading;

  const handlePrimary = () => {
    if (stepBusy) return;
    if (currentStep === 1) {
      handleCategoriesSubmit(true);
      return;
    }
    handlePreferencesSubmit();
  };

  return (
    <Modal
      open={open}
      title={`Configure Service - Step ${currentStep} of 2`}
      onClose={handleClose}
      secondaryLabel="Cancel"
      primaryLabel={
        stepBusy
          ? "Saving…"
          : currentStep === 1
            ? "Next"
            : "Save Preferences"
      }
      onPrimary={handlePrimary}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          maxHeight: "60vh",
          overflowY: "auto",
        }}
      >
        <Controller
          name="serviceId"
          control={control}
          rules={{ required: "Please select a service" }}
          render={({ field: { onChange, value } }) => (
            <Field label="Select Service*" error={errors.serviceId?.message}>
              <Select
                value={value}
                onChange={(next) => onChange(next === "" ? "" : Number(next))}
                options={SERVICE_OPTIONS}
                placeholder="Choose a service to configure"
                error={!!errors.serviceId}
              />
            </Field>
          )}
        />

        {selectedService ? (
          <div
            style={{
              padding: 12,
              background: "var(--accent-tint)",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-md)",
            }}
          >
            <div style={{ fontWeight: 600 }}>Configuring: {selectedService.name}</div>
            {selectedService.description ? (
              <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
                {selectedService.description}
              </div>
            ) : null}
          </div>
        ) : null}

        {currentStep === 1 ? (
          <div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>
              Item Categories{" "}
              {categoriesForSelectedService?.length > 0
                ? `(${categoriesForSelectedService.length} for this service)`
                : "(No categories for this service)"}
            </div>
            <p style={{ margin: "0 0 12px", color: "var(--muted)", fontSize: 14 }}>
              Categories linked to this service. Add new categories from the
              Categories page and select this service when creating them.
            </p>
            {categoriesForSelectedService?.length > 0 ? (
              <div
                style={{
                  maxHeight: 200,
                  overflowY: "auto",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-md)",
                }}
              >
                {categoriesForSelectedService.map((category) => {
                  const isLinked = watchedCategories?.includes(category.id) || false;
                  return (
                    <label
                      key={category.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "8px 12px",
                        background: isLinked ? "var(--accent-tint)" : "transparent",
                        borderBottom: "1px solid var(--line)",
                      }}
                    >
                      <Controller
                        name="selectedCategories"
                        control={control}
                        render={() => (
                          <input
                            type="checkbox"
                            checked={isLinked}
                            onChange={() => handleCategoryToggle(category.id)}
                          />
                        )}
                      />
                      <span>
                        {category.name}
                        {isLinked ? (
                          <Badge tone="success" style={{ marginLeft: 8 }}>
                            Linked
                          </Badge>
                        ) : null}
                        {category.description ? (
                          <span
                            style={{
                              display: "block",
                              fontSize: 12,
                              color: "var(--muted)",
                            }}
                          >
                            {category.description}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: "var(--muted)", margin: 0 }}>
                No categories for this service. Add a category and assign it
                to this service from the Categories page.
              </p>
            )}
          </div>
        ) : (
          <div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>
              Available Preferences{" "}
              {preferences?.length > 0
                ? `(${preferences.length} total)`
                : "(No preferences available)"}
            </div>
            <p style={{ margin: "0 0 12px", color: "var(--muted)", fontSize: 14 }}>
              Choose preferences that customers can select for this service.
              Already linked preferences are checked by default.
            </p>
            {preferences?.length > 0 ? (
              <div
                style={{
                  maxHeight: 250,
                  overflowY: "auto",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-md)",
                }}
              >
                {preferences.map((preference) => {
                  const isLinked =
                    watchedPreferences?.includes(preference?.id) || false;
                  return (
                    <label
                      key={preference.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "8px 12px",
                        background: isLinked ? "var(--accent-tint)" : "transparent",
                        borderBottom: "1px solid var(--line)",
                      }}
                    >
                      <Controller
                        name="selectedPreferences"
                        control={control}
                        render={() => (
                          <input
                            type="checkbox"
                            checked={isLinked}
                            onChange={() => handlePreferenceToggle(preference.id)}
                          />
                        )}
                      />
                      <span>
                        {preference.name}
                        {isLinked ? (
                          <Badge tone="success" style={{ marginLeft: 8 }}>
                            Linked
                          </Badge>
                        ) : null}
                        {preference.preferenceValues?.length > 0 ? (
                          <span
                            style={{
                              display: "block",
                              fontSize: 12,
                              color: "var(--muted)",
                            }}
                          >
                            Options:{" "}
                            {preference.preferenceValues
                              .map((val) => val.value)
                              .join(", ")}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: "var(--muted)", margin: 0 }}>
                No preferences available. Please add preferences first.
              </p>
            )}
          </div>
        )}

        {currentStep === 1 && watchedCategories?.length > 0 ? (
          <div style={{ color: "var(--accent-ink)", fontSize: 13 }}>
            Step 1 Summary — Categories: {watchedCategories.length} selected
          </div>
        ) : null}

        {currentStep === 2 && watchedPreferences?.length > 0 ? (
          <div style={{ color: "var(--accent-ink)", fontSize: 13 }}>
            Step 2 Summary — Categories: {watchedCategories?.length || 0} selected,
            Preferences: {watchedPreferences.length} selected
          </div>
        ) : null}

        {currentStep === 2 ? (
          <div>
            <Button
              variant="secondary"
              onClick={() => setCurrentStep(1)}
              disabled={configServiceLoading || unassignLoading}
            >
              ← Back
            </Button>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
