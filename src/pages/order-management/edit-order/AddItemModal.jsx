import { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
} from "@mui/material";
import ModalComponent from "../../../components/shared/Modal";
import {
  useGetServiceWitPreferencesQuery,
  useGetSubCategoriesQuery,
  useGetAllServicesQuery,
  useGetCategoriesQuery,
  useGetPreferencesQuery,
} from "../../../store/services/api";
import { Delay } from "../../../components/shared/Loaders";
import SelectField from "../../../components/ui/SelectField";
import TextareaField from "../../../components/ui/TextArea";
import ButtonBlue from "../../../components/ui/ButtonBlue";
import ButtonWhite from "../../../components/ui/ButtonWhite";
import { useSelector } from "react-redux";

export default function AddItemModal({ open, onClose, onAddItems, orderData }) {
  const [selectedServiceId, setSelectedServiceId] = useState("");
  
  const { data: serviceData, isLoading: isLoadingService } = useGetServiceWitPreferencesQuery(
    selectedServiceId,
    {
      skip: !selectedServiceId || !open,
    }
  );
  const { data: subCategoriesResponse, isLoading: isLoadingSubCategories } =
    useGetSubCategoriesQuery();
  const { data: servicesResponse } = useGetAllServicesQuery();
  const { data: categoriesResponse } = useGetCategoriesQuery();
  const { data: preferencesResponse, isLoading: isLoadingPreferences } = useGetPreferencesQuery(
    undefined,
    {
      skip: !open, // Only fetch when modal is open
    }
  );

  const allServices = servicesResponse?.data?.services || [];
  const allCategories = categoriesResponse?.data || [];
  const allSubCategories = subCategoriesResponse?.data || [];
  const serviceCategories = serviceData?.data?.serviceCategoriesData || [];
  const servicePreferences = serviceData?.data?.preferencesData || [];
  const allPreferences = preferencesResponse?.data || [];

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

  // Get available subcategories for selected category
  const availableSubCategories = allSubCategories
    .filter((sub) => sub.categoryId === parseInt(formData.categoryName))
    .map((sub) => ({
      value: sub.id,
      label: sub.name,
      price: sub.price,
    }));

  // Get preference values from API by name (case-insensitive)
  const getPreferenceValues = (preferenceName) => {
    const preference = allPreferences.find(
      (p) => p.name?.toLowerCase() === preferenceName.toLowerCase()
    );
    return preference?.preferenceValues?.filter((pv) => pv.status) || [];
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
    }));
  };

  const handleSaveRef = useRef(false);

  // Helper function to find preference type and value IDs
  const findPreferenceIds = (preferenceName, preferenceValue) => {
    const preference = allPreferences.find(
      (p) => p.name?.toLowerCase() === preferenceName.toLowerCase()
    );
    if (!preference) return { preferenceTypeId: null, preferenceValueId: null };

    const preferenceValueObj = preference.preferenceValues?.find(
      (pv) => pv.value?.toLowerCase() === preferenceValue?.toLowerCase()
    );

    return {
      preferenceTypeId: preference.id,
      preferenceValueId: preferenceValueObj?.id || null,
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
      (sub) => sub.value === parseInt(formData.subCategory)
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
      // Try both spellings (API has typo "tempreture")
      let ids = findPreferenceIds("tempreture", tempValue);
      if (!ids.preferenceTypeId || !ids.preferenceValueId) {
        ids = findPreferenceIds("temperature", tempValue);
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
      categoryName: availableCategories.find((c) => c.value === parseInt(formData.categoryName))?.label || "",
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

  // Option button component
  const OptionButton = ({ label, value, selected, onClick }) => (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      sx={{
        px: 2,
        py: 1.5,
        borderRadius: "8px",
        border: "none",
        bgcolor: selected ? "#55ACEE" : "#F3F4F6",
        color: selected ? "#FFFFFF" : "#000000",
        fontFamily: "Switzer",
        fontSize: "14px",
        fontWeight: selected ? 600 : 400,
        cursor: "pointer",
        transition: "all 0.2s",
        "&:hover": {
          bgcolor: selected ? "#3B82F6" : "#E5E7EB",
        },
      }}
    >
      {label}
    </Box>
  );

  return (
    <ModalComponent
      open={open}
      title="Add Item"
      onClose={handleClose}
      width={600}
      hideActions={true}
    >
      {isLoadingService || isLoadingSubCategories || isLoadingPreferences ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
          <Delay />
        </Box>
      ) : (
        <Box sx={{ p: 0 }}>
          {/* Service Type */}
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="body2"
              fontFamily="Switzer"
              sx={{ mb: 1, fontSize: "14px", color: "#374151", fontWeight: 500 }}
            >
              Service Type
            </Typography>
            <SelectField
              value={formData.serviceType}
              onChange={(e) => handleInputChange("serviceType", e.target.value)}
              options={serviceOptions}
              placeholder="Select Service Type"
            />
          </Box>

          {/* Category Name */}
          <Box sx={{ mb: 3, border: "1px solid #55ACEE", borderRadius: "8px", p: 2 }}>
            <Typography
              variant="body2"
              fontFamily="Switzer"
              sx={{ mb: 0.5, fontSize: "12px", color: "#55ACEE", fontWeight: 500 }}
            >
              Input Fields
            </Typography>
            <Typography
              variant="body2"
              fontFamily="Switzer"
              sx={{ mb: 1, fontSize: "14px", color: "#374151", fontWeight: 500 }}
            >
              Category Name
            </Typography>
            <SelectField
              value={formData.categoryName}
              onChange={(e) => handleInputChange("categoryName", e.target.value)}
              options={availableCategories}
              placeholder="Select Category"
            />
          </Box>

          {/* Sub-category */}
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="body2"
              fontFamily="Switzer"
              sx={{ mb: 1, fontSize: "14px", color: "#374151", fontWeight: 500 }}
            >
              Sub-category
            </Typography>
            <SelectField
              value={formData.subCategory}
              onChange={(e) => handleInputChange("subCategory", e.target.value)}
              options={availableSubCategories}
              placeholder="Select Sub-category"
              disabled={!formData.categoryName}
            />
          </Box>

          {/* Detergent */}
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="body2"
              fontFamily="Switzer"
              sx={{ mb: 1.5, fontSize: "14px", color: "#374151", fontWeight: 500 }}
            >
              Detergent:
            </Typography>
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              {getDetergentOptions().map((option) => (
                <OptionButton
                  key={option}
                  label={option}
                  value={option}
                  selected={formData.detergent === option}
                  onClick={() => handleInputChange("detergent", option)}
                />
              ))}
            </Box>
          </Box>

          {/* Fabric Softener */}
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="body2"
              fontFamily="Switzer"
              sx={{ mb: 1.5, fontSize: "14px", color: "#374151", fontWeight: 500 }}
            >
              Fabric Softener:
            </Typography>
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              {getFabricSoftenerOptions().map((option) => (
                <OptionButton
                  key={option}
                  label={option}
                  value={option}
                  selected={formData.fabricSoftener === option}
                  onClick={() => handleInputChange("fabricSoftener", option)}
                />
              ))}
            </Box>
          </Box>

          {/* Oxi Clean */}
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="body2"
              fontFamily="Switzer"
              sx={{ mb: 1.5, fontSize: "14px", color: "#374151", fontWeight: 500 }}
            >
              Oxi Clean
            </Typography>
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              {getOxiCleanOptions().map((option) => (
                <OptionButton
                  key={option}
                  label={option}
                  value={option}
                  selected={formData.oxiClean === option}
                  onClick={() => handleInputChange("oxiClean", option)}
                />
              ))}
            </Box>
          </Box>

          {/* Wash Service */}
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="body2"
              fontFamily="Switzer"
              sx={{ mb: 1.5, fontSize: "14px", color: "#374151", fontWeight: 500 }}
            >
              Wash Service:
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 2,
              }}
            >
              {getWashServiceOptions().map((option) => (
                <OptionButton
                  key={option}
                  label={option}
                  value={option}
                  selected={formData.washService === option}
                  onClick={() => handleInputChange("washService", option)}
                />
              ))}
            </Box>
          </Box>

          {/* Choose Temperature */}
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="body2"
              fontFamily="Switzer"
              sx={{ mb: 1.5, fontSize: "14px", color: "#374151", fontWeight: 500 }}
            >
              Choose Temperature:
            </Typography>
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              {getTemperatureOptions().map((option) => (
                <OptionButton
                  key={option}
                  label={option}
                  value={option}
                  selected={formData.temperature === option}
                  onClick={() => handleInputChange("temperature", option)}
                />
              ))}
            </Box>
          </Box>

          {/* Additional Service instructions */}
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="body2"
              fontFamily="Switzer"
              sx={{ mb: 1, fontSize: "14px", color: "#374151", fontWeight: 500 }}
            >
              Additional Service instructions
            </Typography>
            <TextareaField
              placeholder="Type here..."
              value={formData.additionalInstructions}
              onChange={(e) => handleInputChange("additionalInstructions", e.target.value)}
              rows={4}
            />
          </Box>

          {/* Disclaimer */}
          <Typography
            variant="caption"
            fontFamily="Switzer"
            sx={{
              fontSize: "12px",
              color: "#6B7280",
              mb: 3,
              display: "block",
              lineHeight: 1.5,
            }}
          >
            Disclaimer: Please note that the prices mentioned above are estimated and may vary
            based on the actual condition of the items and additional services requested.
          </Typography>

          {/* Action Buttons */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 2,
            }}
          >
            <ButtonWhite onClick={handleClose}>Cancel</ButtonWhite>
            <ButtonBlue onClick={handleSave} disabled={!formData.subCategory || !formData.serviceType}>
              Save
            </ButtonBlue>
          </Box>
        </Box>
      )}
    </ModalComponent>
  );
}
