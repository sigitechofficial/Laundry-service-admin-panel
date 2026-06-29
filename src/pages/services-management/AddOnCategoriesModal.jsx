import React, { useState } from "react";
import { Box, IconButton, List, ListItem, Typography } from "@mui/material";
import { RiDeleteBin6Line, TbPencil } from "../../shared/icons/index";
import {
  useCreateAddOnCategoryMutation,
  useDeleteAddOnCategoryMutation,
  useGetAllAddOnCategoriesQuery,
  useUpdateAddOnCategoryMutation,
} from "../../store/services/api";
import ModalComponent from "../../components/shared/Modal";
import InputFieldModal from "../../components/ui/InputFieldModal";
import { MiniLoader } from "../../components/shared/Loaders";
import useToaster from "../../components/ui/Toaster";

const isExplicitFailure = (res) =>
  res && (res.status === "0" || res.status === 0 || res.success === false);

export default function AddOnCategoriesModal({ open, onClose }) {
  const { success, error } = useToaster();
  const { data, isLoading, refetch } = useGetAllAddOnCategoriesQuery(
    { includeServices: false },
    { skip: !open }
  );
  const [createCategory, { isLoading: creating }] =
    useCreateAddOnCategoryMutation();
  const [updateCategory, { isLoading: updating }] =
    useUpdateAddOnCategoryMutation();
  const [deleteCategory, { isLoading: deleting }] =
    useDeleteAddOnCategoryMutation();

  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState(null);

  const categories = (() => {
    const list = data?.data?.addOnCategories || data?.data || [];
    return Array.isArray(list) ? list : [];
  })();

  const resetForm = () => {
    setName("");
    setEditingId(null);
  };

  const handleClose = () => {
    resetForm();
    onClose?.();
  };

  const handleSave = async () => {
    const trimmed = String(name || "").trim();
    if (!trimmed) {
      error("Category name is required.");
      return;
    }

    try {
      if (editingId) {
        const res = await updateCategory({
          addOnCategoryId: editingId,
          body: { name: trimmed },
        }).unwrap();
        if (!isExplicitFailure(res)) {
          success("Category updated.");
          resetForm();
          void refetch();
          return;
        }
        error(res?.message || "Could not update category.");
        return;
      }

      const res = await createCategory({ name: trimmed }).unwrap();
      if (!isExplicitFailure(res)) {
        success("Category created.");
        resetForm();
        void refetch();
        return;
      }
      error(res?.message || "Could not create category.");
    } catch {
      error("Request failed. Please try again.");
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setName(item.name || "");
  };

  const handleDelete = async (id) => {
    try {
      const res = await deleteCategory(id).unwrap();
      if (!isExplicitFailure(res)) {
        success("Category deleted.");
        if (editingId === id) resetForm();
        void refetch();
      } else {
        error(res?.message || "Could not delete category.");
      }
    } catch {
      error("Request failed. Please try again.");
    }
  };

  return (
    <ModalComponent
      open={open}
      title="Manage Add-on Categories"
      onClose={handleClose}
      secondaryAction={{ label: "Close", onClick: handleClose }}
      primaryAction={{
        label: editingId ? "Update Category" : "Add Category",
        onClick: handleSave,
        isLoading: creating || updating,
      }}
    >
      <Box className="flex flex-col gap-5">
        <InputFieldModal
          title="Category Name"
          label="Name"
          placeholder="e.g. Blouse"
          name="categoryName"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {editingId && (
          <Typography
            variant="caption"
            sx={{ color: "#1570EF", cursor: "pointer" }}
            onClick={resetForm}
          >
            + Add new category instead
          </Typography>
        )}

        <Box>
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 600, color: "#101828", mb: 1 }}
          >
            Existing Categories
          </Typography>

          {isLoading ? (
            <MiniLoader />
          ) : categories.length === 0 ? (
            <Typography variant="body2" sx={{ color: "#64748B" }}>
              No categories yet. Add one above.
            </Typography>
          ) : (
            <List sx={{ p: 0 }}>
              {categories.map((item) => (
                <ListItem
                  key={item.id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    py: "8px",
                    px: "12px",
                    my: "6px",
                    bgcolor:
                      editingId === item.id ? "rgba(21, 112, 239, 0.12)" : "blue.10",
                    borderRadius: "4px",
                  }}
                >
                  <Typography variant="body1" noWrap sx={{ flex: 1 }}>
                    {item.name}
                  </Typography>
                  <Box className="flex items-center gap-2">
                    <IconButton
                      disabled={updating}
                      onClick={() => handleEdit(item)}
                      size="small"
                    >
                      <TbPencil size="18px" />
                    </IconButton>
                    <IconButton
                      disabled={deleting}
                      onClick={() => handleDelete(item.id)}
                      size="small"
                      sx={{
                        color: "#EF4444",
                        "&:hover": { bgcolor: "#FEF2F2" },
                      }}
                    >
                      <RiDeleteBin6Line size="16px" />
                    </IconButton>
                  </Box>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Box>
    </ModalComponent>
  );
}
