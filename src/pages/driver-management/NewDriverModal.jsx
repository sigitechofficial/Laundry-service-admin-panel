import React from "react";
import { Box, Typography } from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import ModalComponent from "../../components/shared/Modal";
import InputFieldModal from "../../components/ui/InputFieldModal";
import SelectField from "../../components/ui/SelectField";
import PhoneNumberInput from "../../components/ui/PhoneNumberInput";
import useToaster from "../../components/ui/Toaster";
import { useGetShopsDataQuery, useAddDriverByLaundryShopMutation, useUpdateDriverMutation } from "../../store/services/api";
import { useSelector } from "react-redux";

// Validation schema - password is optional in edit mode
const createDriverSchema = (isEditMode = false) => yup.object().shape({
  laundaryShopId: isEditMode ? yup.string() : yup.string().required("Shop is required"),
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
  password: isEditMode 
    ? yup.string().min(6, "Password must be at least 6 characters")
    : yup.string().required("Password is required").min(6, "Password must be at least 6 characters"),
  confirmPassword: isEditMode
    ? yup.string().when("password", {
        is: (val) => val && val.length > 0,
        then: (schema) => schema.required("Confirm password is required").oneOf([yup.ref("password"), null], "Passwords must match"),
        otherwise: (schema) => schema,
      })
    : yup.string().required("Confirm password is required").oneOf([yup.ref("password"), null], "Passwords must match"),
  phoneNumber: yup.string().required("Phone number is required"),
  countryCode: yup.string().required("Country code is required"),
});

const defaultValues = {
  laundaryShopId: "",
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
  countryCode: "+92",
  phoneNumber: "",
};

export default function NewDriverModal({ open, onClose, onDriverAdded, driverData = null }) {
  const { success, error } = useToaster();
  const isEditMode = !!driverData;
  
  // Fetch shops data directly from API
  const { data: shopsResponse, isLoading: shopsLoading, error: shopsError } = useGetShopsDataQuery();
  
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

  const [addDriver, { isLoading: isAddingDriver }] = useAddDriverByLaundryShopMutation();
  const [updateDriver, { isLoading: isUpdatingDriver }] = useUpdateDriverMutation();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
    watch,
  } = useForm({
    resolver: yupResolver(createDriverSchema(isEditMode)),
    defaultValues: defaultValues,
    mode: "onChange",
  });

  const countryCode = watch("countryCode");

  // Pre-fill form when in edit mode
  React.useEffect(() => {
    if (driverData && open && isEditMode) {
      console.log("Pre-filling driver data:", driverData);
      
      // Parse phone number if it includes country code
      // Note: phoneNum might not be in mini details, so we'll leave it empty if not available
      let phone = driverData.phone || driverData.phoneNum || "";
      let code = "+92"; // default

      // Try to extract country code from phone number
      if (phone) {
        const matchedCode = ["+971", "+966", "+92", "+1", "+44", "+91"].find(
          (c) => phone.startsWith(c)
        );
        if (matchedCode) {
          code = matchedCode;
          phone = phone.replace(matchedCode, "").trim();
        }
      }

      const formData = {
        laundaryShopId: driverData.laundaryShopId || driverData.shopId || (driverData.classifiedAsId ? String(driverData.classifiedAsId) : ""),
        firstName: driverData.firstName || "",
        lastName: driverData.lastName || "",
        email: driverData.email || "",
        password: "",
        confirmPassword: "",
        countryCode: code,
        phoneNumber: phone,
      };

      console.log("Form data to reset:", formData);
      reset(formData);
    } else if (!driverData && open) {
      // Reset to defaults for add mode
      reset(defaultValues);
    }
  }, [driverData, open, isEditMode, reset]);

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

      // Only include password if provided (for edit mode, password is optional)
      if (data.password && data.password.trim() !== "") {
        body.password = data.password;
      }

      let res;
      if (isEditMode) {
        // Update driver
        res = await updateDriver({
          id: driverData.id,
          body,
        }).unwrap();
      } else {
        // Add driver - password is required
        if (!data.password || data.password.trim() === "") {
          error("Password is required");
          return;
        }
        body.password = data.password;
        res = await addDriver(body).unwrap();
      }
      
      if (res?.status === "1") {
        success(res?.message || (isEditMode ? "Driver updated successfully!" : "Driver added successfully!"));
        handleClose();
        // Call the callback to refetch drivers list
        if (onDriverAdded) {
          onDriverAdded();
        }
      } else {
        error(res?.message || "Something went wrong");
      }
    } catch (err) {
      console.error(isEditMode ? "Update driver error:" : "Add driver error:", err);
      const errorMessage =
        err?.data?.message ||
        err?.data?.error ||
        err?.message ||
        (isEditMode ? "Failed to update driver" : "Failed to add driver");
      error(errorMessage);
    }
  };

  return (
    <ModalComponent
      open={open}
      title={isEditMode ? "UPDATE DRIVER" : "+ NEW DRIVER"}
      onClose={handleClose}
      secondaryAction={{
        label: "Cancel",
        onClick: handleClose,
      }}
      primaryAction={{
        label: isEditMode ? "Save" : "Add",
        onClick: handleSubmit(onSubmit),
        isLoading: isAddingDriver || isUpdatingDriver,
      }}
    >
      <Box className="flex flex-col gap-5">
        <Controller
          name="laundaryShopId"
          control={control}
          render={({ field: { onChange, value } }) => (
            <Box>
              <SelectField
                title="Shop Name"
                value={value}
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
          render={({ field: { onChange, value } }) => (
            <Box>
              <InputFieldModal
                title="First Name"
                placeholder="Enter first name"
                name="firstName"
                value={value}
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
          render={({ field: { onChange, value } }) => (
            <Box>
              <InputFieldModal
                title="Last Name"
                placeholder="Enter last name"
                name="lastName"
                value={value}
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
          render={({ field: { onChange, value } }) => (
            <Box>
              <InputFieldModal
                title="Email"
                placeholder="Enter email address"
                name="email"
                type="email"
                value={value}
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

        <Controller
          name="password"
          control={control}
          render={({ field: { onChange, value } }) => (
            <Box>
              <InputFieldModal
                title={isEditMode ? "Password (leave blank to keep current)" : "Password"}
                placeholder={isEditMode ? "Enter new password (optional)" : "Enter password"}
                name="password"
                type="password"
                value={value}
                onChange={(e) => onChange(e.target.value)}
              />
              {errors.password && (
                <Typography
                  variant="caption"
                  sx={{ color: "error.main", mt: 1, display: "block" }}
                >
                  {errors.password.message}
                </Typography>
              )}
            </Box>
          )}
        />

        <Controller
          name="confirmPassword"
          control={control}
          render={({ field: { onChange, value } }) => (
            <Box>
              <InputFieldModal
                title={isEditMode ? "Confirm password (if changing)" : "Confirm password"}
                placeholder={isEditMode ? "Confirm new password (optional)" : "Confirm password"}
                name="confirmPassword"
                type="password"
                value={value}
                onChange={(e) => onChange(e.target.value)}
              />
              {errors.confirmPassword && (
                <Typography
                  variant="caption"
                  sx={{ color: "error.main", mt: 1, display: "block" }}
                >
                  {errors.confirmPassword.message}
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

