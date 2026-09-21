import { useMemo, useState } from "react";
import {
  Button,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Table,
} from "../../design-system";
import { CheckRow, Notice, Toggle } from "../misc-kit";
import {
  DirectoryActionEdit,
  DirectoryActionView,
  DirectoryActions,
  DirectoryClearButton,
  DirectoryDotPill,
  DirectoryIdentity,
  DirectoryMetric,
  DirectoryMetrics,
  DirectorySearch,
  DirectoryStatusPill,
  DirectoryTableWrap,
  DirectoryTool,
  DirectoryToolSelect,
  DirectoryToolbar,
  DirectoryToolbarEnd,
} from "../directory-table/directoryTable";
import useToaster from "../../components/ui/Toaster";
import { Delay } from "../../components/shared/Loaders";
import {
  useAddFeatureMutation,
  useAddLaundryRoleMutation,
  useGetAllRolesQuery,
  useGetFeaturesQuery,
  useUpdateRoleMutation,
} from "../../store/services/api";
import { getSidebarPermissionSelectOptions } from "../../components/shared/constants";

const ACTION_OPTIONS = ["read", "create", "update", "delete"];
const ACTION_LABEL = {
  read: "View",
  create: "Create",
  update: "Edit",
  delete: "Delete",
};
// Single-letter tokens for the compact access-matrix cells.
const ACTION_INITIAL = {
  read: "V",
  create: "C",
  update: "E",
  delete: "D",
};

const FEATURE_OF_OPTIONS = [
  { label: "Admin", value: "Admin" },
  { label: "Both", value: "both" },
  { label: "Agent", value: "Agent" },
  { label: "Agent Employee", value: "Agent Employee" },
];
const DEFAULT_FEATURE_OF = "Admin";
const ADMIN_FEATURE_OF = new Set(["Admin", "both"]);
const AGENT_FEATURE_OF = new Set(["Agent", "Agent Employee", "both"]);

const pretty = (value = "") =>
  String(value)
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());

const extractList = (payload, keys = []) => {
  const source = payload?.data ?? payload;
  if (Array.isArray(source)) return source;
  if (source && typeof source === "object") {
    for (const key of keys) {
      if (Array.isArray(source[key])) return source[key];
    }
    for (const value of Object.values(source)) {
      if (Array.isArray(value)) return value;
    }
  }
  return [];
};

const normalizeFeatureOptions = (featuresResponse) => {
  const features = extractList(featuresResponse, ["features", "permissions", "items", "rows"]);
  if (features.length) {
    return features.map((item, idx) => ({
      id: item?.id ?? item?.featureId ?? item?.permissionId ?? idx + 1,
      title: item?.title ?? item?.name ?? item?.key ?? `Feature ${idx + 1}`,
      key: item?.key,
      featureOf: item?.featureOf ?? item?.feature_of ?? null,
      permissions: Array.isArray(item?.permissions) ? item.permissions : [],
    }));
  }
  return [];
};

const emptyActions = () =>
  ACTION_OPTIONS.reduce((acc, action) => ({ ...acc, [action]: false }), {});

const pickCrud = (obj) => ({
  create: Boolean(obj?.create),
  read: Boolean(obj?.read),
  update: Boolean(obj?.update),
  delete: Boolean(obj?.delete),
});

const isAgentShopStaffRole = (role) => {
  const id = Number(role?.id);
  return role?.audience === "agent_shop_staff" || id === 6 || id === 8;
};

const isZoneManagerRole = (role) => {
  if (isAgentShopStaffRole(role)) return false;
  if (Number(role?.id) === 7) return true;
  return String(role?.scope || "").toLowerCase() === "zone";
};

