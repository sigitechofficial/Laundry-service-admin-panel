import { useState } from "react";
import {
  useCreateAddOnCategoryMutation,
  useDeleteAddOnCategoryMutation,
  useGetAllAddOnCategoriesQuery,
  useUpdateAddOnCategoryMutation,
} from "../../store/services/api";
import { Button, Field, Input, Modal } from "../../design-system";
import useToaster from "../../components/ui/Toaster";
import { QueryState } from "./QueryState";
import {
  DirectoryActionDelete,
  DirectoryActionEdit,
} from "../directory-table/directoryTable";

const isExplicitFailure = (res) =>
  res && (res.status === "0" || res.status === 0 || res.success === false);

export default function AddOnCategoriesModal({ open, onClose }) {
  const { success, error } = useToaster();
  const { data, isLoading, isError, error: categoriesQueryError, refetch } = useGetAllAddOnCategoriesQuery(
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
  const [status, setStatus] = useState(true);
  const [editingId, setEditingId] = useState(null);

  const categories = (() => {
    const list = data?.data?.addOnCategories || data?.data || [];
    return Array.isArray(list) ? list : [];
  })();

  const resetForm = () => {
    setName("");
    setStatus(true);
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
          body: { name: trimmed, status },
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

      const res = await createCategory({ name: trimmed, status }).unwrap();
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
    setStatus(item?.status !== false);
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

  const saving = creating || updating;

  return (
    <Modal
      open={open}
      title="Manage Add-on Categories"
      onClose={handleClose}
      secondaryLabel="Close"
      primaryLabel={
        saving ? "Saving…" : editingId ? "Update Category" : "Add Category"
      }
      onPrimary={() => {
        if (saving) return;
        handleSave();
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Field label="Category Name" htmlFor="addon-cat-name">
          <Input
            id="addon-cat-name"
            name="categoryName"
            placeholder="e.g. Blouse"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Availability">
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={Boolean(status)}
              onChange={(e) => setStatus(e.target.checked)}
            />
            Enabled in customer/agent apps
          </label>
        </Field>

        {editingId ? (
          <Button variant="ghost" size="sm" onClick={resetForm}>
            + Add new category instead
          </Button>
        ) : null}

        <div>
          <div style={{ fontWeight: 600, marginBottom: 8, color: "var(--ink)" }}>
            Existing Categories
          </div>
          {isLoading || isError ? (
            <QueryState
              loading={isLoading}
              error={categoriesQueryError || isError}
              onRetry={refetch}
              errorLabel="Could not load add-on categories."
            />
          ) : categories.length === 0 ? (
            <p style={{ color: "var(--muted)", margin: 0 }}>
              No categories yet. Add one above.
            </p>
          ) : (
            categories.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  margin: "6px 0",
                  background:
                    editingId === item.id
                      ? "var(--accent-tint)"
                      : "var(--canvas)",
                  borderRadius: "var(--r-sm)",
                }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                  {item.name} {item?.status === false ? "(Disabled)" : ""}
                </span>
                <div style={{ display: "flex", gap: 6 }}>
                  <DirectoryActionEdit
                    disabled={updating}
                    onClick={() => handleEdit(item)}
                  />
                  <DirectoryActionDelete
                    disabled={deleting}
                    onClick={() => handleDelete(item.id)}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
