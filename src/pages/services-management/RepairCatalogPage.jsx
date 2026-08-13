import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { useMemo, useState } from "react";
import { BsCardList, TbPencil, TbPlus, TbTrash } from "../../shared/icons/index";
import useToaster from "../../components/ui/Toaster";
import {
  useCreateRepairGarmentMutation,
  useCreateRepairOptionMutation,
  useDeleteRepairGarmentMutation,
  useDeleteRepairOptionMutation,
  useGetRepairGarmentsQuery,
  useGetRepairOptionsQuery,
  useSeedRepairCatalogMutation,
  useUpdateRepairGarmentMutation,
  useUpdateRepairOptionMutation,
} from "../../store/services/api";

function unwrapList(res) {
  const d = res?.data !== undefined ? res.data : res;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.garments)) return d.garments;
  if (Array.isArray(d?.options)) return d.options;
  return [];
}

function money(value) {
  return `£${Number(value || 0).toFixed(2)}`;
}

const panelSx = {
  bgcolor: "#fff",
  border: "1px solid #E5E7EB",
  borderRadius: "12px",
  overflow: "hidden",
};

const sectionHeaderSx = {
  px: 2.5,
  py: 2,
  borderBottom: "1px solid #F3F4F6",
  bgcolor: "#FAFBFC",
};

const primaryBtnSx = {
  textTransform: "none",
  bgcolor: "#000099",
  "&:hover": { bgcolor: "#0000cc" },
};

