import { useState, useRef, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Button, Field, Input, Textarea, Modal } from "../../design-system";
import BlogRichTextEditor from "./BlogRichTextEditor";
import { TbSparkles } from "../../shared/icons/index";
import { generateWithGemini } from "../../utilities/geminiApi";
import { joinMediaUrl } from "../../utilities/formatters";
import useToaster from "../../components/ui/Toaster";
import {
  IMAGE_UPLOAD_ACCEPT,
  IMAGE_UPLOAD_MESSAGES,
  acceptImageFile,
  validateImageFile,
} from "../../utilities/imageUploadPolicy";
import { getApiErrorMessage } from "../../store/services/apiErrors";

function getImageDisplayUrl(img) {
  return joinMediaUrl(img) || null;
}

function imagePreviewSrc(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return URL.createObjectURL(value);
}

const getBlogSchema = (isEdit) =>
  yup.object().shape({
    title: yup
      .string()
      .required("Title is required")
      .min(2, "Title must be at least 2 characters"),
    description: yup
      .string()
      .required("Description is required")
      .min(10, "Description must be at least 10 characters"),
    image: isEdit
      ? yup
        .mixed()
        .nullable()
        .test("imagePolicy", IMAGE_UPLOAD_MESSAGES.size, function (value) {
          if (value == null || value === "" || typeof value === "string") return true;
          const result = validateImageFile(value, { allowExistingUrl: true });
          if (result.ok) return true;
          return this.createError({ message: result.message });
        })
      : yup
        .mixed()
        .required("Image is required")
        .test("isFile", "Please select an image file", (value) => value instanceof File)
        .test("imagePolicy", IMAGE_UPLOAD_MESSAGES.size, function (value) {
          const result = validateImageFile(value);
          if (result.ok) return true;
          return this.createError({ message: result.message });
        }),
  });

const defaultValues = {
  title: "",
  description: "",
  image: null,
};

