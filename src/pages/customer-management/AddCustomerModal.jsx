import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useEffect } from "react";
import { Field, Input, Modal } from "../../design-system";
import useToaster from "../../components/ui/Toaster";
import { useAddCustomerMutation } from "../../store/services/api";
import { getApiErrorMessage } from "../../store/services/apiErrors";

const addCustomerSchema = yup.object().shape({
  firstName: yup.string().required("First name is required").min(2, "At least 2 characters"),
  lastName: yup.string().required("Last name is required").min(2, "At least 2 characters"),
  email: yup.string().required("Email is required").email("Enter a valid email"),
  phoneNum: yup.string().required("Phone is required").min(8, "Enter a valid phone number"),
  password: yup.string().required("Password is required").min(6, "At least 6 characters"),
  confirmPassword: yup
    .string()
    .required("Confirm the password")
    .oneOf([yup.ref("password")], "Passwords must match"),
});

const emptyDefaults = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNum: "",
  password: "",
  confirmPassword: "",
};

export default function AddCustomerModal({ open, onClose, onSuccess }) {
  const { success, error } = useToaster();
  const [addCustomer, { isLoading }] = useAddCustomerMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(addCustomerSchema),
    defaultValues: emptyDefaults,
  });

  useEffect(() => {
    if (open) reset(emptyDefaults);
  }, [open, reset]);

  const handleClose = () => {
    reset(emptyDefaults);
    onClose();
  };

  const onSubmit = async (data) => {
    const res = await addCustomer({
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      email: data.email.trim(),
      phoneNum: data.phoneNum.trim(),
      password: data.password,
    });
    if (res?.data?.status === "1") {
      success(res?.data?.message ?? "Customer registered. They can sign in to the app with this email and password.");
      handleClose();
      onSuccess?.(res.data.data);
    } else {
      error(getApiErrorMessage(res?.error, res?.data?.message ?? "Failed to register customer."));
    }
  };

  return (
    <Modal
      open={open}
      title="Add customer"
      description="Creates a verified app account. The customer can sign in with this email and password."
      onClose={handleClose}
      primaryLabel={isLoading ? "Registering…" : "Register customer"}
      secondaryLabel="Cancel"
      onPrimary={() => {
        if (isLoading) return;
        handleSubmit(onSubmit)();
      }}
    >
      <div style={{ display: "grid", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="First name" error={errors.firstName?.message} htmlFor="add-cus-first">
            <Input id="add-cus-first" placeholder="First name" {...register("firstName")} error={!!errors.firstName} />
          </Field>
          <Field label="Last name" error={errors.lastName?.message} htmlFor="add-cus-last">
            <Input id="add-cus-last" placeholder="Last name" {...register("lastName")} error={!!errors.lastName} />
          </Field>
        </div>
        <Field label="Email" error={errors.email?.message} htmlFor="add-cus-email">
          <Input
            id="add-cus-email"
            type="email"
            placeholder="name@example.com"
            autoComplete="off"
            {...register("email")}
            error={!!errors.email}
          />
        </Field>
        <Field label="Phone" error={errors.phoneNum?.message} htmlFor="add-cus-phone">
          <Input id="add-cus-phone" placeholder="Phone number" {...register("phoneNum")} error={!!errors.phoneNum} />
        </Field>
        <Field label="Password" error={errors.password?.message} htmlFor="add-cus-password">
          <Input
            id="add-cus-password"
            type="password"
            placeholder="At least 6 characters"
            autoComplete="new-password"
            {...register("password")}
            error={!!errors.password}
          />
        </Field>
        <Field label="Confirm password" error={errors.confirmPassword?.message} htmlFor="add-cus-confirm">
          <Input
            id="add-cus-confirm"
            type="password"
            placeholder="Repeat password"
            autoComplete="new-password"
            {...register("confirmPassword")}
            error={!!errors.confirmPassword}
          />
        </Field>
      </div>
    </Modal>
  );
}
