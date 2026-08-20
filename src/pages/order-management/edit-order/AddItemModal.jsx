import { useState, useEffect, useRef, useMemo } from "react";
import { Button, Field, Modal, Select, Textarea } from "../../../design-system";
import {
  useGetServiceWitPreferencesQuery,
  useGetSubCategoriesQuery,
  useGetAllServicesQuery,
  useGetPreferencesQuery,
} from "../../../store/services/api";
import { Delay } from "../../../components/shared/Loaders";

export default function AddItemModal({ open, onClose, onAddItems, orderData: _orderData }) {
  const [selectedServiceId, setSelectedServiceId] = useState("");
  
  const { data: serviceData, isFetching: isFetchingService } =
    useGetServiceWitPreferencesQuery(selectedServiceId, {
      skip: !selectedServiceId || !open,
    });
  const { data: subCategoriesResponse, isLoading: isLoadingSubCategories } =
    useGetSubCategoriesQuery();
  const { data: servicesResponse } = useGetAllServicesQuery();
  const { data: preferencesResponse, isLoading: isLoadingPreferences } = useGetPreferencesQuery(
    undefined,
    {
      skip: !open, // Only fetch when modal is open
    }
  );

  const allServices = useMemo(
    () => servicesResponse?.data?.services || [],
    [servicesResponse?.data?.services]
  );
  const allSubCategories = useMemo(
    () => subCategoriesResponse?.data || [],
    [subCategoriesResponse?.data]
  );
  const serviceCategories = useMemo(
    () => serviceData?.data?.serviceCategoriesData || [],
    [serviceData?.data?.serviceCategoriesData]
  );
  const servicePreferences = useMemo(
    () => serviceData?.data?.preferencesData || [],
    [serviceData?.data?.preferencesData]
  );
  const allPreferences = useMemo(
    () => preferencesResponse?.data || [],
    [preferencesResponse?.data]
  );

  /** Service config API returns `id`; older payloads used `preferenceTypeId`. */
  const preferenceTypeIdFromServicePref = (sp) =>
    sp?.preferenceTypeId ?? sp?.id;

  const isActivePreferenceValue = (pv) => {
    if (pv == null) return false;
    if (pv.status === false || pv.status === 0 || pv.status === "0")
      return false;
    return true;
  };
  
  const [formData, setFormData] = useState({
    serviceType: "",
    categoryName: "",
    subCategory: "",
    detergent: "",
    fabricSoftener: "",
    oxiClean: "",
    washService: "",
    temperature: "",
    additionalInstructions: "",
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setFormData({
        serviceType: "",
        categoryName: "",
        subCategory: "",
        detergent: "",
        fabricSoftener: "",
        oxiClean: "",
        washService: "",
        temperature: "",
        additionalInstructions: "",
      });
      setSelectedServiceId("");
    }
  }, [open]);

  // Update selectedServiceId when serviceType changes
  useEffect(() => {
    if (formData.serviceType) {
      setSelectedServiceId(formData.serviceType);
    }
  }, [formData.serviceType]);

  // Get available categories for selected service
  const availableCategories = serviceCategories.map((sc) => ({
    value: sc.categoryId,
    label: sc.category?.name || "Unknown",
  }));

  // Prefer subcategories embedded on service config; merge id from global list when missing.
  const availableSubCategories = useMemo(() => {
    const catKey = formData.categoryName;
    if (catKey === "" || catKey == null) return [];

    const serviceCat = serviceCategories.find(
      (sc) => String(sc.categoryId) === String(catKey)
    );
    const embedded = serviceCat?.category?.subCategories;

    if (Array.isArray(embedded) && embedded.length > 0) {
      return embedded.map((sub) => {
        const globalMatch = allSubCategories.find(
          (s) =>
            String(s.categoryId) === String(catKey) && s.name === sub.name
        );
        return {
          value: sub.id ?? globalMatch?.id ?? sub.name,
          label: sub.name,
          price: sub.price,
        };
      });
    }

    return allSubCategories
      .filter((sub) => String(sub.categoryId) === String(catKey))
      .map((sub) => ({
        value: sub.id,
        label: sub.name,
        price: sub.price,
      }));
  }, [serviceCategories, formData.categoryName, allSubCategories]);

  // Get preference values from API by name (case-insensitive)
  // IMPORTANT: Only return preferences that are configured for the selected service
  const getPreferenceValues = (preferenceName) => {
    const key = preferenceName.toLowerCase();

    // New API: each entry in preferencesData has `id`, `name`, `preferenceValues`
    const direct = servicePreferences.find(
      (p) => p?.name?.toLowerCase?.() === key
    );
    if (direct?.preferenceValues?.length) {
      return direct.preferenceValues.filter(isActivePreferenceValue);
    }

    // Legacy: match via global catalog using preferenceTypeId on service row
    const servicePreferenceType = servicePreferences.find((sp) => {
      const typeId = preferenceTypeIdFromServicePref(sp);
      const pref = allPreferences.find((p) => p.id === typeId);
      return pref?.name?.toLowerCase() === key;
    });

    if (!servicePreferenceType) {
      console.warn(
        `⚠️ AddItemModal: Preference "${preferenceName}" is NOT configured for service ${selectedServiceId}`
      );
      return [];
    }

    const typeId = preferenceTypeIdFromServicePref(servicePreferenceType);
    const preference = allPreferences.find((p) => p.id === typeId);

    if (!preference) {
      console.warn(
        `⚠️ AddItemModal: Preference type ${typeId} not found in allPreferences`
      );
      return [];
    }

    return (preference.preferenceValues || []).filter(isActivePreferenceValue);
  };

  // Get options for each preference type
  const getDetergentOptions = () => {
    const values = getPreferenceValues("detergent");
    return values.map((pv) => pv.value);
  };

  const getFabricSoftenerOptions = () => {
    // Check if there's a "Fabric Softener" preference, otherwise use Yes/No
    const values = getPreferenceValues("Fabric Softener");
    if (values.length > 0) {
      return values.map((pv) => pv.value);
    }
    return ["Yes", "No"]; // Default fallback
  };

  const getOxiCleanOptions = () => {
    // Check if there's an "Oxi Clean" preference, otherwise use Yes/No
    const values = getPreferenceValues("Oxi Clean");
    if (values.length > 0) {
      return values.map((pv) => pv.value);
    }
    return ["Yes", "No"]; // Default fallback
  };

  const getWashServiceOptions = () => {
    // Check for "Sorting" preference which might be the wash service
    const sortingValues = getPreferenceValues("Sorting");
    if (sortingValues.length > 0) {
      return sortingValues.map((pv) => pv.value);
    }
    // Fallback to default options
    return ["Mixed", "White Separate", "Dark Separate", "White + light mixed"];
  };

  const getTemperatureOptions = () => {
    // Note: API has "tempreture" (typo) but we'll check both
    const tempValues = getPreferenceValues("tempreture") || getPreferenceValues("temperature");
    if (tempValues.length > 0) {
      // Format temperature values - add °C if not already present
      return tempValues.map((pv) => {
        const value = pv.value;
        return value.includes('°') ? value : `${value}°C`;
      });
    }
    // Fallback to default options
    return ["30°C", "40°C", "60°C", "90°C"];
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
      // Reset subcategory when category changes
      ...(field === "categoryName" && { subCategory: "" }),
      // Reset category chain when service changes (avoid stale picks + full-modal loader on refetch)
      ...(field === "serviceType" && { categoryName: "", subCategory: "" }),
    }));
  };

  const handleSaveRef = useRef(false);

  // Resolve preference type/value IDs for the selected service (supports new + legacy API shapes).
  const findPreferenceIds = (preferenceName, preferenceValue) => {
    if (preferenceValue === "" || preferenceValue == null) {
      return { preferenceTypeId: null, preferenceValueId: null };
    }

    const key = preferenceName.toLowerCase();
    const searchValue = String(preferenceValue).toLowerCase().trim();

    const direct = servicePreferences.find(
      (p) => p?.name?.toLowerCase?.() === key
    );
    if (direct?.preferenceValues?.length) {
      const preferenceValueObj = direct.preferenceValues.find((pv) => {
        const pvValue = pv.value?.toLowerCase?.().trim();
        return pvValue === searchValue;
      });
      return {
        preferenceTypeId: preferenceTypeIdFromServicePref(direct),
        preferenceValueId: preferenceValueObj?.id ?? null,
      };
    }

    if (!servicePreferences?.length || !allPreferences?.length) {
      return { preferenceTypeId: null, preferenceValueId: null };
    }

    const servicePreferenceType = servicePreferences.find((sp) => {
      const typeId = preferenceTypeIdFromServicePref(sp);
      const pref = allPreferences.find((p) => p.id === typeId);
      return pref?.name?.toLowerCase() === key;
    });

    if (!servicePreferenceType) {
      return { preferenceTypeId: null, preferenceValueId: null };
    }

    const typeId = preferenceTypeIdFromServicePref(servicePreferenceType);
    const preference = allPreferences.find((p) => p.id === typeId);

    if (!preference?.preferenceValues?.length) {
      return { preferenceTypeId: typeId, preferenceValueId: null };
    }

    const preferenceValueObj = preference.preferenceValues.find((pv) => {
      const pvValue = pv.value?.toLowerCase?.().trim();
      return pvValue === searchValue;
    });

    return {
      preferenceTypeId: preference.id,
      preferenceValueId: preferenceValueObj?.id ?? null,
    };
  };

  const handleSave = (e) => {
    // Prevent double submission
    if (handleSaveRef.current) {
      e?.preventDefault();
      e?.stopPropagation();
      return;
    }

    const selectedSubCategory = availableSubCategories.find(
      (sub) => String(sub.value) === String(formData.subCategory)
    );

    if (!selectedSubCategory || !formData.serviceType) {
      return;
    }

    handleSaveRef.current = true;

    // Build preferences with IDs
    const preferences = {
      detergent: formData.detergent,
      fabricSoftener: formData.fabricSoftener,
      oxiClean: formData.oxiClean,
      washService: formData.washService,
      temperature: formData.temperature,
      additionalInstructions: formData.additionalInstructions,
      // Store IDs for API
      preferenceIds: [],
    };
    // Find and store preference IDs for all preferences
    if (formData.detergent) {
      const ids = findPreferenceIds("detergent", formData.detergent);
      if (ids.preferenceTypeId && ids.preferenceValueId) {
        preferences.preferenceIds.push({
          preferenceTypeId: ids.preferenceTypeId,
          preferenceValueId: ids.preferenceValueId,
        });
      }
    }

    if (formData.temperature) {
      // Remove °C for matching - API stores just the number
      const tempValue = formData.temperature.replace("°C", "").replace("°", "").trim();
      // Try multiple approaches to find temperature preference
      let ids = findPreferenceIds("tempreture", tempValue);
      if (!ids.preferenceTypeId || !ids.preferenceValueId) {
        ids = findPreferenceIds("temperature", tempValue);
      }
      
      // If not found, try with original value (with °C)
      if (!ids.preferenceTypeId || !ids.preferenceValueId) {
        ids = findPreferenceIds("tempreture", formData.temperature);
        if (!ids.preferenceTypeId || !ids.preferenceValueId) {
          ids = findPreferenceIds("temperature", formData.temperature);
        }
      }
      
      // If still not found, try with just the number as string
      if (!ids.preferenceTypeId || !ids.preferenceValueId && !isNaN(tempValue)) {
        ids = findPreferenceIds("tempreture", String(parseInt(tempValue)));
        if (!ids.preferenceTypeId || !ids.preferenceValueId) {
          ids = findPreferenceIds("temperature", String(parseInt(tempValue)));
        }
      }
      
      if (ids.preferenceTypeId && ids.preferenceValueId) {
        preferences.preferenceIds.push({
          preferenceTypeId: ids.preferenceTypeId,
          preferenceValueId: ids.preferenceValueId,
        });
      }
    }

    if (formData.washService) {
      // Try "Sorting" preference for wash service
      const ids = findPreferenceIds("Sorting", formData.washService);
      if (ids.preferenceTypeId && ids.preferenceValueId) {
        preferences.preferenceIds.push({
          preferenceTypeId: ids.preferenceTypeId,
          preferenceValueId: ids.preferenceValueId,
        });
      }
    }

    // Add other preferences if they exist in the API
    if (formData.fabricSoftener) {
      const ids = findPreferenceIds("Fabric Softener", formData.fabricSoftener);
      if (ids.preferenceTypeId && ids.preferenceValueId) {
        preferences.preferenceIds.push({
          preferenceTypeId: ids.preferenceTypeId,
          preferenceValueId: ids.preferenceValueId,
        });
      }
    }

    if (formData.oxiClean) {
      const ids = findPreferenceIds("Oxi Clean", formData.oxiClean);
      if (ids.preferenceTypeId && ids.preferenceValueId) {
        preferences.preferenceIds.push({
          preferenceTypeId: ids.preferenceTypeId,
          preferenceValueId: ids.preferenceValueId,
        });
      }
    }

    const item = {
      serviceId: parseInt(formData.serviceType),
      name: selectedSubCategory.label,
      price: selectedSubCategory.price,
      categoryId: parseInt(formData.categoryName),
      categoryName:
        availableCategories.find(
          (c) => String(c.value) === String(formData.categoryName)
        )?.label || "",
      subCategoryId: selectedSubCategory.value,
      preferences: preferences,
    };

    onAddItems(item);
    
    // Reset flag after a delay to allow state update
    setTimeout(() => {
      handleSaveRef.current = false;
      handleClose();
    }, 200);
  };

  const handleClose = () => {
    setFormData({
      serviceType: "",
      categoryName: "",
      subCategory: "",
      detergent: "",
      fabricSoftener: "",
      oxiClean: "",
      washService: "",
      temperature: "",
      additionalInstructions: "",
    });
    setSelectedServiceId("");
    handleSaveRef.current = false;
    onClose();
  };

  // Service options
  const serviceOptions = allServices.map((service) => ({
    value: service.id,
    label: service.name,
  }));

  const OptionButton = ({ label, selected, onClick }) => (
    <Button
      type="button"
      size="sm"
      variant={selected ? "primary" : "secondary"}
      onClick={onClick}
    >
      {label}
    </Button>
  );

  return (
    <Modal
      open={open}
      title="Add Item"
      onClose={handleClose}
      size="md"
      secondaryLabel="Cancel"
      primaryLabel="Save"
      onPrimary={handleSave}
      primaryDisabled={!formData.subCategory || !formData.serviceType}
    >
      {/* Do not gate on service-with-preferences fetch: selecting service type refetches and would hide the whole modal behind Delay. */}
      {isLoadingSubCategories || isLoadingPreferences ? (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 300 }}>
          <Delay />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Field label="Service Type">
            <Select
              value={formData.serviceType}
              onChange={(value) => handleInputChange("serviceType", value)}
              options={serviceOptions}
              placeholder="Select Service Type"
            />
          </Field>

          <Field label="Category Name">
            <Select
              value={formData.categoryName}
              onChange={(value) => handleInputChange("categoryName", value)}
              options={availableCategories}
              placeholder={
                formData.serviceType && isFetchingService
                  ? "Loading categories…"
                  : "Select Category"
              }
              disabled={!formData.serviceType || isFetchingService}
            />
          </Field>

          <Field label="Sub-category">
            <Select
              value={formData.subCategory}
              onChange={(value) => handleInputChange("subCategory", value)}
              options={availableSubCategories}
              placeholder="Select Sub-category"
              disabled={!formData.categoryName}
            />
          </Field>

          <Field label="Detergent">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {getDetergentOptions().map((option) => (
                <OptionButton
                  key={option}
                  label={option}
                  selected={formData.detergent === option}
                  onClick={() => handleInputChange("detergent", option)}
                />
              ))}
            </div>
          </Field>

          <Field label="Fabric Softener">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {getFabricSoftenerOptions().map((option) => (
                <OptionButton
                  key={option}
                  label={option}
                  selected={formData.fabricSoftener === option}
                  onClick={() => handleInputChange("fabricSoftener", option)}
                />
              ))}
            </div>
          </Field>

          <Field label="Oxi Clean">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {getOxiCleanOptions().map((option) => (
                <OptionButton
                  key={option}
                  label={option}
                  selected={formData.oxiClean === option}
                  onClick={() => handleInputChange("oxiClean", option)}
                />
              ))}
            </div>
          </Field>

          <Field label="Wash Service">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
              {getWashServiceOptions().map((option) => (
                <OptionButton
                  key={option}
                  label={option}
                  selected={formData.washService === option}
                  onClick={() => handleInputChange("washService", option)}
                />
              ))}
            </div>
          </Field>

          <Field label="Choose Temperature">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {getTemperatureOptions().map((option) => (
                <OptionButton
                  key={option}
                  label={option}
                  selected={formData.temperature === option}
                  onClick={() => handleInputChange("temperature", option)}
                />
              ))}
            </div>
          </Field>

          <Field label="Additional Service instructions">
            <Textarea
              placeholder="Type here..."
              value={formData.additionalInstructions}
              onChange={(e) => handleInputChange("additionalInstructions", e.target.value)}
              rows={4}
            />
          </Field>

          <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
            Disclaimer: Please note that the prices mentioned above are estimated and may vary
            based on the actual condition of the items and additional services requested.
          </p>
        </div>
      )}
    </Modal>
  );
}
