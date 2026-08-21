import { useEffect, useMemo, useState } from "react";
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
  DirectoryActions,
  DirectoryActionView,
  DirectoryIdentity,
  DirectoryMetrics,
  DirectoryStatusPill,
  DirectoryTableWrap,
  DirectoryViewModal,
} from "../directory-table/directoryTable";
import { formatDisplayDate } from "../directory-table/directoryTableUtils";
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

const ACTION_OPTIONS = ["create", "read", "update", "delete"];

const FEATURE_OF_OPTIONS = [
  { label: "Admin", value: "Admin" },
  { label: "Agent", value: "Agent" },
  { label: "Both", value: "both" },
  { label: "Agent Employee", value: "Agent Employee" },
];
const DEFAULT_FEATURE_OF = "Agent Employee";

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

const AGENT_FEATURE_OF = new Set(["Agent", "Agent Employee", "both"]);

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
  const otherRoles = useMemo(() => roles.filter((r) => !isAgentShopStaffRole(r)), [roles]);
  const permissionOptions = useMemo(() => normalizeFeatureOptions(featuresRes), [featuresRes]);

  const [permissionModal, setPermissionModal] = useState(false);
  const [roleModal, setRoleModal] = useState(false);
  const [isEditRoleMode, setIsEditRoleMode] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [editingIsAgentShop, setEditingIsAgentShop] = useState(false);

  const [permissionPath, setPermissionPath] = useState("");
  const [featureOf, setFeatureOf] = useState(DEFAULT_FEATURE_OF);

  const sidebarPermissionOptions = useMemo(() => getSidebarPermissionSelectOptions(), []);

  const [roleName, setRoleName] = useState("");
  const [roleStatus, setRoleStatus] = useState(true);
  const [roleSelections, setRoleSelections] = useState({});
  const [viewRole, setViewRole] = useState(null);

  const editablePermissionOptions = useMemo(() => {
    if (!editingIsAgentShop) return permissionOptions;
    return permissionOptions.filter((f) => {
      if (!f.featureOf) return true;
      return AGENT_FEATURE_OF.has(f.featureOf);
    });
  }, [permissionOptions, editingIsAgentShop]);

  useEffect(() => {
    setRoleSelections((prev) => {
      const next = {};
      permissionOptions.forEach((feature) => {
        const existing = prev[String(feature.id)] || {};
        next[String(feature.id)] = ACTION_OPTIONS.reduce(
          (acc, action) => ({ ...acc, [action]: Boolean(existing[action]) }),
          {}
        );
      });
      return next;
    });
  }, [permissionOptions]);

  const resetRoleSelectionsToEmpty = () => {
    const reset = {};
    permissionOptions.forEach((feature) => {
      reset[String(feature.id)] = emptyActions();
    });
    setRoleSelections(reset);
  };

  const handleRoleActionToggle = (featureId, action) => {
    const key = String(featureId);
    setRoleSelections((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        [action]: !prev?.[key]?.[action],
      },
    }));
  };

  const closePermissionModal = () => {
    setPermissionModal(false);
    setPermissionPath("");
    setFeatureOf(DEFAULT_FEATURE_OF);
  };

  const closeRoleModal = () => {
    setRoleModal(false);
    setIsEditRoleMode(false);
    setEditingRoleId(null);
    setEditingIsAgentShop(false);
    setRoleName("");
    setRoleStatus(true);
    setRoleSelections((prev) => {
      const reset = {};
      Object.keys(prev).forEach((id) => {
        reset[id] = emptyActions();
      });
      return reset;
    });
  };

  const submitPermission = async () => {
    if (!permissionPath) return error("Select a screen from the list.");

    const selected = sidebarPermissionOptions.find((o) => o.value === permissionPath);
    const normalized = selected?.featureKey || "";
    if (!normalized) return error("Could not derive a permission key for that screen.");

    try {
      await addFeature({
        title: normalized,
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

    const featuresForSubmit = editingIsAgentShop ? editablePermissionOptions : permissionOptions;

    const permissionRole = featuresForSubmit
      .map((feature) => {
        const actions = roleSelections[String(feature.id)] || {};
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
            ? "Agent shop feature defaults updated (ops rights unchanged)."
            : "Role updated successfully."
        );
      } else {
        await addLaundryRole({ name, permissionRole }).unwrap();
        success("Role added successfully.");
      }
      closeRoleModal();
      refetchRoles();
      refetchFeatures();
    } catch (err) {
      error(err?.data?.message ?? (isEditRoleMode ? "Failed to update role." : "Failed to add role."));
    }
  };

  const openEditRoleModal = (role) => {
    const roleId = role?.id;
    if (!roleId) return;

    const agentShop = isAgentShopStaffRole(role);
    setIsEditRoleMode(true);
    setEditingRoleId(roleId);
    setEditingIsAgentShop(agentShop);
    setRoleName(role?.name || "");
    setRoleStatus(Boolean(role?.status));

    const existingFromRole = Array.isArray(role?.permissionRole) ? role.permissionRole : [];
    const byFeatureId = new Map(
      existingFromRole
        .filter((e) => e != null && e.id != null)
        .map((e) => [Number(e.id), e?.permissions])
    );

    const featuresForEdit = agentShop
      ? permissionOptions.filter((f) => !f.featureOf || AGENT_FEATURE_OF.has(f.featureOf))
      : permissionOptions;

    const next = {};
    featuresForEdit.forEach((feature) => {
      const fid = Number(feature.id);
      const fromFeatures = feature.permissions?.find((p) => Number(p?.roleId) === Number(roleId));
      const fromRoleList = byFeatureId.get(fid);
      const source = fromFeatures || fromRoleList;
      next[String(feature.id)] = source ? pickCrud(source) : emptyActions();
    });

    setRoleSelections(next);
    setRoleModal(true);
  };

  const roleColumns = [
    {
      key: "name",
      header: "Role",
      render: (role) => (
        <DirectoryIdentity
          name={role?.name ?? `Role ${role?.id ?? ""}`}
          meta={[
            isAgentShopStaffRole(role) ? "Agent employee" : null,
            role?.audience === "admin_portal" ? "Admin employee" : null,
            role?.isSystem ? "System" : null,
          ]
            .filter(Boolean)
            .join(" · ") || null}
          id={role?.id}
        />
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (role) => (
        <DirectoryStatusPill active={role?.status} />
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (role) => (
        <DirectoryActions>
          <DirectoryActionView onClick={() => setViewRole(role)} />
          {isAgentShopStaffRole(role) ? (
            <Button size="sm" variant="secondary" onClick={() => openEditRoleModal(role)}>
              Edit defaults
            </Button>
          ) : (
            <DirectoryActionEdit onClick={() => openEditRoleModal(role)} />
          )}
        </DirectoryActions>
      ),
    },
  ];

  if (isRolesLoading) return <Delay />;
  if (isError) {
    return <p style={{ color: "var(--danger)", margin: 0 }}>Could not load roles.</p>;
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <PageHeader
        title="Role and Permission"
        description="Define admin and agent shop roles, then assign screen-level CRUD."
        actions={
          <>
            <Button variant="secondary" onClick={() => setPermissionModal(true)}>
              Add Permission
            </Button>
            <Button
              onClick={() => {
                setIsEditRoleMode(false);
                setEditingRoleId(null);
                setEditingIsAgentShop(false);
                setRoleStatus(true);
                setRoleName("");
                resetRoleSelectionsToEmpty();
                setRoleModal(true);
              }}
            >
              Add Role
            </Button>
          </>
        }
      />

      <DirectoryMetrics
        items={[
          { label: "Total roles", value: roles.length, tone: "brand" },
          { label: "Agent shop", value: agentShopRoles.length, tone: "navy" },
          { label: "Admin / custom", value: otherRoles.length, tone: "success" },
        ]}
      />

      <section>
        <h3 style={{ margin: "0 0 8px" }}>Agent shop defaults</h3>
        <p style={{ margin: "0 0 16px", color: "var(--muted)", fontSize: 14 }}>
          Laundry Shop Driver (6) and Manager (8). Edit feature menu CRUD here. Accept / assign /
          team / wallet rights are fixed by role and do not change with these checkboxes.
        </p>
        <DirectoryTableWrap>
          <Table
            columns={roleColumns}
            rows={agentShopRoles}
            rowKey={(role) => role?.id ?? role?.name}
            empty="No roles found."
          />
        </DirectoryTableWrap>
      </section>

      <section>
        <h3 style={{ margin: "0 0 16px" }}>Admin / custom roles</h3>
        <DirectoryTableWrap>
          <Table
            columns={roleColumns}
            rows={otherRoles}
            rowKey={(role) => role?.id ?? role?.name}
            empty="No roles found."
          />
        </DirectoryTableWrap>
      </section>

      <Modal
        open={permissionModal}
        onClose={closePermissionModal}
        title="Add New Permission"
        description="Add a feature first so it can be used in roles."
        primaryLabel="Add Permission"
        onPrimary={submitPermission}
        primaryDisabled={isAddingFeature}
        size="md"
      >
        <div style={{ display: "grid", gap: 16 }}>
          <Field label="Screen / tab">
            <Select
              aria-label="Permission screen"
              value={permissionPath}
              onChange={setPermissionPath}
              options={sidebarPermissionOptions.map((opt) => ({
                value: opt.value,
                label: opt.menuLabel,
              }))}
              placeholder="Select a screen"
            />
          </Field>
          <Field label="Feature of">
            <Select
              aria-label="Feature of"
              value={featureOf}
              onChange={setFeatureOf}
              options={FEATURE_OF_OPTIONS}
            />
          </Field>
        </div>
      </Modal>

      <Modal
        open={roleModal}
        onClose={closeRoleModal}
        title={
          isEditRoleMode
            ? editingIsAgentShop
              ? "Edit Agent shop feature defaults"
              : "Update Role"
            : "Create New Role"
        }
        description={
          editingIsAgentShop
            ? "Update feature menu permissions for this Agent employee role. Does not change accept, assign, team, or wallet rights."
            : isEditRoleMode
              ? "Update role details and permissions."
              : "Define a new role and assign permission."
        }
        primaryLabel={isEditRoleMode ? "Update Role" : "Add Role"}
        onPrimary={submitRole}
        primaryDisabled={isAddingRole || isUpdatingRole}
        size="lg"
      >
        <div style={{ display: "grid", gap: 16 }}>
          <Field label="Role Name" htmlFor="role-name">
            <Input
              id="role-name"
              placeholder="Enter full name"
              value={roleName}
              onChange={(e) => {
                if (editingIsAgentShop) return;
                setRoleName(e.target.value);
              }}
              disabled={editingIsAgentShop}
            />
          </Field>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-md)",
              padding: "10px 12px",
            }}
          >
            <span>Role Status</span>
            <Toggle checked={roleStatus} onChange={() => setRoleStatus((prev) => !prev)} />
          </div>

          <div>
            <h4 style={{ margin: "0 0 8px" }}>Assign Permission</h4>
            <p style={{ margin: "0 0 12px", color: "var(--muted)", fontSize: 13 }}>
              {editingIsAgentShop
                ? "Only Agent / Agent Employee / both features are shown."
                : "Select the permission for this role."}
            </p>
            {!editablePermissionOptions.length ? (
              <Notice>No permissions found. Add permissions first.</Notice>
            ) : (
              <div style={{ display: "grid", gap: 16 }}>
                {editablePermissionOptions.map((feature) => (
                  <div key={feature.id}>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>{pretty(feature.title)}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                      {ACTION_OPTIONS.map((action) => (
                        <CheckRow
                          key={`${feature.id}-${action}`}
                          checked={Boolean(roleSelections?.[String(feature.id)]?.[action])}
                          onChange={() => handleRoleActionToggle(feature.id, action)}
                          label={pretty(action)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      <DirectoryViewModal
        open={Boolean(viewRole)}
        title={viewRole?.name || "Role"}
        onClose={() => setViewRole(null)}
        fields={[
          { label: "Role ID", value: viewRole?.id },
          { label: "Name", value: viewRole?.name },
          { label: "Audience", value: viewRole?.audience || "—" },
          { label: "System", value: viewRole?.isSystem ? "Yes" : "No" },
          { label: "Status", value: viewRole?.status ? "Active" : "Inactive" },
          { label: "Created", value: formatDisplayDate(viewRole?.createdAt) },
          { label: "Updated", value: formatDisplayDate(viewRole?.updatedAt) },
        ]}
      />
    </div>
  );
}
