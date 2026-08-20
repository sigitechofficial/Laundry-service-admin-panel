import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Field, Input, Textarea, Select, Modal } from "../../design-system";

// Icon options for customer app – admin picks which icon shows per FAQ
const FAQ_ICON_OPTIONS = [
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
    <Modal
      open={open}
      onClose={handleClose}
      title={isEdit ? "Edit FAQ" : "Add FAQ"}
      onPrimary={() => {
        if (isLoading) return;
        handleSubmit(onSubmit)();
      }}
      primaryLabel={isLoading ? (isEdit ? "Updating…" : "Adding…") : isEdit ? "Update" : "Add"}
      secondaryLabel="Cancel"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Controller
          name="question"
          control={control}
          render={({ field: { onChange, value } }) => (
            <Field label="Question" htmlFor="faq-question" error={errors.question?.message}>
              <Input
                id="faq-question"
                name="question"
                placeholder="Enter the question"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                error={!!errors.question}
              />
            </Field>
          )}
        />

        <Controller
          name="icon"
          control={control}
          render={({ field: { onChange, value } }) => (
            <Field
              label="Icon"
              hint="Choose which icon to display with this FAQ on the customer app."
            >
              <Select
                aria-label="Icon"
                value={value || "help"}
                onChange={onChange}
                options={FAQ_ICON_OPTIONS}
                placeholder="Select icon (shown on customer side)"
              />
            </Field>
          )}
        />

        <Controller
          name="answer"
          control={control}
          render={({ field: { onChange, value } }) => (
            <Field label="Answer" htmlFor="faq-answer" error={errors.answer?.message}>
              <Textarea
                id="faq-answer"
                name="answer"
                placeholder="Enter the answer"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                rows={4}
                error={!!errors.answer}
              />
            </Field>
          )}
        />
      </div>
    </Modal>
  );
}
