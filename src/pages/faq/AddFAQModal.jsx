import { useEffect } from "react";
import { Box, Typography } from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import ModalComponent from "../../components/shared/Modal";
import InputFieldModal from "../../components/ui/InputFieldModal";
import TextareaField from "../../components/ui/TextArea";
import SelectField from "../../components/ui/SelectField";

// Icon options for customer app – admin picks which icon shows per FAQ
export const FAQ_ICON_OPTIONS = [
  { value: "help", label: "Help" },
  { value: "info", label: "Info" },
  { value: "delivery", label: "Delivery" },
  { value: "laundry", label: "Laundry" },
  { value: "support", label: "Support" },
  { value: "payment", label: "Payment" },
  { value: "order", label: "Order" },
  { value: "general", label: "General" },
  { value: "clock", label: "Clock" },
  { value: "service", label: "Service" },
];

const faqSchema = yup.object().shape({
  question: yup
    .string()
    .required("Question is required")
    .min(2, "Question must be at least 2 characters"),
  answer: yup
    .string()
    .required("Answer is required")
    .min(10, "Answer must be at least 10 characters"),
  icon: yup.string(),
});

const defaultValues = {
  question: "",
  answer: "",
  icon: "help",
};

function getIconValue(icon) {
  if (!icon) return "help";
  if (typeof icon === "string" && icon.endsWith("-icon.png")) {
    return icon.replace(/-icon\.png$/, "");
  }
  return icon;
}

export default function AddFAQModal({ open, onClose, onSave, isLoading = false, faqToEdit = null }) {
  const isEdit = !!faqToEdit;
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(faqSchema),
    defaultValues,
    mode: "onChange",
  });

  useEffect(() => {
    if (open && faqToEdit) {
      reset({
        question: faqToEdit.question || "",
        answer: faqToEdit.answer || "",
        icon: getIconValue(faqToEdit.icon) || "help",
      });
    } else if (open && !faqToEdit) {
      reset(defaultValues);
    }
  }, [open, faqToEdit, reset]);

  const handleClose = () => {
    reset(defaultValues);
    onClose();
  };

  const onSubmit = async (data) => {
    try {
      await onSave?.(
        { question: data.question, answer: data.answer, icon: data.icon || "help" },
        faqToEdit?.id
      );
      handleClose();
    } catch {
      // Error handled by parent, keep modal open for retry
    }
  };

  return (
    <ModalComponent
      open={open}
      onClose={handleClose}
      title={isEdit ? "Edit FAQ" : "Add FAQ"}
      secondaryAction={{
        label: "Cancel",
        onClick: handleClose,
      }}
      primaryAction={{
        label: isEdit ? "Update" : "Add",
        onClick: handleSubmit(onSubmit),
        isLoading: isLoading,
      }}
    >
      <Box className="flex flex-col gap-5">
        <Controller
          name="question"
          control={control}
          render={({ field: { onChange, value } }) => (
            <Box>
              <InputFieldModal
                title="Question"
                placeholder="Enter the question"
                name="question"
                value={value}
                onChange={(e) => onChange(e.target.value)}
              />
              {errors.question && (
                <Typography
                  variant="caption"
                  sx={{ color: "error.main", mt: 1, display: "block" }}
                >
                  {errors.question.message}
                </Typography>
              )}
            </Box>
          )}
        />

        <Controller
          name="icon"
          control={control}
          render={({ field: { onChange, value } }) => (
            <Box>
              <SelectField
                title="Icon"
                placeholder="Select icon (shown on customer side)"
                value={value || "help"}
                onChange={(e) => onChange(e.target.value)}
                options={FAQ_ICON_OPTIONS}
                fullWidth
                bgcolor="#F4F7FF"
              />
              <Typography variant="caption" sx={{ color: "grey.70", mt: 0.5, display: "block" }}>
                Choose which icon to display with this FAQ on the customer app.
              </Typography>
            </Box>
          )}
        />

        <Controller
          name="answer"
          control={control}
          render={({ field: { onChange, value } }) => (
            <Box>
              <TextareaField
                title="Answer"
                placeholder="Enter the answer"
                name="answer"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                rows={4}
              />
              {errors.answer && (
                <Typography
                  variant="caption"
                  sx={{ color: "error.main", mt: 1, display: "block" }}
                >
                  {errors.answer.message}
                </Typography>
              )}
            </Box>
          )}
        />
      </Box>
    </ModalComponent>
  );
}
