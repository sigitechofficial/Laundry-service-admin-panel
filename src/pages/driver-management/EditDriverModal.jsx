import React, { useEffect } from "react";
import { Box, Typography } from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import ModalComponent from "../../components/shared/Modal";
import InputFieldModal from "../../components/ui/InputFieldModal";
import SelectField from "../../components/ui/SelectField";
import PhoneNumberInput from "../../components/ui/PhoneNumberInput";
import useToaster from "../../components/ui/Toaster";
import { useGetShopsDataQuery, useUpdateDriverMutation } from "../../store/services/api";
import { useSelector } from "react-redux";

// Validation schema
const editDriverSchema = yup.object().shape({
  laundaryShopId: yup.string(),
  firstName: yup
    .string()
    .required("First name is required")
    .min(2, "First name must be at least 2 characters"),
  lastName: yup
    .string()
    .required("Last name is required")
    .min(2, "Last name must be at least 2 characters"),
  email: yup
    .string()
    .required("Email is required")
    .email("Please enter a valid email address"),
  phoneNumber: yup.string().required("Phone number is required"),
  countryCode: yup.string().required("Country code is required"),
});

const defaultValues = {
  laundaryShopId: "",
  firstName: "",
  lastName: "",
  email: "",
  countryCode: "+44",
  phoneNumber: "",
};

