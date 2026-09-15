import { useParams, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import {
  useEditCustomerMutation,
  useGetCustomerByIdQuery,
} from "../../../store/services/api";
import useToaster from "../../../components/ui/Toaster";
import { Button, Field, Input, PageHeader, PasswordInput } from "../../../design-system";
import { Delay } from "../../../components/shared/Loaders";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { editCustomerDefaultValues, editCustomerSchema } from "../constants";
import { DirectoryFormCard, DirectoryFormGrid, DirectoryStack } from "../../directory-table/directoryTable";
import { getApiErrorMessage } from "../../../store/services/apiErrors";

export default function EditCustomer() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading: isFetchingCustomer } = useGetCustomerByIdQuery(id, {
    skip: !id,
  });
  const userDetails = data?.data?.userDetails;
  const customer = userDetails?.user;

  const [updateCustomer, { isLoading }] = useEditCustomerMutation();
  const { success, error } = useToaster();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: yupResolver(editCustomerSchema),
    defaultValues: editCustomerDefaultValues,
  });

  const onSubmit = async (form) => {
    const body = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phoneNum: form.phoneNum.trim(),
    };
    if (form.password) body.password = form.password;

    const res = await updateCustomer({ id, body });

    if (res?.data?.status === "1") {
      success(res?.data?.message ?? "Customer updated.");
      reset((current) => ({ ...current, password: "", confirmPassword: "" }));
    } else {
      error(getApiErrorMessage(res?.error, res?.data?.error || "Failed to update customer"));
    }
  };

  useEffect(() => {
    if (customer) {
      reset({
        firstName: customer?.firstName || "",
        lastName: customer?.lastName || "",
        email: customer?.email || "",
        phoneNum: customer?.phoneNum || "",
        password: "",
        confirmPassword: "",
        status: customer?.status,
      });
    }
  }, [customer, reset]);

  if (isFetchingCustomer) return <Delay />;

  return (
    <div>
      <PageHeader
        title="Customer update"
        description="Update this customer account. Leave password blank to keep the current one."
        actions={
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Back
          </Button>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        <DirectoryFormGrid>
          <DirectoryFormCard title="Profile">
          <DirectoryStack>
            <Field label="First name" error={errors.firstName?.message} htmlFor="edit-customer-first-name">
              <Input id="edit-customer-first-name" placeholder="First name" {...register("firstName")} error={!!errors.firstName} />
            </Field>
            <Field label="Last name" error={errors.lastName?.message} htmlFor="edit-customer-last-name">
              <Input id="edit-customer-last-name" placeholder="Last name" {...register("lastName")} error={!!errors.lastName} />
            </Field>
            <Field
              label="Phone number"
              hint="UK number, e.g. 07911 123456 or +44 7911 123456"
              error={errors.phoneNum?.message}
              htmlFor="edit-customer-phone"
            >
              <Input
                id="edit-customer-phone"
                type="tel"
                inputMode="tel"
                placeholder="07911 123456"
                {...register("phoneNum")}
                error={!!errors.phoneNum}
              />
            </Field>
          </DirectoryStack>
          </DirectoryFormCard>
          <DirectoryFormCard title="Account">
          <DirectoryStack>
            <Field label="Email" error={errors.email?.message} htmlFor="edit-customer-email">
              <Input id="edit-customer-email" type="email" placeholder="Email" {...register("email")} error={!!errors.email} />
            </Field>
            <Field
              label="New password"
              hint="Leave blank to keep the current password"
              error={errors.password?.message}
              htmlFor="edit-customer-password"
            >
              <PasswordInput
                id="edit-customer-password"
                placeholder="At least 6 characters"
                autoComplete="new-password"
                {...register("password")}
                error={!!errors.password}
              />
            </Field>
            <Field label="Confirm new password" error={errors.confirmPassword?.message} htmlFor="edit-customer-confirm">
              <PasswordInput
                id="edit-customer-confirm"
                placeholder="Repeat new password"
                autoComplete="new-password"
                {...register("confirmPassword")}
                error={!!errors.confirmPassword}
              />
            </Field>
          </DirectoryStack>
          </DirectoryFormCard>
        </DirectoryFormGrid>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Updating…" : "Update"}
          </Button>
        </div>
      </form>
    </div>
  );
}
