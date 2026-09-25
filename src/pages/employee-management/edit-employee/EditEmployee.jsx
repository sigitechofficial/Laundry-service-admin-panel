import { useParams, useNavigate, Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
  useUpdateAdminEmployeeMutation,
  useGetAdminEmployeesQuery,
  useGetAllRolesQuery,
  useGetFeaturesQuery,
  useGetAllCountriesQuery,
  useGetCitiesByCountryIdQuery,
  useGetAllZonesQuery,
} from "../../../store/services/api";
import useToaster from "../../../components/ui/Toaster";
import { Button, Field, Input, PageHeader, Select } from "../../../design-system";
import { Delay } from "../../../components/shared/Loaders";
import { extractAdminEmployees } from "../extractAdminEmployees";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  DirectoryError,
  DirectoryFormCard,
  DirectoryFormGrid,
  DirectoryStack,
} from "../../directory-table/directoryTable";
import { RoleAccessPanel } from "../RoleAccessPanel";

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

const editEmployeeSchema = yup.object().shape({
  firstName: yup.string().required("First name is required").min(2, "At least 2 characters"),
  lastName: yup.string().required("Last name is required").min(2, "At least 2 characters"),
  email: yup.string().required("Email is required").email("Enter a valid email"),
  phoneNum: yup.string().required("Phone is required"),
  roleId: yup.mixed().required("Role is required"),
  countryId: yup.mixed().optional(),
  cityId: yup.mixed().optional(),
  zoneId: yup.mixed().optional(),
  password: yup
    .string()
    .transform((v) => (v == null ? "" : v))
    .test("password-when-enabled", "Password is required (min 6 characters)", function (value) {
      if (!this.options.context?.enablePassword) return true;
      return Boolean(value) && String(value).length >= 6;
    }),
});

const defaultValues = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNum: "",
  roleId: "",
  countryId: "",
  cityId: "",
  zoneId: "",
  password: "",
};