export default function AddBlogModal({ open, onClose, onSave, isLoading = false, blogToEdit = null }) {
  const isEdit = !!blogToEdit;
  const { error: toastError } = useToaster();
  const fileInputRef = useRef(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantPrompt, setAssistantPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [assistantError, setAssistantError] = useState("");

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(getBlogSchema(isEdit)),
    defaultValues,
    mode: "onChange",
  });

  useEffect(() => {
    if (open && blogToEdit) {
      reset({
        title: blogToEdit.title || "",
        description: blogToEdit.description || "",
        image: blogToEdit.image ? getImageDisplayUrl(blogToEdit.image) : null,
      });
    } else if (open && !blogToEdit) {
      reset(defaultValues);
    }
  }, [open, blogToEdit, reset]);

  const handleClose = () => {
    reset(defaultValues);
    setAssistantOpen(false);
    setAssistantPrompt("");
    setAssistantError("");
    onClose();
  };

  const handleGenerateDescription = async () => {
    const prompt = assistantPrompt.trim();
    if (!prompt) {
      setAssistantError("Enter a topic, heading, or instruction (e.g. “Write a blog on laundry tips”).");
      return;
    }
    setAssistantError("");
    setGenerating(true);
    try {
      const systemHint =
        "You are a helpful assistant for a laundry/dry cleaning business. Generate a blog post or description based on the user's request. Follow their instructions exactly, including any requested word count or length (e.g. if they ask for 500 words, write approximately 500 words). Output only the blog content, no title or extra text.";
      const fullPrompt = `${systemHint}\n\nUser request: ${prompt}`;
      const text = await generateWithGemini(fullPrompt);
      setValue("description", text);
      setAssistantOpen(false);
      setAssistantPrompt("");
    } catch (err) {
      setAssistantError(
        getApiErrorMessage(
          err,
          "Failed to generate. Ask an admin to set GEMINI_API_KEY on the API host."
        )
      );
    } finally {
      setGenerating(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      await onSave?.(
        {
          title: data.title,
          description: data.description,
          image: data.image,
        },
        blogToEdit?.id
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
      title={isEdit ? "Edit Blog" : "Add Blog"}
      size="lg"
      onPrimary={() => {
        if (isLoading) return;
        handleSubmit(onSubmit)();
      }}
      primaryLabel={isLoading ? (isEdit ? "Updating…" : "Adding…") : isEdit ? "Update" : "Add"}
      secondaryLabel="Cancel"
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          maxHeight: "60vh",
          overflowY: "auto",
        }}
      >
        <Controller
          name="title"
          control={control}
          render={({ field: { onChange, value } }) => (
            <Field label="Title" htmlFor="blog-title" error={errors.title?.message}>
              <Input
                id="blog-title"
                name="title"
                placeholder="Enter blog title"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                error={!!errors.title}
              />
            </Field>
          )}
        />

        <Controller
          name="description"
          control={control}
          render={({ field: { onChange, value } }) => (
            <Field label="Description" error={errors.description?.message}>
              <div style={{ position: "relative", width: "100%" }}>
                <BlogRichTextEditor
                  placeholder="Enter blog description"
                  value={value || ""}
                  onChange={(html) => onChange(html)}
                  minHeight={140}
                  emitAsEvent={false}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAssistantOpen(true)}
                  title="Generate description with AI"
                  style={{ position: "absolute", bottom: 8, right: 8 }}
                >
                  <TbSparkles size={18} />
                </Button>
              </div>

              {assistantOpen ? (
                <div
                  style={{
                    marginTop: 8,
                    padding: 16,
                    background: "var(--surface)",
                    border: "1px solid var(--line)",
                    borderRadius: "var(--r-lg)",
                    boxShadow: "var(--e-3)",
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 4, color: "var(--ink)" }}>
                    AI assistant
                  </div>
                  <p style={{ margin: "0 0 12px", fontSize: "var(--text-xs)", color: "var(--muted)" }}>
                    e.g. &quot;Write a blog on laundry tips&quot; or paste a heading
                  </p>
                  <Field error={assistantError}>
                    <Textarea
                      placeholder="Topic, heading, or instruction..."
                      value={assistantPrompt}
                      onChange={(e) => setAssistantPrompt(e.target.value)}
                      rows={2}
                      disabled={generating}
                    />
                  </Field>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setAssistantOpen(false)}
                      disabled={generating}
                    >
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleGenerateDescription} disabled={generating}>
                      <TbSparkles size={16} />
                      {generating ? "Generating…" : "Generate"}
                    </Button>
                  </div>
                </div>
              ) : null}
            </Field>
          )}
        />

        <Controller
          name="image"
          control={control}
          render={({ field: { onChange, value } }) => (
            <Field
              label="Image"
              hint="JPEG, PNG, GIF, or WebP. Max 5MB."
              error={errors.image?.message}
            >
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: "100%",
                  cursor: "pointer",
                  borderRadius: "var(--r-md)",
                  background: "var(--canvas)",
                  border: "1px dashed var(--line-2)",
                  padding: 16,
                  textAlign: "center",
                  color: "var(--muted)",
                  font: "inherit",
                }}
              >
                {value ? (
                  <img
                    src={imagePreviewSrc(value)}
                    alt="Uploaded preview"
                    style={{
                      maxHeight: 150,
                      maxWidth: "100%",
                      borderRadius: "var(--r-sm)",
                      objectFit: "cover",
                      display: "block",
                      margin: "0 auto",
                    }}
                  />
                ) : (
                  "Upload image"
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept={IMAGE_UPLOAD_ACCEPT}
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  const accepted = acceptImageFile(file, toastError);
                  if (accepted) onChange(accepted);
                }}
              />
              {value ? (
                <div style={{ marginTop: 8, textAlign: "center" }}>
                  <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
                    Remove
                  </Button>
                </div>
              ) : null}
            </Field>
          )}
        />
      </div>
    </Modal>
  );
}
