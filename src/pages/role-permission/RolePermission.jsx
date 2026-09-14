import { useEffect, useMemo, useState } from "react";
import {
  Badge,
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
  DirectoryIdentity,
  DirectoryMetrics,
  DirectoryStatusPill,
  DirectoryTableWrap,
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

const crudSummary = (perm) => {
  const bits = ACTION_OPTIONS.filter((action) => perm?.[action]).map((action) => ACTION_LABEL[action]);
  return bits.length ? bits.join(" · ") : "No access";
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
      <div style={{ fontWeight: 600 }}>{pretty(feature.title)}</div>
      <code style={{ fontSize: 12, color: "var(--muted)" }}>{feature.key || "missing key"}</code>
    </div>
  );
}

function PermissionMatrix({ features, selections, onToggle, empty }) {
  if (!features.length) {
    return <Notice>No Admin screens found. Add a permission with feature of Admin.</Notice>;
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
  const permissionOptions = useMemo(() => normalizeFeatureOptions(featuresRes), [featuresRes]);
  const adminFeatures = useMemo(
    () =>
      permissionOptions.filter((f) => !f.featureOf || ADMIN_FEATURE_OF.has(f.featureOf)),
    [permissionOptions]
  );
  const agentFeatures = useMemo(
    () => permissionOptions.filter((f) => !f.featureOf || AGENT_FEATURE_OF.has(f.featureOf)),
    [permissionOptions]
  );

  const glanceRoles = useMemo(() => [...zoneRoles, ...platformRoles], [zoneRoles, platformRoles]);

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
  const [zoneSelections, setZoneSelections] = useState({});
  const [platformSelections, setPlatformSelections] = useState({});
  const [selectedPlatformRoleId, setSelectedPlatformRoleId] = useState("");

  const zoneRole = zoneRoles[0] || null;
  const selectedPlatformRole = useMemo(
    () => platformRoles.find((r) => String(r.id) === String(selectedPlatformRoleId)) || platformRoles[0] || null,
    [platformRoles, selectedPlatformRoleId]
  );

  useEffect(() => {
    if (!selectedPlatformRoleId && platformRoles[0]?.id) {
      setSelectedPlatformRoleId(String(platformRoles[0].id));
    }
  }, [platformRoles, selectedPlatformRoleId]);

  useEffect(() => {
    if (zoneRole) setZoneSelections(selectionsFromRole(zoneRole, adminFeatures));
  }, [zoneRole, adminFeatures]);

  useEffect(() => {
    if (selectedPlatformRole) {
      setPlatformSelections(selectionsFromRole(selectedPlatformRole, adminFeatures));
    }
  }, [selectedPlatformRole, adminFeatures]);

  const editablePermissionOptions = useMemo(() => {
    if (editingIsAgentShop) return agentFeatures;
    return adminFeatures;
  }, [editingIsAgentShop, permissionOptions, adminFeatures, agentFeatures]);

  const handleMatrixToggle = (setter) => (featureId, action) => {
    const key = String(featureId);
    setter((prev) => ({
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

  const handleRoleActionToggle = (featureId, action) => {
    const key = String(featureId);
    setRoleSelections((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || emptyActions()),
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
    setRoleSelections({});
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

  const saveRolePermissions = async (role, features, selections, fallbackName) => {
    if (!role?.id) return error("Select a role first.");
    const permissionRole = permissionRolePayload(features, selections);
    if (!permissionRole.length) {
      return error("Select at least one permission.");
    }
    try {
      await updateRole({
        id: role.id,
        name: role.name || fallbackName,
        status: role.status !== false,
        permissionRole,
      }).unwrap();
      success(`${role.name || "Role"} permissions saved.`);
      refetchRoles();
      refetchFeatures();
    } catch (err) {
      error(err?.data?.message ?? "Failed to save permissions.");
    }
  };

  const submitRole = async () => {
    const name = roleName.trim();
    if (!name) return error("Role name is required.");

    const featuresForSubmit = editingIsAgentShop ? editablePermissionOptions : adminFeatures;
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
            ? "Agent shop feature defaults updated (ops rights unchanged)."
            : "Role updated successfully."
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

  const openEditRoleModal = (role) => {
    const roleId = role?.id;
    if (!roleId) return;

    const agentShop = isAgentShopStaffRole(role);
    setIsEditRoleMode(true);
    setEditingRoleId(roleId);
    setEditingIsAgentShop(agentShop);
    setRoleName(role?.name || "");
    setRoleStatus(Boolean(role?.status));
    const featuresForEdit = agentShop ? agentFeatures : adminFeatures;
    setRoleSelections(selectionsFromRole(role, featuresForEdit));
    setRoleModal(true);
  };

  const glanceColumns = useMemo(
    () => [
      {
        key: "screen",
        header: "Screen",
        render: (feature) => <FeatureTitle feature={feature} />,
      },
      ...glanceRoles.map((role) => ({
        key: `role-${role.id}`,
        header: role.name,
        render: (feature) => {
          const perm = (role.permissions || []).find(
            (p) => Number(p.featureId) === Number(feature.id)
          );
          const granted = Boolean(perm?.read || perm?.create || perm?.update || perm?.delete);
          return (
            <Badge tone={granted ? "success" : "neutral"}>
              {granted ? crudSummary(perm) : "Denied"}
            </Badge>
          );
        },
      })),
    ],
    [glanceRoles]
  );

  const agentRoleColumns = [
    {
      key: "name",
      header: "Role",
      render: (role) => (
        <DirectoryIdentity
          name={role?.name ?? `Role ${role?.id ?? ""}`}
          meta="Agent employee · system"
          id={role?.id}
        />
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (role) => <DirectoryStatusPill active={role?.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      render: (role) => (
        <DirectoryActions>
          <Button size="sm" variant="secondary" onClick={() => openEditRoleModal(role)}>
            Edit defaults
          </Button>
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
        description="Super Admin sees Zone Manager vs Admin Manager screens at a glance. Staff still need View on a screen to use it."
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
                resetRoleSelectionsToEmpty(adminFeatures);
                setRoleModal(true);
              }}
            >
              Add Admin Manager role
            </Button>
          </>
        }
      />

      <DirectoryMetrics
        items={[
          { label: "Admin screens", value: adminFeatures.length, tone: "brand" },
          { label: "Zone Manager roles", value: zoneRoles.length, tone: "navy" },
          { label: "Platform roles", value: platformRoles.length, tone: "success" },
        ]}
      />

      <section>
        <h3 style={{ margin: "0 0 8px" }}>Who can open which screen</h3>
        <p style={{ margin: "0 0 16px", color: "var(--muted)", fontSize: 14 }}>
          Green means that role has at least one grant. Zone Manager is limited to their assigned zone.
          Admin Manager is platform-wide.
        </p>
        <DirectoryTableWrap>
          <Table
            stickyLeft={1}
            columns={glanceColumns}
            rows={adminFeatures}
            rowKey={(feature) => feature.id}
            empty="No Admin screens in the catalog yet."
          />
        </DirectoryTableWrap>
      </section>

      <section>
        <h3 style={{ margin: "0 0 8px" }}>Zone Manager</h3>
        <p style={{ margin: "0 0 16px", color: "var(--muted)", fontSize: 14 }}>
          {zoneRole
            ? `${zoneRole.name} (role ${zoneRole.id}) — screens they can use inside their assigned zone.`
            : "Zone Admin (role 7) is missing. Deploy seeders, then refresh."}
        </p>
        <PermissionMatrix
          features={adminFeatures}
          selections={zoneSelections}
          onToggle={handleMatrixToggle(setZoneSelections)}
        />
        {zoneRole ? (
          <div style={{ marginTop: 12 }}>
            <Button
              disabled={isUpdatingRole}
              onClick={() => saveRolePermissions(zoneRole, adminFeatures, zoneSelections)}
            >
              {isUpdatingRole ? "Saving…" : "Save Zone Manager"}
            </Button>
          </div>
        ) : null}
      </section>

      <section>
        <h3 style={{ margin: "0 0 8px" }}>Admin Manager / platform roles</h3>
        <p style={{ margin: "0 0 16px", color: "var(--muted)", fontSize: 14 }}>
          These staff sign in with Staff login and can work across all zones, only on granted screens.
        </p>
        {platformRoles.length ? (
          <div style={{ display: "grid", gap: 16 }}>
            <Field label="Platform role">
              <Select
                aria-label="Platform role"
                value={selectedPlatformRole ? String(selectedPlatformRole.id) : ""}
                onChange={setSelectedPlatformRoleId}
                options={platformRoles.map((r) => ({
                  value: String(r.id),
                  label: r.name || `Role ${r.id}`,
                }))}
              />
            </Field>
            <PermissionMatrix
              features={adminFeatures}
              selections={platformSelections}
              onToggle={handleMatrixToggle(setPlatformSelections)}
            />
            {selectedPlatformRole ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Button
                  disabled={isUpdatingRole}
                  onClick={() =>
                    saveRolePermissions(selectedPlatformRole, adminFeatures, platformSelections)
                  }
                >
                  {isUpdatingRole ? "Saving…" : `Save ${selectedPlatformRole.name}`}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => openEditRoleModal(selectedPlatformRole)}
                >
                  Rename
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <Notice>No platform roles yet. Add an Admin Manager role to grant screens without a zone.</Notice>
        )}
      </section>

      <section>
        <h3 style={{ margin: "0 0 8px" }}>Agent shop defaults</h3>
        <p style={{ margin: "0 0 16px", color: "var(--muted)", fontSize: 14 }}>
          Laundry Shop Driver (6) and Manager (8). Edit feature menu CRUD here. Accept / assign /
          team / wallet rights are fixed by role and do not change with these checkboxes.
        </p>
        <DirectoryTableWrap>
          <Table
            columns={agentRoleColumns}
            rows={agentShopRoles}
            rowKey={(role) => role?.id ?? role?.name}
            empty="No roles found."
          />
        </DirectoryTableWrap>
      </section>

      <Modal
        open={permissionModal}
        onClose={closePermissionModal}
        title="Add New Permission"
        description="Create an Admin screen key that matches the sidebar (for example orderManagement)."
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
            : "Create Admin Manager role"
        }
        description={
          editingIsAgentShop
            ? "Update feature menu permissions for this Agent employee role. Does not change accept, assign, team, or wallet rights."
            : isEditRoleMode
              ? "Update role details and Admin screen permissions."
              : "Platform role: all zones, only the Admin screens you grant."
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
              placeholder="Admin Manager"
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
            <h4 style={{ margin: "0 0 8px" }}>Admin screens</h4>
            <p style={{ margin: "0 0 12px", color: "var(--muted)", fontSize: 13 }}>
              {editingIsAgentShop
                ? "Only Agent / Agent Employee / both features are shown."
                : "Only Admin / both features. Each row shows the live API key."}
            </p>
            {!editablePermissionOptions.length ? (
              <Notice>No permissions found. Add permissions first.</Notice>
            ) : (
              <PermissionMatrix
                features={editablePermissionOptions}
                selections={roleSelections}
                onToggle={handleRoleActionToggle}
              />
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