export default function EditEmployee() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [enablePassword, setEnablePassword] = useState(false);

  const { data, currentData, isLoading: isListLoading, isFetching, isUninitialized, isError, refetch } =
    useGetAdminEmployeesQuery({ includeInactive: 1 }, { skip: !id, refetchOnMountOrArgChange: true });
  const payload = currentData ?? data;
  const adminEmployees = extractAdminEmployees(payload);
  const employee = adminEmployees.find((e) => String(e.id) === String(id));
  const showInitialLoader =
    Boolean(id) &&
    payload == null &&
    !isError &&
    (isUninitialized || isListLoading || isFetching);

  const { data: rolesRes } = useGetAllRolesQuery("admin_portal");
  const roles = useMemo(() => {
    const list = Array.isArray(rolesRes?.data) ? rolesRes.data : [];
    return list.filter((r) => {
      const roleId = Number(r.id);
      if (r.audience === "agent_shop_staff") return false;
      if (roleId === 6 || roleId === 8) return false;
      return true;
    });
  }, [rolesRes?.data]);
  const roleOptions = useMemo(
    () =>
      roles.map((r) => ({
        value: String(r.id),
        label: `${r.name ?? r.id} · ${isZoneScopedRole(r.id, [r]) ? "Zone" : "Platform"}`,
      })),
    [roles]
  );

  const { data: featuresRes } = useGetFeaturesQuery();
  const features = useMemo(() => {
    const all = extractFeatures(featuresRes);
    return all.filter((f) => {
      const of = String(f?.featureOf ?? "").toLowerCase();
      return !of || of === "admin" || of === "both";
    });
  }, [featuresRes]);

  const { data: countriesRes } = useGetAllCountriesQuery();
  const countries = useMemo(() => {
    const d = countriesRes?.data?.countries ?? countriesRes?.data;
    return Array.isArray(d) ? d : [];
  }, [countriesRes?.data]);
  const countryOptions = useMemo(
    () =>
      countries.map((c) => ({
        value: String(c.id),
        label: c.name ?? c.countryName ?? String(c.id),
      })),
    [countries]
  );

  const [updateEmployee, { isLoading }] = useUpdateAdminEmployeeMutation();
  const { success, error } = useToaster();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm({
    resolver: async (values, _ctx, options) =>
      yupResolver(editEmployeeSchema)(values, { enablePassword }, options),
    defaultValues,
  });

  const countryId = watch("countryId");
  const selectedRoleId = watch("roleId");
  const selectedRole = useMemo(
    () => roles.find((r) => String(r.id) === String(selectedRoleId)) ?? null,
    [roles, selectedRoleId]
  );
  const showZone = isZoneScopedRole(selectedRoleId, roles);

  const { data: citiesRes } = useGetCitiesByCountryIdQuery(countryId, {
    skip: !countryId,
  });
  const cityOptions = useMemo(() => {
    const d = citiesRes?.data?.cities ?? citiesRes?.data;
    const list = Array.isArray(d) ? d : [];
    return list.map((c) => ({
      value: String(c.id),
      label: c.name ?? c.cityName ?? String(c.id),
    }));
  }, [citiesRes?.data]);

  const { data: zonesRes } = useGetAllZonesQuery(undefined, { skip: !showZone });
  const zoneOptions = useMemo(() => {
    const zonesRaw = Array.isArray(zonesRes?.data)
      ? zonesRes.data
      : zonesRes?.data?.zones ?? [];
    return (Array.isArray(zonesRaw) ? zonesRaw : [])
      .map((z) => ({
        value: String(z.id ?? z.zoneId ?? ""),
        label: z.name ?? z.zoneName ?? String(z.id ?? z.zoneId ?? ""),
      }))
      .filter((o) => o.value);
  }, [zonesRes]);

  const onSubmit = async (formData) => {
    const body = {
      employeeId: Number(id),
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phoneNum: formData.phoneNum,
      roleId: Number(formData.roleId),
    };
    if (formData.countryId) body.countryId = Number(formData.countryId);
    if (formData.cityId) body.cityId = Number(formData.cityId);
    if (showZone && formData.zoneId) body.zoneId = Number(formData.zoneId);
    if (enablePassword && formData.password) {
      body.updatePassword = formData.password;
    }
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
        roleId: employee.roleId != null ? String(employee.roleId) : "",
        countryId: employee.countryId != null ? String(employee.countryId) : "",
        cityId: employee.cityId != null ? String(employee.cityId) : "",
        zoneId: employee.zoneId != null ? String(employee.zoneId) : "",
        password: "",
      });
      setEnablePassword(false);
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
          title="Update Employee"
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
        title="Update Employee"
        description="Profile, role, and screen access for this admin employee"
        actions={
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Back
          </Button>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        <DirectoryFormGrid>
          <DirectoryFormCard title="Basic information">
            <DirectoryStack>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="First name" error={errors.firstName?.message} htmlFor="edit-emp-first-name">
                  <Input id="edit-emp-first-name" placeholder="First name" {...register("firstName")} error={!!errors.firstName} />
                </Field>
                <Field label="Last name" error={errors.lastName?.message} htmlFor="edit-emp-last-name">
                  <Input id="edit-emp-last-name" placeholder="Last name" {...register("lastName")} error={!!errors.lastName} />
                </Field>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Email" error={errors.email?.message} htmlFor="edit-emp-email">
                  <Input id="edit-emp-email" type="email" placeholder="Email" {...register("email")} error={!!errors.email} />
                </Field>
                <Field label="Phone number" error={errors.phoneNum?.message} htmlFor="edit-emp-phone">
                  <Input id="edit-emp-phone" placeholder="Phone number" {...register("phoneNum")} error={!!errors.phoneNum} />
                </Field>
              </div>
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
                <Field label="New password" error={errors.password?.message} htmlFor="edit-emp-password">
                  <Input
                    id="edit-emp-password"
                    type="password"
                    placeholder="••••••••"
                    {...register("password")}
                    error={!!errors.password}
                  />
                </Field>
              ) : null}
            </DirectoryStack>
          </DirectoryFormCard>

          <DirectoryFormCard title="Role & location">
            <DirectoryStack>
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
                    <p className="jd-field__hint" style={{ margin: "6px 0 0" }}>
                      Screen access below comes from this role.{" "}
                      <Link to="/role-permission" style={{ fontWeight: 600 }}>
                        Manage role permissions
                      </Link>
                    </p>
                  </Field>
                )}
              />
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
              {showZone ? (
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
              ) : null}
            </DirectoryStack>
          </DirectoryFormCard>
        </DirectoryFormGrid>

        <div style={{ marginTop: 20 }}>
          <DirectoryFormCard title="Permissions">
            <RoleAccessPanel role={selectedRole} features={features} readOnly compactHint />
          </DirectoryFormCard>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Updating…" : "Update Employee"}
          </Button>
        </div>
      </form>
    </div>
  );
}
