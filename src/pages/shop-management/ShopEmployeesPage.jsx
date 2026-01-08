import { Box, Typography } from "@mui/material";
import Layout from "../../components/shared/Layout";
import { BsCardList } from "../../shared/icons/index";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  MdMailOutline,
  MdOutlinePhone,
  CiEdit,
  IoEye,
  IconDriver,
  IconShop,
  RiUserSettingsLine,
} from "../../shared/icons/index";
import Search from "../../components/ui/Search";
import SelectField from "../../components/ui/SelectField";
import { useGetShopsDataQuery, useGetAllEmployeesWithShopInfoQuery } from "../../store/services/api";
import { useSelector } from "react-redux";
import { Delay } from "../../components/shared/Loaders";
import { BASE_URL } from "../../utilities/URL";

export default function ShopEmployeesPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedShop, setSelectedShop] = useState("");

  // Fetch employees data
  const { data: employeesResponse, isLoading: employeesLoading, error: employeesError } = useGetAllEmployeesWithShopInfoQuery();
  const employeesFromRedux = useSelector((state) => state?.apiData?.employees || []);
  
  // Use response data directly if available, otherwise use Redux data
  const employees = employeesResponse?.data?.employees || employeesFromRedux || [];
  
  // Debug logs
  console.log("Employees from Redux:", employeesFromRedux);
  console.log("Employees Response:", employeesResponse);
  console.log("Employees (final):", employees);
  console.log("Employees Loading:", employeesLoading);
  if (employeesError) console.error("Employees Error:", employeesError);
  
  // Fetch shops data
  const { data: shopsResponse, isLoading: shopsLoading } = useGetShopsDataQuery();
  const shops = shopsResponse?.data?.AllShopsData || [];

  // Transform shops to options format for dropdown
  const shopOptions = useMemo(() => {
    const options = [{ value: "", label: "All Shops" }];
    if (shops && Array.isArray(shops) && shops.length > 0) {
      shops.forEach((shop) => {
        options.push({
          value: String(shop.id),
          label: shop.shopName || shop.name || shop.businessName || `Shop ${shop.id}`,
        });
      });
    }
    return options;
  }, [shops]);

  const handleSearchChange = (e) => {
    const v = e?.target?.value ?? e;
    setSearchTerm(v);
  };

  const handleShopFilterChange = (e) => {
    setSelectedShop(e.target.value);
  };

  // Transform employees from API to display format
  const allEmployees = useMemo(() => {
    if (!employees || employees.length === 0) return [];
    
    return employees.map((emp) => {
      const phoneDisplay = emp.countryCode && emp.phoneNum 
        ? `${emp.countryCode} ${emp.phoneNum}` 
        : emp.phoneNum || "N/A";
      
      const imageUrl = emp.image 
        ? (emp.image.startsWith('http') ? emp.image : `${BASE_URL}${emp.image}`)
        : "/images/admin.png";
      
      return {
        id: emp.id,
        name: `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "N/A",
        email: emp.email || "N/A",
        phone: phoneDisplay,
        shopId: emp.shopInfo?.id || null,
        shopName: emp.shopInfo?.shopName || "No Shop Assigned",
        role: emp.role?.name || "No Role",
        image: imageUrl,
        status: emp.status,
        employeeOff: emp.employeeOff,
        raw: emp, // Keep full data for future use
      };
    });
  }, [employees]);

  // Debug: Log transformed employees
  console.log("All Employees (transformed):", allEmployees);
  console.log("Selected Shop:", selectedShop);
  console.log("Search Term:", searchTerm);

  // Filter employees based on selected shop and search term
  const filteredEmployees = useMemo(() => {
    let filtered = allEmployees;

    // Filter by shop
    if (selectedShop) {
      filtered = filtered.filter((emp) => String(emp.shopId) === String(selectedShop));
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (emp) =>
          (emp.name || "").toLowerCase().includes(searchLower) ||
          (emp.email || "").toLowerCase().includes(searchLower) ||
          (emp.phone || "").toString().includes(searchTerm) ||
          (emp.shopName || "").toLowerCase().includes(searchLower) ||
          `#${emp.id}`.includes(searchTerm)
      );
    }

    console.log("Filtered Employees:", filtered);
    return filtered;
  }, [selectedShop, searchTerm, allEmployees]);

  if (employeesLoading) {
    return (
      <Layout
        content={
          <div className="w-full flex items-center justify-center py-20">
            <Delay />
          </div>
        }
      />
    );
  }

  return (
    <Layout
      content={
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
                placeholder="Filter by Shop"
                width={"200px"}
                radius="8px"
                height="44px"
                bgcolor={"white"}
                disabled={shopsLoading}
              />
              <Search
                placeholder="Search employees..."
                onChange={handleSearchChange}
                value={searchTerm}
              />

              <button className="bg-blue100 hover:bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center min-w-[120px] h-[40px]">
                Add Employee
              </button>
            </Box>
          </Box>

          <Box>
            {filteredEmployees.length === 0 ? (
              <div className="w-full flex items-center justify-center py-20">
                <Typography variant="h6" color="grey.20">
                  {employeesLoading 
                    ? "Loading employees..." 
                    : `No employees found${selectedShop ? " for the selected shop" : ""}${searchTerm ? ` matching "${searchTerm}"` : ""}`
                  }
                </Typography>
              </div>
            ) : (
              <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredEmployees.map((employee) => (
                  <div key={employee.id} className="flex w-full rounded-xl">
                    <div className="w-full bg-[#F5F5F5] rounded-[20px] !p-7 flex flex-col justify-between font-Inter">
                      <div className="!space-y-2">
                        <p className="text-grey20 font-medium text-2xl">
                          Employee ID #{employee.id}
                        </p>

                        <div className="size-20 rounded-2xl overflow-hidden bg-gray-200">
                          <img
                            className="w-full h-full object-cover"
                            src={employee.image || "/images/admin.png"}
                            alt={`${employee.name} profile`}
                            onError={(e) => {
                              e.target.src = "/images/admin.png";
                            }}
                          />
                        </div>

                        <p className="font-medium text-2xl !pt-4 capitalize">
                          {employee.name}
                        </p>
                        <p className="font-medium text-base text-grey20 flex items-center gap-2">
                          <MdMailOutline size={"22px"} />
                          {employee.email}
                        </p>
                        <p className="font-medium text-base text-grey20 flex items-center gap-2">
                          <MdOutlinePhone size={"22px"} />
                          {employee.phone}
                        </p>
                        <p className="font-medium text-base text-grey20 flex items-center gap-2">
                          <IconDriver />
                          {employee.role}
                        </p>

                        <p className="font-medium text-base text-grey20 flex items-center gap-2">
                          <IconShop />
                          {employee.shopName}
                        </p>
                      </div>

                      <div className="flex gap-x-4 mt-4 pt-4 border-t border-gray-200">
                        <button
                          className="cursor-pointer hover:opacity-70 transition-opacity"
                          title="Edit Employee"
                        >
                          <CiEdit size={30} />
                        </button>
                        <button
                          className="cursor-pointer hover:opacity-70 transition-opacity"
                          title="View Details"
                        >
                          <IoEye size={30} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Box>
        </div>
      }
    />
  );
}

