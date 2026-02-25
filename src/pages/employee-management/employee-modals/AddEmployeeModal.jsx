import { Box } from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useMemo, useEffect } from "react";
import ModalComponent from "../../../components/shared/Modal";
import FormInputField from "../../../components/ui/FormInputField";
import SelectField from "../../../components/ui/SelectField";
import useToaster from "../../../components/ui/Toaster";
import {
  useAddAdminEmployeeMutation,
  useAddAgentEmployeeMutation,
  useUpdateAdminEmployeeMutation,
  useUpdateAgentEmployeeMutation,
  useGetAllCountriesQuery,
  useGetCitiesByCountryIdQuery,
  useGetAllRolesQuery,
} from "../../../store/services/api";

const addEmployeeSchema = yup.object().shape({
  firstName: yup.string().required("First name is required").min(2, "At least 2 characters"),
  lastName: yup.string().required("Last name is required").min(2, "At least 2 characters"),
  email: yup.string().required("Email is required").email("Enter a valid email"),
  password: yup.string().when("$isEdit", {
    is: false,
    then: (s) => s.required("Password is required").min(6, "At least 6 characters"),
    otherwise: (s) => s.optional(),
  }),
  phoneNum: yup.string().required("Phone is required"),
  roleId: yup.mixed().required("Role is required"),
  countryId: yup.mixed().when("$isEdit", {
    is: false,
    then: (s) => s.required("Country is required"),
    otherwise: (s) => s.optional(),
  }),
  cityId: yup.mixed().when("$isEdit", {
    is: false,
    then: (s) => s.required("City is required"),
    otherwise: (s) => s.optional(),
  }),
  agentId: yup.mixed().when("$forShopEmployees", {
    is: true,
    then: (s) => s.required("Shop is required"),
    otherwise: (s) => s.optional(),
  }),
});

const emptyDefaults = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  phoneNum: "",
  roleId: "",
  countryId: "",
  cityId: "",
  agentId: "",
};

function getDefaultsFromEmployee(emp, forShopEmployees) {
  if (!emp) return { ...emptyDefaults, ...(forShopEmployees ? { agentId: "" } : {}) };
  const roleId = emp.roleId ?? emp.role?.id ?? "";
  const countryId = emp.countryId ?? emp.country?.id ?? "";
  const cityId = emp.cityId ?? emp.city?.id ?? "";
  const agentId = emp.agentId ?? emp.shopId ?? emp.shopInfo?.id ?? "";
  return {
    firstName: emp.firstName ?? "",
    lastName: emp.lastName ?? "",
    email: emp.email ?? "",
    password: "",
    phoneNum: emp.phoneNum ?? "",
    roleId: roleId !== undefined && roleId !== null ? roleId : "",
    countryId: countryId !== undefined && countryId !== null ? countryId : "",
    cityId: cityId !== undefined && cityId !== null ? cityId : "",
    ...(forShopEmployees ? { agentId: agentId !== undefined && agentId !== null ? agentId : "" } : {}),
  };
}

