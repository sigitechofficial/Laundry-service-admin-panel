import { useMemo, useState } from "react";
import { Button, PageHeader, Table } from "../../../design-system";
import { useNavigate, useParams } from "react-router-dom";
import { useGetSpecificDriverDetailQuery } from "../../../store/services/api";
import { Delay } from "../../../components/shared/Loaders";
import { DATE_TIME_FORMAT, formatDate, formatMoney, resolveCurrencySymbol } from "../../../utilities/formatters";
import {
  DirectoryActions,
  DirectoryDotPill,
  DirectoryIdentity,
  DirectoryMetric,
  DirectoryMoney,
  DirectorySearch,
  DirectoryTableWrap,
  DirectoryToolbar,
} from "../../directory-table/directoryTable";
import { directoryStatusTone, joinMeta } from "../../directory-table/directoryTableUtils";

const PANEL = {
  padding: 24,
  border: "1px solid var(--line)",
  borderRadius: "var(--r-xl)",
  background: "var(--surface)",
  boxShadow: "var(--e-1)",
};

function matchesSearch(row, term) {
  if (!term) return true;
  const q = term.toLowerCase();
  return Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(q));
}

export default function DriverDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading, isError } = useGetSpecificDriverDetailQuery(id, { skip: !id });

  const driverInfo = data?.data?.userInformation;
  const driverDetails = driverInfo?.driverInZone;
  const shopInfo = driverInfo?.laundaryDriver;
  const addressInfo = shopInfo?.addressDb;
  const bookings = useMemo(
    () => data?.data?.driverBookings || [],
    [data?.data?.driverBookings]
  );

  const rows = useMemo(
    () =>
      (bookings || []).map((booking, index) => ({
        id: booking?.id,
        sl: index + 1,
        orderId: booking?.id,
        orderDateTime: formatDate(booking?.createdAt, DATE_TIME_FORMAT),
        serviceType: booking?.serviceType || "—",
        totalItems: booking?.totalItems || 0,
        pickupDateTime: formatDate(booking?.collectionDate, DATE_TIME_FORMAT),
        deliveryDateTime: formatDate(booking?.deliveryDate, DATE_TIME_FORMAT),
        currencySymbol: resolveCurrencySymbol(
          booking?.billingDetail ?? booking?.paymentSummary ?? booking?.zone ?? booking
        ),
        onHold: booking?.OnHoldConfirmations?.length || 0,
        pickupDriver: `${booking?.driver?.firstName || ""} ${booking?.driver?.lastName || ""}`.trim() || "—",
        deliveryDriver: `${booking?.deliveryDriver?.firstName || booking?.driver?.firstName || ""} ${
          booking?.deliveryDriver?.lastName || booking?.driver?.lastName || ""
        }`.trim() || "—",
        shopName: booking?.laundryShop?.name || booking?.laundryShop?.shopName || "—",
        cost: booking?.orderAmount,
        status: booking?.bookingStatus?.title || "—",
      })),
    [bookings]
  );

  const visibleRows = useMemo(
    () => rows.filter((row) => matchesSearch(row, searchTerm)),
    [rows, searchTerm]
  );

  const columns = [
    {
      key: "orderId",
      header: "Order",
      render: (row) => (
        <DirectoryIdentity
          name={`#${row.orderId}`}
          meta={joinMeta(row.shopName, row.serviceType)}
        />
      ),
    },
    {
      key: "orderDateTime",
      header: "When",
      render: (row) => (
        <DirectoryIdentity
          name={row.orderDateTime}
          meta={joinMeta(
            row.pickupDateTime !== "—" ? `Pickup ${row.pickupDateTime}` : null,
            row.deliveryDateTime !== "—" ? `Delivery ${row.deliveryDateTime}` : null
          )}
        />
      ),
    },
    {
      key: "pickupDriver",
      header: "Drivers",
      render: (row) => (
        <DirectoryIdentity
          name={row.pickupDriver}
          meta={row.deliveryDriver !== row.pickupDriver ? row.deliveryDriver : undefined}
        />
      ),
    },
    {
      key: "totalItems",
      header: "Items",
      render: (row) => (
        <DirectoryMetric
          value={row.totalItems}
          hint={row.onHold ? `${row.onHold} on hold` : undefined}
        />
      ),
    },
    {
      key: "cost",
      header: "Total",
      render: (row) => <DirectoryMoney>{formatMoney(row.cost, row.currencySymbol)}</DirectoryMoney>,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <DirectoryDotPill tone={directoryStatusTone(row.status)}>{row.status}</DirectoryDotPill>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <DirectoryActions>
          <Button size="sm" variant="secondary" onClick={() => row.id && navigate(`/orders/details/${row.id}`)}>
            View
          </Button>
        </DirectoryActions>
      ),
    },
  ];

  if (isLoading) return <Delay />;

  if (isError) {
    return (
      <div>
        <PageHeader
          title="Driver details"
          actions={
            <Button variant="secondary" onClick={() => navigate("/driver-management")}>
              Back
            </Button>
          }
        />
        <p role="alert" style={{ color: "var(--danger)" }}>
          Couldn’t load this driver. The details API failed. Try again or go back to the list.
        </p>
      </div>
    );
  }

  const fullName = `${driverDetails?.firstName || ""} ${driverDetails?.lastName || ""}`.trim() || "Driver";
  const address = addressInfo
    ? `${addressInfo?.streetAddress || ""} ${addressInfo?.district || ""}, ${addressInfo?.province || ""}`.trim()
    : "";

  return (
    <div>
      <PageHeader
        title={fullName}
        description={`Driver ID #${driverDetails?.id || id}`}
        actions={
          <Button variant="secondary" onClick={() => navigate("/driver-management")}>
            Back
          </Button>
        }
      />

      <div style={{ ...PANEL, marginBottom: 20 }}>
        <p style={{ margin: "0 0 8px", color: "var(--muted)" }}>{driverDetails?.email || "—"}</p>
        {shopInfo ? <p style={{ margin: "0 0 8px" }}>Shop: {shopInfo?.shopName || "—"}</p> : null}
        {address ? <p style={{ margin: "0 0 8px" }}>{address}</p> : null}
        {driverDetails?.role ? <p style={{ margin: 0 }}>Role: {driverDetails.role.name}</p> : null}
      </div>

      <DirectoryTableWrap
        toolbar={
          <DirectoryToolbar>
            <DirectorySearch
              id="driver-orders-search"
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search by order ID, shop, status..."
            />
          </DirectoryToolbar>
        }
      >
        <Table
          columns={columns}
          rows={visibleRows}
          rowKey={(row) => row.id}
          empty="No bookings found for this driver"
        />
      </DirectoryTableWrap>
    </div>
  );
}
