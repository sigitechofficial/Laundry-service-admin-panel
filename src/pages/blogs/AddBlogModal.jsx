import { useState, useRef, useEffect } from "react";
import {
  Box,
  Typography,
  IconButton,
  Popover,
  TextField,
  Button,
  CircularProgress,
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import ModalComponent from "../../components/shared/Modal";
import InputFieldModal from "../../components/ui/InputFieldModal";
import RichTextEditor from "../../components/ui/RichTextEditor";
import ImageUpload from "../../components/ui/ImageUpload";
import { TbSparkles } from "../../shared/icons/index";
import { generateWithGemini } from "../../utilities/geminiApi";
import { BASE_URL } from "../../utilities/URL";

function getImageDisplayUrl(img) {
  if (!img) return null;
  if (typeof img === "string" && (img.startsWith("http") || img.startsWith("data:"))) return img;
  return `${BASE_URL}${img}`;
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
      ? yup.mixed().nullable()
      : yup
        .mixed()
        .required("Image is required")
        .test("isFile", "Please select an image file", (value) => value instanceof File),
  });

const defaultValues = {
  title: "",
  description: "",
  image: null,
};

export default function AddBlogModal({ open, onClose, onSave, isLoading = false, blogToEdit = null }) {
  const isEdit = !!blogToEdit;
  const aiButtonRef = useRef(null);
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
    const apiKey = import.meta.env.LAUNDRY_GEMINI_API_KEY;
    if (!apiKey) {
      setAssistantError("Add LAUNDRY_GEMINI_API_KEY to .env or .env.local");
      return;
    }
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
      const text = await generateWithGemini(fullPrompt, apiKey);
      setValue("description", text);
      setAssistantOpen(false);
      setAssistantPrompt("");
    } catch (err) {
      setAssistantError(err?.message || "Failed to generate. Check your API key and try again.");
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
    <ModalComponent
      open={open}
      onClose={handleClose}
      title={isEdit ? "Edit Blog" : "Add Blog"}
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
          name="title"
          control={control}
          render={({ field: { onChange, value } }) => (
            <Box>
              <InputFieldModal
                title="Title"
                placeholder="Enter blog title"
                name="title"
                value={value}
                onChange={(e) => onChange(e.target.value)}
              />
              {errors.title && (
                <Typography
                  variant="caption"
                  sx={{ color: "error.main", mt: 1, display: "block" }}
                >
                  {errors.title.message}
                </Typography>
              )}
            </Box>
          )}
        />

        <Controller
          name="description"
          control={control}
          render={({ field: { onChange, value } }) => (
            <Box>
              <Box sx={{ position: "relative", width: "100%" }}>
                <RichTextEditor
                  title="Description"
                  placeholder="Enter blog description"
                  value={value || ""}
                  onChange={(html) => onChange(html)}
                  minHeight={140}
                  emitAsEvent={false}
                />
                <IconButton
                  ref={aiButtonRef}
                  onClick={() => setAssistantOpen(true)}
                  size="small"
                  sx={{
                    position: "absolute",
                    bottom: 8,
                    right: 8,
                    bgcolor: "grey.200",
                    color: "grey.700",
                    "&:hover": { bgcolor: "grey.300" },
                  }}
                  title="Generate description with AI"
                >
                  <TbSparkles size={20} />
                </IconButton>
              </Box>
              {errors.description && (
                <Typography
                  variant="caption"
                  sx={{ color: "error.main", mt: 1, display: "block" }}
                >
                  {errors.description.message}
                </Typography>
              )}

              <Popover
                open={assistantOpen}
                anchorEl={aiButtonRef.current}
                onClose={() => !generating && setAssistantOpen(false)}
                anchorOrigin={{ vertical: "top", horizontal: "right" }}
                transformOrigin={{ vertical: "bottom", horizontal: "right" }}
                slotProps={{
                  paper: {
                    sx: {
                      p: 2,
                      width: 320,
                      borderRadius: 2,
                      boxShadow: 3,
                    },
                  },
                }}
              >
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                  AI assistant
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: "block" }}>
                  e.g. &quot;Write a blog on laundry tips&quot; or paste a heading
                </Typography>
                <TextField
                  placeholder="Topic, heading, or instruction..."
                  value={assistantPrompt}
                  onChange={(e) => setAssistantPrompt(e.target.value)}
                  multiline
                  minRows={2}
                  fullWidth
                  size="small"
                  disabled={generating}
                  sx={{
                    mb: 1.5,
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 1,
                      bgcolor: "grey.50",
                      fontSize: "14px",
                    },
                  }}
                />
                {assistantError && (
                  <Typography variant="caption" color="error" sx={{ mb: 1, display: "block" }}>
                    {assistantError}
                  </Typography>
                )}
                <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
                  <Button size="small" onClick={() => setAssistantOpen(false)} disabled={generating}>
                    Cancel
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleGenerateDescription}
                    disabled={generating}
                    startIcon={generating ? <CircularProgress size={16} color="inherit" /> : <TbSparkles size={16} />}
                    sx={{ bgcolor: "#000099", "&:hover": { bgcolor: "#000077" } }}
                  >
                    {generating ? "Generating…" : "Generate"}
                  </Button>
                </Box>
              </Popover>
            </Box>
          )}
        />

        <Controller
          name="image"
          control={control}
          render={({ field: { onChange, value } }) => (
            <Box>
              <ImageUpload
                title="Image"
                placeholder="Upload image"
                value={value}
                onChange={(file) => onChange(file)}
              />
              {errors.image && (
                <Typography
                  variant="caption"
                  sx={{ color: "error.main", mt: 1, display: "block" }}
                >
                  {errors.image.message}
                </Typography>
              )}
            </Box>
          )}
        />
      </Box>
    </ModalComponent>
  );
}