export default function AddEmployeeModal({
  open,
  onClose,
  onSuccess,
  employee: initialEmployee,
  forShopEmployees = false,
  shopOptions = [],
}) {
  const isEdit = Boolean(initialEmployee);
  const { success, error } = useToaster();
  const [addEmployee, { isLoading: isAdding }] = useAddAdminEmployeeMutation();
  const [addAgentEmployee, { isLoading: isAddingAgent }] = useAddAgentEmployeeMutation();
  const [updateEmployee, { isLoading: isUpdating }] = useUpdateAdminEmployeeMutation();
  const [updateAgentEmployee, { isLoading: isUpdatingAgent }] = useUpdateAgentEmployeeMutation();
  const isLoading = isAdding || isAddingAgent || isUpdating || isUpdatingAgent;
  const { data: countriesRes } = useGetAllCountriesQuery(undefined, { skip: !open });
  const countries = countriesRes?.data?.countries ?? countriesRes?.data ?? [];
  const countryOptions = useMemo(() => {
    const list = Array.isArray(countries) ? countries : [];
    return list.map((c) => ({ value: c.id, label: c.name ?? c.countryName ?? String(c.id) }));
  }, [countries]);

  const { data: rolesRes } = useGetAllRolesQuery(undefined, { skip: !open });
  const roles = rolesRes?.data ?? [];
  const roleOptions = useMemo(() => {
    const list = Array.isArray(roles) ? roles : [];
    return list.map((r) => ({ value: r.id, label: r.name ?? String(r.id) }));
  }, [roles]);

  const formDefaultValues = useMemo(
    () => getDefaultsFromEmployee(initialEmployee, forShopEmployees),
    [initialEmployee, forShopEmployees]
  );

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(addEmployeeSchema),
    defaultValues: formDefaultValues,
    context: { isEdit, forShopEmployees },
  });

  useEffect(() => {
    if (open) {
      const values = getDefaultsFromEmployee(initialEmployee, forShopEmployees);
      reset(values);
    }
  }, [open, initialEmployee, forShopEmployees, reset]);

  const countryId = watch("countryId");
  const { data: citiesRes } = useGetCitiesByCountryIdQuery(countryId, {
    skip: !open || !countryId,
  });
  const cities = citiesRes?.data?.cities ?? citiesRes?.data ?? [];
  const cityOptions = useMemo(() => {
    const list = Array.isArray(cities) ? cities : [];
    return list.map((c) => ({ value: c.id, label: c.name ?? c.cityName ?? String(c.id) }));
  }, [cities]);

  const handleClose = () => {
    reset(emptyDefaults);
    onClose();
  };

  const onSubmit = async (data) => {
    if (isEdit && forShopEmployees) {
      const body = {
        employeeId: initialEmployee.id,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phoneNum: data.phoneNum,
        roleId: Number(data.roleId),
        agentId: data.agentId ? Number(data.agentId) : undefined,
      };
      const res = await updateAgentEmployee(body);
      if (res?.data?.status === "1") {
        success(res?.data?.message ?? "Employee updated successfully.");
        handleClose();
        onSuccess?.();
      } else {
        error(res?.error?.data?.message ?? res?.data?.message ?? "Failed to update employee.");
      }
    } else if (isEdit) {
      const body = {
        employeeId: initialEmployee.id,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phoneNum: data.phoneNum,
        roleId: Number(data.roleId),
      };
      const res = await updateEmployee(body);
      if (res?.data?.status === "1") {
        success(res?.data?.message ?? "Employee updated successfully.");
        handleClose();
        onSuccess?.();
      } else {
        error(res?.error?.data?.message ?? res?.data?.message ?? "Failed to update employee.");
      }
    } else if (forShopEmployees) {
      const body = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        phoneNum: data.phoneNum,
        roleId: Number(data.roleId),
        countryId: Number(data.countryId),
        cityId: Number(data.cityId),
        agentId: Number(data.agentId),
      };
      const res = await addAgentEmployee(body);
      if (res?.data?.status === "1") {
        success(res?.data?.message ?? "Employee added successfully.");
        handleClose();
        onSuccess?.();
      } else {
        error(res?.error?.data?.message ?? res?.data?.message ?? "Failed to add employee.");
      }
    } else {
      const body = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        phoneNum: data.phoneNum,
        roleId: Number(data.roleId),
        countryId: Number(data.countryId),
        cityId: Number(data.cityId),
      };
      const res = await addEmployee(body);
      if (res?.data?.status === "1") {
        success(res?.data?.message ?? "Employee added successfully.");
        handleClose();
        onSuccess?.();
      } else {
        error(res?.error?.data?.message ?? res?.data?.message ?? "Failed to add employee.");
      }
    }
  };

  return (
    <ModalComponent
      open={open}
      title={isEdit ? "Edit Employee" : "Add Employee"}
      onClose={handleClose}
      width={560}
      primaryAction={{
        label: isEdit ? "Update" : "Add Employee",
        onClick: handleSubmit(onSubmit),
        isLoading,
      }}
      secondaryAction={{
        label: "Cancel",
        onClick: handleClose,
      }}
    >
      <Box className="flex flex-col gap-5">
        <Box className="grid grid-cols-2 gap-4">
          <FormInputField
            title="First Name"
            label="First Name"
            placeholder="First Name"
            name="firstName"
            register={register}
            error={errors.firstName}
          />
          <FormInputField
            title="Last Name"
            label="Last Name"
            placeholder="Last Name"
            name="lastName"
            register={register}
            error={errors.lastName}
          />
        </Box>
        <FormInputField
          title="Email"
          label="Email"
          placeholder="email@example.com"
          name="email"
          type="email"
          register={register}
          error={errors.email}
        />
        {!isEdit && (
          <FormInputField
            title="Password"
            label="Password"
            placeholder="••••••••"
            name="password"
            type="password"
            register={register}
            error={errors.password}
          />
        )}
        <FormInputField
          title="Phone Number"
          label="Phone"
          placeholder="Phone number"
          name="phoneNum"
          register={register}
          error={errors.phoneNum}
        />
        <Controller
          name="roleId"
          control={control}
          render={({ field }) => (
            <SelectField
              title="Role"
              value={field.value}
              onChange={field.onChange}
              options={roleOptions}
              placeholder="Select role"
            />
          )}
        />
        {errors.roleId && (
          <p className="text-red-500 text-sm mt-0.5">{errors.roleId.message}</p>
        )}
        {forShopEmployees && (
          <>
            <Controller
              name="agentId"
              control={control}
              render={({ field }) => (
                <SelectField
                  title="Shop"
                  value={field.value}
                  onChange={field.onChange}
                  options={shopOptions}
                  placeholder="Select shop"
                />
              )}
            />
            {errors.agentId && (
              <p className="text-red-500 text-sm mt-0.5">{errors.agentId.message}</p>
            )}
          </>
        )}
        {!isEdit && (
          <>
            <Controller
              name="countryId"
              control={control}
              render={({ field }) => (
                <SelectField
                  title="Country"
                  value={field.value}
                  onChange={(e) => {
                    field.onChange(e.target.value);
                    reset({ ...watch(), cityId: "" });
                  }}
                  options={countryOptions}
                  placeholder="Select country"
                />
              )}
            />
            {errors.countryId && (
              <p className="text-red-500 text-sm mt-0.5">{errors.countryId.message}</p>
            )}
            <Controller
              name="cityId"
              control={control}
              render={({ field }) => (
                <SelectField
                  title="City"
                  value={field.value}
                  onChange={field.onChange}
                  options={cityOptions}
                  placeholder="Select city"
                  disabled={!countryId}
                />
              )}
            />
            {errors.cityId && (
              <p className="text-red-500 text-sm mt-0.5">{errors.cityId.message}</p>
            )}
          </>
        )}
      </Box>
    </ModalComponent>
  );
}