// Type badge + meta line + whether the role name is a fixed system role.
const roleTypeInfo = (role) => {
  if (isAgentShopStaffRole(role))
    return { label: "Agent shop staff", tone: "teal", meta: "Agent employee · system role", system: true, agentShop: true };
  if (isZoneManagerRole(role))
    return { label: "Zone Manager", tone: "info", meta: "Zone-scoped · staff login", system: true, agentShop: false };
  return { label: "Admin Manager", tone: "success", meta: "Platform-wide · staff login", system: false, agentShop: false };
};

const grantedScreenCount = (role) => {
  const perms = Array.isArray(role?.permissions) ? role.permissions : [];
  return perms.filter((p) => p?.read || p?.create || p?.update || p?.delete).length;
};

function selectionsFromRole(role, features) {
  const next = {};
  const fromRole = Array.isArray(role?.permissions) ? role.permissions : [];
  const byFeatureId = new Map(
    fromRole
      .filter((row) => row?.featureId != null || row?.id != null)
      .map((row) => [Number(row.featureId ?? row.id), row])
  );
  features.forEach((feature) => {
    const fid = Number(feature.id);
    const fromFeatures = feature.permissions?.find((p) => Number(p?.roleId) === Number(role?.id));
    const source = byFeatureId.get(fid) || fromFeatures;
    next[String(feature.id)] = source ? pickCrud(source) : emptyActions();
  });
  return next;
}

function permissionRolePayload(features, selections) {
  return features
    .map((feature) => {
      const actions = selections[String(feature.id)] || {};
      const hasAny = ACTION_OPTIONS.some((action) => actions[action]);
      if (!hasAny) return null;
      return {
        id: Number(feature.id),
        permissions: {
          create: Boolean(actions.create),
          read: Boolean(actions.read),
          update: Boolean(actions.update),
          delete: Boolean(actions.delete),
        },
      };
    })
    .filter(Boolean);
}

function FeatureTitle({ feature }) {
  return (
    <div>
      <div style={{ fontWeight: 600 }}>{pretty(feature?.title)}</div>
      <code style={{ fontSize: 12, color: "var(--muted)" }}>{feature?.key || "missing key"}</code>
    </div>
  );
}

function PermissionMatrix({ features, selections, onToggle, empty, readOnly = false }) {
  if (!features.length) {
    return <Notice>No screens found. Add a permission first.</Notice>;
  }
  return (
    <DirectoryTableWrap>
      <Table
        stickyLeft={1}
        columns={[
          {
            key: "screen",
            header: "Screen",
            render: (feature) => <FeatureTitle feature={feature} />,
          },
          ...ACTION_OPTIONS.map((action) => ({
            key: action,
            header: ACTION_LABEL[action],
            render: (feature) => (
              <CheckRow
                label={ACTION_LABEL[action]}
                checked={Boolean(selections?.[String(feature.id)]?.[action])}
                disabled={readOnly}
                onChange={() => onToggle(feature.id, action)}
              />
            ),
          })),
        ]}
        rows={features}
        rowKey={(feature) => feature.id}
        empty={empty || "No screens."}
      />
    </DirectoryTableWrap>
  );
}

// Read-only derivation of a role's grant for one screen. Mirrors the matching
// used by selectionsFromRole (role.permissions by featureId, else the feature's
// own permissions list by roleId) WITHOUT mutating any submit payload.
function crudForRoleFeature(role, feature) {
  const perms = Array.isArray(role?.permissions) ? role.permissions : [];
  const byId = perms.find(
    (p) => Number(p?.featureId ?? p?.id) === Number(feature?.id)
  );
  const fromFeature = Array.isArray(feature?.permissions)
    ? feature.permissions.find((p) => Number(p?.roleId) === Number(role?.id))
    : null;
  const source = byId || fromFeature;
  return source ? pickCrud(source) : emptyActions();
}

const hasAnyCrud = (crud) => ACTION_OPTIONS.some((action) => crud[action]);

