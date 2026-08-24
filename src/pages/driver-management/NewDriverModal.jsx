import { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Field, Input, Modal, Select } from "../../design-system";
import useToaster from "../../components/ui/Toaster";
import {
  useGetShopsDataQuery,
  useAddDriverByLaundryShopMutation,
  useUpdateDriverMutation,
} from "../../store/services/api";

const COUNTRY_OPTIONS = [
  { value: "+44", label: "+44" },
  { value: "+1", label: "+1" },
  { value: "+91", label: "+91" },
  { value: "+92", label: "+92" },
  { value: "+966", label: "+966" },
  { value: "+971", label: "+971" },
];

const ROLE_OPTIONS = [
  { value: "6", label: "Laundry Shop Driver" },
  { value: "8", label: "Laundry Shop Manager" },
];

const createDriverSchema = (isEditMode = false) =>
  yup.object().shape({
    laundaryShopId: isEditMode ? yup.string() : yup.string().required("Shop is required"),
    roleId: yup.string().required("Role is required"),
    firstName: yup.string().required("First name is required").min(2, "First name must be at least 2 characters"),
    lastName: yup.string().required("Last name is required").min(2, "Last name must be at least 2 characters"),
    email: yup.string().required("Email is required").email("Please enter a valid email address"),
    password: isEditMode
      ? yup.string().min(6, "Password must be at least 6 characters")
      : yup.string().required("Password is required").min(6, "Password must be at least 6 characters"),
    confirmPassword: isEditMode
      ? yup.string().when("password", {
          is: (val) => val && val.length > 0,
          then: (schema) =>
            schema.required("Confirm password is required").oneOf([yup.ref("password"), null], "Passwords must match"),
          otherwise: (schema) => schema,
        })
      : yup
          .string()
          .required("Confirm password is required")
          .oneOf([yup.ref("password"), null], "Passwords must match"),
    phoneNumber: yup.string().required("Phone number is required"),
    countryCode: yup.string().required("Country code is required"),
  });

const defaultValues = {
  laundaryShopId: "",
  roleId: "6",
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
  countryCode: "+44",
  phoneNumber: "",
};

