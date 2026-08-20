import { useState } from "react";
import { PageHeader, Table } from "../../design-system";
import {
  DirectoryIdentity,
  DirectoryTableWrap,
} from "../directory-table/directoryTable";
import { useGetAllCustomersQuery } from "../../store/services/api";
import { useSelector } from "react-redux";
import ReportToolbar from "./ReportToolbar";

export default function Reports() {
  const [searchTerm, setSearchTerm] = useState("");
  const { isLoading, isError, error } = useGetAllCustomersQuery();
  const customers = useSelector((state) => state.apiData.customers);

  const customersData = (customers || [])
    .map((cus, index) => ({
      id: cus.id,
      sl: index + 1,
      rank: cus.id,
      service: `${cus?.firstName || ""} ${cus?.lastName || ""}`.trim() || "—",
      noOfOrders: cus?.email || "—",
      totalRevenue: cus?.email || "—",
    }))
    .filter((row) =>
      searchTerm
        ? `${row.service} ${row.noOfOrders}`.toLowerCase().includes(searchTerm.toLowerCase())
        : true
    );

  const columns = [
    {
      key: "service",
      header: "Service",
      render: (row) => <DirectoryIdentity name={row.service} meta={`Rank ${row.rank}`} />,
    },
    { key: "noOfOrders", header: "Orders" },
    { key: "totalRevenue", header: "Revenue" },
  ];

  if (isLoading) return <p style={{ color: "var(--muted)", margin: 0 }}>Loading…</p>;
  if (isError) {
    return (
      <p style={{ color: "var(--danger-700)", margin: 0 }}>
        {error?.data?.message || "Failed to load report."}
      </p>
    );
  }

  return (
    <div>
      <PageHeader title="Top Services Report" />
      <ReportToolbar
        search={searchTerm}
        onSearch={setSearchTerm}
        searchPlaceholder="Search by ID, product or other..."
        period="all"
      />
      <DirectoryTableWrap>
        <Table columns={columns} rows={customersData} rowKey={(row) => row.id} empty="No rows" />
      </DirectoryTableWrap>
    </div>
  );
}
