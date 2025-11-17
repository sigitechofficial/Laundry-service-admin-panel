import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import DataTable from "../../components/ui/DataTable";
import ActionButtons from "../../components/ui/ActionButtons";
import StatusPill from "../../components/ui/StatusPill";
import ChangeStatus from "../../components/ui/Switch";
import { Delay } from "../../components/shared/Loaders";
import shopsFallback from "../../data/shops.json";
import { useState } from "react";
import InputFieldModal from "../../components/ui/InputFieldModal";
import InputFieldBordered from "../../components/ui/InputFieldBordered";
import { Box, Typography } from "@mui/material";
import ModalComponent from "../../components/shared/Modal";

export default function Shops() {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const navigate = useNavigate();
  const customers = useSelector((state) => state.apiData.customers);
  const sourceData =
    customers && customers.length > 0 ? customers : shopsFallback;
  const customersData = sourceData.map((item, index) => {
    const isShop =
      item && item.name && typeof item.totalRevenue !== "undefined";
    return {
      id: item.id,
      sl: index + 1,
      customerId: item.id,
      name: isShop
        ? item.name
        : `${item?.firstName || ""} ${item?.lastName || ""}`,
      email: item?.email || "",
      phoneNumber: item?.phone || item?.phoneNum || "",
      amountSpent: isShop ? item.totalRevenue : item?.totalAmountSpent,
      lastOrderDate: item?.lastOrderDate || item?.lastBookingDate,
      totalOrders: item?.totalOrders || item?.bookingCount,
      address: item?.address || "",
      createdAt: item?.createdAt,
      updatedAt: item?.updatedAt,
      status: !!item?.status,
      changeStatus: !!item?.status,
    };
  });

  const customerColumns = [
    {
      field: "sl",
      headerName: "SL",
      flex: 0.15,
      minWidth: 100,
    },
    {
      field: "customerId",
      headerName: "ID",
      flex: 0.12,
      minWidth: 170,
    },
    {
      field: "name",
      headerName: "Name",
      flex: 0.18,
      minWidth: 150,
    },
    {
      field: "email",
      headerName: "Email",
      flex: 0.18,
      minWidth: 150,
    },
    {
      field: "phoneNumber",
      headerName: "Phone Number",
      flex: 0.15,
      minWidth: 180,
    },
    {
      field: "totalOrders",
      headerName: "Total Orders",
      flex: 0.1,
      minWidth: 170,
      type: "number",
    },
    {
      field: "lastOrderDate",
      headerName: "Last Order Date",
      flex: 0.12,
      minWidth: 190,
    },
    {
      field: "amountSpent",
      headerName: "Total Amount",
      flex: 0.12,
      minWidth: 220,
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
            // open edit modal with prefilled data from row
            setEditData({
              id: row.id,
              name: row.name,
              email: row.email,
              phone: row.phoneNumber,
              address: row.address,
            });
            setEditModalOpen(true);
          }}
          onDelete={() => alert("Delete clicked")}
        />
      ),
      sortable: false,
    },
  ];

  if (!customersData || customersData.length === 0) {
    return <Delay />;
  }

  return (
    <div className="w-full !space-y-11 !mt-16">
      <DataTable
        data={customersData}
        columns={customerColumns}
        searchPlaceholder="Search by ID, name, email..."
        height={600}
      />
      <ModalComponent
        open={editModalOpen}
        title={editData ? "Edit Shop" : "Edit"}
        onClose={() => setEditModalOpen(false)}
        secondaryAction={{
          label: "Cancel",
          onClick: () => setEditModalOpen(false),
        }}
        primaryAction={{
          label: "Save",
          onClick: () => {
            console.log("Save edit:", editData);
            setEditModalOpen(false);
          },
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
    </div>
  );
}