// Compact, scannable cell: a green letter chip per granted action (V/C/E/D),
// dashed placeholders for the rest, and the full action list in the tooltip.
// Fully-denied screens collapse to one grey pill so empty rows read at a glance.
function GrantCell({ crud }) {
  const granted = ACTION_OPTIONS.filter((action) => crud[action]);
  if (!granted.length) {
    return (
      <span
        title="No access to this screen"
        style={{
          display: "inline-block",
          padding: "2px 9px",
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 600,
          color: "var(--muted)",
          background: "var(--n-100, #f1f3f8)",
          border: "1px solid var(--line)",
        }}
      >
        Denied
      </span>
    );
  }
  const label = granted.map((action) => ACTION_LABEL[action]).join(" · ");
  const full = granted.length === ACTION_OPTIONS.length;
  return (
    <span
      title={full ? `Full access — ${label}` : label}
      style={{ display: "inline-flex", gap: 3, whiteSpace: "nowrap" }}
    >
      {ACTION_OPTIONS.map((action) => {
        const on = crud[action];
        return (
          <span
            key={action}
            aria-hidden="true"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 19,
              height: 19,
              borderRadius: 5,
              fontSize: 10.5,
              fontWeight: 700,
              lineHeight: 1,
              color: on ? "var(--success-700)" : "var(--muted)",
              background: on ? "var(--success-bg)" : "transparent",
              border: on ? "1px solid transparent" : "1px dashed var(--line)",
              opacity: on ? 1 : 0.6,
            }}
          >
            {ACTION_INITIAL[action]}
          </span>
        );
      })}
      <span
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          border: 0,
        }}
      >
        {label}
      </span>
    </span>
  );
}

