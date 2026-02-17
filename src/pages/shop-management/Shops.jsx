import { useNavigate } from "react-router-dom";
import DataTable from "../../components/ui/DataTable";
import ActionButtons from "../../components/ui/ActionButtons";
import StatusPill from "../../components/ui/StatusPill";
import ChangeStatus from "../../components/ui/Switch";
import { Delay } from "../../components/shared/Loaders";
import { useState } from "react";
import InputFieldBordered from "../../components/ui/InputFieldBordered";
import { Box } from "@mui/material";
import ModalComponent from "../../components/shared/Modal";
import StatCard from "../../components/ui/StatCard";
import {
  useGetShopsDataQuery,
  useEditShopMutation,
  useDeleteShopMutation,
} from "../../store/services/api";
import useToaster from "../../components/ui/Toaster";
import DeleteShopModal from "./DeleteShopModal";

export default function Shops() {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [shopToDelete, setShopToDelete] = useState(null);
  const navigate = useNavigate();
  const { success, error } = useToaster();

  const { data: shopsResponse, isLoading, refetch } = useGetShopsDataQuery();
  const [editShop, { isLoading: isEditing }] = useEditShopMutation();

  const shops = shopsResponse?.data?.AllShopsData || [];
  const topPerformingShops = shopsResponse?.data?.topPerformingShops || [];

  const shopsData = shops.map((item, index) => {
    const addr = item?.addressDb;
    const biz = item?.businessInfo;
    const addressParts = [
      addr?.streetAddress,
      addr?.district,
      addr?.province,
      addr?.city?.name,
      addr?.country?.name,
    ].filter(Boolean);
    const address = addressParts.join(", ") || "-";
    const status = !!addr?.zone?.status;
    return {
      id: item.id,
      sl: index + 1,
      customerId: item.id,
      name: item?.shopName ?? item?.name ?? "",
      email: biz?.email ?? item?.email ?? "",
      phoneNumber: biz?.phoneNum ?? item?.phone ?? item?.phoneNum ?? "",
      amountSpent: addr?.TotalRevenue ?? item?.totalRevenue ?? 0,
      totalOrders: addr?.TotalBookingCount ?? item?.totalOrders ?? 0,
      pendingOrders: addr?.PendingBookingCount ?? 0,
      lastOrderDate: item?.lastOrderDate ?? "-",
      address,
      zone: addr?.zone?.name ?? "-",
      city: addr?.city?.name ?? "-",
      country: addr?.country?.name ?? "-",
      status,
      changeStatus: status,
    };
  });

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
        err?.data?.message ?? err?.data?.error ?? err?.message ?? "Failed to update shop";
      error(msg);
    }
  };

  const handleDeleteClick = (row) => {
    setShopToDelete(row);
    setDeleteModalOpen(true);
  };

  const handleDeleteSuccess = () => {
    setDeleteModalOpen(false);
    setShopToDelete(null);
    refetch();
  };

  const customerColumns = [
    {
      field: "sl",
      headerName: "SL",
      flex: 0.08,
      minWidth: 60,
    },
    {
      field: "customerId",
      headerName: "ID",
      flex: 0.08,
      minWidth: 80,
    },
    {
      field: "name",
      headerName: "Shop Name",
      flex: 0.14,
      minWidth: 140,
    },
    {
      field: "email",
      headerName: "Email",
      flex: 0.14,
      minWidth: 160,
    },
    {
      field: "phoneNumber",
      headerName: "Phone",
      flex: 0.12,
      minWidth: 120,
    },
    {
      field: "address",
      headerName: "Address",
      flex: 0.18,
      minWidth: 200,
    },
    {
      field: "zone",
      headerName: "Zone",
      flex: 0.1,
      minWidth: 100,
    },
    {
      field: "city",
      headerName: "City",
      flex: 0.1,
      minWidth: 100,
    },
    {
      field: "country",
      headerName: "Country",
      flex: 0.1,
      minWidth: 120,
    },
    {
      field: "totalOrders",
      headerName: "Total Bookings",
      flex: 0.1,
      minWidth: 120,
      type: "number",
    },
    {
      field: "pendingOrders",
      headerName: "Pending",
      flex: 0.08,
      minWidth: 90,
      type: "number",
    },
    {
      field: "amountSpent",
      headerName: "Total Revenue",
      flex: 0.1,
      minWidth: 120,
    },
    {
      field: "status",
      headerName: "Status",
      flex: 0.08,
      minWidth: 100,
      renderCell: (row) => (
        <StatusPill status={row.status ? "active" : "block"} />
      ),
      sortable: false,
    },
    {
      field: "changeStatus",
      headerName: "Change Status",
      flex: 0.1,
      minWidth: 160,
      type: "switch",
      renderCell: (row) => (
        <ChangeStatus width={"45px"} checked={row.changeStatus} />
      ),
      sortable: false,
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 0.15,
      minWidth: 200,
      renderCell: (row) => (
        <ActionButtons
          onView={() => navigate(`/shop-management/details/${row?.id}`)}
          onEdit={() => {
            setEditData({
              id: row.id,
              name: row.name,
              email: row.email,
              phone: row.phoneNumber,
              address: row.address,
            });
            setEditModalOpen(true);
          }}
          onDelete={() => handleDeleteClick(row)}
        />
      ),
      sortable: false,
    },
  ];

  if (isLoading) {
    return <Delay />;
  }

  const statCardColors = ["bg-purple50", "bg-red50", "bg-green50", "bg-green200", "bg-yellow50"];

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
      <DataTable
        data={shopsData}
        columns={customerColumns}
        searchPlaceholder="Search by shop name, email, address..."
        height={600}
      />
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
