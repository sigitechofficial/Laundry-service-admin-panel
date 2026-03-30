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
  useGetAllZonesQuery,
} from "../../../store/services/api";

/** Role label from API (e.g. "Zone Admin", id 7) — zone field only for this role. */
function isZoneAdminRole(roleId, roles) {
  if (roleId === undefined || roleId === null || String(roleId).trim() === "") return false;
  const list = Array.isArray(roles) ? roles : [];
  const r = list.find((x) => String(x.id) === String(roleId));
  if (!r) return false;
  const name = String(r.name ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  return name === "zone admin";
}

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
  countryId: yup.mixed().when("$forShopEmployees", {
    is: true,
    then: (s) => s.optional(),
    otherwise: (s) => s.required("Country is required"),
  }),
  cityId: yup.mixed().when("$forShopEmployees", {
    is: true,
    then: (s) => s.optional(),
    otherwise: (s) => s.required("City is required"),
  }),
  zoneId: yup.mixed().when("$forShopEmployees", {
    is: true,
    then: (s) => s.optional(),
    otherwise: (s) =>
      s.test("zone-if-zone-admin", "Zone is required for Zone Admin", function (value) {
        const roleId = this.parent.roleId;
        const rolesList = this.options.context?.roles ?? [];
        if (!isZoneAdminRole(roleId, rolesList)) return true;
        return value !== undefined && value !== null && String(value).trim() !== "";
      }),
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
  zoneId: "",
  agentId: "",
};

function getDefaultsFromEmployee(emp, forShopEmployees) {
  if (!emp) return { ...emptyDefaults, ...(forShopEmployees ? { agentId: "" } : {}) };
  const roleId = emp.roleId ?? emp.role?.id ?? "";
  const countryId = emp.countryId ?? emp.country?.id ?? "";
  const cityId = emp.cityId ?? emp.city?.id ?? "";
  const zoneId = emp.zoneId ?? emp.zone?.id ?? "";
  const agentId = emp.agentId ?? emp.shopId ?? emp.shopInfo?.id ?? "";

  const normalizeValue = (value) =>
    value !== undefined && value !== null && value !== "" ? String(value) : "";

  return {
    firstName: emp.firstName ?? "",
    lastName: emp.lastName ?? "",
    email: emp.email ?? "",
    password: "",
    phoneNum: emp.phoneNum ?? "",
    roleId: normalizeValue(roleId),
    countryId: normalizeValue(countryId),
    cityId: normalizeValue(cityId),
    zoneId: normalizeValue(zoneId),
    ...(forShopEmployees ? { agentId: normalizeValue(agentId) } : {}),
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
  const countries = useMemo(() => {
    const d = countriesRes?.data?.countries ?? countriesRes?.data;
    return Array.isArray(d) ? d : [];
  }, [countriesRes?.data]);
  const countryOptions = useMemo(() => {
    return countries.map((c) => ({
      value: String(c.id),
      label: c.name ?? c.countryName ?? String(c.id),
    }));
  }, [countries]);

  const { data: rolesRes } = useGetAllRolesQuery(undefined, { skip: !open });
  const roles = useMemo(() => {
    const d = rolesRes?.data;
    return Array.isArray(d) ? d : [];
  }, [rolesRes?.data]);
  const roleOptions = useMemo(() => {
    return roles.map((r) => ({ value: String(r.id), label: r.name ?? String(r.id) }));
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
    setValue,
    getValues,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(addEmployeeSchema),
    defaultValues: formDefaultValues,
    context: { isEdit, forShopEmployees, roles },
  });

  useEffect(() => {
    if (open) {
      const values = getDefaultsFromEmployee(initialEmployee, forShopEmployees);
      reset(values);
    }
  }, [open, initialEmployee, forShopEmployees, reset]);

  const countryId = watch("countryId");
  const selectedRoleId = watch("roleId");
  const showZoneForRole =
    !forShopEmployees && isZoneAdminRole(selectedRoleId, roles);

  useEffect(() => {
    if (!open || forShopEmployees) return;
    if (isZoneAdminRole(selectedRoleId, roles)) return;
    if (!getValues("zoneId")) return;
    setValue("zoneId", "", { shouldValidate: true });
  }, [selectedRoleId, roles, open, forShopEmployees, setValue, getValues]);

  const { data: citiesRes } = useGetCitiesByCountryIdQuery(countryId, {
    skip: !open || !countryId,
  });
  const cities = useMemo(() => {
    const d = citiesRes?.data?.cities ?? citiesRes?.data;
    return Array.isArray(d) ? d : [];
  }, [citiesRes?.data]);
  const cityOptions = useMemo(() => {
    return cities.map((c) => ({
      value: String(c.id),
      label: c.name ?? c.cityName ?? String(c.id),
    }));
  }, [cities]);

  const { data: zonesRes } = useGetAllZonesQuery(undefined, {
    skip: !open || forShopEmployees || !showZoneForRole,
  });
  const zonesRaw = Array.isArray(zonesRes?.data)
    ? zonesRes.data
    : zonesRes?.data?.zones ?? zonesRes?.zones ?? [];
  const zones = Array.isArray(zonesRaw) ? zonesRaw : [];
  const zoneOptions = useMemo(
    () =>
      zones
        .map((z) => ({
          value: String(z.id ?? z.zoneId ?? ""),
          label: z.name ?? z.zoneName ?? String(z.id ?? z.zoneId ?? ""),
        }))
        .filter((opt) => opt.value !== ""),
    [zones]
  );

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
        countryId: data.countryId ? Number(data.countryId) : undefined,
        cityId: data.cityId ? Number(data.cityId) : undefined,
      };
      if (isZoneAdminRole(data.roleId, roles) && data.zoneId) {
        body.zoneId = Number(data.zoneId);
      }
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
      if (isZoneAdminRole(data.roleId, roles) && data.zoneId) {
        body.zoneId = Number(data.zoneId);
      }
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
        {!forShopEmployees && (
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
            {showZoneForRole && (
              <>
                <Controller
                  name="zoneId"
                  control={control}
                  render={({ field }) => (
                    <SelectField
                      title="Zone"
                      value={field.value}
                      onChange={field.onChange}
                      options={zoneOptions}
                      placeholder="Select zone"
                    />
                  )}
                />
                {errors.zoneId && (
                  <p className="text-red-500 text-sm mt-0.5">{errors.zoneId.message}</p>
                )}
              </>
            )}
          </>
        )}
      </Box>
    </ModalComponent>
  );
}
