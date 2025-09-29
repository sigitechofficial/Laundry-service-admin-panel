import React, { useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  Collapse,
  Menu,
  MenuItem,
} from "@mui/material";
import {
  TbPlus,
  TbChevronDown,
  RiDeleteBin6Line,
  TbDotsVertical,
  TbPencil,
} from "../../shared/icons/index";
import Search from "../../components/ui/Search";
import {
  useDeleteCategoryMutation,
  useDeleteSubCategoryMutation,
  useGetCategoriesQuery,
  useGetSubCategoriesQuery,
} from "../../store/services/api";
import { MiniLoader } from "../../components/shared/Loaders";
import { useSelector } from "react-redux";
import CategoryModal from "./categories-modal/CategoryModal";
import SubCategoryModal from "./categories-modal/SubCategoryModal";
import useToaster from "../../components/ui/Toaster";

export default function ItemCategoriesCard() {
  const categoryData = useSelector((state) => state?.apiData);
  const { success, error } = useToaster();
  const { isLoading } = useGetCategoriesQuery();
  useGetSubCategoriesQuery();
  const [deleteCategory, { isLoading: deleteLoading }] =
    useDeleteCategoryMutation();
  const [deleteSubCategory] = useDeleteSubCategoryMutation();
  const [expandedCategories, setExpandedCategories] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [anchorEl, setAnchorEl] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState({
    isOpen: false,
    isSubModalOpen: "",
    data: {},
    subCatId: "",
    categoryName: "",
    type: "",
  });

  const handleToggle = () => {
    setIsModalOpen({ isOpen: !isModalOpen.isOpen });
  };

  const handleCloseModal = () => {
    setIsModalOpen({ isOpen: false });
  };

  const handleCategoryToggle = (categoryId) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleDeleteCategory = async (categoryId) => {
    let res = await deleteCategory(categoryId).unwrap();
    if (res.status === "1") {
      success("Category deleted successfully");
    } else {
      error(res.message);
    }
  };

  const handleDelteSubCategory = async () => {
    let res = await deleteSubCategory(isModalOpen?.subCatId).unwrap();
    if (res.status === "1") {
      success("Sub Category deleted successfully");
    } else {
      error(res?.message || "Something went wrong");
    }
  };

  const filteredCategories = categoryData?.categories?.filter(
    (category) =>
      category?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      categoryData?.subCategories?.some(
        (item) =>
          item?.categoryId === category?.id &&
          item?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
  );

  return isLoading ? (
    <MiniLoader />
  ) : (
    <Box
      sx={{
        bgcolor: "white",
        borderRadius: "12px",
        border: "1px solid #E4E7EC",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          borderBottom: "1px solid #E4E7EC",
        }}
        className="flex items-start md:items-center justify-between gap-4 !px-4 !py-5 bg-blue10"
      >
        <Box className="flex md:items-center md:flex-row flex-col gap-5">
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 700,
              fontSize: "18px",
              color: "#101828",
              fontFamily: "Inter, sans-serif",
            }}
          >
            Item Categories & Sub Categories
          </Typography>

          <Box className="!w-full sm:!w-[320px] h-11">
            <Search
              onChange={(e) => {
                setSearchTerm(e.target.value);
              }}
            />
          </Box>
        </Box>

        <IconButton
          onClick={handleToggle}
          sx={{
            bgcolor: "blue.100",
            padding: "2px",
            "&:hover": {
              bgcolor: "blue.100",
            },
          }}
        >
          <TbPlus size="22px" color="white" />
        </IconButton>
      </Box>

      <Collapse in={true}>
        <Box sx={{ p: "16px" }}>
          <List sx={{ p: "0 8px" }}>
            {filteredCategories?.length
              ? filteredCategories?.map((category) => (
                  <Box key={category?.id}>
                    <ListItem
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        py: "8px",
                        px: "16px",
                        my: "4px",
                        bgcolor: "blue.10",
                        borderRadius: "4px",
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <Typography width={"100px"} variant="body1">
                          {category?.name}
                        </Typography>
                        <IconButton
                          onClick={() => {
                            setIsModalOpen({
                              ...isModalOpen,
                              isSubModalOpen: true,
                              data: category,
                            });
                          }}
                          sx={{
                            bgcolor: "blue.100",
                            padding: "2px",
                            "&:hover": {
                              bgcolor: "blue.100",
                            },
                          }}
                        >
                          <TbPlus size="16px" color="white" />
                        </IconButton>
                        <IconButton
                          disabled={deleteLoading}
                          size="small"
                          sx={{ color: "#EF4444" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCategory(category.id);
                          }}
                        >
                          <RiDeleteBin6Line size="20px" />
                        </IconButton>
                      </Box>
                      <IconButton
                        onClick={() => {
                          handleCategoryToggle(category?.id);
                        }}
                        size="small"
                        sx={{
                          color: "#667085",
                          transform: expandedCategories[category?.id]
                            ? "rotate(180deg)"
                            : "rotate(0deg)",
                          transition: "transform 0.2s",
                        }}
                      >
                        <TbChevronDown size="20px" color="black" />
                      </IconButton>
                    </ListItem>

                    {/* Category Items */}
                    <Collapse in={expandedCategories[category?.id]}>
                      <Box sx={{ pl: "16px", pb: "8px" }}>
                        {categoryData?.subCategories
                          ?.filter((el) => el?.categoryId === category?.id)
                          ?.map((item) => (
                            <Box
                              borderBottom="1px solid #E4E7EC"
                              key={item?.id}
                              className="flex items-center justify-between py-2 px-3 !space-y-2 !mb-2"
                            >
                              <Box>
                                <Typography variant="body2" fontFamily="Inter">
                                  {item?.name}
                                </Typography>
                                <Typography variant="caption" color="grey.40">
                                  {item?.service}
                                </Typography>
                                <Typography variant="body2" fontFamily="Inter">
                                  ${item?.price}
                                </Typography>
                              </Box>
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  setIsModalOpen({
                                    ...isModalOpen,
                                    subCatId: item?.id,
                                    data: {
                                      ...item,
                                      categoryName: category.name,
                                    },
                                  });
                                  handleMenuClick(e);
                                }}
                                color="grey.20"
                              >
                                <TbDotsVertical size="20px" />
                              </IconButton>
                            </Box>
                          ))}
                      </Box>
                    </Collapse>
                  </Box>
                ))
              : "No categories & sub categories found"}
          </List>
        </Box>
      </Collapse>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        sx={{
          "& .MuiPaper-root": {
            borderRadius: "6px",
            border: "1px solid #E4E7EC",
            boxShadow: "0px 4px 16px rgba(0, 0, 0, 0.1)",
          },
        }}
      >
        <MenuItem
          onClick={(e) => {
            setIsModalOpen({
              ...isModalOpen,
              type: "update",
            });
            handleMenuClose(e);
          }}
          className="flex items-center gap-x-2 font-sm font-Inter !px-2 !mx-2 !rounded-sm border-b"
        >
          <TbPencil size="20px" />
          Edit
        </MenuItem>
        <hr className="text-gray-100 w-full !my-1.5" />
        <MenuItem
          onClick={(e) => {
            handleDelteSubCategory();
            handleMenuClose(e);
          }}
          className="flex items-center gap-x-2 font-sm font-Inter !text-red100 !px-2 !mx-2 !rounded-sm"
        >
          <RiDeleteBin6Line size="20px" />
          Delete
        </MenuItem>
      </Menu>

      <CategoryModal open={isModalOpen.isOpen} onClose={handleCloseModal} />

      <SubCategoryModal
        open={isModalOpen.isSubModalOpen}
        categoryData={isModalOpen.data}
        type={isModalOpen.type}
        onClose={() => {
          setIsModalOpen({
            isSubModalOpen: false,
          });
        }}
      />
    </Box>
  );
}
