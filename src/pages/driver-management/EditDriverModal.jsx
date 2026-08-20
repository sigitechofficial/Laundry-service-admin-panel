import { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Field, Input, Modal, Select } from "../../design-system";
import useToaster from "../../components/ui/Toaster";
import { useGetShopsDataQuery, useUpdateDriverMutation } from "../../store/services/api";

const COUNTRY_OPTIONS = [
  { value: "+44", label: "+44" },
  { value: "+1", label: "+1" },
  { value: "+91", label: "+91" },
  { value: "+92", label: "+92" },
  { value: "+966", label: "+966" },
  { value: "+971", label: "+971" },
];

const editDriverSchema = yup.object().shape({
  laundaryShopId: yup.string(),
  firstName: yup.string().required("First name is required").min(2, "First name must be at least 2 characters"),
  lastName: yup.string().required("Last name is required").min(2, "Last name must be at least 2 characters"),
  email: yup.string().required("Email is required").email("Please enter a valid email address"),
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

  const [updateDriver, { isLoading: isUpdatingDriver }] = useUpdateDriverMutation();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(editDriverSchema),
    defaultValues,
    mode: "onChange",
  });

  useEffect(() => {
    if (driverData && open) {
      let phone = driverData.phoneNum || driverData.phone || "";
      let code = driverData.countryCode || "+44";

      if (!driverData.countryCode && phone) {
        const matchedCode = ["+971", "+966", "+44", "+92", "+91", "+1"].find((c) => phone.startsWith(c));
        if (matchedCode) {
          code = matchedCode;
          phone = phone.replace(matchedCode, "").trim();
        }
      } else if (phone && code && phone.startsWith(code)) {
        phone = phone.replace(code, "").trim();
      }

      reset({
        laundaryShopId:
          driverData.laundaryShopId ||
          driverData.shopId ||
          (driverData.classifiedAsId ? String(driverData.classifiedAsId) : ""),
        firstName: driverData.firstName || "",
        lastName: driverData.lastName || "",
        email: driverData.email || "",
        countryCode: code,
        phoneNumber: phone,
      });
    } else if (!driverData && open) {
      reset(defaultValues);
    }
  }, [driverData, open, reset]);

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
        onDriverUpdated?.();
      } else {
        error(res?.message || "Something went wrong");
      }
    } catch (err) {
      error(err?.data?.message || err?.data?.error || err?.message || "Failed to update driver");
    }
  };

  return (
    <Modal
      open={open}
      title="Update driver detail"
      onClose={handleClose}
      secondaryLabel="Cancel"
      primaryLabel={isUpdatingDriver ? "Updating…" : "Update"}
      onPrimary={() => {
        if (isUpdatingDriver) return;
        handleSubmit(onSubmit)();
      }}
    >
      <div key={driverData?.id || "new"} style={{ display: "grid", gap: 16 }}>
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
          name="firstName"
          control={control}
          render={({ field }) => (
            <Field label="First name" error={errors.firstName?.message} htmlFor="edit-driver-first-name">
              <Input id="edit-driver-first-name" {...field} placeholder="Enter first name" error={!!errors.firstName} />
            </Field>
          )}
        />
        <Controller
          name="lastName"
          control={control}
          render={({ field }) => (
            <Field label="Last name" error={errors.lastName?.message} htmlFor="edit-driver-last-name">
              <Input id="edit-driver-last-name" {...field} placeholder="Enter last name" error={!!errors.lastName} />
            </Field>
          )}
        />
        <Controller
          name="email"
          control={control}
          render={({ field }) => (
            <Field label="Email" error={errors.email?.message} htmlFor="edit-driver-email">
              <Input id="edit-driver-email" type="email" {...field} placeholder="Enter email address" error={!!errors.email} />
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
              <Field label="Phone number" error={errors.phoneNumber?.message} htmlFor="edit-driver-phone">
                <Input id="edit-driver-phone" {...field} placeholder="Phone number" error={!!errors.phoneNumber} />
              </Field>
            )}
          />
        </div>
      </div>
    </Modal>
  );
}
