import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { MdFormatBold, MdFormatItalic, MdLink, MdImage } from "react-icons/md";
import { useCallback, useEffect, useRef } from "react";

const MenuButton = ({ onClick, active, children, title }) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    className={`rounded p-1 transition-colors hover:bg-black/5 hover:text-[#1F69FF] ${
      active ? "text-[#1F69FF]" : "text-[#667085]"
    }`}
  >
    {children}
  </button>
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
        class: "prose prose-sm max-w-none focus:outline-none min-h-[80px]",
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

  const imageInputRef = useRef(null);

  if (!editor) return null;

  const addLink = () => {
    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
    } else {
      const url = window.prompt("Enter URL:", "https://");
      if (url) editor.chain().focus().setLink({ href: url }).run();
    }
  };

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
        <p className="mb-2 text-sm text-[#374151]">{title}</p>
      )}
      <div className="w-full overflow-hidden rounded-lg border border-[#D1D5DB] bg-[#F4F7FF]">
        <div className="flex items-center gap-1 border-b border-[#E5E7EB] bg-white px-2 py-1">
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
            className="hidden"
            onChange={handleImageFile}
          />
        </div>
        <div className="overflow-y-auto" style={{ minHeight: `${minHeight}px`, maxHeight: 300 }}>
          <EditorContent editor={editor} />
        </div>
      </div>
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
