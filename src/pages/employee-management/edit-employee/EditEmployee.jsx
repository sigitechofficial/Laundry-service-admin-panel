import { useParams, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import {
  useUpdateAdminEmployeeMutation,
  useGetAdminEmployeesQuery,
} from "../../../store/services/api";
import useToaster from "../../../components/ui/Toaster";
import { Button, Field, Input, PageHeader } from "../../../design-system";
import { Delay } from "../../../components/shared/Loaders";
import { extractAdminEmployees } from "../extractAdminEmployees";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { DirectoryError, DirectoryFormCard, DirectoryFormGrid, DirectoryStack } from "../../directory-table/directoryTable";

const editEmployeeSchema = yup.object().shape({
  firstName: yup.string().required("First name is required").min(2, "At least 2 characters"),
  lastName: yup.string().required("Last name is required").min(2, "At least 2 characters"),
  email: yup.string().required("Email is required").email("Enter a valid email"),
  phoneNum: yup.string().required("Phone is required"),
  roleId: yup.number().typeError("Role ID must be a number").required("Role ID is required"),
});

const defaultValues = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNum: "",
  roleId: "",
};

export default function EditEmployee() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, currentData, isLoading: isListLoading, isFetching, isUninitialized, isError, refetch } =
    useGetAdminEmployeesQuery(undefined, { skip: !id, refetchOnMountOrArgChange: true });
  const payload = currentData ?? data;
  const adminEmployees = extractAdminEmployees(payload);
  const employee = adminEmployees.find((e) => String(e.id) === String(id));
  const showInitialLoader =
    Boolean(id) &&
    payload == null &&
    !isError &&
    (isUninitialized || isListLoading || isFetching);

  const [updateEmployee, { isLoading }] = useUpdateAdminEmployeeMutation();
  const { success, error } = useToaster();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: yupResolver(editEmployeeSchema),
    defaultValues,
  });

  const onSubmit = async (formData) => {
    const body = {
      employeeId: Number(id),
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phoneNum: formData.phoneNum,
      roleId: Number(formData.roleId),
    };
    const res = await updateEmployee(body);
    if (res?.data?.status === "1") {
      success(res?.data?.message ?? "Employee updated.");
      navigate(-1);
    } else {
      error(res?.error?.data?.message ?? res?.data?.message ?? "Failed to update employee.");
    }
  };

  useEffect(() => {
    if (employee) {
      reset({
        firstName: employee.firstName ?? "",
        lastName: employee.lastName ?? "",
        email: employee.email ?? "",
        phoneNum: employee.phoneNum ?? "",
        roleId: employee.roleId ?? "",
      });
    }
  }, [employee, reset]);

  if (showInitialLoader) {
    return (
      <div
        style={{
          minHeight: 280,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Delay />
      </div>
    );
  }
  if (isError || !employee) {
    return (
      <div>
        <PageHeader
          title="Edit employee"
          actions={
            <Button variant="secondary" onClick={() => navigate(-1)}>
              Back
            </Button>
          }
        />
        <DirectoryError onRetry={isError ? () => refetch() : undefined}>
          {isError ? "Could not load this employee." : "Employee not found."}
        </DirectoryError>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Edit employee"
        description="Update this admin employee"
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
            <Field label="First name" error={errors.firstName?.message} htmlFor="edit-emp-first-name">
              <Input id="edit-emp-first-name" placeholder="First name" {...register("firstName")} error={!!errors.firstName} />
            </Field>
            <Field label="Last name" error={errors.lastName?.message} htmlFor="edit-emp-last-name">
              <Input id="edit-emp-last-name" placeholder="Last name" {...register("lastName")} error={!!errors.lastName} />
            </Field>
            <Field label="Phone number" error={errors.phoneNum?.message} htmlFor="edit-emp-phone">
              <Input id="edit-emp-phone" placeholder="Phone number" {...register("phoneNum")} error={!!errors.phoneNum} />
            </Field>
          </DirectoryStack>
          </DirectoryFormCard>
          <DirectoryFormCard title="Account">
          <DirectoryStack>
            <Field label="Email" error={errors.email?.message} htmlFor="edit-emp-email">
              <Input id="edit-emp-email" type="email" placeholder="Email" {...register("email")} error={!!errors.email} />
            </Field>
            <Field label="Role ID" error={errors.roleId?.message} htmlFor="edit-emp-role">
              <Input id="edit-emp-role" type="number" placeholder="e.g. 6" {...register("roleId")} error={!!errors.roleId} />
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
