import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useMemo, useEffect, useState } from "react";
import { Field, Input, Modal, Select } from "../../../design-system";
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
  useGetFeaturesQuery,
} from "../../../store/services/api";
import { RoleAccessPanel } from "../RoleAccessPanel";

/** Role is zone-forced (Zone Manager / Zone Admin). */
function isZoneScopedRole(roleId, roles) {
  if (roleId === undefined || roleId === null || String(roleId).trim() === "") return false;
  const list = Array.isArray(roles) ? roles : [];
  const r = list.find((x) => String(x.id) === String(roleId));
  if (!r) return false;
  if (String(r.scope || "").trim().toLowerCase() === "zone") return true;
  const name = String(r.name ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  return Number(r.id) === 7 || name === "zone admin";
}

function extractFeatures(featuresResponse) {
  const source = featuresResponse?.data ?? featuresResponse;
  if (Array.isArray(source)) return source;
  if (source && typeof source === "object") {
    for (const key of ["features", "permissions", "items", "rows"]) {
      if (Array.isArray(source[key])) return source[key];
    }
  }
  return [];
}

const addEmployeeSchema = yup.object().shape({
  firstName: yup.string().required("First name is required").min(2, "At least 2 characters"),
  lastName: yup.string().required("Last name is required").min(2, "At least 2 characters"),
  email: yup.string().required("Email is required").email("Enter a valid email"),
  password: yup
    .string()
    .transform((v) => (v == null ? "" : v))
    .test("password-when-needed", "Password is required (min 6 characters)", function (value) {
      const { isEdit, enablePassword } = this.options.context || {};
      const needed = !isEdit || enablePassword;
      if (!needed) return true;
      return Boolean(value) && String(value).length >= 6;
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
      s.test("zone-if-zone-admin", "Zone is required for Zone Manager", function (value) {
        const roleId = this.parent.roleId;
        const rolesList = this.options.context?.roles ?? [];
        if (!isZoneScopedRole(roleId, rolesList)) return true;
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

function SectionLabel({ children }) {
  return (
    <h3
      style={{
        margin: "4px 0 0",
        fontSize: 14,
        fontWeight: 700,
        letterSpacing: "0.02em",
        textTransform: "uppercase",
        color: "var(--muted)",
      }}
    >
      {children}
    </h3>
  );
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
  const [enablePassword, setEnablePassword] = useState(false);
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

  const { data: rolesRes } = useGetAllRolesQuery(
    forShopEmployees ? "agent_shop_staff" : "admin_portal",
    { skip: !open }
  );
  const roles = useMemo(() => {
    const d = rolesRes?.data;
    const list = Array.isArray(d) ? d : [];
    if (forShopEmployees) {
      return list.filter((r) => {
        const id = Number(r.id);
        const audience = r.audience;
        if (audience === "agent_shop_staff") return true;
        if (audience === "admin_portal") return false;
        return id === 6 || id === 8;
      });
    }
    return list.filter((r) => {
      const id = Number(r.id);
      const audience = r.audience;
      if (audience === "agent_shop_staff") return false;
      if (id === 6 || id === 8) return false;
      return true;
    });
  }, [rolesRes?.data, forShopEmployees]);
  const roleOptions = useMemo(() => {
    return roles.map((r) => {
      const zoneScoped = isZoneScopedRole(r.id, [r]);
      const type = zoneScoped ? "Zone" : "Platform";
      return {
        value: String(r.id),
        label: `${r.name ?? r.id} · ${type}`,
      };
    });
  }, [roles]);

  const { data: featuresRes } = useGetFeaturesQuery(undefined, { skip: !open || forShopEmployees });
  const features = useMemo(() => {
    if (forShopEmployees) return [];
    const all = extractFeatures(featuresRes);
    return all.filter((f) => {
      const of = String(f?.featureOf ?? "").toLowerCase();
      return !of || of === "admin" || of === "both";
    });
  }, [featuresRes, forShopEmployees]);

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
    resolver: async (values, _ctx, options) =>
      yupResolver(addEmployeeSchema)(
        values,
        { isEdit, forShopEmployees, roles, enablePassword },
        options
      ),
    defaultValues: formDefaultValues,
  });

  useEffect(() => {
    if (open) {
      const values = getDefaultsFromEmployee(initialEmployee, forShopEmployees);
      reset(values);
      setEnablePassword(false);
    }
  }, [open, initialEmployee, forShopEmployees, reset]);

  const countryId = watch("countryId");
  const selectedRoleId = watch("roleId");
  const showZoneForRole =
    !forShopEmployees && isZoneScopedRole(selectedRoleId, roles);
  const selectedRole = useMemo(
    () => roles.find((r) => String(r.id) === String(selectedRoleId)) ?? null,
    [roles, selectedRoleId]
  );

  useEffect(() => {
    if (!open || forShopEmployees) return;
    if (isZoneScopedRole(selectedRoleId, roles)) return;
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
  const zones = useMemo(() => {
    const zonesRaw = Array.isArray(zonesRes?.data)
      ? zonesRes.data
      : zonesRes?.data?.zones ?? zonesRes?.zones ?? [];
    return Array.isArray(zonesRaw) ? zonesRaw : [];
  }, [zonesRes]);
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
    setEnablePassword(false);
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
      if (enablePassword && data.password) {
        body.updatePassword = data.password;
      }
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
      if (isZoneScopedRole(data.roleId, roles) && data.zoneId) {
        body.zoneId = Number(data.zoneId);
      }
      if (enablePassword && data.password) {
        body.updatePassword = data.password;
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
      if (isZoneScopedRole(data.roleId, roles) && data.zoneId) {
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
    <Modal
      open={open}
      title={isEdit ? "Update Employee" : "New Employee"}
      onClose={handleClose}
      primaryLabel={
        isLoading
          ? isEdit
            ? "Updating…"
            : "Creating…"
          : isEdit
            ? "Update Employee"
            : "Create Employee"
      }
      secondaryLabel="Cancel"
      size="xl"
      maxHeight="80vh"
      onPrimary={() => {
        if (isLoading) return;
        handleSubmit(onSubmit)();
      }}
    >
      <div style={{ display: "grid", gap: 20 }}>
        <SectionLabel>Basic information</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="First name" error={errors.firstName?.message} htmlFor="emp-first-name">
            <Input id="emp-first-name" placeholder="First name" {...register("firstName")} error={!!errors.firstName} />
          </Field>
          <Field label="Last name" error={errors.lastName?.message} htmlFor="emp-last-name">
            <Input id="emp-last-name" placeholder="Last name" {...register("lastName")} error={!!errors.lastName} />
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Email" error={errors.email?.message} htmlFor="emp-email">
            <Input id="emp-email" type="email" placeholder="email@example.com" {...register("email")} error={!!errors.email} />
          </Field>
          <Field label="Phone number" error={errors.phoneNum?.message} htmlFor="emp-phone">
            <Input id="emp-phone" placeholder="Phone number" {...register("phoneNum")} error={!!errors.phoneNum} />
          </Field>
        </div>

        {!isEdit ? (
          <Field label="Password" error={errors.password?.message} htmlFor="emp-password">
            <Input id="emp-password" type="password" placeholder="••••••••" {...register("password")} error={!!errors.password} />
          </Field>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                margin: 0,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <input
                type="checkbox"
                checked={enablePassword}
                onChange={(e) => {
                  setEnablePassword(e.target.checked);
                  if (!e.target.checked) setValue("password", "");
                }}
              />
              Update password — Enable
            </label>
            {enablePassword ? (
              <Field label="New password" error={errors.password?.message} htmlFor="emp-password">
                <Input
                  id="emp-password"
                  type="password"
                  placeholder="••••••••"
                  {...register("password")}
                  error={!!errors.password}
                />
              </Field>
            ) : null}
          </div>
        )}

        <Controller
          name="roleId"
          control={control}
          render={({ field }) => (
            <Field label="Role" error={errors.roleId?.message}>
              <Select
                aria-label="Role"
                value={field.value}
                onChange={field.onChange}
                options={roleOptions}
                placeholder="Select role"
              />
              {!forShopEmployees ? (
                <p className="jd-field__hint" style={{ margin: "6px 0 0" }}>
                  {showZoneForRole
                    ? "Zone Manager — limited to one assigned zone."
                    : "Platform — works across zones, only on screens this role grants."}
                </p>
              ) : null}
            </Field>
          )}
        />

        {forShopEmployees && (
          <Controller
            name="agentId"
            control={control}
            render={({ field }) => (
              <Field label="Shop" error={errors.agentId?.message}>
                <Select
                  aria-label="Shop"
                  value={field.value}
                  onChange={field.onChange}
                  options={shopOptions}
                  placeholder="Select shop"
                />
              </Field>
            )}
          />
        )}

        {!forShopEmployees && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Controller
                name="countryId"
                control={control}
                render={({ field }) => (
                  <Field label="Country" error={errors.countryId?.message}>
                    <Select
                      aria-label="Country"
                      value={field.value}
                      onChange={(value) => {
                        field.onChange(value);
                        setValue("cityId", "");
                      }}
                      options={countryOptions}
                      placeholder="Select country"
                    />
                  </Field>
                )}
              />
              <Controller
                name="cityId"
                control={control}
                render={({ field }) => (
                  <Field label="City" error={errors.cityId?.message}>
                    <Select
                      aria-label="City"
                      value={field.value}
                      onChange={field.onChange}
                      options={cityOptions}
                      placeholder="Select city"
                      disabled={!countryId}
                    />
                  </Field>
                )}
              />
            </div>
            {showZoneForRole && (
              <Controller
                name="zoneId"
                control={control}
                render={({ field }) => (
                  <Field label="Zone" error={errors.zoneId?.message}>
                    <Select
                      aria-label="Zone"
                      value={field.value}
                      onChange={field.onChange}
                      options={zoneOptions}
                      placeholder="Select zone"
                    />
                  </Field>
                )}
              />
            )}
          </>
        )}

        {!forShopEmployees ? (
          <RoleAccessPanel role={selectedRole} features={features} readOnly />
        ) : null}
      </div>
    </Modal>
  );
}
