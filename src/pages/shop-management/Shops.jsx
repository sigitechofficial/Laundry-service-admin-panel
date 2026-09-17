import { useNavigate } from "react-router-dom";
import { Delay } from "../../components/shared/Loaders";
import { useMemo, useState, useCallback } from "react";
import { Button, Field, Input, Modal, Table } from "../../design-system";
import {
  useGetAllZonesQuery,
  useGetShopsDataQuery,
  useLazyGetShopsDataQuery,
  useEditShopMutation,
} from "../../store/services/api";
import useToaster from "../../components/ui/Toaster";
import DeleteShopModal from "./DeleteShopModal";
import { useShopListTableFilters } from "./useShopListTableFilters";
import ShopDirectoryToolbar from "./ShopDirectoryToolbar";
import ListPagination from "../order-management/ListPagination";
import { useOrderListPageData } from "../order-management/useOrderListPageData";
import {
  SHOP_LIST_CSV_COLUMNS,
  buildShopListColumns,
  mapShopToCsvRow,
  mapShopToRow,
} from "./shopListTable";
import {
  DirectoryTableWrap,
  DirectoryViewModal,
} from "../directory-table/directoryTable";
import { useCsvExport } from "../../hooks/useCsvExport";
import { csvFormat } from "../../utilities/csvExport";
import { formatMoney, resolveCurrencySymbol } from "../../utilities/formatters";
import styles from "./ShopDirectory.module.css";

const FORM_GRID = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
  gap: 16,
};

