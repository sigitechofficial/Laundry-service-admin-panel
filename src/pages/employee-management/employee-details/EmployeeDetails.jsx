import { Badge, Button, PageHeader } from "../../../design-system";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  useGetAdminEmployeesQuery,
  useGetAllRolesQuery,
  useGetFeaturesQuery,
} from "../../../store/services/api";
import { Delay } from "../../../components/shared/Loaders";
import { extractAdminEmployees } from "../extractAdminEmployees";
import { useState, useEffect, useMemo } from "react";
import { BlockUserButton, AnonymizeDeleteModal } from "../../user-management/UserBlockActions";
import { isAccountBlocked } from "../../../utilities/accountBlocked";
import { RoleAccessPanel } from "../RoleAccessPanel";
import { summarizeRoleAccess } from "../roleAccessUtils";
import { formatUserPhone } from "../../../utilities/contactLinks";

const PANEL = {
  border: "1px solid #e6e9f0",
  borderRadius: 16,
  background: "#fff",
  boxShadow: "0 1px 2px rgba(16, 21, 31, 0.04)",
  overflow: "hidden",
};

function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

function formatJoined(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function Field({ label, children }) {
  return (
    <div>
      <p className="jd-field__hint" style={{ margin: 0 }}>{label}</p>
      <div style={{ marginTop: 6, fontWeight: 600, fontSize: 14, color: "#0F172A" }}>
        {children}
      </div>
    </div>
  );
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

export default function EmployeeDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [anonymizeModal, setAnonymizeModal] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  const { data, currentData, isLoading, isFetching, isUninitialized, isError, refetch } =
    useGetAdminEmployeesQuery({ includeInactive: 1 }, { skip: !id, refetchOnMountOrArgChange: true });
  const payload = currentData ?? data;
  const adminEmployees = extractAdminEmployees(payload);
  const employee = adminEmployees.find((e) => String(e.id) === String(id));

  const { data: rolesRes } = useGetAllRolesQuery("admin_portal");
  const rolesList = useMemo(
    () => (Array.isArray(rolesRes?.data) ? rolesRes.data : []),
    [rolesRes?.data]
  );
  const roleById = useMemo(() => {
    const map = new Map();
    rolesList.forEach((r) => map.set(String(r.id), r));
    return map;
  }, [rolesList]);

  const { data: featuresRes } = useGetFeaturesQuery();
  const features = useMemo(() => {
    const all = extractFeatures(featuresRes);
    return all.filter((f) => {
      const of = String(f?.featureOf ?? "").toLowerCase();
      return !of || of === "admin" || of === "both";
    });
  }, [featuresRes]);

  const roleId = employee?.roleId ?? employee?.role?.id ?? null;
  const roleRecord =
    employee?.role?.permissions
      ? employee.role
      : roleId != null
        ? roleById.get(String(roleId))
        : null;
  const roleName =
    employee?.role?.name ??
    roleRecord?.name ??
    (roleId != null ? `Role ${roleId}` : null);
  const accessSummary = roleRecord ? summarizeRoleAccess(roleRecord) : null;

  useEffect(() => {
    if (employee) setIsBlocked(isAccountBlocked(employee));
  }, [employee]);
  const showInitialLoader =
    Boolean(id) &&
    payload == null &&
    !isError &&
    (isUninitialized || isLoading || isFetching);

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
          title="Employee details"
          actions={
            <Button variant="secondary" onClick={() => navigate(-1)}>
              Back
            </Button>
          }
        />
        <p style={{ color: "var(--muted)" }}>
          {isError ? "Could not load this employee." : "Employee not found."}
        </p>
        {isError ? (
          <Button variant="secondary" onClick={() => refetch()}>
            Retry
          </Button>
        ) : null}
      </div>
    );
  }

  const fullName = [employee.firstName, employee.lastName].filter(Boolean).join(" ") || "—";
  const blocked = isAccountBlocked(employee);
  const inactive = employee.status === false;

  return (
    <div>
      <PageHeader
        title="Employee details"
        description={`ID #${employee.id}`}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate(-1)}>
              Back
            </Button>
            <BlockUserButton
              userId={employee.id}
              userType="admin_employee"
              isBlocked={isBlocked}
              onSuccess={(nextBlocked) => { setIsBlocked(nextBlocked); refetch(); }}
            />
            <Button variant="danger" onClick={() => setAnonymizeModal(true)}>Delete & anonymize</Button>
            <Button onClick={() => navigate(`/employee-management/edit/${employee.id}`)}>
              Edit
            </Button>
          </>
        }
      />

      <div style={{ ...PANEL, marginBottom: 16 }}>
        <div
          className="flex items-center"
          style={{ gap: 16, padding: 20, borderBottom: "1px solid #e6e9f0" }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: "#EEF2FF",
              color: "#4338CA",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 18,
              flexShrink: 0,
            }}
          >
            {initials(fullName)}
          </div>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#0F172A" }}>
              {fullName}
            </h2>
            <p style={{ margin: "2px 0 0", color: "var(--muted)", fontSize: 13 }}>
              {employee.email ?? "—"}
            </p>
          </div>
          <div className="flex items-center flex-wrap" style={{ gap: 6, marginLeft: "auto" }}>
            <Badge tone={blocked || inactive ? "danger" : "success"}>
              {blocked ? "Blocked" : inactive ? "Inactive" : "Active"}
            </Badge>
            {roleName ? <Badge tone="brand">{roleName}</Badge> : null}
            {accessSummary ? (
              <Badge tone="neutral">
                {accessSummary.screens} screen{accessSummary.screens === 1 ? "" : "s"}
              </Badge>
            ) : null}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 20,
            padding: 20,
          }}
        >
          <Field label="Employee ID">#{employee.id}</Field>
          <Field label="Role">{roleName || "—"}</Field>
          <Field label="Email">{employee.email ?? "—"}</Field>
          <Field label="Phone number">{formatUserPhone(employee) || employee.phoneNum || "—"}</Field>
          <Field label="Status">
            <Badge tone={blocked || inactive ? "danger" : "success"}>
              {blocked ? "Blocked" : inactive ? "Inactive" : "Active"}
            </Badge>
          </Field>
          <Field label="Joined">{formatJoined(employee.createdAt)}</Field>
        </div>
      </div>

      <div style={{ ...PANEL, padding: 20 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 12,
            flexWrap: "wrap",
          }}
        >
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Permissions</h3>
          <Link to="/role-permission" style={{ fontSize: 13, fontWeight: 600 }}>
            Manage role permissions →
          </Link>
        </div>
        <RoleAccessPanel role={roleRecord} features={features} readOnly compactHint />
      </div>

      <AnonymizeDeleteModal
        open={anonymizeModal}
        onClose={() => setAnonymizeModal(false)}
        userId={employee.id}
        userType="admin_employee"
        onSuccess={() => {
          setAnonymizeModal(false);
          navigate("/employee-management");
        }}
      />
    </div>
  );
}
