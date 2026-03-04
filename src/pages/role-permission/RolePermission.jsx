import { useEffect, useMemo, useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { RiUserSettingsLine } from "../../shared/icons/index";
import ModalComponent from "../../components/shared/Modal";
import InputFieldModal from "../../components/ui/InputFieldModal";
import StyledCheckbox from "../../components/ui/StyledCheckbox";
import useToaster from "../../components/ui/Toaster";
import { Delay } from "../../components/shared/Loaders";
import {
  useAddFeatureMutation,
  useAddLaundryRoleMutation,
  useGetAllRolesQuery,
  useGetFeaturesQuery,
} from "../../store/services/api";

const ACTION_OPTIONS = ["view", "create", "edit", "update", "delete", "manage"];
const PERMISSION_TYPES = ["create", "edit", "update", "delete"];
const DEFAULT_FEATURE_OF = "AdminEmployee";

const pretty = (value = "") =>
  String(value)
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());

const toSnake = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

const toPascal = (value = "") =>
  String(value)
    .replace(/[_-]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("");

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

const normalizeFeatureOptions = (featuresResponse, rolesResponse) => {
  const features = extractList(featuresResponse, ["features", "permissions", "items", "rows"]);
  if (features.length) {
    return features.map((item, idx) => ({
      id: item?.id ?? item?.featureId ?? item?.permissionId ?? idx + 1,
      title: item?.title ?? item?.name ?? item?.key ?? `Feature ${idx + 1}`,
    }));
  }

  const roles = extractList(rolesResponse, ["roles", "items", "rows"]);
  const fromRoles = [];
  roles.forEach((role) => {
    const permissionRoles = Array.isArray(role?.permissionRole) ? role.permissionRole : [];
    permissionRoles.forEach((entry) => {
      if (!entry?.id) return;
      fromRoles.push({
        id: entry.id,
        title:
          entry?.feature?.title ??
          entry?.featureTitle ??
          entry?.name ??
          `Permission ${entry.id}`,
      });
    });
  });

  const seen = new Set();
  const deduped = fromRoles.filter((item) => {
    const key = String(item.id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return deduped;
};

export default function RolePermission() {
  const { success, error } = useToaster();
  const { data: rolesRes, isLoading: isRolesLoading, refetch: refetchRoles } = useGetAllRolesQuery();
  const { data: featuresRes, refetch: refetchFeatures } = useGetFeaturesQuery();
  const [addFeature, { isLoading: isAddingFeature }] = useAddFeatureMutation();
  const [addLaundryRole, { isLoading: isAddingRole }] = useAddLaundryRoleMutation();

  const roles = useMemo(() => extractList(rolesRes, ["roles", "items", "rows"]), [rolesRes]);
  const permissionOptions = useMemo(
    () => normalizeFeatureOptions(featuresRes, rolesRes),
    [featuresRes, rolesRes]
  );

  const [permissionModal, setPermissionModal] = useState(false);
  const [roleModal, setRoleModal] = useState(false);

  const [permissionName, setPermissionName] = useState("");
  const [permissionTypes, setPermissionTypes] = useState(
    PERMISSION_TYPES.reduce((acc, type) => ({ ...acc, [type]: false }), {})
  );

  const [roleName, setRoleName] = useState("");
  const [roleSelections, setRoleSelections] = useState({});

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

  const handlePermissionTypeToggle = (key) => {
    setPermissionTypes((prev) => ({ ...prev, [key]: !prev[key] }));
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
    setPermissionName("");
    setPermissionTypes(PERMISSION_TYPES.reduce((acc, type) => ({ ...acc, [type]: false }), {}));
  };

  const closeRoleModal = () => {
    setRoleModal(false);
    setRoleName("");
    setRoleSelections((prev) => {
      const reset = {};
      Object.keys(prev).forEach((id) => {
        reset[id] = ACTION_OPTIONS.reduce((acc, action) => ({ ...acc, [action]: false }), {});
      });
      return reset;
    });
  };

  const submitPermission = async () => {
    const name = permissionName.trim();
    if (!name) return error("Permission name is required.");

    const selectedTypes = PERMISSION_TYPES.filter((type) => permissionTypes[type]);
    if (!selectedTypes.length) return error("Select at least one permission type.");

    try {
      await Promise.all(
        selectedTypes.map((type) =>
          addFeature({
            title: `${toPascal(name)}${toPascal(type)}`,
            status: true,
            featureOf: DEFAULT_FEATURE_OF,
            key: `${toSnake(name)}_${type}`,
          }).unwrap()
        )
      );
      success("Permission(s) added successfully.");
      closePermissionModal();
      refetchFeatures();
    } catch (err) {
      error(err?.data?.message ?? "Failed to add permission.");
    }
  };

  const submitRole = async () => {
    const name = roleName.trim();
    if (!name) return error("Role name is required.");

    const permissionRole = permissionOptions
      .map((feature) => {
        const actions = roleSelections[String(feature.id)] || {};
        const hasAny = ACTION_OPTIONS.some((action) => actions[action]);
        if (!hasAny) return null;

        const read = Boolean(actions.view);
        const update = Boolean(actions.update || actions.edit);
        const write = Boolean(
          actions.create || actions.edit || actions.update || actions.delete || actions.manage
        );

        return {
          id: Number(feature.id),
          permissions: {
            create: Boolean(actions.create),
            read,
            update,
            delete: Boolean(actions.delete),
            write,
            manage: Boolean(actions.manage),
          },
        };
      })
      .filter(Boolean);

    if (!permissionRole.length) return error("Select at least one permission.");

    try {
      await addLaundryRole({ name, permissionRole }).unwrap();
      success("Role added successfully.");
      closeRoleModal();
      refetchRoles();
    } catch (err) {
      error(err?.data?.message ?? "Failed to add role.");
    }
  };

  if (isRolesLoading) return <Delay />;

  return (
    <Box className="!space-y-6">
      <Box className="flex items-center justify-between gap-4">
        <Box className="flex items-center gap-x-4">
          <Typography color="blue.50">
            <RiUserSettingsLine size="24px" color="blue.50" />
          </Typography>
          <Typography variant="h4" fontFamily="Switzer" color="grey.20">
            Role and Permission
          </Typography>
        </Box>

        <Box className="flex items-center gap-3">
          <Button
            variant="outlined"
            onClick={() => setPermissionModal(true)}
            sx={{ textTransform: "none", borderRadius: "999px" }}
          >
            Add Permission
          </Button>
          <Button
            variant="contained"
            onClick={() => setRoleModal(true)}
            sx={{ textTransform: "none", borderRadius: "999px", bgcolor: "#2176d2" }}
          >
            Add Role
          </Button>
        </Box>
      </Box>

      <Box className="rounded-xl bg-white !p-6 !space-y-4">
        <Typography variant="h6" color="grey.20" fontFamily="Switzer">
          Existing Roles
        </Typography>

        {!roles.length ? (
          <Typography variant="body2" color="grey.400">
            No roles found.
          </Typography>
        ) : (
          <Box className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {roles.map((role) => (
              <Box
                key={role?.id ?? role?.name}
                className="rounded-lg border border-[#E5E7EB] !p-4 !space-y-2"
              >
                <Typography variant="body1" fontFamily="Switzer" color="grey.20">
                  {role?.name ?? `Role ${role?.id}`}
                </Typography>
                <Typography variant="caption" color="grey.400">
                  ID: {role?.id ?? "-"}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      <ModalComponent
        open={permissionModal}
        onClose={closePermissionModal}
        title="Add New Permission"
        width={640}
        primaryAction={{
          label: "Add Permission",
          onClick: submitPermission,
          isLoading: isAddingFeature,
        }}
        secondaryAction={{
          label: "Cancel",
          onClick: closePermissionModal,
        }}
      >
        <Box className="!space-y-6">
          <Typography variant="body1" color="grey.400">
            Define permission and select allowed actions
          </Typography>

          <InputFieldModal
            title="Permission Name"
            placeholder="Enter full name"
            value={permissionName}
            onChange={(e) => setPermissionName(e.target.value)}
          />

          <Box className="!space-y-3">
            <Typography variant="h5" fontFamily="Switzer" color="grey.20">
              Permission Types
            </Typography>
            <Typography variant="body2" color="grey.400">
              Select the permission for this role.
            </Typography>

            <Box className="!space-y-3">
              {PERMISSION_TYPES.map((type) => (
                <Box key={type} className="flex items-center gap-2">
                  <StyledCheckbox
                    checked={Boolean(permissionTypes[type])}
                    onChange={() => handlePermissionTypeToggle(type)}
                  />
                  <Typography variant="body1">{pretty(type)}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </ModalComponent>

      <ModalComponent
        open={roleModal}
        onClose={closeRoleModal}
        title="Create New Role"
        width={680}
        primaryAction={{
          label: "Add Role",
          onClick: submitRole,
          isLoading: isAddingRole,
        }}
        secondaryAction={{
          label: "Cancel",
          onClick: closeRoleModal,
        }}
      >
        <Box className="!space-y-6">
          <Typography variant="body1" color="grey.400">
            Define a new role and assign permission.
          </Typography>

          <InputFieldModal
            title="Role Name"
            placeholder="Enter full name"
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
          />

          <Box className="!space-y-4">
            <Typography variant="h5" fontFamily="Switzer" color="grey.20">
              Assign Permission
            </Typography>
            <Typography variant="body2" color="grey.400">
              Select the permission for this role.
            </Typography>

            {!permissionOptions.length ? (
              <Typography variant="body2" color="grey.400">
                No permissions found. Add permissions first.
              </Typography>
            ) : (
              <Box className="!space-y-4">
                {permissionOptions.map((feature) => (
                  <Box key={feature.id} className="!space-y-2">
                    <Typography variant="body1" fontFamily="Switzer" color="grey.20">
                      {pretty(feature.title)}
                    </Typography>
                    <Box className="flex flex-wrap items-center gap-2 md:gap-4">
                      {ACTION_OPTIONS.map((action) => (
                        <Box key={`${feature.id}-${action}`} className="flex items-center gap-1">
                          <StyledCheckbox
                            checked={Boolean(roleSelections?.[String(feature.id)]?.[action])}
                            onChange={() => handleRoleActionToggle(feature.id, action)}
                          />
                          <Typography variant="body2">{pretty(action)}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Box>
      </ModalComponent>
    </Box>
  );
}
