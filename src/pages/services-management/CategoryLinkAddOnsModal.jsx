import { useEffect, useMemo, useState } from "react";
import { Badge, Field, Modal } from "../../design-system";
import useToaster from "../../components/ui/Toaster";
import { getApiErrorMessage } from "../../store/services/apiErrors";
import {
  useEditCategoryMutation,
  useGetAllAddOnCategoriesQuery,
  useGetAllAddOnServicesQuery,
  useGetCategoriesQuery,
  useGetSubCategoriesQuery,
} from "../../store/services/api";

/**
 * Link add-on categories to a catalog (service) category.
 * Those links are inherited by all current and future sub-categories.
 */
export default function CategoryLinkAddOnsModal({
  open,
  onClose,
  category,
}) {
  const { success, error } = useToaster();
  const [selectedIds, setSelectedIds] = useState([]);
  const [editCategory, { isLoading: saving }] = useEditCategoryMutation();
  const { data: addOnCategoriesData, isLoading: loadingOptions } =
    useGetAllAddOnCategoriesQuery(
      { includeServices: false },
      { skip: !open }
    );
  const { refetch: refetchCategories } = useGetCategoriesQuery(undefined, {
    skip: !open,
  });
  const { refetch: refetchSubCategories } = useGetSubCategoriesQuery(undefined, {
    skip: !open,
  });
  const { refetch: refetchAddOns } = useGetAllAddOnServicesQuery(undefined, {
    skip: !open,
  });

  const options = useMemo(() => {
    const list =
      addOnCategoriesData?.data?.addOnCategories ||
      addOnCategoriesData?.data ||
      [];
    return Array.isArray(list)
      ? list.map((c) => ({ value: String(c.id), label: c.name }))
      : [];
  }, [addOnCategoriesData]);

  useEffect(() => {
    if (!open) return;
    const linked = Array.isArray(category?.addOnCategories)
      ? category.addOnCategories.map((c) => String(c.id))
      : [];
    setSelectedIds(linked);
  }, [open, category]);

  const handleClose = () => {
    setSelectedIds([]);
    onClose();
  };

  const handleSave = async () => {
    if (!category?.id) return;
    try {
      const res = await editCategory({
        categoryId: category.id,
        body: {
          addOnCategoryIds: selectedIds.map((id) => Number(id)),
        },
      }).unwrap();

      if (res?.status === "1") {
        success("Category add-ons updated. All items in this category inherit them.");
        void refetchCategories();
        void refetchSubCategories();
        void refetchAddOns();
        handleClose();
      } else {
        error(res?.message || "Could not update category add-ons.");
      }
    } catch (err) {
      error(getApiErrorMessage(err, "Could not update category add-ons."));
    }
  };

  const itemCountHint =
    category?.itemCount != null
      ? ` Applies to ${category.itemCount} ${
          category.itemCount === 1 ? "item" : "items"
        } now, and any items added later.`
      : " Applies to all current and future items under this category.";

  return (
    <Modal
      open={open}
      title={`Link Add-ons — ${category?.name || "Category"}`}
      description={`Choose add-on categories for this catalog category.${itemCountHint} Per-item links still work on each sub-category.`}
      onClose={handleClose}
      secondaryLabel="Cancel"
      primaryLabel={saving ? "Saving…" : "Save links"}
      maxHeight="80vh"
      onPrimary={() => {
        if (saving) return;
        void handleSave();
      }}
    >
      <Field label="Add-on / Repair Categories">
        {loadingOptions ? (
          <p style={{ color: "var(--muted)", margin: 0 }}>Loading…</p>
        ) : options.length === 0 ? (
          <p style={{ color: "var(--muted)", margin: 0 }}>
            No add-on categories available
          </p>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              padding: 12,
              background: "var(--canvas)",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-md)",
            }}
          >
            {options.map((opt) => {
              const checked = selectedIds.includes(opt.value);
              return (
                <label
                  key={opt.value}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      setSelectedIds((prev) =>
                        checked
                          ? prev.filter((id) => id !== opt.value)
                          : [...prev, opt.value]
                      );
                    }}
                  />
                  <span>{opt.label}</span>
                  {checked ? <Badge tone="brand">Linked</Badge> : null}
                </label>
              );
            })}
          </div>
        )}
      </Field>
    </Modal>
  );
}
