import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { useCallback, useEffect, useRef } from "react";
import useToaster from "../../components/ui/Toaster";
import {
  IMAGE_UPLOAD_ACCEPT,
  acceptImageFile,
} from "../../utilities/imageUploadPolicy";

function MenuButton({ onClick, active, children, title }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 32,
        height: 32,
        padding: 0,
        border: 0,
        borderRadius: "var(--r-sm)",
        background: active ? "var(--accent-bg)" : "transparent",
        color: active ? "var(--accent-ink)" : "var(--ink-2)",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function IconBold() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M7 4h7a4 4 0 0 1 3.1 6.5A4.2 4.2 0 0 1 15 18.5H7V4Zm3 6h3.2a1.6 1.6 0 0 0 0-3.2H10V10Zm0 5.4h4a1.8 1.8 0 1 0 0-3.6h-4v3.6Z" />
    </svg>
  );
}

function IconItalic() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M10 4h9v2.4h-3.2l-3.1 11.2H16V20H7v-2.4h3.1L13.2 6.4H10V4Z" />
    </svg>
  );
}

function IconLink() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
      <path d="M10 13a5 5 0 0 0 7.5.4l2.1-2.1a5 5 0 0 0-7.1-7.1L10.8 6" />
      <path d="M14 11a5 5 0 0 0-7.5-.4L4.4 12.7a5 5 0 0 0 7.1 7.1L13.2 18" />
    </svg>
  );
}

function IconImage() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="10" r="1.5" />
      <path d="m21 16-5-5-11 8" />
    </svg>
  );
}

export default function BlogRichTextEditor({
  value = "",
  onChange,
  placeholder = "Enter description...",
  title = "",
  minHeight = 120,
  emitAsEvent = true,
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
        class: "blog-rte__editor",
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

  const { error: toastError } = useToaster();
  const imageInputRef = useRef(null);

  if (!editor) return null;

  const addLink = () => {
    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const url = window.prompt("Enter URL:", "https://");
    if (url) editor.chain().focus().setLink({ href: url }).run();
  };

  const addImage = () => {
    const url = window.prompt(
      "Enter image URL (or leave empty & OK to upload from device):",
      "https://"
    );
    if (url && url.trim()) {
      editor.chain().focus().setImage({ src: url.trim() }).run();
    } else if (url === "") {
      imageInputRef.current?.click();
    }
  };

  const handleImageFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    const accepted = acceptImageFile(file, toastError);
    if (!accepted) return;
    const reader = new FileReader();
    reader.onload = () => {
      editor.chain().focus().setImage({ src: reader.result }).run();
    };
    reader.readAsDataURL(accepted);
  };

  return (
    <div>
      {title ? (
        <p style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>
          {title}
        </p>
      ) : null}
      <div
        style={{
          width: "100%",
          border: "1px solid var(--line-2)",
          borderRadius: "var(--r-md)",
          background: "var(--surface)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "4px 8px",
            borderBottom: "1px solid var(--line)",
            background: "var(--canvas)",
          }}
        >
          <MenuButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive("bold")}
            title="Bold"
          >
            <IconBold />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive("italic")}
            title="Italic"
          >
            <IconItalic />
          </MenuButton>
          <MenuButton onClick={addLink} active={editor.isActive("link")} title="Add link">
            <IconLink />
          </MenuButton>
          <MenuButton onClick={addImage} active={false} title="Add image">
            <IconImage />
          </MenuButton>
          <input
            ref={imageInputRef}
            type="file"
            accept={IMAGE_UPLOAD_ACCEPT}
            hidden
            onChange={handleImageFile}
          />
        </div>
        <div style={{ minHeight, maxHeight: 300, overflowY: "auto" }}>
          <EditorContent editor={editor} />
        </div>
      </div>
      <style>{`
        .blog-rte__editor {
          min-height: ${Math.max(40, minHeight - 40)}px;
          padding: 12px 16px;
          outline: none;
          font: inherit;
          font-size: 15px;
          line-height: 1.6;
          color: var(--ink);
        }
        .blog-rte__editor p { margin: 0.25em 0; }
        .blog-rte__editor p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: var(--muted);
          pointer-events: none;
          height: 0;
        }
        .blog-rte__editor a { color: var(--accent); text-decoration: underline; }
        .blog-rte__editor img { max-width: 100%; height: auto; border-radius: 4px; }
      `}</style>
    </div>
  );
}
