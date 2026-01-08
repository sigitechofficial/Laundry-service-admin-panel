import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  Collapse,
  Checkbox,
  Menu,
  MenuItem,
} from "@mui/material";
import {
  TbPlus,
  RiDeleteBin6Line,
  TbChevronDown,
  TbDotsVertical,
  TbPencil,
} from "../../shared/icons/index";
import {
  useAddPreferenceMutation,
  useAddPreferenceValueMutation,
  useDeletePreferenceMutation,
  useDeletePreferenceValueMutation,
  useEditPreferenceTypeMutation,
  useEditPreferenceValueMutation,
  useGetPreferencesQuery,
} from "../../store/services/api";
import { MiniLoader } from "../../components/shared/Loaders";
import { useSelector } from "react-redux";
import ModalComponent from "../../components/shared/Modal";
import InputFieldModal from "../../components/ui/InputFieldModal";
import useToaster from "../../components/ui/Toaster";

export default function PreferencesCard({ triggerAdd }) {
  const { success, error } = useToaster();

  const preferences = useSelector((state) => state?.apiData?.preferences);

  const [addPreference, { isLoading: preferenceLoading }] =
    useAddPreferenceMutation();
  const [addPreferenceValue, { isLoading: preferenceValLoading }] =
    useAddPreferenceValueMutation();
  const [deletePreferenceValue, { isLoading: deletePrefValueLoading }] =
    useDeletePreferenceValueMutation();
  const [deletePreference, { isLoading: preferenceDeleteLoading }] =
    useDeletePreferenceMutation();
  const [editPreferenceValue, { isLoading: editPrefValLoading }] =
    useEditPreferenceValueMutation();
  const [editPreferenceType, { isLoading: editPrefTypeLoading }] =
    useEditPreferenceTypeMutation();

  const { isLoading } = useGetPreferencesQuery();
  const [expandedPrefs, setExpandedPrefs] = useState({});
  const [anchorEl, setAnchorEl] = useState(null);
  const [preferenceData, setPreferenceData] = useState({
    name: "",
    preferenceId: "",
    open: false,
    valueModal: false,
    subPreference: "",
    subPreferenceId: "",
    type: "",
  });

  // Handle external trigger to open add modal
  useEffect(() => {
    if (triggerAdd && triggerAdd > 0 && !preferenceData.open) {
      setPreferenceData((prev) => ({ ...prev, open: true }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerAdd]);

  const handleToggle = (val) => {
    if (val) {
      setPreferenceData((prev) => ({
        ...prev,
        valueModal: !prev.valueModal,
      }));
    } else {
      setPreferenceData((prev) => ({
        ...prev,
        open: !prev.open,
      }));
    }
  };

  const handlePrefToggle = (prefId) => {
    setExpandedPrefs((prev) => ({
      ...prev,
      [prefId]: !prev[prefId],
    }));
  };

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleAddPreference = async () => {
    try {
      let res = await addPreference({
        name: preferenceData.name,
      }).unwrap();
      if (res?.status === "1") {
        success("Preference added successfully!");
        handleToggle(false);
        setPreferenceData({
          name: "",
          preferenceId: "",
          open: false,
          valueModal: false,
          subPreference: "",
          subPreferenceId: "",
          type: "",
        });
      } else {
        error(res?.message || "Something went wrong");
      }
    } catch (err) {
      error(err?.data?.message || "Failed to add preference");
    }
  };

  const handleEditPreference = async () => {
    try {
      let res = await editPreferenceType({
        id: preferenceData.preferenceId,
        name: preferenceData.name,
      }).unwrap();
      if (res?.status === "1") {
        success("Preference added successfully!");
        handleToggle(false);
        setPreferenceData({
          name: "",
          preferenceId: "",
          open: false,
          valueModal: false,
          subPreference: "",
          subPreferenceId: "",
          type: "",
        });
      } else {
        error(res?.message || "Something went wrong");
      }
    } catch (err) {
      error(err?.data?.message || "Failed to add preference");
    }
  };

  const handleAddPreferenceValue = async () => {
    try {
      let res = await addPreferenceValue({
        value: [preferenceData.subPreference],
        preferenceTypeId: preferenceData.preferenceId,
      }).unwrap();
      if (res?.status === "1") {
        success("Preference value added successfully!");
        handleToggle(true);
        setPreferenceData({
          name: "",
          preferenceId: "",
          open: false,
          valueModal: false,
          subPreference: "",
          subPreferenceId: "",
          type: "",
        });
      } else {
        error(res?.error);
      }
    } catch (err) {
      error(err?.data?.error || "Failed to add preference value");
    }
  };

  const handleUpdatePreferenceValue = async () => {
    try {
      let res = await editPreferenceValue({
        id: preferenceData.subPreferenceId,
        value: preferenceData.subPreference,
      }).unwrap();
      if (res?.status === "1") {
        success("Preference value updated successfully!");
        handleToggle(true);
        setPreferenceData({
          name: "",
          preferenceId: "",
          open: false,
          valueModal: false,
          subPreference: "",
          subPreferenceId: "",
          type: "",
        });
      } else {
        error(res?.message || "Something went wrong");
      }
    } catch (err) {
      error(err?.data?.message || "Failed to update preference value");
    }
  };

  const deletePref = async (id) => {
    try {
      let res = await deletePreference(id).unwrap();
      if (res.status === "1") {
        success("Preference deleted successfully");
      } else {
        error(res?.message || "Failed to delete preference");
      }
    } catch (err) {
      error(err?.data?.message || "Failed to delete preference");
    }
  };

  const deletePrefValue = async (id) => {
    try {
      let res = await deletePreferenceValue(id).unwrap();
      if (res.status === "1") {
        success("Preference value deleted successfully");
      } else {
        error(res?.message || "Failed to delete preference value");
      }
    } catch (err) {
      error(err?.data?.message || "Failed to delete preference value");
    }
  };

  return isLoading ? (
    <MiniLoader />
  ) : (
    <Box
      className="w-full"
      sx={{
        bgcolor: "white",
        borderRadius: "12px",
        border: "1px solid #E4E7EC",
        overflow: "hidden",
        fontFamily: "Inter",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          p: "16px 20px",
          borderBottom: "1px solid #E4E7EC",
          bgcolor: "blue.10",
        }}
      >
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 700,
            fontSize: "18px",
            color: "#101828",
            fontFamily: "Inter, sans-serif",
          }}
        >
          Preferences
        </Typography>
      </Box>

      {/* Content */}
      <Collapse in={true}>
        <Box sx={{ p: "12px" }}>
          <List sx={{ p: "0 8px" }}>
            {preferences?.map((preference) => (
              <Box key={preference?.id}>
                <ListItem
                  onClick={() => handlePrefToggle(preference?.id)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    py: "8px",
                    px: "16px",
                    my: "4px",
                    bgcolor: "blue.10",
                    borderRadius: "4px",
                    "&:hover": {
                      bgcolor: "blue.20",
                    },
                  }}
                >
                  <Box
                    sx={{ display: "flex", alignItems: "center", gap: "8px" }}
                  >
                    <Typography width={"140px"} variant="body1">
                      {preference?.name}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      gap: "8px",
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreferenceData({
                          ...preferenceData,
                          name: preference?.name,
                          preferenceId: preference?.id,
                          valueModal: true,
                        });
                      }}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-5 py-1 rounded-lg font-medium text-xs transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center h-9 min-w-[140px]"
                    >
                      Add Sub Preference
                    </button>

                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreferenceData({
                          type: "preference",
                          preferenceId: preference?.id,
                          name: preference?.name,
                          open: true,
                        });
                      }}
                      size="small"
                    >
                      <TbPencil size="20px" />
                    </IconButton>

                    <IconButton
                      disabled={preferenceDeleteLoading}
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePref(preference?.id);
                      }}
                      size="small"
                      sx={{ color: "#EF4444" }}
                    >
                      <RiDeleteBin6Line size="20px" />
                    </IconButton>

                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrefToggle(preference?.id);
                      }}
                      size="small"
                      sx={{
                        color: "#667085",
                        transform: expandedPrefs[preference?.id]
                          ? "rotate(180deg)"
                          : "rotate(0deg)",
                        transition: "transform 0.2s",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        pointerEvents: "auto",
                      }}
                    >
                      <TbChevronDown size="20px" color="black" />
                    </IconButton>
                  </Box>
                </ListItem>

                {/* Preference Options */}
                <Collapse in={expandedPrefs[preference?.id]}>
                  <Box sx={{ pb: "8px" }}>
                    {preference?.preferenceValues?.map((option) => (
                      <Box
                        key={option.value}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          py: "4px",
                          px: "4px",
                          borderRadius: "4px",
                          // "&:hover": {
                          //   bgcolor: "#F9FAFB",
                          // },
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <Checkbox
                            size="medium"
                            defaultChecked
                            sx={{
                              color: "black",
                              "&.Mui-checked": { color: "blue.100" },
                            }}
                          />
                          <Typography variant="subtitle2">
                            {option?.value}
                          </Typography>
                        </Box>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            handleMenuClick(e, option);

                            setPreferenceData({
                              name: preference.name,
                              subPreference: option?.value,
                              preferenceId: preference?.id,
                              subPreferenceId: option?.id,
                              type: "update",
                            });
                          }}
                          sx={{ color: "#667085" }}
                        >
                          <TbDotsVertical size="20px" />
                        </IconButton>
                      </Box>
                    ))}
                  </Box>
                </Collapse>
              </Box>
            ))}
          </List>
        </Box>
      </Collapse>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        sx={{
          "& .MuiPaper-root": {
            borderRadius: "6px",
            border: "1px solid #E4E7EC",
            boxShadow: "0px 4px 16px rgba(0, 0, 0, 0.1)",
          },
        }}
      >
        <MenuItem
          onClick={() => {
            setPreferenceData({ ...preferenceData, valueModal: true });
            handleMenuClose();
          }}
          className="flex items-center gap-x-2 font-sm font-Inter !px-2 !mx-2 !rounded-sm border-b"
        >
          <TbPencil size="20px" />
          Edit
        </MenuItem>

        <hr className="text-gray-100 w-full !my-1.5" />

        <MenuItem
          onClick={() => {
            deletePrefValue(preferenceData.subPreferenceId);
            handleMenuClose();
          }}
          disabled={deletePrefValueLoading}
          className="flex items-center gap-x-2 font-sm font-Inter !text-red100 !px-2 !mx-2 !rounded-sm"
        >
          <RiDeleteBin6Line size="20px" />
          Delete
        </MenuItem>
      </Menu>

      <ModalComponent
        open={preferenceData.open || preferenceData.valueModal}
        title={
          preferenceData.valueModal
            ? preferenceData.type === "update"
              ? "Update sub  Preferences"
              : "Add sub  Preferences"
            : preferenceData.type === "preference"
            ? "Update Preference"
            : "ADD PREFERENCE"
        }
        onClose={() => handleToggle(Boolean(preferenceData.valueModal))}
        secondaryAction={{
          label: "Cancel",
          onClick: () => handleToggle(Boolean(preferenceData.valueModal)),
        }}
        primaryAction={{
          label: preferenceData.valueModal
            ? preferenceData.type === "update"
              ? "Update Sub Preference"
              : "Add Sub Preference"
            : preferenceData.type === "preference"
            ? "Update"
            : "Add Preference",
          onClick: preferenceData.valueModal
            ? preferenceData.type === "update"
              ? handleUpdatePreferenceValue
              : handleAddPreferenceValue
            : preferenceData.type === "preference"
            ? handleEditPreference
            : handleAddPreference,
          isLoading:
            preferenceLoading ||
            preferenceValLoading ||
            editPrefValLoading ||
            editPrefTypeLoading,
        }}
      >
        <Box className="flex flex-col gap-5">
          <InputFieldModal
            title="Name (Preference Name)"
            placeholder={"preference"}
            name="name"
            disabled={preferenceData.valueModal}
            value={preferenceData?.name}
            onChange={(e) => {
              setPreferenceData({ ...preferenceData, name: e.target.value });
            }}
          />
          {preferenceData.valueModal && (
            <InputFieldModal
              title="Name (Sub Preferences)"
              placeholder={"..."}
              name="name"
              value={preferenceData?.subPreference}
              onChange={(e) => {
                setPreferenceData({
                  ...preferenceData,
                  subPreference: e.target.value,
                });
              }}
            />
          )}
        </Box>
      </ModalComponent>
    </Box>
  );
}
