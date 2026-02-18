import { Box, Typography } from "@mui/material";
import { BsCardList, TbPlus } from "../../shared/icons/index";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import SelectField from "../../components/ui/SelectField";
import FiltersButton from "../../components/ui/FiltersButton";
import DataTable from "../../components/ui/DataTable";
import StatCard from "../../components/ui/StatCard";
import StatusPill from "../../components/ui/StatusPill";
import ActionButtons from "../../components/ui/ActionButtons";
import {
  useGetShopsDataQuery,
  useGetAllEmployeesWithShopInfoQuery,
} from "../../store/services/api";
import { Delay } from "../../components/shared/Loaders";

export default function ShopEmployeesPage() {
  const navigate = useNavigate();
  const [selectedShop, setSelectedShop] = useState("");

  const { data: employeesResponse, isLoading: employeesLoading } =
    useGetAllEmployeesWithShopInfoQuery();
  const employees = employeesResponse?.data?.employees || [];

  const { data: shopsResponse, isLoading: shopsLoading } = useGetShopsDataQuery();
  const shops = shopsResponse?.data?.AllShopsData || [];

  const shopOptions = useMemo(() => {
    if (!shops?.length) return [];
    return shops.map((shop) => ({
      value: String(shop.id),
      label: shop.shopName || shop.name || shop.businessName || `Shop ${shop.id}`,
    }));
  }, [shops]);

  const allEmployees = useMemo(() => {
    if (!employees?.length) return [];
    return employees.map((emp, index) => {
      const phoneDisplay =
        emp.countryCode && emp.phoneNum
          ? `${emp.countryCode} ${emp.phoneNum}`
          : emp.phoneNum || "—";
      return {
        id: emp.id,
        sl: index + 1,
        name: [emp.firstName, emp.lastName].filter(Boolean).join(" ") || "—",
        email: emp.email ?? "—",
        phone: phoneDisplay,
        shopId: emp.shopInfo?.id ?? null,
        shopName: emp.shopInfo?.shopName ?? "—",
        role: emp.role?.name ?? "—",
        status: emp.status,
      };
    });
  }, [employees]);

  const filteredByShop = useMemo(() => {
    if (!selectedShop) return allEmployees;
    return allEmployees.filter((e) => String(e.shopId) === String(selectedShop));
  }, [allEmployees, selectedShop]);

  const statCardColors = ["bg-purple50", "bg-red50", "bg-green50", "bg-green200"];
  const totalCount = allEmployees.length;
  const activeCount = allEmployees.filter((e) => e.status).length;
  const inactiveCount = totalCount - activeCount;
  const shopsWithEmployees = new Set(allEmployees.map((e) => e.shopId).filter(Boolean)).size;

  const statCards = useMemo(
    () => [
      { title: "Total Employees", value: `${totalCount}`, bgColor: statCardColors[0] },
      { title: "Active", value: `${activeCount}`, bgColor: statCardColors[1] },
      { title: "Inactive", value: `${inactiveCount}`, bgColor: statCardColors[2] },
      { title: "Shops", value: `${shopsWithEmployees}`, bgColor: statCardColors[3] },
    ],
    [totalCount, activeCount, inactiveCount, shopsWithEmployees]
  );

  const employeeColumns = [
    { field: "sl", headerName: "SL", flex: 0.06, minWidth: 50 },
    { field: "id", headerName: "ID", flex: 0.08, minWidth: 70 },
    { field: "name", headerName: "Name", flex: 0.14, minWidth: 120 },
    { field: "email", headerName: "Email", flex: 0.18, minWidth: 160 },
    { field: "phone", headerName: "Phone", flex: 0.12, minWidth: 120 },
    { field: "role", headerName: "Role", flex: 0.1, minWidth: 100 },
    { field: "shopName", headerName: "Shop", flex: 0.14, minWidth: 130 },
    {
      field: "status",
      headerName: "Status",
      flex: 0.08,
      minWidth: 90,
      renderCell: (row) => (
        <StatusPill status={row.status ? "active" : "block"} />
      ),
      sortable: false,
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 0.12,
      minWidth: 140,
      sortable: false,
      renderCell: (row) => (
        <ActionButtons
          showView={false}
          onEdit={() => navigate(`/shop-management/employees/${row?.id}/edit`)}
          onDelete={() => {}}
        />
      ),
    },
  ];

  const handleShopFilterChange = (e) => setSelectedShop(e.target.value ?? "");

  if (employeesLoading) return <Delay />;

  return (
    <div className="!space-y-11">
      <Box className="flex items-center gap-x-5 justify-between">
        <Box className="flex items-center gap-x-5">
          <Typography color="blue.50">
            <BsCardList size="24px" color="blue.50" />
          </Typography>
          <Typography variant="h4" fontFamily={"Switzer"} color="grey.20">
            Shop Employees
          </Typography>
        </Box>
        <Box className="flex items-center gap-x-4">
          <SelectField
            onChange={handleShopFilterChange}
            options={shopOptions}
            value={selectedShop}
            placeholder="All Shops"
            width="200px"
            radius="8px"
            height="44px"
            bgcolor="white"
            disabled={shopsLoading}
          />
          <FiltersButton
            text="Add Employee"
            onClick={() => {}}
            Icon={<TbPlus size="20px" />}
            variant="blue"
          />
        </Box>
      </Box>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-7 font-Inter">
        {statCards.map((card, index) => (
          <StatCard
            key={card.title}
            title={card.title}
            value={card.value}
            bgColor={card.bgColor}
          />
        ))}
      </div>

      <div className="w-full overflow-auto">
        <DataTable
          data={filteredByShop}
          columns={employeeColumns}
          searchPlaceholder="Search by employee name, email, phone..."
          height={600}
        />
      </div>
    </div>
  );
}
