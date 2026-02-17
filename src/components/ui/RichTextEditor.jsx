import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Box, Typography, IconButton, Tooltip } from "@mui/material";
import { MdFormatBold, MdFormatItalic, MdLink, MdImage } from "react-icons/md";
import { useCallback, useEffect, useRef } from "react";

const MenuButton = ({ onClick, active, children, title }) => (
  <Tooltip title={title}>
    <IconButton
      size="small"
      onClick={onClick}
      sx={{
        p: 0.5,
        color: active ? "primary.main" : "text.secondary",
        "&:hover": { color: "primary.main", bgcolor: "action.hover" },
      }}
    >
      {children}
    </IconButton>
  </Tooltip>
);

export default function RichTextEditor({
  value = "",
  onChange,
  placeholder = "Enter description...",
  title = "",
  minHeight = 120,
  emitAsEvent = true, // true: onChange({ target: { value } }), false: onChange(html)
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false, allowBase64: true }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[80px]",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value || "", false);
    }
  }, [value, editor]);

  const handleUpdate = useCallback(() => {
    if (editor && onChange) {
      const html = editor.getHTML();
      if (emitAsEvent) {
        onChange({ target: { value: html } });
      } else {
        onChange(html);
      }
    }
  }, [editor, onChange, emitAsEvent]);

  useEffect(() => {
    if (!editor) return;
    editor.on("update", handleUpdate);
    return () => editor.off("update", handleUpdate);
  }, [editor, handleUpdate]);

  if (!editor) return null;

  const addLink = () => {
    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
    } else {
      const url = window.prompt("Enter URL:", "https://");
      if (url) editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const imageInputRef = useRef(null);

  const addImage = () => {
    const url = window.prompt("Enter image URL (or leave empty & OK to upload from device):", "https://");
    if (url && url.trim()) {
      editor.chain().focus().setImage({ src: url.trim() }).run();
    } else if (url === "") {
      imageInputRef.current?.click();
    }
  };

  const handleImageFile = (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      editor.chain().focus().setImage({ src: reader.result }).run();
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

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
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            px: 1,
            py: 0.5,
            borderBottom: "1px solid #E5E7EB",
            backgroundColor: "#fff",
          }}
        >
          <MenuButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive("bold")}
            title="Bold"
          >
            <MdFormatBold size={18} />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive("italic")}
            title="Italic"
          >
            <MdFormatItalic size={18} />
          </MenuButton>
          <MenuButton
            onClick={addLink}
            active={editor.isActive("link")}
            title="Add link"
          >
            <MdLink size={18} />
          </MenuButton>
          <MenuButton onClick={addImage} active={false} title="Add image">
            <MdImage size={18} />
          </MenuButton>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleImageFile}
          />
        </Box>
        <Box sx={{ minHeight: `${minHeight}px`, maxHeight: 300, overflowY: "auto" }}>
          <EditorContent editor={editor} />
        </Box>
      </Box>
      <style>{`
        .ProseMirror {
          min-height: ${minHeight - 40}px;
          padding: 12px 16px !important;
          font-family: Switzer, sans-serif;
          font-size: 16px;
          line-height: 1.6;
        }
        .ProseMirror p { margin: 0.25em 0; }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #9CA3AF;
          pointer-events: none;
          height: 0;
        }
        .ProseMirror a { color: #2563EB; text-decoration: underline; }
        .ProseMirror img { max-width: 100%; height: auto; border-radius: 4px; }
      `}</style>
    </div>
  );
}