export default function RepairCatalogPage() {
  const { success, error } = useToaster();
  const { data: garmentsRes, isLoading: garmentsLoading } =
    useGetRepairGarmentsQuery();
  const { data: optionsRes, isLoading: optionsLoading } =
    useGetRepairOptionsQuery();

  const [createGarment, { isLoading: creatingGarment }] =
    useCreateRepairGarmentMutation();
  const [updateGarment, { isLoading: updatingGarment }] =
    useUpdateRepairGarmentMutation();
  const [deleteGarment] = useDeleteRepairGarmentMutation();
  const [createOption, { isLoading: creatingOption }] =
    useCreateRepairOptionMutation();
  const [updateOption, { isLoading: updatingOption }] =
    useUpdateRepairOptionMutation();
  const [deleteOption] = useDeleteRepairOptionMutation();
  const [seedCatalog, { isLoading: seeding }] = useSeedRepairCatalogMutation();

  const garments = useMemo(() => unwrapList(garmentsRes), [garmentsRes]);
  const options = useMemo(() => unwrapList(optionsRes), [optionsRes]);

  const [activeTab, setActiveTab] = useState("repairs");

  const [optionModal, setOptionModal] = useState({
    open: false,
    id: null,
    name: "",
    price: "",
  });

  const [garmentModal, setGarmentModal] = useState({
    open: false,
    id: null,
    name: "",
    repairOptionIds: [],
  });

  const [confirmDelete, setConfirmDelete] = useState(null);

  const isEditingOption = Boolean(optionModal.id);
  const isEditingGarment = Boolean(garmentModal.id);
  const savingOption = creatingOption || updatingOption;
  const savingGarment = creatingGarment || updatingGarment;

  const openAddOption = () =>
    setOptionModal({ open: true, id: null, name: "", price: "" });

  const openEditOption = (opt) =>
    setOptionModal({
      open: true,
      id: opt.id,
      name: opt.name || "",
      price: String(opt.price ?? ""),
    });

  const closeOptionModal = () =>
    setOptionModal({ open: false, id: null, name: "", price: "" });

  const openAddGarment = () => {
    if (!options.length) {
      error("Add at least one repair first (Repairs tab), then create a garment.");
      setActiveTab("repairs");
      return;
    }
    setGarmentModal({
      open: true,
      id: null,
      name: "",
      repairOptionIds: options.map((o) => o.id),
    });
  };

  const openEditGarment = (g) =>
    setGarmentModal({
      open: true,
      id: g.id,
      name: g.name || "",
      repairOptionIds:
        g.repairOptionIds || (g.options || []).map((o) => o.id) || [],
    });

  const closeGarmentModal = () =>
    setGarmentModal({
      open: false,
      id: null,
      name: "",
      repairOptionIds: [],
    });

  const toggleGarmentOption = (optionId) => {
    setGarmentModal((prev) => {
      const ids = prev.repairOptionIds.includes(optionId)
        ? prev.repairOptionIds.filter((id) => id !== optionId)
        : [...prev.repairOptionIds, optionId];
      return { ...prev, repairOptionIds: ids };
    });
  };

  const saveOption = async () => {
    const name = optionModal.name.trim();
    if (!name) return error("Repair name is required");
    const price = Number(optionModal.price || 0);
    if (Number.isNaN(price) || price < 0) return error("Enter a valid price");
    try {
      if (optionModal.id) {
        await updateOption({
          repairOptionId: optionModal.id,
          body: { name, price },
        }).unwrap();
        success("Repair option updated");
      } else {
        await createOption({ name, price }).unwrap();
        success("Repair option added");
      }
      closeOptionModal();
    } catch (e) {
      error(e?.data?.message || "Failed to save repair option");
    }
  };

  const saveGarment = async () => {
    const name = garmentModal.name.trim();
    if (!name) return error("Garment name is required");
    if (!garmentModal.repairOptionIds.length) {
      return error("Tick at least one repair to link to this garment");
    }
    try {
      if (garmentModal.id) {
        await updateGarment({
          repairGarmentId: garmentModal.id,
          body: {
            name,
            repairOptionIds: garmentModal.repairOptionIds,
          },
        }).unwrap();
        success("Garment updated");
      } else {
        await createGarment({
          name,
          repairOptionIds: garmentModal.repairOptionIds,
        }).unwrap();
        success("Garment added");
      }
      closeGarmentModal();
    } catch (e) {
      error(e?.data?.message || "Failed to save garment");
    }
  };

  const onSeed = async () => {
    try {
      const result = await seedCatalog().unwrap();
      success(result?.message || result?.data?.message || "Defaults loaded");
    } catch (e) {
      error(e?.data?.message || "Failed to seed catalog");
    }
  };

  const runDelete = async () => {
    if (!confirmDelete) return;
    try {
      if (confirmDelete.type === "option") {
        await deleteOption(confirmDelete.id).unwrap();
        if (optionModal.id === confirmDelete.id) closeOptionModal();
        success("Repair option deleted");
      } else {
        await deleteGarment(confirmDelete.id).unwrap();
        if (garmentModal.id === confirmDelete.id) closeGarmentModal();
        success("Garment deleted");
      }
    } catch (e) {
      error(e?.data?.message || "Delete failed");
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <Box sx={{ pb: 4 }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        alignItems={{ md: "flex-start" }}
        justifyContent="space-between"
        mb={2.5}
      >
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Typography color="blue.50" sx={{ mt: 0.5 }}>
            <BsCardList size={26} />
          </Typography>
          <Box>
            <Typography variant="h4" fontFamily="Switzer" color="grey.20">
              Repair Catalog
            </Typography>
            <Typography
              variant="body2"
              color="grey.50"
              sx={{ mt: 0.75, maxWidth: 580, lineHeight: 1.5 }}
            >
              Use <strong>Repairs</strong> to add priced work, then{" "}
              <strong>Garments</strong> to create clothing types and link which
              repairs customers can choose.
            </Typography>
          </Box>
        </Stack>
        <Button
          variant="outlined"
          onClick={onSeed}
          disabled={seeding}
          sx={{
            textTransform: "none",
            borderColor: "#000099",
            color: "#000099",
            minWidth: 140,
            height: 40,
            "&:hover": { borderColor: "#0000cc", bgcolor: "#F4F7FF" },
          }}
        >
          {seeding ? "Loading…" : "Load defaults"}
        </Button>
      </Stack>

      <Box sx={{ mb: 2.5, borderBottom: "1px solid #E5E7EB" }}>
        <Tabs
          value={activeTab}
          onChange={(_e, value) => setActiveTab(value)}
          sx={{
            minHeight: 44,
            "& .MuiTab-root": {
              textTransform: "none",
              fontWeight: 600,
              fontSize: 15,
              minHeight: 44,
              color: "#6B7280",
            },
            "& .Mui-selected": { color: "#000099 !important" },
            "& .MuiTabs-indicator": { bgcolor: "#000099", height: 3 },
          }}
        >
          <Tab value="repairs" label={`Repairs (${options.length})`} />
          <Tab value="garments" label={`Garments (${garments.length})`} />
        </Tabs>
      </Box>

      {activeTab === "repairs" ? (
        <Box sx={panelSx}>
          <Box sx={sectionHeaderSx}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              spacing={2}
            >
              <Box>
                <Typography sx={{ fontWeight: 700, color: "#111827", fontSize: 16 }}>
                  Repairs
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: "#6B7280", mt: 0.25 }}>
                  Priced repair options customers can select
                </Typography>
              </Box>
              <Button
                size="small"
                variant="contained"
                startIcon={<TbPlus size={16} />}
                onClick={openAddOption}
                sx={primaryBtnSx}
              >
                Add repair
              </Button>
            </Stack>
          </Box>

          <Box>
            {optionsLoading ? (
              <Typography sx={{ p: 3, fontSize: 13, color: "#6B7280" }}>
                Loading…
              </Typography>
            ) : options.length === 0 ? (
              <Box sx={{ p: 5, textAlign: "center" }}>
                <Typography
                  sx={{ fontSize: 15, fontWeight: 600, color: "#374151", mb: 0.75 }}
                >
                  Add your first repair
                </Typography>
                <Typography sx={{ fontSize: 13, color: "#6B7280", mb: 2.5 }}>
                  Example: “Hemming” at £8.00. Then switch to Garments to link them.
                </Typography>
                <Stack direction="row" spacing={1} justifyContent="center">
                  <Button
                    variant="contained"
                    startIcon={<TbPlus size={16} />}
                    onClick={openAddOption}
                    sx={primaryBtnSx}
                  >
                    Add repair
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={onSeed}
                    disabled={seeding}
                    sx={{
                      textTransform: "none",
                      borderColor: "#000099",
                      color: "#000099",
                    }}
                  >
                    Load defaults
                  </Button>
                </Stack>
              </Box>
            ) : (
              options.map((opt) => (
                <Box
                  key={opt.id}
                  sx={{
                    px: 2.5,
                    py: 1.75,
                    borderBottom: "1px solid #F3F4F6",
                    "&:hover": { bgcolor: "#FAFBFC" },
                  }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    spacing={2}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        sx={{ fontSize: 14, fontWeight: 600, color: "#111827" }}
                      >
                        {opt.name}
                      </Typography>
                      <Typography sx={{ fontSize: 13, color: "#6B7280", mt: 0.25 }}>
                        {money(opt.price)}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={0.5}>
                      <IconButton
                        size="small"
                        aria-label="Edit repair"
                        onClick={() => openEditOption(opt)}
                        sx={{ color: "#000099" }}
                      >
                        <TbPencil size={18} />
                      </IconButton>
                      <IconButton
                        size="small"
                        aria-label="Delete repair"
                        onClick={() =>
                          setConfirmDelete({
                            type: "option",
                            id: opt.id,
                            label: opt.name,
                          })
                        }
                        sx={{ color: "#DC2626" }}
                      >
                        <TbTrash size={18} />
                      </IconButton>
                    </Stack>
                  </Stack>
                </Box>
              ))
            )}
          </Box>

          {options.length > 0 ? (
            <Box
              sx={{
                px: 2.5,
                py: 1.75,
                bgcolor: "#F8FAFF",
                borderTop: "1px solid #E5E7EB",
              }}
            >
              <Typography sx={{ fontSize: 13, color: "#475569" }}>
                Next: open the <strong>Garments</strong> tab to create clothing
                types and link these repairs.
              </Typography>
              <Button
                size="small"
                onClick={() => setActiveTab("garments")}
                sx={{ textTransform: "none", mt: 0.5, color: "#000099", px: 0 }}
              >
                Go to Garments →
              </Button>
            </Box>
          ) : null}
        </Box>
      ) : (
        <Box sx={panelSx}>
          <Box sx={sectionHeaderSx}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              spacing={2}
            >
              <Box>
                <Typography sx={{ fontWeight: 700, color: "#111827", fontSize: 16 }}>
                  Garments
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: "#6B7280", mt: 0.25 }}>
                  Clothing types · edit to link repairs
                </Typography>
              </Box>
              <Button
                size="small"
                variant="contained"
                startIcon={<TbPlus size={16} />}
                onClick={openAddGarment}
                disabled={!options.length}
                sx={primaryBtnSx}
              >
                Add garment
              </Button>
            </Stack>
          </Box>

          <Box>
            {!options.length ? (
              <Box sx={{ p: 5, textAlign: "center" }}>
                <Typography
                  sx={{ fontSize: 15, fontWeight: 600, color: "#374151", mb: 0.75 }}
                >
                  Add repairs first
                </Typography>
                <Typography sx={{ fontSize: 13, color: "#6B7280", mb: 2 }}>
                  Garments need repair options to link. Go to the Repairs tab and
                  add at least one.
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => setActiveTab("repairs")}
                  sx={primaryBtnSx}
                >
                  Go to Repairs
                </Button>
              </Box>
            ) : garmentsLoading ? (
              <Typography sx={{ p: 3, fontSize: 13, color: "#6B7280" }}>
                Loading…
              </Typography>
            ) : garments.length === 0 ? (
              <Box sx={{ p: 5, textAlign: "center" }}>
                <Typography
                  sx={{ fontSize: 15, fontWeight: 600, color: "#374151", mb: 0.75 }}
                >
                  Add a garment and link repairs
                </Typography>
                <Typography sx={{ fontSize: 13, color: "#6B7280", mb: 2.5 }}>
                  Example: “Shirt” → tick Hemming, Button resew, Seam repair.
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<TbPlus size={16} />}
                  onClick={openAddGarment}
                  sx={primaryBtnSx}
                >
                  Add garment
                </Button>
              </Box>
            ) : (
              garments.map((g) => {
                const linked = g.options || [];
                const preview = linked.slice(0, 4);
                const extra = Math.max(0, linked.length - preview.length);
                return (
                  <Box
                    key={g.id}
                    sx={{
                      px: 2.5,
                      py: 2,
                      borderBottom: "1px solid #F3F4F6",
                      "&:hover": { bgcolor: "#FAFBFC" },
                    }}
                  >
                    <Stack
                      direction="row"
                      alignItems="flex-start"
                      justifyContent="space-between"
                      spacing={1.5}
                    >
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Stack
                          direction="row"
                          alignItems="center"
                          spacing={1}
                          mb={0.75}
                        >
                          <Typography
                            sx={{ fontSize: 14, fontWeight: 700, color: "#111827" }}
                          >
                            {g.name}
                          </Typography>
                          <Chip
                            size="small"
                            label={`${linked.length} linked`}
                            sx={{
                              height: 22,
                              fontSize: 11,
                              bgcolor: linked.length ? "#EEF2FF" : "#FEF3C7",
                              color: linked.length ? "#000099" : "#B45309",
                            }}
                          />
                        </Stack>
                        {linked.length === 0 ? (
                          <Typography sx={{ fontSize: 12.5, color: "#B45309" }}>
                            No repairs linked — open Edit and tick options
                          </Typography>
                        ) : (
                          <Stack
                            direction="row"
                            flexWrap="wrap"
                            useFlexGap
                            spacing={0.75}
                          >
                            {preview.map((o) => (
                              <Chip
                                key={o.id}
                                size="small"
                                label={`${o.name} · ${money(o.price)}`}
                                variant="outlined"
                                sx={{
                                  height: 24,
                                  fontSize: 11,
                                  borderColor: "#E5E7EB",
                                  color: "#374151",
                                }}
                              />
                            ))}
                            {extra > 0 ? (
                              <Chip
                                size="small"
                                label={`+${extra} more`}
                                sx={{
                                  height: 24,
                                  fontSize: 11,
                                  bgcolor: "#F3F4F6",
                                  color: "#6B7280",
                                }}
                              />
                            ) : null}
                          </Stack>
                        )}
                      </Box>
                      <Stack direction="row" spacing={0.25}>
                        <IconButton
                          size="small"
                          aria-label="Edit garment"
                          onClick={() => openEditGarment(g)}
                          sx={{ color: "#000099" }}
                        >
                          <TbPencil size={18} />
                        </IconButton>
                        <IconButton
                          size="small"
                          aria-label="Delete garment"
                          onClick={() =>
                            setConfirmDelete({
                              type: "garment",
                              id: g.id,
                              label: g.name,
                            })
                          }
                          sx={{ color: "#DC2626" }}
                        >
                          <TbTrash size={18} />
                        </IconButton>
                      </Stack>
                    </Stack>
                  </Box>
                );
              })
            )}
          </Box>
        </Box>
      )}

      <Dialog
        open={optionModal.open}
        onClose={closeOptionModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          {isEditingOption ? "Edit repair" : "Add repair"}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13, color: "#64748B", mb: 2 }}>
            A priced service customers can choose (e.g. Hemming, Zip repair).
          </Typography>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <TextField
              label="Repair name"
              placeholder="e.g. Hemming"
              fullWidth
              autoFocus
              value={optionModal.name}
              onChange={(e) =>
                setOptionModal((p) => ({ ...p, name: e.target.value }))
              }
            />
            <TextField
              label="Price"
              placeholder="0.00"
              fullWidth
              value={optionModal.price}
              onChange={(e) =>
                setOptionModal((p) => ({ ...p, price: e.target.value }))
              }
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">£</InputAdornment>
                ),
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeOptionModal} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={savingOption}
            onClick={saveOption}
            sx={primaryBtnSx}
          >
            {isEditingOption ? "Save changes" : "Add repair"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={garmentModal.open}
        onClose={closeGarmentModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          {isEditingGarment
            ? "Edit garment & linked repairs"
            : "Add garment & link repairs"}
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2, fontSize: 13 }}>
            Name the garment, then tick every repair customers should see for it.
          </Alert>
          <TextField
            label="Garment name"
            placeholder="e.g. Shirt"
            fullWidth
            autoFocus
            value={garmentModal.name}
            onChange={(e) =>
              setGarmentModal((p) => ({ ...p, name: e.target.value }))
            }
            sx={{ mb: 2.5 }}
          />

          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            mb={1}
          >
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>
              Link repairs ({garmentModal.repairOptionIds.length}/{options.length})
            </Typography>
            <Stack direction="row" spacing={0.5}>
              <Button
                size="small"
                onClick={() =>
                  setGarmentModal((p) => ({
                    ...p,
                    repairOptionIds: options.map((o) => o.id),
                  }))
                }
                sx={{ textTransform: "none", fontSize: 12 }}
              >
                Select all
              </Button>
              <Button
                size="small"
                onClick={() =>
                  setGarmentModal((p) => ({ ...p, repairOptionIds: [] }))
                }
                sx={{ textTransform: "none", fontSize: 12 }}
              >
                Clear
              </Button>
            </Stack>
          </Stack>

          {options.length === 0 ? (
            <Typography sx={{ fontSize: 13, color: "#6B7280" }}>
              No repair options available. Close this and add repairs first.
            </Typography>
          ) : (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 0.5,
                maxHeight: 280,
                overflowY: "auto",
                p: 1.5,
                bgcolor: "#F9FAFB",
                borderRadius: "8px",
                border: "1px solid #E5E7EB",
              }}
            >
              {options.map((opt) => {
                const checked = garmentModal.repairOptionIds.includes(opt.id);
                return (
                  <FormControlLabel
                    key={opt.id}
                    control={
                      <Checkbox
                        size="small"
                        checked={checked}
                        onChange={() => toggleGarmentOption(opt.id)}
                        sx={{
                          color: "#9CA3AF",
                          "&.Mui-checked": { color: "#000099" },
                        }}
                      />
                    }
                    label={
                      <Typography sx={{ fontSize: 13, color: "#111827" }}>
                        {opt.name}{" "}
                        <Box
                          component="span"
                          sx={{ color: "#6B7280", fontSize: 12 }}
                        >
                          · {money(opt.price)}
                        </Box>
                      </Typography>
                    }
                    sx={{ m: 0 }}
                  />
                );
              })}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeGarmentModal} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={savingGarment}
            onClick={saveGarment}
            sx={primaryBtnSx}
          >
            {isEditingGarment ? "Save changes" : "Add garment"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Delete {confirmDelete?.type === "option" ? "repair" : "garment"}?
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 14, color: "#475569" }}>
            “{confirmDelete?.label}” will be removed from the catalog
            {confirmDelete?.type === "option"
              ? " and unlinked from any garments."
              : "."}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setConfirmDelete(null)}
            sx={{ textTransform: "none" }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={runDelete}
            sx={{ textTransform: "none" }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
