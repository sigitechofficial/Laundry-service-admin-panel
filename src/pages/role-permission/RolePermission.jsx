import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  FormControl,
  Select,
  MenuItem,
} from "@mui/material";
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
  useUpdateRoleMutation,
} from "../../store/services/api";
import { getSidebarPermissionSelectOptions } from "../../components/shared/constants";

const ACTION_OPTIONS = ["create", "read", "update", "delete"];
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
  const features = extractList(featuresResponse, [
    "features",
    "permissions",
    "items",
    "rows",
  ]);
  if (features.length) {
    return features.map((item, idx) => ({
      id: item?.id ?? item?.featureId ?? item?.permissionId ?? idx + 1,
      title: item?.title ?? item?.name ?? item?.key ?? `Feature ${idx + 1}`,
      key: item?.key,
      /** Per-role CRUD rows from GET /admin/getFeatures (match by roleId when editing). */
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

export default function RolePermission() {
  const { success, error } = useToaster();
  const { data: rolesRes, isLoading: isRolesLoading, refetch: refetchRoles } = useGetAllRolesQuery();
  const { data: featuresRes, refetch: refetchFeatures } = useGetFeaturesQuery();
  const [addFeature, { isLoading: isAddingFeature }] = useAddFeatureMutation();
  const [addLaundryRole, { isLoading: isAddingRole }] = useAddLaundryRoleMutation();
  const [updateRole, { isLoading: isUpdatingRole }] = useUpdateRoleMutation();

  const roles = useMemo(() => extractList(rolesRes, ["roles", "items", "rows"]), [rolesRes]);
  const permissionOptions = useMemo(() => normalizeFeatureOptions(featuresRes), [featuresRes]);

  const [permissionModal, setPermissionModal] = useState(false);
  const [roleModal, setRoleModal] = useState(false);
  const [isEditRoleMode, setIsEditRoleMode] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState(null);

  const [permissionPath, setPermissionPath] = useState("");

  const sidebarPermissionOptions = useMemo(() => getSidebarPermissionSelectOptions(), []);

  const [roleName, setRoleName] = useState("");
  const [roleStatus, setRoleStatus] = useState(true);
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
  };

  const closeRoleModal = () => {
    setRoleModal(false);
    setIsEditRoleMode(false);
    setEditingRoleId(null);
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
        featureOf: DEFAULT_FEATURE_OF,
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

    const permissionRole = permissionOptions
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

    if (!isEditRoleMode && !permissionRole.length) {
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
        success("Role updated successfully.");
      } else {
        await addLaundryRole({ name, permissionRole }).unwrap();
        success("Role added successfully.");
      }
      closeRoleModal();
      refetchRoles();
    } catch (err) {
      error(err?.data?.message ?? (isEditRoleMode ? "Failed to update role." : "Failed to add role."));
    }
  };

  const openEditRoleModal = (role) => {
    const roleId = role?.id;
    if (!roleId) return;

    setIsEditRoleMode(true);
    setEditingRoleId(roleId);
    setRoleName(role?.name || "");
    setRoleStatus(Boolean(role?.status));

    const existingFromRole = Array.isArray(role?.permissionRole) ? role.permissionRole : [];
    const byFeatureId = new Map(
      existingFromRole
        .filter((e) => e != null && e.id != null)
        .map((e) => [Number(e.id), e?.permissions])
    );

    const next = {};
    permissionOptions.forEach((feature) => {
      const fid = Number(feature.id);
      const fromFeatures = feature.permissions?.find(
        (p) => Number(p?.roleId) === Number(roleId)
      );
      const fromRoleList = byFeatureId.get(fid);
      const source = fromFeatures || fromRoleList;
      next[String(feature.id)] = source ? pickCrud(source) : emptyActions();
    });

    setRoleSelections(next);
    setRoleModal(true);
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
            onClick={() => {
              setIsEditRoleMode(false);
              setEditingRoleId(null);
              setRoleStatus(true);
              setRoleName("");
              resetRoleSelectionsToEmpty();
              setRoleModal(true);
            }}
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
          <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #E5E7EB", borderRadius: "12px" }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "#F8FAFC" }}>
                  {["ID", "Role Name", "Status", "Created At", "Updated At", "Actions"].map((header) => (
                    <TableCell
                      key={header}
                      sx={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#94A3B8",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        borderBottom: "1px solid #E2E8F0",
                      }}
                    >
                      {header}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role?.id ?? role?.name} hover>
                    <TableCell sx={{ fontSize: 13, fontWeight: 700, color: "#1E293B" }}>
                      {role?.id ?? "-"}
                    </TableCell>
                    <TableCell sx={{ fontSize: 13, color: "#334155" }}>
                      {role?.name ?? `Role ${role?.id ?? ""}`}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={role?.status ? "Active" : "Inactive"}
                        sx={{
                          fontSize: 11,
                          fontWeight: 700,
                          bgcolor: role?.status ? "#DCFCE7" : "#F1F5F9",
                          color: role?.status ? "#15803D" : "#64748B",
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, color: "#64748B" }}>
                      {role?.createdAt ? new Date(role.createdAt).toLocaleString() : "-"}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, color: "#64748B" }}>
                      {role?.updatedAt ? new Date(role.updatedAt).toLocaleString() : "-"}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        onClick={() => openEditRoleModal(role)}
                        sx={{ textTransform: "none", minWidth: 0 }}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
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
            Add feature first to use it in roles.
          </Typography>

          <Box className="w-full">
            <Typography variant="body2" sx={{ color: "#374151", mb: "8px" }}>
              Screen / tab
            </Typography>
            <FormControl fullWidth>
              <Select
                id="permission-screen-select"
                inputProps={{ "aria-label": "Permission screen" }}
                displayEmpty
                value={permissionPath}
                onChange={(e) => setPermissionPath(e.target.value)}
                renderValue={(selected) => {
                  if (!selected) {
                    return (
                      <Typography component="span" variant="body1" sx={{ color: "#94A3B8", fontFamily: "Switzer" }}>
                        &nbsp;
                      </Typography>
                    );
                  }
                  const opt = sidebarPermissionOptions.find((o) => o.value === selected);
                  return (
                    <Typography component="span" variant="body1" sx={{ fontFamily: "Switzer", fontWeight: 400 }}>
                      {opt?.menuLabel ?? selected}
                    </Typography>
                  );
                }}
                sx={{
                  height: 52,
                  borderRadius: "8px",
                  bgcolor: "#F4F7FF",
                  fontFamily: "Switzer",
                  fontWeight: 400,
                  "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                  "&:hover .MuiOutlinedInput-notchedOutline": { border: "none" },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": { border: "none" },
                }}
                MenuProps={{ PaperProps: { sx: { maxHeight: 360 } } }}
              >
                {sidebarPermissionOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.menuLabel}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>
      </ModalComponent>

      <ModalComponent
        open={roleModal}
        onClose={closeRoleModal}
        title={isEditRoleMode ? "Update Role" : "Create New Role"}
        width={680}
        primaryAction={{
          label: isEditRoleMode ? "Update Role" : "Add Role",
          onClick: submitRole,
          isLoading: isAddingRole || isUpdatingRole,
        }}
        secondaryAction={{
          label: "Cancel",
          onClick: closeRoleModal,
        }}
      >
        <Box className="!space-y-6">
          <Typography variant="body1" color="grey.400">
            {isEditRoleMode
              ? "Update role details and permissions."
              : "Define a new role and assign permission."}
          </Typography>

          <InputFieldModal
            title="Role Name"
            placeholder="Enter full name"
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
          />

          <Box className="flex items-center justify-between rounded-lg border border-[#E5E7EB] !px-3 !py-2.5">
            <Typography variant="body2" color="grey.20">
              Role Status
            </Typography>
            <StyledCheckbox checked={roleStatus} onChange={() => setRoleStatus((prev) => !prev)} />
          </Box>

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
