import { useParams, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import {
  useEditCustomerMutation,
  useGetCustomerByIdQuery,
} from "../../../store/services/api";
import useToaster from "../../../components/ui/Toaster";
import { Button, Field, Input, PageHeader } from "../../../design-system";
import { Delay } from "../../../components/shared/Loaders";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { editCustomerDefaultValues, editCustomerSchema } from "../constants";
import { DirectoryFormCard, DirectoryFormGrid, DirectoryStack } from "../../directory-table/directoryTable";

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

  const onSubmit = async (data) => {
    const body = {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phoneNum: data.phoneNum,
      status: data.status,
      password: data.password,
      confirmPassword: data.confirmPassword,
    };

    const res = await updateCustomer({ id, body });

    if (res?.data?.status === "1") {
      success(res?.data?.message);
    } else {
      error(res?.data?.error || "Failed to update customer");
    }
  };

  useEffect(() => {
    if (customer) {
      reset({
        firstName: customer?.firstName || "",
        lastName: customer?.lastName || "",
        email: customer?.email || "",
        phoneNum: customer?.phoneNum || "",
        password: customer?.password || "",
        confirmPassword: customer?.confirmPassword || "",
        status: customer?.status || userDetails?.status || "",
      });
    }
  }, [customer, reset, userDetails?.status]);

  if (isFetchingCustomer) return <Delay />;

  return (
    <div>
      <PageHeader
        title="Customer update"
        description="Update this customer account"
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
            <Field label="Phone number" error={errors.phoneNum?.message} htmlFor="edit-customer-phone">
              <Input id="edit-customer-phone" placeholder="Phone number" {...register("phoneNum")} error={!!errors.phoneNum} />
            </Field>
          </DirectoryStack>
          </DirectoryFormCard>
          <DirectoryFormCard title="Account">
          <DirectoryStack>
            <Field label="Email" error={errors.email?.message} htmlFor="edit-customer-email">
              <Input id="edit-customer-email" type="email" placeholder="Email" {...register("email")} error={!!errors.email} />
            </Field>
            <Field label="Password" error={errors.password?.message} htmlFor="edit-customer-password">
              <Input id="edit-customer-password" type="password" placeholder="Password" {...register("password")} error={!!errors.password} />
            </Field>
            <Field label="Confirm password" error={errors.confirmPassword?.message} htmlFor="edit-customer-confirm">
              <Input id="edit-customer-confirm" type="password" placeholder="Confirm password" {...register("confirmPassword")} error={!!errors.confirmPassword} />
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