export default function Shops() {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [shopToDelete, setShopToDelete] = useState(null);
  const [viewRow, setViewRow] = useState(null);
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
    isError,
  } = useOrderListPageData(listQuery, {
    pickRows,
    totalCountField: "total",
    listArrayField: "AllShopsData",
    isSearchPending: tableFilters.isSearchPending,
  });

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
    return Array.isArray(list) ? list.slice(0, 4) : [];
  }, [listQuery.currentData, listQuery.data]);

  const [editShop, { isLoading: isEditing }] = useEditShopMutation();

  // ── CSV export: whole filtered set, not the visible page ──────────────────
  const [fetchShops] = useLazyGetShopsDataQuery();
  const { data: zonesRes } = useGetAllZonesQuery(undefined, {
    skip: !tableFilters.zoneId,
  });
  const zoneLabel = useMemo(() => {
    if (!tableFilters.zoneId) return "";
    const raw = zonesRes?.data;
    const zones = Array.isArray(raw) ? raw : raw?.zones ?? raw?.data ?? [];
    const zone = (Array.isArray(zones) ? zones : []).find(
      (z) => String(z.id ?? z.zoneId ?? "") === String(tableFilters.zoneId)
    );
    return zone?.name ?? zone?.zoneName ?? String(tableFilters.zoneId);
  }, [tableFilters.zoneId, zonesRes?.data]);
  const csvFilenameFilters = useMemo(
    () => ({
      search: tableFilters.debouncedSearch || "",
      zone: zoneLabel,
      status: tableFilters.statusId || "",
      from: csvFormat.date(tableFilters.dateRange?.startDate),
      to: csvFormat.date(tableFilters.dateRange?.endDate),
    }),
    [
      tableFilters.debouncedSearch,
      tableFilters.statusId,
      tableFilters.dateRange?.startDate,
      tableFilters.dateRange?.endDate,
      zoneLabel,
    ]
  );
  const apiParams = tableFilters.apiParams;
  const fetchAllShops = useCallback(async () => {
    // export=1 → the API ignores page/limit and returns the whole filtered set
    // (server cap 5000) with pagination.exportMode / truncated.
    const res = await fetchShops({ ...apiParams, export: true }, false).unwrap();
    const rows = Array.isArray(res?.data?.AllShopsData) ? res.data.AllShopsData : [];
    return { rows, pagination: res?.data?.pagination || null };
  }, [apiParams, fetchShops]);
  const csv = useCsvExport({
    filenameBase: "shops",
    columns: SHOP_LIST_CSV_COLUMNS,
    fetchAll: fetchAllShops,
    filenameFilters: csvFilenameFilters,
    mapRow: mapShopToCsvRow,
  });

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

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditData(null);
  };

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
        closeEditModal();
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

  const handleViewClick = useCallback(
    (row) => {
      if (!row?.id) return;
      navigate(`/shop-management/details/${row.id}`);
    },
    [navigate]
  );

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
        onView: handleViewClick,
        onEdit: handleEditClick,
        onDelete: handleDeleteClick,
      }),
    [navigate, handleViewClick, handleEditClick, handleDeleteClick]
  );

  const emptyMessage = useMemo(() => {
    if (isTableLoading && !shopsData.length) return "Loading shops…";
    if (tableFilters.zoneId != null && String(tableFilters.zoneId).trim() !== "") {
      return "No shops found for this zone";
    }
    if (tableFilters.hasActiveFilters) return "No shops match these filters";
    return "No shops found";
  }, [
    isTableLoading,
    shopsData.length,
    tableFilters.zoneId,
    tableFilters.hasActiveFilters,
  ]);

  if (isError && shops.length === 0 && !tableFilters.hasActiveFilters) {
    return (
      <div style={{ textAlign: "center", padding: 28 }}>
        <p className="jd-lead" style={{ margin: "0 0 12px" }}>
          Could not load shops.
        </p>
        <Button variant="secondary" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  if (isLoading && shops.length === 0 && !tableFilters.hasActiveFilters) {
    return <Delay />;
  }

  return (
    <div className={styles.page}>
      {topPerformingShops.length ? (
        <div className={styles.spotlight} aria-label="Top performing shops">
          {topPerformingShops.map((shop, index) => {
            const shopId = shop?.id ?? shop?.laundryShopId;
            return (
              <button
                key={shopId ?? index}
                type="button"
                className={styles.spot}
                disabled={!shopId}
                onClick={() =>
                  shopId && navigate(`/shop-management/details/${shopId}`)
                }
              >
                <span className={styles.spotKicker}>Top {index + 1}</span>
                <span className={styles.spotName}>{shop?.shopName ?? "—"}</span>
                <span className={styles.spotMeta}>
                  {shop?.orderCount ?? 0} orders
                  {shop?.totalRevenue != null
                    ? ` · ${formatMoney(shop.totalRevenue, resolveCurrencySymbol(shop, { applyDefault: true }))}`
                    : ""}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      <DirectoryTableWrap
        key={tableFilterKey}
        toolbar={
          <ShopDirectoryToolbar
            searchInput={tableFilters.searchInput}
            onSearchInputChange={tableFilters.setSearchInput}
            zoneId={tableFilters.zoneId}
            onZoneIdChange={tableFilters.setZoneId}
            statusId={tableFilters.statusId}
            onStatusIdChange={tableFilters.setStatusId}
            dateRange={tableFilters.dateRange}
            onDateRangeChange={tableFilters.setDateRange}
            onClearFilters={tableFilters.clearFilters}
            hasActiveFilters={tableFilters.hasActiveFilters}
            isRefreshing={Boolean(isTableLoading && shopsData.length)}
            onExport={csv.run}
            isExporting={csv.isExporting}
            exportCount={totalRows}
          />
        }
        footer={
          <ListPagination
            page={tableFilters.page}
            pageSize={tableFilters.pageSize}
            totalRows={totalRows}
            onPageChange={tableFilters.setPage}
            onPageSizeChange={tableFilters.setPageSize}
            noun="shops"
          />
        }
      >
        <Table
          columns={customerColumns}
          rows={shopsData}
          rowKey={(row) => row.id}
          empty={emptyMessage}
        />
      </DirectoryTableWrap>

      <DirectoryViewModal
        open={Boolean(viewRow)}
        title={viewRow?.name || "Shop"}
        onClose={() => setViewRow(null)}
        primaryLabel="Open details"
        onPrimary={() => {
          if (!viewRow?.id) return;
          navigate(`/shop-management/details/${viewRow.id}`);
        }}
        fields={[
          { label: "Shop ID", value: viewRow?.customerId },
          { label: "Email", value: viewRow?.email },
          { label: "Phone", value: viewRow?.phoneNumber },
          { label: "Address", value: viewRow?.address },
          { label: "Location", value: viewRow?.locationLine },
          { label: "Orders", value: viewRow?.totalOrders },
          { label: "Pending orders", value: viewRow?.pendingOrders },
          { label: "Revenue", value: formatMoney(viewRow?.amountSpent, viewRow?.currencySymbol) },
          { label: "Employees", value: viewRow?.employees ?? "—" },
          { label: "Status", value: viewRow?.status ? "Active" : "Inactive" },
        ]}
      />

      <Modal
        open={editModalOpen}
        title={editData ? "Edit Shop" : "Edit"}
        onClose={closeEditModal}
        onPrimary={handleSaveEdit}
        primaryLabel={isEditing ? "Saving…" : "Save"}
        primaryDisabled={isEditing || !editData?.id}
        secondaryLabel="Cancel"
      >
        {editData ? (
          <div style={FORM_GRID}>
            <Field label="Shop name" htmlFor="edit-shop-name">
              <Input
                id="edit-shop-name"
                value={editData.name}
                onChange={(e) =>
                  setEditData((d) => ({ ...d, name: e.target.value }))
                }
              />
            </Field>
            <Field label="Email" htmlFor="edit-shop-email">
              <Input
                id="edit-shop-email"
                type="email"
                value={editData.email}
                onChange={(e) =>
                  setEditData((d) => ({ ...d, email: e.target.value }))
                }
              />
            </Field>
            <Field label="Phone" htmlFor="edit-shop-phone">
              <Input
                id="edit-shop-phone"
                value={editData.phone}
                onChange={(e) =>
                  setEditData((d) => ({ ...d, phone: e.target.value }))
                }
              />
            </Field>
            <Field label="Address" htmlFor="edit-shop-address">
              <Input
                id="edit-shop-address"
                value={editData.address}
                onChange={(e) =>
                  setEditData((d) => ({ ...d, address: e.target.value }))
                }
              />
            </Field>
          </div>
        ) : null}
      </Modal>

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
