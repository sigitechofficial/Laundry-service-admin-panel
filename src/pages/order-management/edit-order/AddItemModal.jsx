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
  
  // Log API responses for debugging
  useEffect(() => {
    console.log('📡 AddItemModal: API Data loaded:');
    console.log('📡 AddItemModal: allServices:', allServices);
    console.log('📡 AddItemModal: allCategories:', allCategories);
    console.log('📡 AddItemModal: allSubCategories:', allSubCategories);
    console.log('📡 AddItemModal: serviceCategories:', serviceCategories);
    console.log('📡 AddItemModal: servicePreferences:', servicePreferences);
    console.log('📡 AddItemModal: allPreferences:', allPreferences);
    console.log('📡 AddItemModal: allPreferences count:', allPreferences.length);
  }, [allServices, allCategories, allSubCategories, serviceCategories, servicePreferences, allPreferences]);

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
  // IMPORTANT: Only return preferences that are configured for the selected service
  const getPreferenceValues = (preferenceName) => {
    console.log(`🔍 AddItemModal: getPreferenceValues called for:`, preferenceName);
    console.log(`🔍 AddItemModal: servicePreferences (configured for service):`, servicePreferences);
    console.log(`🔍 AddItemModal: allPreferences:`, allPreferences);
    
    // First, check if this preference type is configured for the selected service
    const servicePreferenceType = servicePreferences.find(
      (sp) => {
        // Find the preference type in allPreferences to match by name
        const pref = allPreferences.find(p => p.id === sp.preferenceTypeId);
        return pref?.name?.toLowerCase() === preferenceName.toLowerCase();
      }
    );
    
    if (!servicePreferenceType) {
      console.warn(`⚠️ AddItemModal: Preference "${preferenceName}" is NOT configured for service ${selectedServiceId}`);
      return [];
    }
    
    // Now get the preference from allPreferences using the preferenceTypeId
    const preference = allPreferences.find(
      (p) => p.id === servicePreferenceType.preferenceTypeId
    );
    
    if (!preference) {
      console.warn(`⚠️ AddItemModal: Preference type ${servicePreferenceType.preferenceTypeId} not found in allPreferences`);
      return [];
    }
    
    const values = preference?.preferenceValues?.filter((pv) => pv.status) || [];
    console.log(`✅ AddItemModal: Found ${values.length} active values for "${preferenceName}" (configured for service):`, values);
    return values;
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
  // IMPORTANT: Only find preferences that are configured for the selected service
  const findPreferenceIds = (preferenceName, preferenceValue) => {
    console.log(`🔎 AddItemModal: findPreferenceIds called with:`, { preferenceName, preferenceValue });
    console.log(`🔎 AddItemModal: servicePreferences (configured for service):`, servicePreferences);
    console.log(`🔎 AddItemModal: Available preferences count:`, allPreferences.length);
    
    if (!allPreferences || allPreferences.length === 0) {
      console.error(`❌ AddItemModal: allPreferences is empty! Check API response.`);
      return { preferenceTypeId: null, preferenceValueId: null };
    }
    
    if (!servicePreferences || servicePreferences.length === 0) {
      console.warn(`⚠️ AddItemModal: No preferences configured for service ${selectedServiceId}`);
      console.warn(`⚠️ AddItemModal: Service must have preferences configured in Configure Service modal`);
      return { preferenceTypeId: null, preferenceValueId: null };
    }
    
    // First, check if this preference type is configured for the selected service
    const servicePreferenceType = servicePreferences.find(
      (sp) => {
        // Find the preference type in allPreferences to match by name
        const pref = allPreferences.find(p => p.id === sp.preferenceTypeId);
        return pref?.name?.toLowerCase() === preferenceName.toLowerCase();
      }
    );
    
    if (!servicePreferenceType) {
      console.warn(`⚠️ AddItemModal: Preference type "${preferenceName}" is NOT configured for service ${selectedServiceId}`);
      console.warn(`⚠️ AddItemModal: Configured preference types for this service:`, 
        servicePreferences.map(sp => {
          const pref = allPreferences.find(p => p.id === sp.preferenceTypeId);
          return pref?.name || `ID: ${sp.preferenceTypeId}`;
        })
      );
      return { preferenceTypeId: null, preferenceValueId: null };
    }
    
    // Now get the preference from allPreferences using the preferenceTypeId
    const preference = allPreferences.find(
      (p) => p.id === servicePreferenceType.preferenceTypeId
    );
    
    if (!preference) {
      console.warn(`⚠️ AddItemModal: Preference type ${servicePreferenceType.preferenceTypeId} not found in allPreferences`);
      return { preferenceTypeId: null, preferenceValueId: null };
    }
    
    console.log(`✅ AddItemModal: Found preference type (configured for service):`, preference);
    console.log(`🔎 AddItemModal: Looking for value "${preferenceValue}" in preference values:`, preference.preferenceValues);

    if (!preference.preferenceValues || preference.preferenceValues.length === 0) {
      console.warn(`⚠️ AddItemModal: Preference "${preferenceName}" has no preferenceValues`);
      return { preferenceTypeId: preference.id, preferenceValueId: null };
    }

    const preferenceValueObj = preference.preferenceValues.find(
      (pv) => {
        const pvValue = pv.value?.toLowerCase().trim();
        const searchValue = preferenceValue?.toLowerCase().trim();
        const match = pvValue === searchValue;
        if (!match) {
          console.log(`🔍 AddItemModal: Comparing "${pvValue}" with "${searchValue}" - no match`);
        }
        return match;
      }
    );

    if (!preferenceValueObj) {
      console.warn(`⚠️ AddItemModal: Preference value "${preferenceValue}" not found in preference "${preferenceName}"`);
      console.warn(`⚠️ AddItemModal: Available values:`, preference.preferenceValues.map(pv => pv.value));
    } else {
      console.log(`✅ AddItemModal: Found preference value:`, preferenceValueObj);
    }

    const result = {
      preferenceTypeId: preference.id,
      preferenceValueId: preferenceValueObj?.id || null,
    };
    
    console.log(`📋 AddItemModal: Returning preference IDs:`, result);
    return result;
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
      console.log('❌ AddItemModal: Cannot save - missing subCategory or serviceType', {
        selectedSubCategory,
        serviceType: formData.serviceType
      });
      return;
    }

    handleSaveRef.current = true;

    console.log('📝 AddItemModal: Starting to build preferences from formData:', formData);

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
    
    console.log('📝 AddItemModal: Initial preferences object:', preferences);

    // Find and store preference IDs for all preferences
    if (formData.detergent) {
      console.log('🔍 AddItemModal: Looking for detergent preference:', formData.detergent);
      const ids = findPreferenceIds("detergent", formData.detergent);
      console.log('🔍 AddItemModal: Detergent preference IDs found:', ids);
      if (ids.preferenceTypeId && ids.preferenceValueId) {
        preferences.preferenceIds.push({
          preferenceTypeId: ids.preferenceTypeId,
          preferenceValueId: ids.preferenceValueId,
        });
        console.log('✅ AddItemModal: Added detergent preference ID');
      } else {
        console.warn('⚠️ AddItemModal: Detergent preference IDs not found');
      }
    }

    if (formData.temperature) {
      // Remove °C for matching - API stores just the number
      const tempValue = formData.temperature.replace("°C", "").replace("°", "").trim();
      console.log('🔍 AddItemModal: Looking for temperature preference:', tempValue);
      console.log('🔍 AddItemModal: Original temperature value:', formData.temperature);
      
      // Try multiple approaches to find temperature preference
      let ids = null;
      
      // First try with cleaned value (just number)
      ids = findPreferenceIds("tempreture", tempValue);
      if (!ids.preferenceTypeId || !ids.preferenceValueId) {
        ids = findPreferenceIds("temperature", tempValue);
      }
      
      // If not found, try with original value (with °C)
      if (!ids.preferenceTypeId || !ids.preferenceValueId) {
        console.log('🔍 AddItemModal: Trying with original temperature value:', formData.temperature);
        ids = findPreferenceIds("tempreture", formData.temperature);
        if (!ids.preferenceTypeId || !ids.preferenceValueId) {
          ids = findPreferenceIds("temperature", formData.temperature);
        }
      }
      
      // If still not found, try with just the number as string
      if (!ids.preferenceTypeId || !ids.preferenceValueId && !isNaN(tempValue)) {
        console.log('🔍 AddItemModal: Trying with numeric value:', tempValue);
        ids = findPreferenceIds("tempreture", String(parseInt(tempValue)));
        if (!ids.preferenceTypeId || !ids.preferenceValueId) {
          ids = findPreferenceIds("temperature", String(parseInt(tempValue)));
        }
      }
      
      console.log('🔍 AddItemModal: Temperature preference IDs found:', ids);
      if (ids.preferenceTypeId && ids.preferenceValueId) {
        preferences.preferenceIds.push({
          preferenceTypeId: ids.preferenceTypeId,
          preferenceValueId: ids.preferenceValueId,
        });
        console.log('✅ AddItemModal: Added temperature preference ID');
      } else {
        console.warn('⚠️ AddItemModal: Temperature preference IDs not found after all attempts');
        console.warn('⚠️ AddItemModal: Tried values:', [tempValue, formData.temperature, String(parseInt(tempValue))]);
      }
    }

    if (formData.washService) {
      console.log('🔍 AddItemModal: Looking for washService preference:', formData.washService);
      // Try "Sorting" preference for wash service
      const ids = findPreferenceIds("Sorting", formData.washService);
      console.log('🔍 AddItemModal: WashService preference IDs found:', ids);
      if (ids.preferenceTypeId && ids.preferenceValueId) {
        preferences.preferenceIds.push({
          preferenceTypeId: ids.preferenceTypeId,
          preferenceValueId: ids.preferenceValueId,
        });
        console.log('✅ AddItemModal: Added washService preference ID');
      } else {
        console.warn('⚠️ AddItemModal: WashService preference IDs not found');
      }
    }

    // Add other preferences if they exist in the API
    if (formData.fabricSoftener) {
      console.log('🔍 AddItemModal: Looking for fabricSoftener preference:', formData.fabricSoftener);
      const ids = findPreferenceIds("Fabric Softener", formData.fabricSoftener);
      console.log('🔍 AddItemModal: FabricSoftener preference IDs found:', ids);
      if (ids.preferenceTypeId && ids.preferenceValueId) {
        preferences.preferenceIds.push({
          preferenceTypeId: ids.preferenceTypeId,
          preferenceValueId: ids.preferenceValueId,
        });
        console.log('✅ AddItemModal: Added fabricSoftener preference ID');
      } else {
        console.warn('⚠️ AddItemModal: FabricSoftener preference IDs not found');
      }
    }

    if (formData.oxiClean) {
      console.log('🔍 AddItemModal: Looking for oxiClean preference:', formData.oxiClean);
      const ids = findPreferenceIds("Oxi Clean", formData.oxiClean);
      console.log('🔍 AddItemModal: OxiClean preference IDs found:', ids);
      if (ids.preferenceTypeId && ids.preferenceValueId) {
        preferences.preferenceIds.push({
          preferenceTypeId: ids.preferenceTypeId,
          preferenceValueId: ids.preferenceValueId,
        });
        console.log('✅ AddItemModal: Added oxiClean preference ID');
      } else {
        console.warn('⚠️ AddItemModal: OxiClean preference IDs not found');
      }
    }
    
    console.log('📦 AddItemModal: Final preferences object with preferenceIds:', preferences);
    console.log('📦 AddItemModal: Number of preferenceIds:', preferences.preferenceIds.length);
    
    // CRITICAL: Validate that we have at least some preferenceIds before sending
    if (preferences.preferenceIds.length === 0) {
      console.error('❌ AddItemModal: WARNING - No preferenceIds found! Preferences will be empty!');
      console.error('❌ AddItemModal: FormData preferences:', {
        detergent: formData.detergent,
        fabricSoftener: formData.fabricSoftener,
        oxiClean: formData.oxiClean,
        washService: formData.washService,
        temperature: formData.temperature,
      });
      console.error('❌ AddItemModal: allPreferences available:', allPreferences.map(p => ({ name: p.name, id: p.id })));
    } else {
      console.log('✅ AddItemModal: Successfully found', preferences.preferenceIds.length, 'preference IDs');
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

    console.log('📤 AddItemModal: Sending item to parent component:', item);
    console.log('📤 AddItemModal: Item preferences structure:', item.preferences);
    console.log('📤 AddItemModal: Item preferenceIds count:', item.preferences.preferenceIds.length);
    console.log('📤 AddItemModal: Item preferenceIds details:', item.preferences.preferenceIds);

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
          <Box sx={{ mb: 3 }}>
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
