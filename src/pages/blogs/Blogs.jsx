import { useState } from "react";
import { TbPlus } from "../../shared/icons/index";
import { Button, Modal, PageHeader, Table } from "../../design-system";
import AddBlogModal from "./AddBlogModal";
import { useGetAllBlogsQuery, useDeleteBlogMutation, useCreateBlogMutation, useUpdateBlogMutation } from "../../store/services/api";
import {
  DirectoryActionDelete,
  DirectoryActionEdit,
  DirectoryActions,
  DirectoryError,
  DirectoryIdentity,
  DirectoryTableWrap,
  PageLoading,
} from "../directory-table/directoryTable";
import useToaster from "../../components/ui/Toaster";
import { validateImageFile } from "../../utilities/imageUploadPolicy";
import { getApiErrorMessage } from "../../store/services/apiErrors";
import { joinMediaUrl } from "../../utilities/formatters";

function extractBlogs(payload) {
  if (Array.isArray(payload?.message)) return payload.message;
  if (Array.isArray(payload?.data?.blogs)) return payload.data.blogs;
  if (Array.isArray(payload?.blogs)) return payload.blogs;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
}

function mediaUrl(path) {
  return joinMediaUrl(path);
}

function BlogCover({ src, alt }) {
  const [failed, setFailed] = useState(!src);
  if (!src || failed) {
    return (
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 10,
          display: "grid",
          placeItems: "center",
          background: "#f4f5f8",
          color: "#8a94a2",
          fontSize: 11,
          flexShrink: 0,
        }}
      >
        —
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      style={{
        width: 48,
        height: 48,
        borderRadius: 10,
        objectFit: "cover",
        flexShrink: 0,
        display: "block",
      }}
    />
  );
}

const PREVIEW_MAX_CHARS = 1200;

/** Strip rich HTML to plain text for list previews (never dump full HTML in the table). */
function previewText(html) {
  if (!html) return "";
  const plain = String(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= PREVIEW_MAX_CHARS) return plain;
  return `${plain.slice(0, PREVIEW_MAX_CHARS).trimEnd()}…`;
}

export default function Blogs() {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [blogToEdit, setBlogToEdit] = useState(null);
  const [blogToDelete, setBlogToDelete] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const { success, error: showError } = useToaster();
  const { data, isLoading, isError, refetch } = useGetAllBlogsQuery();
  const [deleteBlog, { isLoading: isDeleting }] = useDeleteBlogMutation();
  const [createBlog, { isLoading: isCreating }] = useCreateBlogMutation();
  const [updateBlog, { isLoading: isUpdating }] = useUpdateBlogMutation();
  const blogs = extractBlogs(data);

  const handleEdit = (blog) => {
    setBlogToEdit(blog);
    setAddModalOpen(true);
  };

  const handleDelete = (blog) => {
    setBlogToDelete(blog);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!blogToDelete || isDeleting) return;
    try {
      await deleteBlog(blogToDelete.id).unwrap();
      success("Blog deleted successfully!");
      setDeleteConfirmOpen(false);
      setBlogToDelete(null);
      refetch();
    } catch (err) {
      showError(getApiErrorMessage(err, "Failed to delete blog. Please try again."));
      setDeleteConfirmOpen(false);
      setBlogToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
    setBlogToDelete(null);
  };

  const handleAdd = () => {
    setBlogToEdit(null);
    setAddModalOpen(true);
  };

  const handleSave = async (form, blogId) => {
    if (form.image instanceof File) {
      const imageCheck = validateImageFile(form.image);
      if (!imageCheck.ok) {
        showError(imageCheck.message);
        throw new Error(imageCheck.message);
      }
    } else if (!blogId) {
      showError("Please select an image for the blog");
      throw new Error("Image required");
    }
    const formData = new FormData();
    formData.append("title", form.title);
    formData.append("description", form.description);
    formData.append("status", "true");
    if (form.image instanceof File) {
      formData.append("image", form.image);
    }
    try {
      if (blogId) {
        await updateBlog({ blogId, body: formData }).unwrap();
        success("Blog updated successfully!");
      } else {
        await createBlog(formData).unwrap();
        success("Blog added successfully!");
      }
      refetch();
    } catch (err) {
      showError(getApiErrorMessage(err, "Failed to save blog. Please try again."));
      throw err;
    }
  };

  if (isLoading) return <PageLoading label="Loading blogs…" />;

  return (
    <div>
      <PageHeader
        title="Blogs"
        description="Articles shown to customers on the website and app."
        actions={
          <Button onClick={handleAdd}>
            <TbPlus size={18} />
            Add
          </Button>
        }
      />

      {isError ? (
        <DirectoryError onRetry={() => refetch()}>
          Could not load blogs. Check your connection and try again.
        </DirectoryError>
      ) : (
        <DirectoryTableWrap>
          <Table
            columns={[
              {
                key: "title",
                header: "Article",
                render: (blog) => {
                  const excerpt = previewText(blog.description);
                  return (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                        minWidth: 0,
                        width: "100%",
                      }}
                    >
                      <BlogCover src={mediaUrl(blog.image)} alt={blog.title || "Blog cover"} />
                      <DirectoryIdentity
                        name={blog.title}
                        meta={excerpt || "No preview"}
                        id={blog.id}
                        title={blog.title || undefined}
                        metaClamp={3}
                      />
                    </div>
                  );
                },
              },
              {
                key: "actions",
                header: "Actions",
                render: (blog) => (
                  <DirectoryActions>
                    <DirectoryActionEdit onClick={() => handleEdit(blog)} />
                    <DirectoryActionDelete onClick={() => handleDelete(blog)} />
                  </DirectoryActions>
                ),
              },
            ]}
            rows={blogs}
            rowKey={(blog) => blog.id}
            empty="No blogs yet. Click Add to create your first blog."
          />
        </DirectoryTableWrap>
      )}

      <AddBlogModal
        open={addModalOpen}
        onClose={() => {
          setAddModalOpen(false);
          setBlogToEdit(null);
        }}
        onSave={handleSave}
        isLoading={isCreating || isUpdating}
        blogToEdit={blogToEdit}
      />

      <Modal
        open={deleteConfirmOpen}
        title="Delete Blog"
        description="Are you sure you want to delete this blog?"
        onClose={handleCancelDelete}
        onPrimary={handleConfirmDelete}
        primaryLabel={isDeleting ? "Deleting…" : "Delete"}
        secondaryLabel="Cancel"
        danger
      >
        {blogToDelete ? (
          <p style={{ margin: 0, color: "var(--muted)", fontStyle: "italic" }}>
            &quot;{blogToDelete.title}&quot;
          </p>
        ) : null}
        <p style={{ margin: "12px 0 0", color: "var(--danger)", fontSize: "var(--text-sm)" }}>
          This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