export default function NewDriverModal({ open, onClose, onDriverAdded, driverData = null }) {
  const { success, error } = useToaster();
  const isEditMode = !!driverData;

  const { data: shopsResponse, isLoading: shopsLoading } = useGetShopsDataQuery();
  const shops = useMemo(
    () => shopsResponse?.data?.AllShopsData || [],
    [shopsResponse?.data?.AllShopsData]
  );

  const shopOptions = useMemo(() => {
    if (!Array.isArray(shops) || shops.length === 0) return [];
    return shops
      .map((shop) => ({
        value: String(shop.id),
        label: shop.shopName || "Unknown Shop",
      }))
      .filter((shop) => shop.value && shop.value !== "undefined");
  }, [shops]);

  const [addDriver, { isLoading: isAddingDriver }] = useAddDriverByLaundryShopMutation();
  const [updateDriver, { isLoading: isUpdatingDriver }] = useUpdateDriverMutation();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(createDriverSchema(isEditMode)),
    defaultValues,
    mode: "onChange",
  });

  useEffect(() => {
    if (driverData && open && isEditMode) {
      let phone = driverData.phone || driverData.phoneNum || "";
      let code = driverData.countryCode || "+44";

      if (phone) {
        const matchedCode = ["+971", "+966", "+44", "+92", "+91", "+1"].find((c) => phone.startsWith(c));
        if (matchedCode) {
          code = matchedCode;
          phone = phone.replace(matchedCode, "").trim();
        }
      }

      reset({
        laundaryShopId:
          driverData.laundaryShopId ||
          driverData.shopId ||
          (driverData.classifiedAsId ? String(driverData.classifiedAsId) : ""),
        roleId: driverData.roleId ? String(driverData.roleId) : "6",
        firstName: driverData.firstName || "",
        lastName: driverData.lastName || "",
        email: driverData.email || "",
        password: "",
        confirmPassword: "",
        countryCode: code,
        phoneNumber: phone,
      });
    } else if (!driverData && open) {
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
        roleId: data.roleId || "6",
      };

      if (data.password && data.password.trim() !== "") {
        body.password = data.password;
      }

      let res;
      if (isEditMode) {
        res = await updateDriver({
          id: driverData.id,
          body,
        }).unwrap();
      } else {
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
        onDriverAdded?.();
      } else {
        error(res?.message || "Something went wrong");
      }
    } catch (err) {
      error(
        err?.data?.message ||
          err?.data?.error ||
          err?.message ||
          (isEditMode ? "Failed to update driver" : "Failed to add driver")
      );
    }
  };

  return (
    <Modal
      open={open}
      title={isEditMode ? "Update driver" : "New driver"}
      onClose={handleClose}
      secondaryLabel="Cancel"
      primaryLabel={isAddingDriver || isUpdatingDriver ? (isEditMode ? "Saving…" : "Adding…") : isEditMode ? "Save" : "Add"}
      onPrimary={() => {
        if (isAddingDriver || isUpdatingDriver) return;
        handleSubmit(onSubmit)();
      }}
    >
      <div style={{ display: "grid", gap: 16 }}>
        <Controller
          name="laundaryShopId"
          control={control}
          render={({ field }) => (
            <Field label="Shop name" error={errors.laundaryShopId?.message}>
              <Select
                aria-label="Shop name"
                value={field.value}
                onChange={field.onChange}
                options={shopOptions}
                placeholder="Select shop"
                disabled={shopsLoading}
              />
            </Field>
          )}
        />
        <Controller
          name="roleId"
          control={control}
          render={({ field }) => (
            <Field label="Role" error={errors.roleId?.message}>
              <Select
                aria-label="Role"
                value={field.value}
                onChange={field.onChange}
                options={ROLE_OPTIONS}
                placeholder="Select role"
              />
            </Field>
          )}
        />
        <Controller
          name="firstName"
          control={control}
          render={({ field }) => (
            <Field label="First name" error={errors.firstName?.message} htmlFor="driver-first-name">
              <Input id="driver-first-name" {...field} placeholder="Enter first name" error={!!errors.firstName} />
            </Field>
          )}
        />
        <Controller
          name="lastName"
          control={control}
          render={({ field }) => (
            <Field label="Last name" error={errors.lastName?.message} htmlFor="driver-last-name">
              <Input id="driver-last-name" {...field} placeholder="Enter last name" error={!!errors.lastName} />
            </Field>
          )}
        />
        <Controller
          name="email"
          control={control}
          render={({ field }) => (
            <Field label="Email" error={errors.email?.message} htmlFor="driver-email">
              <Input id="driver-email" type="email" {...field} placeholder="Enter email address" error={!!errors.email} />
            </Field>
          )}
        />
        <Controller
          name="password"
          control={control}
          render={({ field }) => (
            <Field
              label={isEditMode ? "Password (leave blank to keep current)" : "Password"}
              error={errors.password?.message}
              htmlFor="driver-password"
            >
              <Input
                id="driver-password"
                type="password"
                {...field}
                placeholder={isEditMode ? "Enter new password (optional)" : "Enter password"}
                error={!!errors.password}
              />
            </Field>
          )}
        />
        <Controller
          name="confirmPassword"
          control={control}
          render={({ field }) => (
            <Field
              label={isEditMode ? "Confirm password (if changing)" : "Confirm password"}
              error={errors.confirmPassword?.message}
              htmlFor="driver-confirm-password"
            >
              <Input
                id="driver-confirm-password"
                type="password"
                {...field}
                placeholder={isEditMode ? "Confirm new password (optional)" : "Confirm password"}
                error={!!errors.confirmPassword}
              />
            </Field>
          )}
        />
        <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 12 }}>
          <Controller
            name="countryCode"
            control={control}
            render={({ field }) => (
              <Field label="Code" error={errors.countryCode?.message}>
                <Select aria-label="Country code" value={field.value} onChange={field.onChange} options={COUNTRY_OPTIONS} />
              </Field>
            )}
          />
          <Controller
            name="phoneNumber"
            control={control}
            render={({ field }) => (
              <Field label="Phone number" error={errors.phoneNumber?.message} htmlFor="driver-phone">
                <Input id="driver-phone" {...field} placeholder="Phone number" error={!!errors.phoneNumber} />
              </Field>
            )}
          />
        </div>
      </div>
    </Modal>
  );
}
