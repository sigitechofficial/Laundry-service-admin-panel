import { useState, useEffect, useMemo } from "react";
import { TbChevronDown, RiDeleteBin6Line, TbPencil } from "../../shared/icons/index";
import {
  useDeleteCategoryMutation,
  useDeleteSubCategoryMutation,
  useGetCategoriesQuery,
  useGetSubCategoriesQuery,
  useGetAllServicesQuery,
} from "../../store/services/api";
import { useSelector } from "react-redux";
import { Button, Select } from "../../design-system";
import CategoryModal from "./categories-modal/CategoryModal";
import SubCategoryModal from "./categories-modal/SubCategoryModal";
import ConfirmDeleteModal from "./ConfirmDeleteModal";
import useToaster from "../../components/ui/Toaster";
import { formatMoney } from "../../utilities/formatters";
import { getApiErrorMessage } from "../../store/services/apiErrors";
import { EmptyHint, QueryState } from "./QueryState";
import {
  DirectoryActions,
  DirectoryListRow,
  DirectoryMetrics,
  DirectoryMoney,
  DirectorySearch,
  DirectoryTableWrap,
  DirectoryToolbar,
  DirectoryToolSelect,
} from "../directory-table/directoryTable";

export default function ItemCategoriesCard({ triggerAdd }) {
  const categoryData = useSelector((state) => state?.apiData);
  const { success, error } = useToaster();
  const { isLoading, isError, error: categoriesQueryError, refetch } = useGetCategoriesQuery();
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  useGetSubCategoriesQuery();
  const { data: servicesResponse } = useGetAllServicesQuery();
  const services = useMemo(
    () => servicesResponse?.data?.services || [],
    [servicesResponse?.data?.services]
  );
  const servicesMap = useMemo(() => {
    const map = {};
    services.forEach((svc) => {
      map[svc.id] = svc.name;
    });
    return map;
  }, [services]);
  const [deleteCategory, { isLoading: deleteLoading }] =
    useDeleteCategoryMutation();
  const [deleteSubCategory] = useDeleteSubCategoryMutation();
  const [expandedCategories, setExpandedCategories] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [subToDelete, setSubToDelete] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState({
    isOpen: false,
    isSubModalOpen: "",
    data: {},
    subCatId: "",
    categoryName: "",
    type: "",
  });

  useEffect(() => {
    if (triggerAdd && triggerAdd > 0 && !isModalOpen.isOpen) {
      setIsModalOpen((prev) => ({ ...prev, isOpen: true }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerAdd]);

  const handleCloseModal = () => {
    setIsModalOpen({
      isOpen: false,
      isSubModalOpen: false,
      data: {},
      subCatId: "",
      categoryName: "",
      type: "",
    });
  };

  const handleCategoryToggle = (categoryId) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const getCategoryServiceId = (category) =>
    category?.serviceId ?? category?.service?.id ?? null;

  const handleDeleteCategory = async () => {
    if (!categoryToDelete?.id) return;
    try {
      const res = await deleteCategory(categoryToDelete.id).unwrap();
      if (res.status === "1") {
        success("Category deleted successfully");
        setCategoryToDelete(null);
        void refetch();
      } else {
        error(res.message);
      }
    } catch (err) {
      error(getApiErrorMessage(err, "Could not delete category."));
    }
  };

  const handleDeleteSubCategory = async () => {
    if (!subToDelete) return;
    try {
      let res = await deleteSubCategory(subToDelete).unwrap();
      if (res.status === "1") {
        success("Sub Category deleted successfully");
      } else {
        error(res?.message || "Something went wrong");
      }
    } catch (err) {
      error(getApiErrorMessage(err, "Could not delete sub-category."));
    } finally {
      setSubToDelete(null);
    }
  };

  const filteredCategories = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return (categoryData?.categories || []).filter((category) => {
      if (selectedServiceId) {
        const catServiceId = getCategoryServiceId(category);
        if (String(catServiceId) !== String(selectedServiceId)) {
          return false;
        }
      }
      if (!term) return true;
      return (
        category?.name?.toLowerCase().includes(term) ||
        categoryData?.subCategories?.some(
          (item) =>
            item?.categoryId === category?.id &&
            item?.name?.toLowerCase().includes(term)
        )
      );
    });
  }, [categoryData?.categories, categoryData?.subCategories, searchTerm, selectedServiceId]);

  const groupedCategories = useMemo(() => {
    const groups = new Map();
    (filteredCategories || []).forEach((category) => {
      const serviceId = getCategoryServiceId(category);
      const key = serviceId == null ? "unassigned" : String(serviceId);
      if (!groups.has(key)) {
        groups.set(key, {
          serviceId,
          name:
            category?.service?.name ||
            servicesMap[serviceId] ||
            "Not assigned to a service",
          items: [],
        });
      }
      groups.get(key).items.push(category);
    });
    return [...groups.values()];
  }, [filteredCategories, servicesMap]);

  const serviceFilterOptions = [
    { value: "", label: "All Services" },
    ...services.map((service) => ({
      value: String(service.id),
      label: service.name,
    })),
  ];

  const totalCategories = categoryData?.categories?.length ?? 0;
  const totalSubCategories = categoryData?.subCategories?.length ?? 0;
  const unassigned = (categoryData?.categories || []).filter(
    (category) => !getCategoryServiceId(category)
  ).length;

  if (isLoading || isError) {
    return (
      <QueryState
        loading={isLoading}
        error={categoriesQueryError || isError}
        onRetry={refetch}
        errorLabel="Could not load categories. Please try again."
      />
    );
  }

  return (
    <div>
      <DirectoryMetrics
        items={[
          { label: "Categories", value: totalCategories, tone: "brand" },
          { label: "Sub-categories", value: totalSubCategories, tone: "navy" },
          { label: "Unassigned service", value: unassigned, tone: "warning" },
          { label: "Showing", value: filteredCategories?.length ?? 0, tone: "success" },
        ]}
      />
    <DirectoryTableWrap
      toolbar={
        <DirectoryToolbar>
          <DirectorySearch
            id="category-search"
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search categories"
          />
          <DirectoryToolSelect>
            <Select
              value={selectedServiceId}
              onChange={(v) => setSelectedServiceId(v == null ? "" : String(v))}
              options={serviceFilterOptions}
              placeholder="Filter by Service"
            />
          </DirectoryToolSelect>
        </DirectoryToolbar>
      }
    >
        {filteredCategories?.length ? (
          groupedCategories.map((group) => (
            <div key={group.serviceId ?? "unassigned"} style={{ marginBottom: 20 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "4px 4px 10px",
                  borderBottom: "1px solid var(--line)",
                  marginBottom: 8,
                }}
              >
                <div style={{ fontWeight: 700, color: "var(--ink)" }}>{group.name}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  {group.items.length}{" "}
                  {group.items.length === 1 ? "category" : "categories"} ·{" "}
                  {(categoryData?.subCategories || []).filter((item) =>
                    group.items.some((category) => category.id === item.categoryId)
                  ).length}{" "}
                  items
                </div>
              </div>
          {group.items.map((category) => (
            <div key={category?.id}>
              <DirectoryListRow
                onClick={() => handleCategoryToggle(category?.id)}
                style={{ cursor: "pointer" }}
              >
                <div>
                  <div>{category?.name}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>
                    {category?.service?.name ||
                      servicesMap[category?.serviceId] ||
                      "Not assigned"}{" "}
                    /{" "}
                    {(() => {
                      const itemCount = (categoryData?.subCategories || []).filter(
                        (item) => item?.categoryId === category?.id
                      ).length;
                      return `${itemCount} ${itemCount === 1 ? "item" : "items"}`;
                    })()}
                  </div>
                </div>
                <DirectoryActions
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setIsModalOpen({
                        ...isModalOpen,
                        isSubModalOpen: true,
                        type: "",
                        data: category,
                      });
                    }}
                  >
                    Add Sub Category
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIsModalOpen({
                        ...isModalOpen,
                        isOpen: true,
                        data: category,
                        type: "update",
                      });
                    }}
                  >
                    <TbPencil size={16} />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={deleteLoading}
                    onClick={() =>
                      setCategoryToDelete({
                        id: category.id,
                        name: category.name,
                      })
                    }
                  >
                    <RiDeleteBin6Line size={14} />
                    Delete
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCategoryToggle(category?.id)}
                    aria-label={
                      expandedCategories[category?.id] ? "Collapse" : "Expand"
                    }
                  >
                    <TbChevronDown
                      size={18}
                      style={{
                        transform: expandedCategories[category?.id]
                          ? "rotate(180deg)"
                          : "none",
                        transition: "transform 0.2s",
                      }}
                    />
                  </Button>
                </DirectoryActions>
              </DirectoryListRow>

              {expandedCategories[category?.id] ? (
                <div>
                  {categoryData?.subCategories
                    ?.filter((el) => el?.categoryId === category?.id)
                    ?.map((item) => {
                      const uc = item?.unitCount ?? item?.unit_count;
                      return (
                        <DirectoryListRow key={item?.id}>
                          <div>
                            <div>{item?.name}</div>
                            <DirectoryMoney>{formatMoney(item?.price, "£")}</DirectoryMoney>
                            {uc === undefined || uc === null || uc === "" ? null : (
                              <div style={{ fontSize: 12, color: "#5c6673" }}>
                                Unit count: {uc}
                              </div>
                            )}
                          </div>
                          <DirectoryActions>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setIsModalOpen({
                                  ...isModalOpen,
                                  isSubModalOpen: true,
                                  type: "update",
                                  subCatId: item?.id,
                                  data: {
                                    ...item,
                                    categoryName: category.name,
                                  },
                                });
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => setSubToDelete(item?.id)}
                            >
                              Delete
                            </Button>
                          </DirectoryActions>
                        </DirectoryListRow>
                      );
                    })}
                </div>
              ) : null}
            </div>
          ))}
            </div>
          ))
        ) : (
          <EmptyHint>No categories & sub categories found</EmptyHint>
        )}
    </DirectoryTableWrap>

      <CategoryModal
        open={isModalOpen.isOpen}
        onClose={handleCloseModal}
        type={isModalOpen.type}
        categoryData={isModalOpen.data}
      />

      <SubCategoryModal
        open={isModalOpen.isSubModalOpen}
        categoryData={isModalOpen.data}
        type={isModalOpen.type}
        onClose={() => {
          setIsModalOpen({
            ...isModalOpen,
            isSubModalOpen: false,
            type: "",
            subCatId: "",
            data: {},
          });
        }}
      />

      <ConfirmDeleteModal
        open={Boolean(categoryToDelete)}
        title="Delete category"
        description={
          categoryToDelete?.name
            ? `Remove “${categoryToDelete.name}” and its sub-categories from the catalog?`
            : "Remove this category from the catalog?"
        }
        onClose={() => setCategoryToDelete(null)}
        onConfirm={handleDeleteCategory}
        loading={deleteLoading}
      />

      <ConfirmDeleteModal
        open={Boolean(subToDelete)}
        title="Delete sub-category"
        description="Remove this sub-category from the catalog?"
        onClose={() => setSubToDelete(null)}
        onConfirm={handleDeleteSubCategory}
      />
    </div>
  );
}
