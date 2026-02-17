import { Box, Typography } from "@mui/material";
import {
  BsCardList,
  MdOutlinePhone,
  MdMailOutline,
} from "../../../shared/icons/index";
import Search from "../../../components/ui/Search";
import { useNavigate, useParams } from "react-router-dom";
import { useGetAdminEmployeesQuery } from "../../../store/services/api";
import { Delay } from "../../../components/shared/Loaders";
import { useState } from "react";
import { IoChevronBackOutline } from "../../../shared/icons/index";
import StatusPill from "../../../components/ui/StatusPill";

export default function EmployeeDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading } = useGetAdminEmployeesQuery(undefined, { skip: !id });
  const adminEmployees = data?.data?.adminEmployees ?? [];
  const employee = adminEmployees.find((e) => String(e.id) === String(id));

  const handleSearchChange = (value) => setSearchTerm(value);

  if (isLoading) return <Delay />;
  if (!employee) {
    return (
      <div className="!space-y-11">
        <Box className="flex items-center gap-x-5 justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="flex items-center justify-center p-1 rounded-lg hover:bg-grey50 transition-colors"
          >
            <IoChevronBackOutline size={24} />
          </button>
        </Box>
        <Typography>Employee not found.</Typography>
      </div>
    );
  }

  const fullName = [employee.firstName, employee.lastName].filter(Boolean).join(" ") || "—";

  return (
    <div className="!space-y-11">
      <Box className="flex items-center gap-x-5 justify-between">
        <Box className="flex items-center gap-x-5">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="flex items-center justify-center p-1 rounded-lg hover:bg-grey50 transition-colors"
          >
            <IoChevronBackOutline size={24} />
          </button>
          <Typography color="blue.50">
            <BsCardList size="24px" color="blue.50" />
          </Typography>
          <Typography variant="h4" fontFamily={"Switzer"} color="grey.20">
            Employee Details
          </Typography>
        </Box>
        <Search
          placeholder="Search"
          onChange={handleSearchChange}
          value={searchTerm}
        />
      </Box>

      <div className="flex w-full rounded-xl bg-white !p-4">
        <div className="w-full max-w-[720px] bg-grey50 rounded-[20px] !p-7 flex justify-between font-Inter">
          <div className="!space-y-2">
            <p className="text-grey20 font-medium text-2xl">ID #{employee.id}</p>
            <p className="font-medium text-2xl !pt-4 capitalize">{fullName}</p>
            <p className="font-medium text-base text-grey20 flex items-center gap-2">
              <MdMailOutline size={22} />
              {employee.email ?? "—"}
            </p>
            <p className="font-medium text-base text-grey20 flex items-center gap-2">
              <MdOutlinePhone size={22} />
              {employee.phoneNum ?? "—"}
            </p>
            <p className="font-medium text-base text-grey20 flex items-center gap-2">
              Status: <StatusPill status={employee.status ? "active" : "block"} />
            </p>
          </div>
          <div className="size-20 rounded-2xl">
            <img
              className="w-full h-full object-center"
              src="/images/admin.png"
              alt="employee"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
