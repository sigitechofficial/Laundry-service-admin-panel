import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Modal, Field, Input, Select } from "../../design-system";

const schema = yup.object().shape({
  code: yup
    .string()
    .required("Code is required")
    .matches(
      /^[A-Z][A-Z0-9_]{1,62}$/,
      "Use uppercase letters, numbers, underscores (e.g. POS_QUALITY)"
    ),
  label: yup
    .string()
    .required("Reason label is required")
    .min(2, "At least 2 characters"),
  sentiment: yup
    .string()
    .oneOf(["positive", "negative"])
    .required("Sentiment is required"),
  sortOrder: yup
    .number()
    .typeError("Sort order must be a number")
    .min(0, "Must be 0 or greater")
    .required("Sort order is required"),
  status: yup.boolean(),
  isOther: yup.boolean(),
});

const defaultValues = {
  code: "",
  label: "",
  sentiment: "positive",
  sortOrder: 0,
  status: true,
  isOther: false,
};

const SENTIMENT_OPTIONS = [
  { value: "positive", label: "Positive" },
  { value: "negative", label: "Negative" },
];

export default function AddReviewReasonCodeModal({
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
        code: reasonToEdit.code || "",
        label: reasonToEdit.label || "",
        sentiment: reasonToEdit.sentiment || "positive",
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
      const body = {
        label: values.label.trim(),
        sentiment: values.sentiment,
        sortOrder: Number(values.sortOrder),
        status: values.status,
        isOther: values.isOther,
      };
      if (!isEdit) {
        body.code = values.code.trim().toUpperCase();
      }
      await onSave(body, reasonToEdit?.id);
      handleClose();
    } catch {
      // Keep modal open on validation/API errors
    }
  };

  return (
    <Modal
      open={open}
      title={isEdit ? "Edit review reason" : "Add review reason"}
      description="Shown to customers when rating a laundry shop. Codes are stable for reporting and must stay unique."
      onClose={handleClose}
      onPrimary={handleSubmit(onSubmit)}
      primaryLabel={isLoading ? (isEdit ? "Saving…" : "Adding…") : isEdit ? "Save" : "Add"}
      secondaryLabel="Cancel"
    >
      <div style={{ display: "grid", gap: 16 }}>
        <Controller
          name="code"
          control={control}
          render={({ field }) => (
            <Field
              label="Reason code"
              hint={
                errors.code
                  ? undefined
                  : isEdit
                    ? "Code cannot be changed after create"
                    : "Immutable after create"
              }
              error={errors.code?.message}
              htmlFor="review-reason-code"
            >
              <Input
                id="review-reason-code"
                {...field}
                placeholder="e.g. POS_QUALITY"
                disabled={isEdit}
                error={!!errors.code}
                onChange={(e) =>
                  field.onChange(String(e.target.value || "").toUpperCase())
                }
              />
            </Field>
          )}
        />

        <Controller
          name="label"
          control={control}
          render={({ field }) => (
            <Field
              label="Customer-facing label"
              error={errors.label?.message}
              htmlFor="review-reason-label"
            >
              <Input
                id="review-reason-label"
                {...field}
                placeholder="e.g. Excellent cleaning quality"
                error={!!errors.label}
              />
            </Field>
          )}
        />

        <Controller
          name="sentiment"
          control={control}
          render={({ field }) => (
            <Field label="Sentiment" error={errors.sentiment?.message}>
              <Select
                aria-label="Sentiment"
                value={field.value}
                onChange={field.onChange}
                options={SENTIMENT_OPTIONS}
                disabled={isEdit}
                error={!!errors.sentiment}
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
              htmlFor="review-reason-sort"
            >
              <Input
                id="review-reason-sort"
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
              &quot;Other&quot; option (shows extra text field — one per sentiment)
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
