import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Modal, Field, Input } from "../../design-system";

const schema = yup.object().shape({
  label: yup
    .string()
    .required("Reason label is required")
    .min(2, "At least 2 characters"),
  sortOrder: yup
    .number()
    .typeError("Sort order must be a number")
    .min(0, "Must be 0 or greater")
    .required("Sort order is required"),
  status: yup.boolean(),
  isOther: yup.boolean(),
});

const defaultValues = {
  label: "",
  sortOrder: 0,
  status: true,
  isOther: false,
};

export default function AddDeleteAccountReasonModal({
  open,
  onClose,
  onSave,
  isLoading = false,
  reasonToEdit = null,
}) {
  const isEdit = !!reasonToEdit;
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues,
    mode: "onChange",
  });

  useEffect(() => {
    if (open && reasonToEdit) {
      reset({
        label: reasonToEdit.label || "",
        sortOrder: reasonToEdit.sortOrder ?? 0,
        status: reasonToEdit.status !== false,
        isOther: Boolean(reasonToEdit.isOther),
      });
    } else if (open && !reasonToEdit) {
      reset(defaultValues);
    }
  }, [open, reasonToEdit, reset]);

  const handleClose = () => {
    reset(defaultValues);
    onClose();
  };

  const onSubmit = async (values) => {
    if (isLoading) return;
    try {
      await onSave(
        {
          label: values.label.trim(),
          sortOrder: Number(values.sortOrder),
          status: values.status,
          isOther: values.isOther,
        },
        reasonToEdit?.id
      );
      handleClose();
    } catch {
      // Keep modal open on validation/API errors
    }
  };

  return (
    <Modal
      open={open}
      title={isEdit ? "Edit delete reason" : "Add delete reason"}
      description="Shown to customers when they delete their account (step 1)."
      onClose={handleClose}
      onPrimary={handleSubmit(onSubmit)}
      primaryLabel={isLoading ? (isEdit ? "Saving…" : "Adding…") : isEdit ? "Save" : "Add"}
      secondaryLabel="Cancel"
    >
      <div style={{ display: "grid", gap: 16 }}>
        <Controller
          name="label"
          control={control}
          render={({ field }) => (
            <Field label="Reason label" error={errors.label?.message} htmlFor="delete-reason-label">
              <Input
                id="delete-reason-label"
                {...field}
                placeholder="e.g. Had an issue with a shop"
                error={!!errors.label}
              />
            </Field>
          )}
        />

        <Controller
          name="sortOrder"
          control={control}
          render={({ field }) => (
            <Field
              label="Sort order"
              hint={errors.sortOrder ? undefined : "Lower numbers appear first"}
              error={errors.sortOrder?.message}
              htmlFor="delete-reason-sort"
            >
              <Input
                id="delete-reason-sort"
                {...field}
                type="number"
                min={0}
                placeholder="0"
                error={!!errors.sortOrder}
                onChange={(e) => field.onChange(Number(e.target.value))}
              />
            </Field>
          )}
        />

        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <label style={checkStyle}>
              <input
                type="checkbox"
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
              />
              Active (visible to customers)
            </label>
          )}
        />

        <Controller
          name="isOther"
          control={control}
          render={({ field }) => (
            <label style={checkStyle}>
              <input
                type="checkbox"
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
              />
              &quot;Other&quot; option (shows extra text field — only one allowed)
            </label>
          )}
        />
      </div>
    </Modal>
  );
}

const checkStyle = {
  display: "flex",
  alignItems: "flex-start",
  gap: 8,
  fontSize: 14,
  color: "var(--ink-2)",
  cursor: "pointer",
  lineHeight: 1.4,
};
