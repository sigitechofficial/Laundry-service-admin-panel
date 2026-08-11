import { useNavigate } from "react-router-dom";
import { Delay } from "../../components/shared/Loaders";
import { useMemo, useState, useCallback } from "react";
import InputFieldBordered from "../../components/ui/InputFieldBordered";
import { Typography } from "@mui/material";
import ModalComponent from "../../components/shared/Modal";
import StatCard from "../../components/ui/StatCard";
import {
  useGetShopsDataQuery,
  useEditShopMutation,
} from "../../store/services/api";
import useToaster from "../../components/ui/Toaster";
import DeleteShopModal from "./DeleteShopModal";
import { useShopListTableFilters } from "./useShopListTableFilters";
import ShopListDataTable from "./ShopListDataTable";
import { useOrderListPageData } from "../order-management/useOrderListPageData";
import { buildShopListColumns, mapShopToRow } from "./shopListTable";
import {
  SHOP_TABLE_STICKY_LEFT_FIELDS,
  SHOP_TABLE_STICKY_RIGHT_FIELDS,
} from "../../shared/constants";

export default function Shops() {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [shopToDelete, setShopToDelete] = useState(null);
  const navigate = useNavigate();
  const { success, error } = useToaster();

  const tableFilters = useShopListTableFilters(25);
  const listQuery = useGetShopsDataQuery(tableFilters.apiParams);
  const pickRows = useCallback((res) => res?.data?.AllShopsData, []);

  const {
    rows: shops,
    totalRows: backendTotalRows,
    isTableLoading,
    isLoading,
    refetch,
  } = useOrderListPageData(listQuery, {
    pickRows,
    totalCountField: "total",
    listArrayField: "AllShopsData",
    isSearchPending: tableFilters.isSearchPending,
  });

  // Prefer API total; if meta is missing/0 but rows exist, estimate from page + row count
  const totalRows = useMemo(() => {
    if (backendTotalRows > 0) return backendTotalRows;
    if (shops.length === 0) return 0;
    return (tableFilters.page - 1) * tableFilters.pageSize + shops.length;
  }, [
    backendTotalRows,
    shops.length,
    tableFilters.page,
    tableFilters.pageSize,
  ]);

  const topPerformingShops = useMemo(() => {
    const body = listQuery.currentData ?? listQuery.data;
    const list = body?.data?.topPerformingShops;
    return Array.isArray(list) ? list : [];
  }, [listQuery.currentData, listQuery.data]);

  const [editShop, { isLoading: isEditing }] = useEditShopMutation();

  const shopsData = useMemo(
    () => shops.map((item) => mapShopToRow(item)),
    [shops]
  );

  const tableFilterKey = useMemo(
    () =>
      [
        tableFilters.zoneId,
        tableFilters.statusId,
        tableFilters.debouncedSearch,
        tableFilters.dateRange?.startDate?.valueOf?.() ??
          tableFilters.dateRange?.startDate,
        tableFilters.dateRange?.endDate?.valueOf?.() ??
          tableFilters.dateRange?.endDate,
      ].join("|"),
    [
      tableFilters.zoneId,
      tableFilters.statusId,
      tableFilters.debouncedSearch,
      tableFilters.dateRange,
    ]
  );

  const handleSaveEdit = async () => {
    if (!editData?.id) return;
    try {
      const res = await editShop({
        id: editData.id,
        body: {
          shopName: editData.name,
          email: editData.email,
          phone: editData.phone,
          address: editData.address,
        },
      }).unwrap();

      if (res?.status === "1") {
        success(res?.message ?? "Shop updated successfully");
        setEditModalOpen(false);
        setEditData(null);
        refetch();
      } else {
        error(res?.message ?? "Failed to update shop");
      }
    } catch (err) {
      const msg =
        err?.data?.message ??
        err?.data?.error ??
        err?.message ??
        "Failed to update shop";
      error(msg);
    }
  };

  const handleDeleteClick = useCallback((row) => {
    setShopToDelete(row);
    setDeleteModalOpen(true);
  }, []);

  const handleEditClick = useCallback((row) => {
    setEditData({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phoneNumber,
      address: row.address,
    });
    setEditModalOpen(true);
  }, []);

  const handleDeleteSuccess = () => {
    setDeleteModalOpen(false);
    setShopToDelete(null);
    refetch();
  };

  const customerColumns = useMemo(
    () =>
      buildShopListColumns({
        navigate,
        onEdit: handleEditClick,
        onDelete: handleDeleteClick,
      }),
    [navigate, handleEditClick, handleDeleteClick]
  );

  if (isLoading && shops.length === 0 && !tableFilters.hasActiveFilters) {
    return <Delay />;
  }

  const statCardColors = [
    "bg-purple50",
    "bg-red50",
    "bg-green50",
    "bg-green200",
    "bg-yellow50",
  ];

  return (
    <div className="w-full !space-y-11 !mt-0">
      <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-7 font-Inter">
        {topPerformingShops.slice(0, 4).map((shop, index) => (
          <StatCard
            key={shop?.id ?? index}
            title={shop?.shopName ?? "—"}
            value={`${shop?.orderCount ?? 0} orders`}
            bgColor={statCardColors[index % statCardColors.length]}
          />
        ))}
      </div>

      <Typography
        variant="body2"
        sx={{ fontSize: 13, color: "text.secondary", mt: -4 }}
      >
        Cards and table use the same zone, registration date, status, and search
        filters{tableFilters.zoneId ? " (including zone)" : ""}. The table is
        paginated — use the footer to see more rows. Shop and actions stay
        pinned while scrolling.
      </Typography>

      <div className="w-full min-w-0">
        <ShopListDataTable
          key={tableFilterKey}
          data={shopsData}
          columns={customerColumns}
          totalRows={totalRows}
          page={tableFilters.page}
          pageSize={tableFilters.pageSize}
          onPageChange={tableFilters.setPage}
          onPageSizeChange={tableFilters.setPageSize}
          zoneId={tableFilters.zoneId}
          onZoneIdChange={tableFilters.setZoneId}
          statusId={tableFilters.statusId}
          onStatusIdChange={tableFilters.setStatusId}
          dateRange={tableFilters.dateRange}
          onDateRangeChange={tableFilters.setDateRange}
          onClearFilters={tableFilters.clearFilters}
          hasActiveFilters={tableFilters.hasActiveFilters}
          searchInput={tableFilters.searchInput}
          onSearchInputChange={tableFilters.setSearchInput}
          isTableLoading={isTableLoading}
          stickyLeftFields={SHOP_TABLE_STICKY_LEFT_FIELDS}
          stickyRightFields={SHOP_TABLE_STICKY_RIGHT_FIELDS}
        />
      </div>

      <ModalComponent
        open={editModalOpen}
        title={editData ? "Edit Shop" : "Edit"}
        onClose={() => {
          setEditModalOpen(false);
          setEditData(null);
        }}
        secondaryAction={{
          label: "Cancel",
          onClick: () => {
            setEditModalOpen(false);
            setEditData(null);
          },
        }}
        primaryAction={{
          label: "Save",
          onClick: handleSaveEdit,
          isLoading: isEditing,
        }}
      >
        {editData && (
          <div className="grid grid-cols-2 gap-4">
            <InputFieldBordered
              title="Shop Name"
              value={editData.name}
              onChange={(e) =>
                setEditData((d) => ({ ...d, name: e.target.value }))
              }
            />
            <InputFieldBordered
              title="Email"
              value={editData.email}
              onChange={(e) =>
                setEditData((d) => ({ ...d, email: e.target.value }))
              }
            />
            <InputFieldBordered
              title="Phone"
              value={editData.phone}
              onChange={(e) =>
                setEditData((d) => ({ ...d, phone: e.target.value }))
              }
            />
            <InputFieldBordered
              title="Address"
              value={editData.address}
              onChange={(e) =>
                setEditData((d) => ({ ...d, address: e.target.value }))
              }
            />
          </div>
        )}
      </ModalComponent>

      <DeleteShopModal
        open={deleteModalOpen}
        shopData={shopToDelete}
        onClose={() => {
          setDeleteModalOpen(false);
          setShopToDelete(null);
        }}
        onShopDeleted={handleDeleteSuccess}
      />
    </div>
  );
}
