import { Box, Typography } from "@mui/material";
import ActionButtons from "../../components/ui/ActionButtons";
import StatusPill from "../../components/ui/StatusPill";
import ChangeStatus from "../../components/ui/Switch";
import { formatGbp } from "../../utils/formatGbp";

function PrimaryLine({ children, title }) {
  return (
    <Typography
      component="div"
      title={title}
      sx={{
        fontSize: 13,
        fontWeight: 600,
        fontFamily: "Inter, sans-serif",
        color: "#101828",
        lineHeight: 1.35,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        maxWidth: "100%",
      }}
    >
      {children}
    </Typography>
  );
}

function SecondaryLine({ children, title }) {
  return (
    <Typography
      component="div"
      title={title}
      sx={{
        fontSize: 12,
        fontFamily: "Inter, sans-serif",
        color: "#667085",
        lineHeight: 1.35,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        maxWidth: "100%",
        mt: 0.15,
      }}
    >
      {children}
    </Typography>
  );
}

function StackedCell({ primary, secondary, title }) {
  return (
    <Box sx={{ py: 0.25, minWidth: 0, maxWidth: "100%" }} title={title}>
      <PrimaryLine title={typeof primary === "string" ? primary : title}>
        {primary || "—"}
      </PrimaryLine>
      {secondary ? (
        <SecondaryLine title={typeof secondary === "string" ? secondary : undefined}>
          {secondary}
        </SecondaryLine>
      ) : null}
    </Box>
  );
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

  return {
    id: item.id,
    customerId: item.id,
    name: item?.shopName ?? item?.name ?? "",
    email,
    phoneNumber: phone,
    amountSpent: Number(addr?.TotalRevenue ?? item?.totalRevenue ?? 0) || 0,
    totalOrders: Number(addr?.TotalBookingCount ?? item?.totalOrders ?? 0) || 0,
    pendingOrders: Number(addr?.PendingBookingCount ?? 0) || 0,
    address,
    locationLine,
    zone: zone || "-",
    city: city || "-",
    country: country || "-",
    status: statusValue,
    changeStatus: statusValue,
  };
}

export function buildShopListColumns({ navigate, onEdit, onDelete }) {
  return [
    {
      field: "name",
      sortField: "name",
      headerName: "Shop",
      minWidth: 168,
      renderCell: (row) => (
        <StackedCell
          primary={row.name || "—"}
          secondary={`ID ${row.customerId}`}
          title={`${row.name || "—"} (ID ${row.customerId})`}
        />
      ),
    },
    {
      field: "contact",
      sortField: "email",
      headerName: "Contact",
      minWidth: 180,
      renderCell: (row) => (
        <StackedCell
          primary={row.email || "—"}
          secondary={row.phoneNumber || "—"}
          title={[row.email, row.phoneNumber].filter(Boolean).join(" · ")}
        />
      ),
    },
    {
      field: "location",
      sortField: "locationLine",
      headerName: "Location",
      minWidth: 200,
      renderCell: (row) => (
        <StackedCell
          primary={row.locationLine}
          secondary={row.address !== "-" ? row.address : null}
          title={[row.locationLine, row.address].filter(Boolean).join("\n")}
        />
      ),
    },
    {
      field: "activity",
      sortField: "amountSpent",
      headerName: "Activity",
      minWidth: 120,
      renderCell: (row) => (
        <Box sx={{ py: 0.25 }}>
          <PrimaryLine>{formatGbp(row.amountSpent)}</PrimaryLine>
          <SecondaryLine>
            {row.totalOrders} bookings · {row.pendingOrders} pending
          </SecondaryLine>
        </Box>
      ),
    },
    {
      field: "status",
      sortField: "status",
      headerName: "Status",
      minWidth: 128,
      renderCell: (row) => (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            py: 0.25,
          }}
        >
          <StatusPill status={row.status ? "active" : "block"} />
          <ChangeStatus width="42px" checked={row.changeStatus} />
        </Box>
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      minWidth: 148,
      sortable: false,
      renderCell: (row) => (
        <ActionButtons
          onView={() => navigate(`/shop-management/details/${row?.id}`)}
          onEdit={() => onEdit?.(row)}
          onDelete={() => onDelete?.(row)}
        />
      ),
    },
  ];
}
