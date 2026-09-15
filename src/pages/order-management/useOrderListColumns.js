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
  formatOrderMoney,
  resolveShopBusinessInfoId,
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
                      row.shopBusinessInfoId ??
                        resolveShopBusinessInfoId(row._booking)
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
            pickupTimeTo: row._booking?.collectionTimeTo,
            drop: row._booking?.deliveryDate || row.deliveryDateTime,
            dropTime: row._booking?.deliveryTimeFrom,
            dropTimeTo: row._booking?.deliveryTimeTo,
            title: `Pickup: ${row.pickupDateTime}\nDelivery: ${row.deliveryDateTime}`,
          }),
      },
      {
        key: "OrderStatus",
        header: "Status",
        render: (row) =>
          h(StatusDotPill, {
            title: row.OrderStatus,
            extra:
              row.paymentWaitingAdmin ||
              row.isRecurringAutoCreated ||
              row.hasRefund
                ? h(
                    "div",
                    { className: "flex flex-wrap items-center gap-1.5" },
                    row.paymentWaitingAdmin
                      ? h(DotPill, {
                          as: "button",
                          tone: "danger",
                          label: "Payment hold",
                          onClick: () => navigate("/orders/payment-failures"),
                        })
                      : null,
                    row.isRecurringAutoCreated
                      ? h(DotPill, {
                          tone: "info",
                          label: "Recurring",
                          title: "Auto-created from recurring frequency plan",
                        })
                      : null,
                    row.hasRefund
                      ? h(DotPill, {
                          tone: "info",
                          label: row.isFullyRefunded
                            ? "Refunded"
                            : "Partial refund",
                          title: row.refundSummary?.latestReason
                            ? `Refunded ${formatOrderMoney(row.totalRefunded, row._booking)} — ${row.refundSummary.latestReason}`
                            : `Customer refunded ${formatOrderMoney(row.totalRefunded, row._booking)}`,
                        })
                      : null
                  )
                : null,
          }),
      },
      {
        key: "payment",
        header: "Payment",
        render: (row) =>
          h(
            "div",
            { className: "min-w-[132px] leading-snug" },
            h(
              "div",
              { className: "text-[13px] font-semibold text-[#0e131c]" },
              row.paymentMethod || "—"
            ),
            h(
              "div",
              { className: "mt-0.5 text-[12px] text-[#5c6673]" },
              `Upfront: ${row.upfrontLabel ?? "—"}`
            ),
            h(
              "div",
              { className: "text-[12px] font-medium text-[#20307f]" },
              `Final: ${row.finalLabel ?? "—"}`
            )
          ),
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
