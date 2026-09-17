import { formatMoney, resolveCurrencySymbol } from "../../utilities/formatters";
import { formatPhoneWithCountryCode } from "../../utilities/contactLinks";
import { csvFormat } from "../../utilities/csvExport";
import {
  DirectoryActionDelete,
  DirectoryActionEdit,
  DirectoryActions,
  DirectoryActionView,
  DirectoryIdentity,
  DirectoryMetric,
  DirectoryMoney,
  DirectoryStatusPill,
} from "../directory-table/directoryTable";
import { joinMeta } from "../directory-table/directoryTableUtils";

function placeLine(row) {
  return joinMeta(row.city, row.zone);
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
  const phone = formatPhoneWithCountryCode(
    biz?.countryCode ?? item?.countryCode,
    biz?.phoneNum ?? item?.phone ?? item?.phoneNum ?? ""
  );
  const rawEmployees = biz?.TotalEmployees ?? item?.totalEmployees ?? item?.noOfEmployee;

  return {
    id: item.id,
    customerId: item.id,
    name: item?.shopName ?? item?.name ?? "",
    email,
    phoneNumber: phone,
    amountSpent: Number(addr?.TotalRevenue ?? item?.totalRevenue ?? 0) || 0,
    currencySymbol: resolveCurrencySymbol(addr?.zone ?? item, { applyDefault: true }),
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

/** Table row + owner/created fields the CSV needs (same API item as mapShopToRow). */
export function mapShopToCsvRow(item) {
  const biz = item?.businessInfo;
  const ownerName = [biz?.firstName, biz?.lastName].filter(Boolean).join(" ").trim();
  return {
    ...mapShopToRow(item),
    ownerName,
    currencyCode: item?.addressDb?.zone?.currencyUnitZ?.name ?? "",
    createdAt: item?.createdAt ?? item?.created_at ?? null,
  };
}

/** CSV columns for the Shops directory (rows from mapShopToCsvRow). */
export const SHOP_LIST_CSV_COLUMNS = [
  { header: "Shop ID", key: "id" },
  { header: "Shop name", key: "name" },
  { header: "Owner", key: "ownerName" },
  { header: "Email", key: "email" },
  { header: "Phone", key: "phoneNumber" },
  { header: "Zone", value: (r) => (r.zone === "-" ? "" : r.zone) },
  { header: "City", value: (r) => (r.city === "-" ? "" : r.city) },
  { header: "Country", value: (r) => (r.country === "-" ? "" : r.country) },
  { header: "Address", value: (r) => (r.address === "-" ? "" : r.address) },
  { header: "Status", value: (r) => csvFormat.bool(r.status, "Active", "Inactive") },
  { header: "Orders", key: "totalOrders" },
  { header: "Pending orders", key: "pendingOrders" },
  { header: "Revenue", value: (r) => csvFormat.money(r.amountSpent) },
  { header: "Currency", key: "currencyCode" },
  { header: "Employees", value: (r) => (r.employees == null ? "" : r.employees) },
  { header: "Registered", value: (r) => csvFormat.date(r.createdAt) },
];

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
        <DirectoryIdentity name={row.email} meta={row.phoneNumber || undefined} />
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <DirectoryActions>
          <DirectoryActionView onClick={() => onView?.(row)} />
          <DirectoryActionEdit onClick={() => onEdit?.(row)} />
          <DirectoryActionDelete onClick={() => onDelete?.(row)} />
        </DirectoryActions>
      ),
    },
  ];
}