// "Who can open which screen" — one enterprise-grade matrix with a sticky header
// row, a sticky first column, in-table search, a single-role focus filter and a
// granted-only collapse. Self-contained: manages its own view state and reads
// existing role/feature data only (no API or payload changes).
function ScreenAccessMatrix({ roles, features }) {
  const [query, setQuery] = useState("");
  const [roleId, setRoleId] = useState("");
  const [grantedOnly, setGrantedOnly] = useState(false);

  const roleOptions = useMemo(
    () =>
      roles.map((role) => ({
        value: String(role?.id),
        label: role?.name || `Role ${role?.id ?? ""}`,
      })),
    [roles]
  );

  const visibleRoles = useMemo(
    () => (roleId ? roles.filter((role) => String(role?.id) === String(roleId)) : roles),
    [roles, roleId]
  );

  const q = query.trim().toLowerCase();
  const searchedFeatures = useMemo(() => {
    if (!q) return features;
    return features.filter((feature) => {
      const title = pretty(feature?.title).toLowerCase();
      const key = String(feature?.key || "").toLowerCase();
      return title.includes(q) || key.includes(q);
    });
  }, [features, q]);

  const visibleFeatures = useMemo(() => {
    if (!grantedOnly) return searchedFeatures;
    return searchedFeatures.filter((feature) =>
      visibleRoles.some((role) => hasAnyCrud(crudForRoleFeature(role, feature)))
    );
  }, [searchedFeatures, grantedOnly, visibleRoles]);

  const hasFilters = Boolean(q || roleId || grantedOnly);

  if (!features.length) {
    return <Notice>No screens found yet. Add a permission to populate the matrix.</Notice>;
  }

  const headCellBase = {
    position: "sticky",
    top: 0,
    zIndex: 2,
    background: "var(--canvas)",
    padding: "10px 12px",
    borderBottom: "1px solid var(--line)",
    fontSize: 11.5,
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: "var(--muted)",
    whiteSpace: "nowrap",
  };

  const firstColShadow = "6px 0 8px -8px rgba(15, 23, 42, 0.25)";

  return (
    <DirectoryTableWrap
      toolbar={
        <DirectoryToolbar>
          <DirectorySearch
            id="screen-access-search"
            value={query}
            onChange={setQuery}
            placeholder="Search screens by name or key…"
          />
          <DirectoryToolSelect label="Role">
            <Select
              aria-label="Focus a single role"
              value={roleId}
              onChange={(value) => setRoleId(value ?? "")}
              options={roleOptions}
              placeholder="All roles"
            />
          </DirectoryToolSelect>
          <DirectoryTool>
            <CheckRow
              label="Granted only"
              checked={grantedOnly}
              onChange={() => setGrantedOnly((prev) => !prev)}
            />
          </DirectoryTool>
          <DirectoryToolbarEnd>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>
              {visibleFeatures.length} screen{visibleFeatures.length === 1 ? "" : "s"}
              {" · "}
              {visibleRoles.length} role{visibleRoles.length === 1 ? "" : "s"}
            </span>
            {hasFilters ? (
              <DirectoryClearButton
                onClick={() => {
                  setQuery("");
                  setRoleId("");
                  setGrantedOnly(false);
                }}
              />
            ) : null}
          </DirectoryToolbarEnd>
        </DirectoryToolbar>
      }
    >
      <div
        style={{
          maxHeight: 540,
          overflow: "auto",
          position: "relative",
          background: "var(--surface)",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "separate",
            borderSpacing: 0,
            minWidth: Math.max(560, 220 + visibleRoles.length * 132),
          }}
        >
          <thead>
            <tr>
              <th
                scope="col"
                style={{
                  ...headCellBase,
                  left: 0,
                  zIndex: 4,
                  textAlign: "left",
                  minWidth: 200,
                  boxShadow: firstColShadow,
                }}
              >
                Screen
              </th>
              {visibleRoles.map((role) => (
                <th
                  key={role?.id ?? role?.name}
                  scope="col"
                  style={{ ...headCellBase, textAlign: "center", minWidth: 128 }}
                >
                  {role?.name || `Role ${role?.id ?? ""}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!visibleFeatures.length ? (
              <tr>
                <td
                  colSpan={visibleRoles.length + 1}
                  style={{ padding: 28, textAlign: "center", color: "var(--muted)" }}
                >
                  No screens match these filters.
                </td>
              </tr>
            ) : (
              visibleFeatures.map((feature) => (
                <tr key={feature?.id}>
                  <td
                    style={{
                      position: "sticky",
                      left: 0,
                      zIndex: 1,
                      background: "var(--surface)",
                      padding: "10px 12px",
                      borderBottom: "1px solid var(--line)",
                      boxShadow: firstColShadow,
                    }}
                  >
                    <FeatureTitle feature={feature} />
                  </td>
                  {visibleRoles.map((role) => (
                    <td
                      key={role?.id ?? role?.name}
                      style={{
                        padding: "10px 12px",
                        borderBottom: "1px solid var(--line)",
                        textAlign: "center",
                      }}
                    >
                      <GrantCell crud={crudForRoleFeature(role, feature)} />
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </DirectoryTableWrap>
  );
}

function SectionHeading({ title, description }) {
  return (
    <div>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{title}</h2>
      {description ? (
        <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 13.5 }}>
          {description}
        </p>
      ) : null}
    </div>
  );
}

export default function RolePermission() {
  const { success, error } = useToaster();
  const { data: rolesRes, isLoading: isRolesLoading, isError, refetch: refetchRoles } =
    useGetAllRolesQuery();
  const { data: featuresRes, refetch: refetchFeatures } = useGetFeaturesQuery();
  const [addFeature, { isLoading: isAddingFeature }] = useAddFeatureMutation();
  const [addLaundryRole, { isLoading: isAddingRole }] = useAddLaundryRoleMutation();
  const [updateRole, { isLoading: isUpdatingRole }] = useUpdateRoleMutation();

  const roles = useMemo(() => extractList(rolesRes, ["roles", "items", "rows"]), [rolesRes]);
  const agentShopRoles = useMemo(() => roles.filter((r) => isAgentShopStaffRole(r)), [roles]);
  const zoneRoles = useMemo(
    () => roles.filter((r) => !isAgentShopStaffRole(r) && isZoneManagerRole(r)),
    [roles]
  );
  const platformRoles = useMemo(
    () => roles.filter((r) => !isAgentShopStaffRole(r) && !isZoneManagerRole(r)),
    [roles]
  );
  // One table, ordered: platform (Admin Managers) → zone managers → agent shop.
  const allRoles = useMemo(
    () => [...platformRoles, ...zoneRoles, ...agentShopRoles],
    [platformRoles, zoneRoles, agentShopRoles]
  );

  const permissionOptions = useMemo(() => normalizeFeatureOptions(featuresRes), [featuresRes]);
  const adminFeatures = useMemo(
    () => permissionOptions.filter((f) => !f.featureOf || ADMIN_FEATURE_OF.has(f.featureOf)),
    [permissionOptions]
  );
  const agentFeatures = useMemo(
    () => permissionOptions.filter((f) => !f.featureOf || AGENT_FEATURE_OF.has(f.featureOf)),
    [permissionOptions]
  );

  const [permissionModal, setPermissionModal] = useState(false);
  const [roleModal, setRoleModal] = useState(false);
  const [isEditRoleMode, setIsEditRoleMode] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [editingIsAgentShop, setEditingIsAgentShop] = useState(false);
  const [editingIsSystemRole, setEditingIsSystemRole] = useState(false);

  const [permissionPath, setPermissionPath] = useState("");
  const [featureOf, setFeatureOf] = useState(DEFAULT_FEATURE_OF);

  const sidebarPermissionOptions = useMemo(() => getSidebarPermissionSelectOptions(), []);

  const [roleName, setRoleName] = useState("");
  const [roleStatus, setRoleStatus] = useState(true);
  const [roleSelections, setRoleSelections] = useState({});

  const editablePermissionOptions = useMemo(
    () => (editingIsAgentShop ? agentFeatures : adminFeatures),
    [editingIsAgentShop, adminFeatures, agentFeatures]
  );

  const handleRoleActionToggle = (featureId, action) => {
    if (isViewMode) return;
    const key = String(featureId);
    setRoleSelections((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || emptyActions()),
        [action]: !prev?.[key]?.[action],
      },
    }));
  };

  const resetRoleSelectionsToEmpty = (features = adminFeatures) => {
    const reset = {};
    features.forEach((feature) => {
      reset[String(feature.id)] = emptyActions();
    });
    setRoleSelections(reset);
  };

  const grantAllRoleActions = () => {
    if (isViewMode) return;
    setRoleSelections((prev) => {
      const next = { ...prev };
      editablePermissionOptions.forEach((feature) => {
        next[String(feature.id)] = {
          create: true,
          read: true,
          update: true,
          delete: true,
        };
      });
      return next;
    });
  };

  const clearAllRoleActions = () => {
    if (isViewMode) return;
    setRoleSelections((prev) => {
      const next = { ...prev };
      editablePermissionOptions.forEach((feature) => {
        next[String(feature.id)] = emptyActions();
      });
      return next;
    });
  };

  // Running count of screens with at least one action ticked (drives the modal
  // summary line and the disabled state of the primary button).
  const grantedScreenTally = editablePermissionOptions.filter((feature) =>
    ACTION_OPTIONS.some((action) => roleSelections[String(feature.id)]?.[action])
  ).length;

  const closePermissionModal = () => {
    setPermissionModal(false);
    setPermissionPath("");
    setFeatureOf(DEFAULT_FEATURE_OF);
  };

  const closeRoleModal = () => {
    setRoleModal(false);
    setIsEditRoleMode(false);
    setIsViewMode(false);
    setEditingRoleId(null);
    setEditingIsAgentShop(false);
    setEditingIsSystemRole(false);
    setRoleName("");
    setRoleStatus(true);
    setRoleSelections({});
  };

  const openAddRoleModal = () => {
    setIsEditRoleMode(false);
    setIsViewMode(false);
    setEditingRoleId(null);
    setEditingIsAgentShop(false);
    setEditingIsSystemRole(false);
    setRoleStatus(true);
    setRoleName("");
    resetRoleSelectionsToEmpty(adminFeatures);
    setRoleModal(true);
  };

  const openRoleModal = (role, readOnly = false) => {
    const roleId = role?.id;
    if (!roleId) return;
    const info = roleTypeInfo(role);
    const agentShop = Boolean(info.agentShop);
    setIsEditRoleMode(true);
    setIsViewMode(readOnly);
    setEditingRoleId(roleId);
    setEditingIsAgentShop(agentShop);
    setEditingIsSystemRole(Boolean(info.system));
    setRoleName(role?.name || "");
    setRoleStatus(Boolean(role?.status));
    setRoleSelections(selectionsFromRole(role, agentShop ? agentFeatures : adminFeatures));
    setRoleModal(true);
  };

  const submitPermission = async () => {
    if (!permissionPath) return error("Select a screen from the list.");
    const selected = sidebarPermissionOptions.find((o) => o.value === permissionPath);
    const normalized = selected?.featureKey || "";
    if (!normalized) return error("Could not derive a permission key for that screen.");
    try {
      await addFeature({
        title: selected?.menuLabel || normalized,
        status: true,
        featureOf,
        key: normalized,
      }).unwrap();
      success("Feature added successfully.");
      closePermissionModal();
      refetchFeatures();
    } catch (err) {
      error(err?.data?.message ?? "Failed to add feature.");
    }
  };

  const submitRole = async () => {
    const name = roleName.trim();
    if (!name) return error("Role name is required.");

    const featuresForSubmit = editingIsAgentShop ? agentFeatures : adminFeatures;
    const permissionRole = permissionRolePayload(featuresForSubmit, roleSelections);
    if (!permissionRole.length) {
      return error("Select at least one permission.");
    }

    try {
      if (isEditRoleMode) {
        await updateRole({
          id: editingRoleId,
          name,
          status: roleStatus,
          permissionRole,
        }).unwrap();
        success(
          editingIsAgentShop
            ? "Agent shop permissions updated (accept / assign / wallet rights unchanged)."
            : "Role permissions updated."
        );
      } else {
        await addLaundryRole({ name, permissionRole, scope: "platform" }).unwrap();
        success("Admin Manager role added successfully.");
      }
      closeRoleModal();
      refetchRoles();
      refetchFeatures();
    } catch (err) {
      error(err?.data?.message ?? (isEditRoleMode ? "Failed to update role." : "Failed to add role."));
    }
  };

  const roleColumns = useMemo(
    () => [
      {
        key: "role",
        header: "Role",
        render: (role) => {
          const info = roleTypeInfo(role);
          return (
            <DirectoryIdentity
              name={role?.name ?? `Role ${role?.id ?? ""}`}
              meta={info.meta}
              id={role?.id}
            />
          );
        },
      },
      {
        key: "type",
        header: "Type",
        render: (role) => {
          const info = roleTypeInfo(role);
          return <DirectoryDotPill tone={info.tone}>{info.label}</DirectoryDotPill>;
        },
      },
      {
        key: "status",
        header: "Status",
        render: (role) => <DirectoryStatusPill active={role?.status} />,
      },
      {
        key: "screens",
        header: "Screens granted",
        align: "right",
        render: (role) => <DirectoryMetric value={grantedScreenCount(role)} hint="screens" />,
      },
      {
        key: "actions",
        header: "Actions",
        render: (role) => (
          <DirectoryActions>
            <DirectoryActionView title="View permissions" onClick={() => openRoleModal(role, true)} />
            <DirectoryActionEdit title="Edit permissions" onClick={() => openRoleModal(role, false)} />
          </DirectoryActions>
        ),
      },
    ],
    // openRoleModal is stable enough for this list; roles drive the data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [adminFeatures, agentFeatures]
  );

  if (isRolesLoading) return <Delay />;
  if (isError) {
    return <p style={{ color: "var(--danger)", margin: 0 }}>Could not load roles.</p>;
  }

  const roleModalTitle = isViewMode
    ? `${roleName || "Role"} — permissions`
    : isEditRoleMode
      ? `Edit ${roleName || "role"}`
      : "Create Admin Manager role";

  const roleModalDescription = isViewMode
    ? "Screens this role can use. Choose Edit permissions to change access."
    : editingIsAgentShop
      ? "Tick the screens this Agent employee role can open. Accept / assign / team / wallet rights are fixed by the role and don't change here."
      : isEditRoleMode
        ? "Tick View / Create / Edit / Delete per screen. Staff still need View to open a screen."
        : "Platform role: works across all zones, only on the screens you grant below.";

  const nameLocked = isViewMode || editingIsSystemRole;

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <PageHeader
        title="Role and Permission"
        description="All roles in one place. View or edit any role to see and change exactly which screens it can use."
        actions={
          <>
            <Button variant="secondary" onClick={() => setPermissionModal(true)}>
              Add Permission
            </Button>
            <Button onClick={openAddRoleModal}>Add Admin Manager role</Button>
          </>
        }
      />

      <DirectoryMetrics
        items={[
          { label: "Total roles", value: allRoles.length, tone: "brand" },
          { label: "Admin Manager roles", value: platformRoles.length, tone: "success" },
          { label: "Zone Manager roles", value: zoneRoles.length, tone: "navy" },
          { label: "Admin screens", value: adminFeatures.length, tone: "warning" },
        ]}
      />

      <div style={{ display: "grid", gap: 12 }}>
        <SectionHeading
          title="Roles"
          description="Every role in one list. Use View to inspect its screens or Edit to change access."
        />
        <DirectoryTableWrap>
          <Table
            columns={roleColumns}
            rows={allRoles}
            rowKey={(role) => role?.id ?? role?.name}
            empty="No roles found. Deploy seeders, then refresh."
          />
        </DirectoryTableWrap>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        <SectionHeading
          title="Who can open which screen"
          description="Screens down the side, roles across the top. Each cell shows the granted actions — V (View), C (Create), E (Edit), D (Delete) — or Denied. The header row and screen column stay pinned while you scroll; search, focus one role, or hide fully-denied screens to cut the noise."
        />
        <ScreenAccessMatrix roles={allRoles} features={permissionOptions} />
      </div>

      {/* Add / Edit / View role permissions */}
      <Modal
        open={roleModal}
        onClose={closeRoleModal}
        title={roleModalTitle}
        description={roleModalDescription}
        primaryLabel={isViewMode ? "Edit permissions" : isEditRoleMode ? "Save changes" : "Create role"}
        onPrimary={isViewMode ? () => setIsViewMode(false) : submitRole}
        primaryDisabled={
          !isViewMode &&
          (isAddingRole ||
            isUpdatingRole ||
            !roleName.trim() ||
            grantedScreenTally === 0)
        }
        secondaryLabel={isViewMode ? "Close" : "Cancel"}
        size="lg"
      >
        <div style={{ display: "grid", gap: 20 }}>
          {/* Section 1 — the role itself */}
          <div style={{ display: "grid", gap: 12 }}>
            <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Role details
            </h4>
            <Field
              label="Role name"
              htmlFor="role-name"
              hint={
                nameLocked
                  ? "This is a fixed system role, so its name can't be changed here."
                  : "Shown wherever this role appears and used when assigning it to staff. Pick something staff will recognise, e.g. “Operations Manager”."
              }
            >
              <Input
                id="role-name"
                placeholder="Admin Manager"
                value={roleName}
                onChange={(e) => {
                  if (nameLocked) return;
                  setRoleName(e.target.value);
                }}
                disabled={nameLocked}
              />
            </Field>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                border: "1px solid var(--line)",
                borderRadius: "var(--r-md)",
                padding: "10px 12px",
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>Role status</div>
                <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
                  Active roles can be assigned and used to sign in; inactive roles are kept but blocked.
                </div>
              </div>
              <Toggle
                checked={roleStatus}
                disabled={isViewMode}
                onChange={() => {
                  if (isViewMode) return;
                  setRoleStatus((prev) => !prev);
                }}
              />
            </div>
          </div>

          {/* Section 2 — screen grants */}
          <div style={{ display: "grid", gap: 10 }}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  {editingIsAgentShop ? "Agent screens" : "Admin screens"}
                </h4>
                <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 13, lineHeight: 1.5 }}>
                  {isViewMode
                    ? "The actions this role can perform on each screen."
                    : "Tick the actions this role can perform on each screen."}{" "}
                  {editingIsAgentShop
                    ? "Only Agent / Agent Employee / both screens are shown; accept, assign, team and wallet rights are fixed by the role."
                    : "Only Admin / both screens are shown, each with its live API key."}
                </p>
                <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: 12.5, lineHeight: 1.5 }}>
                  <strong>View</strong> opens the screen · <strong>Create</strong> adds new records ·{" "}
                  <strong>Edit</strong> changes them · <strong>Delete</strong> removes them. Staff still
                  need View to open a screen.
                </p>
              </div>
              {!isViewMode && editablePermissionOptions.length ? (
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <Button variant="ghost" size="sm" onClick={grantAllRoleActions}>
                    Select all
                  </Button>
                  <Button variant="ghost" size="sm" onClick={clearAllRoleActions}>
                    Clear all
                  </Button>
                </div>
              ) : null}
            </div>

            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: grantedScreenTally ? "var(--success-700)" : "var(--muted)",
              }}
            >
              {grantedScreenTally} of {editablePermissionOptions.length} screen
              {editablePermissionOptions.length === 1 ? "" : "s"} granted
            </div>

            {!editablePermissionOptions.length ? (
              <Notice>No permissions found. Add permissions first.</Notice>
            ) : (
              <PermissionMatrix
                features={editablePermissionOptions}
                selections={roleSelections}
                onToggle={handleRoleActionToggle}
                readOnly={isViewMode}
              />
            )}
          </div>
        </div>
      </Modal>

      {/* Add a new sidebar screen (feature) to the catalog */}
      <Modal
        open={permissionModal}
        onClose={closePermissionModal}
        title="Add New Permission"
        description="Register a sidebar screen so roles can be granted access to it. This adds the screen to the catalogue — it doesn't grant it to anyone yet."
        primaryLabel="Add Permission"
        onPrimary={submitPermission}
        primaryDisabled={isAddingFeature || !permissionPath}
        size="md"
      >
        <div style={{ display: "grid", gap: 16 }}>
          <Field
            label="Screen / tab"
            hint="The sidebar screen to make controllable. The value in brackets is its screen key — the exact identifier the app checks at runtime to decide who can open it."
          >
            <Select
              aria-label="Permission screen"
              value={permissionPath}
              onChange={setPermissionPath}
              options={sidebarPermissionOptions.map((opt) => ({
                value: opt.value,
                label: `${opt.menuLabel} (${opt.featureKey})`,
              }))}
              placeholder="Select a screen"
            />
          </Field>
          {permissionPath ? (
            <Notice>
              Live key:{" "}
              <code>
                {sidebarPermissionOptions.find((o) => o.value === permissionPath)?.featureKey || "—"}
              </code>
            </Notice>
          ) : null}
          <Field
            label="Feature of"
            hint="Who this screen belongs to. It decides which roles can be granted the screen: Admin (platform staff), Agent / Agent Employee (shop side), or Both."
          >
            <Select
              aria-label="Feature of"
              value={featureOf}
              onChange={setFeatureOf}
              options={FEATURE_OF_OPTIONS}
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
