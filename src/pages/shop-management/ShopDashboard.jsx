import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Table } from "../../design-system";
import { Delay } from "../../components/shared/Loaders";
import { useGetShopsDataQuery } from "../../store/services/api";
import { formatMoney, resolveCurrencySymbol } from "../../utilities/formatters";
import {
  DirectoryActions,
  DirectoryActionView,
  DirectoryIdentity,
  DirectoryMetric,
  DirectoryMetrics,
  DirectoryMoney,
  DirectoryTableWrap,
  DirectoryViewModal,
} from "../directory-table/directoryTable";

function displayCount(value) {
  if (value == null || value === "") return "—";
  const n = Number(value);
  return Number.isFinite(n) ? n : "—";
}

export default function ShopDashboard() {
  const navigate = useNavigate();
  const [viewRow, setViewRow] = useState(null);
  const { data, isLoading, isError, refetch } = useGetShopsDataQuery();
  const shops = useMemo(
    () => data?.data?.AllShopsData ?? [],
    [data?.data?.AllShopsData]
  );
  const topPerformingShops = Array.isArray(data?.data?.topPerformingShops)
    ? data.data.topPerformingShops
    : [];

  const totals = useMemo(() => {
    const next = shops.reduce(
      (acc, shop) => {
        const addr = shop?.addressDb ?? {};
        const biz = shop?.businessInfo ?? {};
        acc.revenue += Number(addr.TotalRevenue ?? shop.totalRevenue ?? 0) || 0;
        acc.orders += Number(addr.TotalBookingCount ?? shop.totalOrders ?? 0) || 0;
        acc.pending += Number(addr.PendingBookingCount ?? 0) || 0;
        acc.employees += Number(biz.TotalEmployees ?? 0) || 0;
        if (addr.status != null ? !!addr.status : false) acc.active += 1;
        else acc.inactive += 1;
        return acc;
      },
      { revenue: 0, orders: 0, pending: 0, employees: 0, active: 0, inactive: 0 }
    );
    const symbols = new Set(shops.map((shop) => resolveCurrencySymbol(shop?.addressDb?.zone ?? shop)));
    next.currencySymbol = symbols.size === 1 ? [...symbols][0] : "";
    return next;
  }, [shops]);

  const topColumns = useMemo(
    () => [
      {
        key: "shopName",
        header: "Shop",
        render: (row) => <DirectoryIdentity name={row.shopName} id={row.id} />,
      },
      {
        key: "orderCount",
        header: "Orders",
        render: (row) => <DirectoryMetric value={row.orderCount} />,
      },
      {
        key: "totalRevenue",
        header: "Revenue",
        render: (row) => (
          <DirectoryMoney>
            {formatMoney(row.totalRevenue, resolveCurrencySymbol(row))}
          </DirectoryMoney>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <DirectoryActions>
            <DirectoryActionView onClick={() => setViewRow(row)} />
          </DirectoryActions>
        ),
      },
    ],
    []
  );

  if (isLoading) return <Delay />;

  if (isError) {
    return (
      <div style={{ textAlign: "center", padding: 28 }}>
        <p className="jd-lead" style={{ margin: "0 0 12px" }}>
          Could not load shop dashboard totals.
        </p>
        <Button variant="secondary" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div>
      <DirectoryMetrics
        items={[
          { label: "Total shops", value: displayCount(shops.length), tone: "brand" },
          { label: "Active shops", value: displayCount(totals.active), tone: "success" },
          { label: "Inactive shops", value: displayCount(totals.inactive), tone: "neutral" },
          { label: "Total employees", value: displayCount(totals.employees), tone: "navy" },
        ]}
      />
      <DirectoryMetrics
        items={[
          { label: "Total revenue", value: formatMoney(totals.revenue, totals.currencySymbol), tone: "brand" },
          { label: "Total orders", value: displayCount(totals.orders), tone: "navy" },
          { label: "Pending orders", value: displayCount(totals.pending), tone: "warning" },
        ]}
      />

      {topPerformingShops.length ? (
        <div>
          <p style={{ fontWeight: 700, margin: "0 0 12px" }}>Top performing shops</p>
          <DirectoryTableWrap>
            <Table
              columns={topColumns}
              rows={topPerformingShops}
              rowKey={(row) => row.id ?? row.laundryShopId ?? row.shopName}
              empty="No shop performance data"
            />
          </DirectoryTableWrap>
        </div>
      ) : (
        <p className="jd-lead" style={{ margin: 0 }}>
          No shop performance data yet.
        </p>
      )}

      <DirectoryViewModal
        open={Boolean(viewRow)}
        title={viewRow?.shopName || "Shop"}
        onClose={() => setViewRow(null)}
        primaryLabel="Open details"
        onPrimary={() => {
          const shopId = viewRow?.id ?? viewRow?.laundryShopId;
          if (!shopId) return;
          navigate(`/shop-management/details/${shopId}`);
        }}
        fields={[
          { label: "Shop", value: viewRow?.shopName },
          { label: "Shop ID", value: viewRow?.id ?? viewRow?.laundryShopId },
          { label: "Orders", value: viewRow?.orderCount },
          { label: "Revenue", value: formatMoney(viewRow?.totalRevenue, resolveCurrencySymbol(viewRow)) },
        ]}
      />
    </div>
  );
}
