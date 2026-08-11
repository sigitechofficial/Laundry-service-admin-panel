import { useEffect } from "react";
import {
  Box,
  Typography,
  FormControlLabel,
  Checkbox,
  MenuItem,
  TextField,
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import ModalComponent from "../../components/shared/Modal";
import InputFieldModal from "../../components/ui/InputFieldModal";

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
    <ModalComponent
      open={open}
      title={isEdit ? "Edit review reason" : "Add review reason"}
      onClose={handleClose}
      primaryAction={{
        label: isEdit ? "Save" : "Add",
        onClick: handleSubmit(onSubmit),
        isLoading,
      }}
      secondaryAction={{
        label: "Cancel",
        onClick: handleClose,
      }}
    >
      <Box className="space-y-4">
        <Typography variant="body2" sx={{ color: "grey.70", fontFamily: "Switzer" }}>
          Shown to customers when rating a laundry shop. Codes are stable for
          reporting and must stay unique.
        </Typography>

        <Controller
          name="code"
          control={control}
          render={({ field }) => (
            <InputFieldModal
              {...field}
              label="Reason code"
              placeholder="e.g. POS_QUALITY"
              disabled={isEdit}
              error={!!errors.code}
              helperText={
                errors.code?.message ||
                (isEdit ? "Code cannot be changed after create" : "Immutable after create")
              }
              onChange={(e) =>
                field.onChange(String(e.target.value || "").toUpperCase())
              }
            />
          )}
        />

        <Controller
          name="label"
          control={control}
          render={({ field }) => (
            <InputFieldModal
              {...field}
              label="Customer-facing label"
              placeholder="e.g. Excellent cleaning quality"
              error={!!errors.label}
              helperText={errors.label?.message}
            />
          )}
        />

        <Controller
          name="sentiment"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              select
              fullWidth
              label="Sentiment"
              error={!!errors.sentiment}
              helperText={errors.sentiment?.message}
              disabled={isEdit}
            >
              <MenuItem value="positive">Positive</MenuItem>
              <MenuItem value="negative">Negative</MenuItem>
            </TextField>
          )}
        />

        <Controller
          name="sortOrder"
          control={control}
          render={({ field }) => (
            <InputFieldModal
              {...field}
              type="number"
              label="Sort order"
              placeholder="0"
              error={!!errors.sortOrder}
              helperText={errors.sortOrder?.message || "Lower numbers appear first"}
              onChange={(e) => field.onChange(Number(e.target.value))}
            />
          )}
        />

        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={
                <Checkbox
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                />
              }
              label="Active (visible to customers)"
            />
          )}
        />

        <Controller
          name="isOther"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={
                <Checkbox
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                />
              }
              label={`"Other" option (shows extra text field — one per sentiment)`}
            />
          )}
        />
      </Box>
    </ModalComponent>
  );
}
