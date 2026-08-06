import { useEffect } from "react";
import { Box, Typography, FormControlLabel, Checkbox } from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import ModalComponent from "../../components/shared/Modal";
import InputFieldModal from "../../components/ui/InputFieldModal";

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
    <ModalComponent
      open={open}
      title={isEdit ? "Edit delete reason" : "Add delete reason"}
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
          Shown to customers when they delete their account (step 1).
        </Typography>

        <Controller
          name="label"
          control={control}
          render={({ field }) => (
            <InputFieldModal
              {...field}
              label="Reason label"
              placeholder="e.g. Had an issue with a shop"
              error={!!errors.label}
              helperText={errors.label?.message}
            />
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
              label={`"Other" option (shows extra text field — only one allowed)`}
            />
          )}
        />
      </Box>
    </ModalComponent>
  );
}
