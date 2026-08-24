import { createElement as h, useMemo } from "react";
import OrderAssignActionButton from "./order-modals/OrderAssignActionButton";
import {
  DirectoryActionDelete,
  DirectoryActionView,
} from "../directory-table/DirectoryActionIcon";
import {
  CustomerNamePhone,
  DateTimeStack,
  DotPill,
  EntityNameLink,
  ItemsBadge,
  OrderIdLink,
  PickupDropCell,
  ServicePills,
  StatusDotPill,
} from "./orderListTable";
import {
  customerDetailsPath,
  resolveLaundryShopId,
  shopDetailsPath,
} from "./orderListUtils";

export function useOrderListColumns({
  navigate,
  setDeleteModal,
  setAssignModal,
  showAssign = true,
  extraColumns = [],
}) {
  return useMemo(
    () => [
      {
        key: "orderId",
        header: "Order",
        render: (row) =>
          h(OrderIdLink, { id: row.id, label: row.orderId, navigate }),
      },
      {
        key: "orderPlacedAt",
        header: "Order placed",
        render: (row) =>
          h(DateTimeStack, {
            value: row.orderPlacedAt,
            title: `When the order was created: ${row.orderDateTime}`,
          }),
      },
      {
        key: "customer",
        header: "Customer",
        render: (row) =>
          h(CustomerNamePhone, {
            name: row.customer,
            phone: row.phone,
            nameTo: customerDetailsPath(row.customerId),
          }),
      },
      {
        key: "shopName",
        header: "Shop & service",
        render: (row) =>
          h(
            "div",
            {
              className: "min-w-0 max-w-[280px] leading-snug",
              title: [row.shopName, row.serviceType].filter(Boolean).join("\n"),
            },
            row.shopName
              ? h(
                  EntityNameLink,
                  {
                    to: shopDetailsPath(
                      row.laundryShopId ?? resolveLaundryShopId(row._booking)
                    ),
                  },
                  row.shopName
                )
              : h("div", { className: "text-[13px] text-[#8a94a2]" }, "No shop assigned"),
            h(ServicePills, { names: row.serviceNames || row.serviceType, shopName: row.shopName })
          ),
      },
      {
        key: "totalItems",
        header: "Items",
        align: "center",
        render: (row) => h(ItemsBadge, { count: row.totalItems }),
      },
      {
        key: "pickupAt",
        header: "Pickup & delivery",
        render: (row) =>
          h(PickupDropCell, {
            pickup: row._booking?.collectionDate || row.pickupDateTime,
            pickupTime: row._booking?.collectionTimeFrom,
            drop: row._booking?.deliveryDate || row.deliveryDateTime,
            dropTime: row._booking?.deliveryTimeFrom,
            title: `Pickup: ${row.pickupDateTime}\nDelivery: ${row.deliveryDateTime}`,
          }),
      },
      {
        key: "OrderStatus",
        header: "Status",
        render: (row) =>
          h(StatusDotPill, {
            title: row.OrderStatus,
            extra: row.paymentWaitingAdmin
              ? h(DotPill, {
                  as: "button",
                  tone: "danger",
                  label: "Payment hold",
                  onClick: () => navigate("/orders/payment-failures"),
                })
              : null,
          }),
      },
      ...extraColumns,
      {
        key: "actions",
        header: "Actions",
        render: (row) =>
          h(
            "div",
            { className: "flex min-w-max items-center justify-start gap-1.5" },
            showAssign && setAssignModal
              ? h(OrderAssignActionButton, {
                  booking: row._booking,
                  onClick: () =>
                    setAssignModal({
                      open: true,
                      orderId: row.id,
                      booking: row._booking,
                    }),
                })
              : null,
            h(DirectoryActionView, {
              title: "View order",
              "aria-label": `View order ${row.orderId}`,
              onClick: () => navigate(`/orders/details/${row.id}`),
            }),
            h(DirectoryActionDelete, {
              title: "Delete order",
              "aria-label": `Delete order ${row.orderId}`,
              onClick: () => setDeleteModal({ open: true, orderId: row.id }),
            })
          ),
      },
    ],
    [extraColumns, navigate, setAssignModal, setDeleteModal, showAssign]
  );
}
