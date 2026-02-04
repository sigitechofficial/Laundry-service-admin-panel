import { useEffect, useState, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Typography, Box, IconButton, Popover, TextField, Button } from "@mui/material";
import { TbBold, TbItalic, TbLink, TbPhoto, TbList, TbListNumbers } from "react-icons/tb";

export default function BlogEditor({
  value,
  onChange,
  placeholder = "Enter blog description...",
  title = "",
  minHeight = 120,
}) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [imageOpen, setImageOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const linkButtonRef = useRef(null);
  const imageButtonRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: { class: "blog-editor-inner" },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html === "<p></p>" ? "" : html);
    },
  });

  useEffect(() => {
    if (!editor) return;
    let newValue = value || "";
    if (newValue && !newValue.trim().startsWith("<")) {
      newValue = newValue
        .split("\n")
        .map((line) => `<p>${line || "<br>"}</p>`)
        .join("");
    }
    const currentHtml = editor.getHTML();
    if (newValue !== currentHtml) {
      editor.commands.setContent(newValue || "<p></p>", false);
    }
  }, [value, editor]);

  const setLink = () => {
    if (linkUrl.trim()) {
      editor?.chain().focus().setLink({ href: linkUrl.trim() }).run();
      setLinkUrl("");
      setLinkOpen(false);
    }
  };

  const addImage = () => {
    if (imageUrl.trim()) {
      editor?.chain().focus().setImage({ src: imageUrl.trim() }).run();
      setImageUrl("");
      setImageOpen(false);
    }
  };

  if (!editor) return null;

  return (
    <div className="w-full">
      {title && (
        <Typography variant="body2" sx={{ mb: "8px", color: "#374151" }}>
          {title}
        </Typography>
      )}
      <Box
        sx={{
          width: "100%",
          border: "1px solid #D1D5DB",
          borderRadius: "8px",
          backgroundColor: "#F4F7FF",
          overflow: "hidden",
        }}
      >
        {/* Toolbar */}
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 0.5,
            px: 1,
            py: 0.5,
            borderBottom: "1px solid #E5E7EB",
            backgroundColor: "#fff",
          }}
        >
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleBold().run()}
            sx={{
              bgcolor: editor.isActive("bold") ? "grey.300" : "transparent",
              "&:hover": { bgcolor: "grey.200" },
            }}
            title="Bold"
          >
            <TbBold size={18} />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            sx={{
              bgcolor: editor.isActive("italic") ? "grey.300" : "transparent",
              "&:hover": { bgcolor: "grey.200" },
            }}
            title="Italic"
          >
            <TbItalic size={18} />
          </IconButton>
          <IconButton
            ref={linkButtonRef}
            size="small"
            onClick={() => setLinkOpen(true)}
            sx={{
              bgcolor: editor.isActive("link") ? "grey.300" : "transparent",
              "&:hover": { bgcolor: "grey.200" },
            }}
            title="Insert link"
          >
            <TbLink size={18} />
          </IconButton>
          <IconButton
            ref={imageButtonRef}
            size="small"
            onClick={() => setImageOpen(true)}
            sx={{ "&:hover": { bgcolor: "grey.200" } }}
            title="Insert image"
          >
            <TbPhoto size={18} />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            sx={{
              bgcolor: editor.isActive("bulletList") ? "grey.300" : "transparent",
              "&:hover": { bgcolor: "grey.200" },
            }}
            title="Bullet list"
          >
            <TbList size={18} />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            sx={{
              bgcolor: editor.isActive("orderedList") ? "grey.300" : "transparent",
              "&:hover": { bgcolor: "grey.200" },
            }}
            title="Numbered list"
          >
            <TbListNumbers size={18} />
          </IconButton>
        </Box>

        {/* Link popover */}
        <Popover
          open={linkOpen}
          onClose={() => { setLinkOpen(false); setLinkUrl(""); }}
          anchorEl={linkButtonRef.current}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          transformOrigin={{ vertical: "top", horizontal: "left" }}
        >
          <Box sx={{ p: 2, minWidth: 280 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Insert link</Typography>
            <TextField
              size="small"
              fullWidth
              placeholder="https://..."
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setLink()}
              sx={{ mb: 1.5 }}
            />
            <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
              <Button size="small" onClick={() => setLinkOpen(false)}>Cancel</Button>
              <Button size="small" variant="contained" onClick={setLink}>Insert</Button>
            </Box>
          </Box>
        </Popover>

        {/* Image popover */}
        <Popover
          open={imageOpen}
          onClose={() => { setImageOpen(false); setImageUrl(""); }}
          anchorEl={imageButtonRef.current}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          transformOrigin={{ vertical: "top", horizontal: "left" }}
        >
          <Box sx={{ p: 2, minWidth: 280 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Insert image</Typography>
            <TextField
              size="small"
              fullWidth
              placeholder="Image URL or data URL"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addImage()}
              sx={{ mb: 1.5 }}
            />
            <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
              <Button size="small" onClick={() => setImageOpen(false)}>Cancel</Button>
              <Button size="small" variant="contained" onClick={addImage}>Insert</Button>
            </Box>
          </Box>
        </Popover>

        {/* Editor content */}
        <Box
          sx={{
            "& .tiptap": { outline: "none" },
            "& .ProseMirror": {
              minHeight: `${minHeight}px`,
              padding: "12px 16px",
              fontFamily: "Switzer, sans-serif",
              fontSize: "16px",
              lineHeight: 1.5,
              outline: "none",
              cursor: "text",
            },
            "& .ProseMirror p.is-empty:first-child::before": {
              color: "#9CA3AF",
              content: "attr(data-placeholder)",
              float: "left",
              height: 0,
              pointerEvents: "none",
            },
            "& .ProseMirror p": { margin: "0 0 0.5em 0" },
            "& .ProseMirror p:last-child": { marginBottom: 0 },
            "& .ProseMirror ul": { paddingLeft: "1.5em", margin: "0.5em 0" },
            "& .ProseMirror ol": { paddingLeft: "1.5em", margin: "0.5em 0" },
            "& .ProseMirror a": { color: "#000099", textDecoration: "underline" },
            "& .ProseMirror img": { maxWidth: "100%", height: "auto", borderRadius: "4px" },
          }}
        >
          <EditorContent editor={editor} />
        </Box>
      </Box>
    </div>
  );
}
