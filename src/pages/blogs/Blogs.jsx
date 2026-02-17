import { useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Button,
} from "@mui/material";
import { TbFileDescription, TbPencil, TbTrash, TbPlus } from "../../shared/icons/index";
import ButtonBlue from "../../components/ui/ButtonBlue";
import AddBlogModal from "./AddBlogModal";
import ModalComponent from "../../components/shared/Modal";
import { useGetAllBlogsQuery, useDeleteBlogMutation, useCreateBlogMutation, useUpdateBlogMutation } from "../../store/services/api";
import { Delay } from "../../components/shared/Loaders";
import useToaster from "../../components/ui/Toaster";
import { BASE_URL } from "../../utilities/URL";

export default function Blogs() {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [blogToEdit, setBlogToEdit] = useState(null);
  const [blogToDelete, setBlogToDelete] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const { success, error: showError } = useToaster();
  const { data, isLoading, refetch } = useGetAllBlogsQuery();
  const [deleteBlog, { isLoading: isDeleting }] = useDeleteBlogMutation();
  const [createBlog, { isLoading: isCreating }] = useCreateBlogMutation();
  const [updateBlog, { isLoading: isUpdating }] = useUpdateBlogMutation();
  const blogs = Array.isArray(data?.message)
    ? data.message
    : Array.isArray(data?.data?.blogs)
      ? data.data.blogs
      : Array.isArray(data?.blogs)
        ? data.blogs
        : Array.isArray(data?.data)
          ? data.data
          : [];

  const handleEdit = (blog) => {
    setBlogToEdit(blog);
    setAddModalOpen(true);
  };

  const handleDelete = (blog) => {
    setBlogToDelete(blog);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!blogToDelete) return;
    try {
      await deleteBlog(blogToDelete.id).unwrap();
      success("Blog deleted successfully!");
      setDeleteConfirmOpen(false);
      setBlogToDelete(null);
      refetch();
    } catch (err) {
      showError(err?.data?.message || "Failed to delete blog. Please try again.");
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

  const handleSave = async (data, blogId) => {
    if (!blogId && !(data.image instanceof File)) {
      showError("Please select an image for the blog");
      throw new Error("Image required");
    }
    const formData = new FormData();
    formData.append("title", data.title);
    formData.append("description", data.description);
    formData.append("status", "true");
    if (data.image instanceof File) {
      formData.append("image", data.image);
    }
    if (blogId) {
      await updateBlog({ blogId, body: formData }).unwrap();
      success("Blog updated successfully!");
    } else {
      await createBlog(formData).unwrap();
      success("Blog added successfully!");
    }
    refetch();
  };

  const getImageUrl = (img) => {
    if (!img) return "";
    if (typeof img === "string" && (img.startsWith("http") || img.startsWith("data:"))) {
      return img;
    }
    return `${BASE_URL}${img}`;
  };

  if (isLoading) return <Delay />;

  return (
    <div className="!space-y-11">
          <Box className="flex items-center justify-between gap-x-5 flex-wrap">
            <Box className="flex items-center gap-x-5">
              <Typography color="blue.50">
                <TbFileDescription size="24px" color="blue.50" />
              </Typography>
              <Typography variant="h4" fontFamily={"Switzer"} color="grey.20">
                Blogs
              </Typography>
            </Box>
            <ButtonBlue
              size="medium"
              startIcon={<TbPlus size={20} />}
              onClick={handleAdd}
            >
              Add
            </ButtonBlue>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(3, 1fr)",
              },
              gap: 3,
              width: "100%",
            }}
          >
            {blogs.length === 0 ? (
              <Typography color="grey.70" sx={{ py: 4, gridColumn: "1 / -1", textAlign: "center" }}>
                No blogs yet. Click Add to create your first blog.
              </Typography>
            ) : (
            blogs.map((blog) => (
              <Card
                key={blog.id}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                  boxShadow: "0px 1px 3px rgba(0,0,0,0.08)",
                  borderRadius: "12px",
                  overflow: "hidden",
                  minWidth: 0,
                }}
              >
                <CardMedia
                  component="img"
                  image={getImageUrl(blog.image)}
                  alt={blog.title}
                  sx={{
                    height: 200,
                    minHeight: 200,
                    width: "100%",
                    objectFit: "cover",
                    flexShrink: 0,
                  }}
                />
                <CardContent sx={{ flexGrow: 1, py: 2 }}>
                  <Typography
                    variant="h6"
                    fontFamily="Switzer"
                    fontWeight={600}
                    color="black.50"
                    sx={{ mb: 1, lineHeight: 1.3 }}
                  >
                    {blog.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="grey.70"
                    sx={{
                      lineHeight: 1.5,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {blog.description}
                  </Typography>
                </CardContent>
                <CardActions sx={{ px: 2, pb: 2, pt: 0, gap: 1 }}>
                  <ButtonBlue
                    size="small"
                    startIcon={<TbPencil size={18} />}
                    onClick={() => handleEdit(blog)}
                  >
                    Edit
                  </ButtonBlue>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    startIcon={<TbTrash size={18} />}
                    onClick={() => handleDelete(blog)}
                    sx={{
                      textTransform: "none",
                      borderColor: "#F53939",
                      color: "#F53939",
                      "&:hover": {
                        borderColor: "#d32f2f",
                        backgroundColor: "rgba(245, 57, 57, 0.04)",
                      },
                    }}
                  >
                    Delete
                  </Button>
                </CardActions>
              </Card>
            ))
            )}
          </Box>

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

          <ModalComponent
            open={deleteConfirmOpen}
            title="Delete Blog"
            onClose={handleCancelDelete}
            primaryAction={{
              label: "Delete",
              onClick: handleConfirmDelete,
              isLoading: isDeleting,
            }}
            secondaryAction={{
              label: "Cancel",
              onClick: handleCancelDelete,
            }}
          >
            <Box>
              <Typography variant="body1" sx={{ color: "grey.80", fontFamily: "Switzer" }}>
                Are you sure you want to delete this blog?
              </Typography>
              {blogToDelete && (
                <Typography variant="body2" sx={{ color: "grey.70", mt: 1, fontStyle: "italic" }}>
                  &quot;{blogToDelete.title}&quot;
                </Typography>
              )}
              <Typography variant="body2" sx={{ color: "error.main", mt: 2, fontFamily: "Switzer" }}>
                This action cannot be undone.
              </Typography>
            </Box>
          </ModalComponent>
        </div>
  );
}
