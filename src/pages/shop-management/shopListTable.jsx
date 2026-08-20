import { Button } from "../../design-system";
import { formatMoney, resolveCurrencySymbol } from "../../utilities/formatters";
import {
  DirectoryActions,
  DirectoryIdentity,
  DirectoryMetric,
  DirectoryMoney,
  DirectoryStatusPill,
} from "../directory-table/directoryTable";
import { joinMeta } from "../directory-table/directoryTableUtils";

function placeLine(row) {
  return joinMeta(row.city, row.zone);
}

function contactLine(row) {
  return joinMeta(row.email, row.phoneNumber);
}

export function mapShopToRow(item) {
  const addr = item?.addressDb;
  const biz = item?.businessInfo;
  const streetParts = [addr?.streetAddress, addr?.district, addr?.province].filter(
    Boolean
  );
  const address = streetParts.join(", ") || "-";
  const zone = addr?.zone?.name ?? "";
  const city = addr?.city?.name ?? "";
  const country = addr?.country?.name ?? "";
  const locationLine = [zone, city, country].filter(Boolean).join(" · ") || "—";
  const statusValue = addr?.status != null ? !!addr.status : false;
  const email = biz?.email ?? item?.email ?? "";
  const phone = biz?.phoneNum ?? item?.phone ?? item?.phoneNum ?? "";
  const rawEmployees = biz?.TotalEmployees ?? item?.totalEmployees ?? item?.noOfEmployee;

  return {
    id: item.id,
    customerId: item.id,
    name: item?.shopName ?? item?.name ?? "",
    email,
    phoneNumber: phone,
    amountSpent: Number(addr?.TotalRevenue ?? item?.totalRevenue ?? 0) || 0,
    currencySymbol: resolveCurrencySymbol(addr?.zone ?? item),
    totalOrders: Number(addr?.TotalBookingCount ?? item?.totalOrders ?? 0) || 0,
    pendingOrders: Number(addr?.PendingBookingCount ?? 0) || 0,
    employees:
      rawEmployees == null || rawEmployees === "" ? null : Number(rawEmployees) || 0,
    address,
    locationLine,
    zone: zone || "-",
    city: city || "-",
    country: country || "-",
    status: statusValue,
    changeStatus: statusValue,
  };
}

export function buildShopListColumns({ navigate, onView, onEdit, onDelete }) {
  return [
    {
      key: "shop",
      header: "Shop",
      render: (row) => {
        const place = placeLine(row);
        const title = [row.name || "—", place, row.address !== "-" ? row.address : ""]
          .filter(Boolean)
          .join("\n");
        return (
          <DirectoryIdentity
            name={row.name}
            meta={place}
            id={row.customerId}
            title={title}
            onClick={() => navigate(`/shop-management/details/${row?.id}`)}
          />
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <DirectoryStatusPill active={row.status} />,
    },
    {
      key: "orders",
      header: "Orders",
      render: (row) => (
        <DirectoryMetric
          value={row.totalOrders}
          hint={row.pendingOrders > 0 ? `${row.pendingOrders} pending` : undefined}
        />
      ),
    },
    {
      key: "revenue",
      header: "Revenue",
      render: (row) => (
        <DirectoryMoney>{formatMoney(row.amountSpent, row.currencySymbol)}</DirectoryMoney>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      render: (row) => (
        <DirectoryIdentity name={contactLine(row)} meta={row.locationLine} />
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <DirectoryActions>
          <Button size="sm" variant="secondary" onClick={() => onView?.(row)}>
            View
          </Button>
          <Button size="sm" variant="secondary" onClick={() => onEdit?.(row)}>
            Edit
          </Button>
          <Button size="sm" variant="danger" onClick={() => onDelete?.(row)}>
            Delete
          </Button>
        </DirectoryActions>
      ),
    },
  ];
}