export default function EditDriverModal({ open, onClose, driverData, onDriverUpdated }) {
  const { success, error } = useToaster();
  
  // Debug: Log driverData prop when it changes
  React.useEffect(() => {
    console.log("=== EditDriverModal driverData prop changed ===");
    console.log("driverData:", driverData);
    console.log("driverData type:", typeof driverData);
    console.log("driverData is null?", driverData === null);
    console.log("driverData is undefined?", driverData === undefined);
    if (driverData) {
      console.log("driverData.firstName:", driverData.firstName);
      console.log("driverData.lastName:", driverData.lastName);
      console.log("driverData.email:", driverData.email);
    }
  }, [driverData]);
  
  // Fetch shops data directly from API
  const { data: shopsResponse, isLoading: shopsLoading } = useGetShopsDataQuery();
  
  // Extract shops from API response - based on actual API structure: data.AllShopsData
  const shops = shopsResponse?.data?.AllShopsData || [];

  // Transform shops to options format - use shop ID as value and shopName as label
  const shopOptions = React.useMemo(() => {
    if (!Array.isArray(shops) || shops.length === 0) {
      return [];
    }
    
    return shops.map((shop) => {
      return {
        value: String(shop.id), // Use id as value
        label: shop.shopName || "Unknown Shop", // Use shopName as label
      };
    }).filter(shop => shop.value && shop.value !== "undefined");
  }, [shops]);

  const [updateDriver, { isLoading: isUpdatingDriver }] = useUpdateDriverMutation();

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors },
    watch,
  } = useForm({
    resolver: yupResolver(editDriverSchema),
    defaultValues: defaultValues,
    mode: "onChange",
  });

  const countryCode = watch("countryCode");

  // Pre-fill form when driverData changes
  useEffect(() => {
    console.log("=== EditDriverModal useEffect triggered ===");
    console.log("open:", open);
    console.log("driverData:", driverData);
    console.log("driverData && open:", driverData && open);
    
    if (driverData && open) {
      console.log("=== Pre-filling driver data for edit ===");
      console.log("Full driverData object:", JSON.stringify(driverData, null, 2));
      console.log("driverData.firstName:", driverData.firstName);
      console.log("driverData.lastName:", driverData.lastName);
      console.log("driverData.email:", driverData.email);
      console.log("driverData.classifiedAsId:", driverData.classifiedAsId);
      console.log("driverData.id:", driverData.id);
      
      // Get phone number from driverData - try multiple possible field names
      let phone = driverData.phoneNum || driverData.phone || "";
      
      // Get country code - use from API if available, otherwise try to extract from phone
      let code = driverData.countryCode || "+44"; // default UK if not provided

      // If country code is not in API response, try to extract it from phone number
      if (!driverData.countryCode && phone) {
        const matchedCode = ["+971", "+966", "+44", "+92", "+91", "+1"].find(
          (c) => phone.startsWith(c)
        );
        if (matchedCode) {
          code = matchedCode;
          phone = phone.replace(matchedCode, "").trim();
        }
      } else if (phone && code && phone.startsWith(code)) {
        // If phone already includes the country code, remove it
        phone = phone.replace(code, "").trim();
      }

      const formData = {
        laundaryShopId: driverData.laundaryShopId || driverData.shopId || (driverData.classifiedAsId ? String(driverData.classifiedAsId) : ""),
        firstName: driverData.firstName || "",
        lastName: driverData.lastName || "",
        email: driverData.email || "",
        countryCode: code,
        phoneNumber: phone,
      };

      console.log("Form data to reset:", formData);
      
      // Use setValue for each field individually to ensure they update
      // This is more reliable than reset for controlled components
      Object.keys(formData).forEach((key) => {
        setValue(key, formData[key], { 
          shouldValidate: false, 
          shouldDirty: false,
          shouldTouch: false 
        });
      });
      
      // Also call reset to ensure form state is consistent
      reset(formData, { keepDefaultValues: false });
      
      // Verify values were set
      setTimeout(() => {
        const currentValues = getValues();
        console.log("Current form values after set:", currentValues);
      }, 100);
    } else if (!driverData && open) {
      // Reset to defaults
      reset(defaultValues);
    }
  }, [driverData, open, reset, setValue, getValues]);

  const handleClose = () => {
    reset(defaultValues);
    onClose();
  };

  const onSubmit = async (data) => {
    try {
      const body = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phoneNum: data.phoneNumber,
        countryCode: data.countryCode,
        laundaryShopId: data.laundaryShopId,
      };

      const res = await updateDriver({
        id: driverData.id,
        body,
      }).unwrap();

      if (res?.status === "1") {
        success(res?.message || "Driver updated successfully!");
        handleClose();
        // Call the callback to refetch drivers list
        if (onDriverUpdated) {
          onDriverUpdated();
        }
      } else {
        error(res?.message || "Something went wrong");
      }
    } catch (err) {
      console.error("Update driver error:", err);
      const errorMessage =
        err?.data?.message ||
        err?.data?.error ||
        err?.message ||
        "Failed to update driver";
      error(errorMessage);
    }
  };

  return (
    <ModalComponent
      open={open}
      title="UPDATE DRIVER DETAIL"
      onClose={handleClose}
      secondaryAction={{
        label: "Cancel",
        onClick: handleClose,
      }}
      primaryAction={{
        label: "Update",
        onClick: handleSubmit(onSubmit),
        isLoading: isUpdatingDriver,
      }}
    >
      <Box key={driverData?.id || "new"} className="flex flex-col gap-5">
        <Controller
          name="laundaryShopId"
          control={control}
          defaultValue={driverData?.classifiedAsId ? String(driverData.classifiedAsId) : ""}
          render={({ field: { onChange, value } }) => (
            <Box>
              <SelectField
                title="Shop Name"
                value={value || (driverData?.classifiedAsId ? String(driverData.classifiedAsId) : "")}
                onChange={(e) => onChange(e.target.value)}
                options={shopOptions}
                placeholder="Select shop"
                fullWidth
                bgcolor="#F4F7FF"
                disabled={shopsLoading}
              />
              {errors.laundaryShopId && (
                <Typography
                  variant="caption"
                  sx={{ color: "error.main", mt: 1, display: "block" }}
                >
                  {errors.laundaryShopId.message}
                </Typography>
              )}
            </Box>
          )}
        />

        <Controller
          name="firstName"
          control={control}
          defaultValue={driverData?.firstName || ""}
          render={({ field: { onChange, value } }) => (
            <Box>
              <InputFieldModal
                title="First Name"
                placeholder="Enter first name"
                name="firstName"
                value={value || driverData?.firstName || ""}
                onChange={(e) => onChange(e.target.value)}
              />
              {errors.firstName && (
                <Typography
                  variant="caption"
                  sx={{ color: "error.main", mt: 1, display: "block" }}
                >
                  {errors.firstName.message}
                </Typography>
              )}
            </Box>
          )}
        />

        <Controller
          name="lastName"
          control={control}
          defaultValue={driverData?.lastName || ""}
          render={({ field: { onChange, value } }) => (
            <Box>
              <InputFieldModal
                title="Last Name"
                placeholder="Enter last name"
                name="lastName"
                value={value || driverData?.lastName || ""}
                onChange={(e) => onChange(e.target.value)}
              />
              {errors.lastName && (
                <Typography
                  variant="caption"
                  sx={{ color: "error.main", mt: 1, display: "block" }}
                >
                  {errors.lastName.message}
                </Typography>
              )}
            </Box>
          )}
        />

        <Controller
          name="email"
          control={control}
          defaultValue={driverData?.email || ""}
          render={({ field: { onChange, value } }) => (
            <Box>
              <InputFieldModal
                title="Email"
                placeholder="Enter email address"
                name="email"
                type="email"
                value={value || driverData?.email || ""}
                onChange={(e) => onChange(e.target.value)}
              />
              {errors.email && (
                <Typography
                  variant="caption"
                  sx={{ color: "error.main", mt: 1, display: "block" }}
                >
                  {errors.email.message}
                </Typography>
              )}
            </Box>
          )}
        />

        <Box>
          <Controller
            name="countryCode"
            control={control}
            render={({ field: { onChange: onChangeCode, value: codeValue } }) => (
              <Controller
                name="phoneNumber"
                control={control}
                render={({ field: { onChange: onChangePhone, value: phoneValue } }) => (
                  <PhoneNumberInput
                    title="Phone No."
                    countryCode={codeValue}
                    phoneNumber={phoneValue}
                    onCountryCodeChange={(code) => {
                      onChangeCode(code);
                    }}
                    onPhoneNumberChange={onChangePhone}
                    errors={errors}
                  />
                )}
              />
            )}
          />
        </Box>
      </Box>
    </ModalComponent>
  );
}
