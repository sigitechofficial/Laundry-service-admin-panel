import { Box, Typography } from "@mui/material";
import Layout from "../../components/shared/Layout";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MdMailOutline,
  MdOutlinePhone,
  MdOutlineLocationOn,
  CiEdit,
  IoEye,
  IconDriver,
  IconShop,
  IoChevronBackOutline,
  BsCardList,
} from "../../shared/icons/index";
import FiltersButton from "../../components/ui/FiltersButton";
import Search from "../../components/ui/Search";

export default function ShopEmployee() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearchChange = (e) => {
    const v = e?.target?.value ?? e;
    setSearchTerm(v);
  };
  return (
    <Layout
      content={
        <div className="w-full !space-y-10">
          <Box className="flex items-center gap-x-5 justify-between">
            <Box className="flex items-center gap-x-5">
              <button
                type="button"
                onClick={() => navigate("/shop-management")}
                aria-label="Go back to shop management"
                className="flex items-center gap-2 cursor-pointer "
              >
                <IoChevronBackOutline size={20} />
              </button>
              <Typography color="blue.50">
                <BsCardList size="24px" color="blue.50" />
              </Typography>

              <Typography variant="h4" fontFamily={"Switzer"} color="grey.20">
                Shop Employees
              </Typography>
            </Box>

            <Box className="flex items-center gap-x-4">
              <Search
                placeholder="Search"
                onChange={handleSearchChange}
                value={searchTerm}
              />

              <button className="bg-blue100 text-white !px-4 !py-2 rounded-lg">
                Add Employee
              </button>
            </Box>
          </Box>
          <div className="w-full grid grid-cols-2 gap-5">
            <div className="flex w-full rounded-xl !p-4">
              <div className="w-[720px] bg-[#F5F5F5] rounded-[20px] !p-7 flex justify-between font-Inter">
                <div className="!space-y-2">
                  <p className="text-grey20 font-medium text-2xl">
                    Employee ID #345345
                  </p>

                  <div className="size-20 rounded-2xl">
                    <img
                      className="w-full h-full object-center"
                      src="/images/admin.png"
                      alt="customer image"
                    />
                  </div>

                  <p className="font-medium text-2xl !pt-4 capitalize">
                    John Doe
                  </p>
                  <p className="font-medium text-base text-grey20 flex items-center gap-2">
                    <MdMailOutline size={"22px"} />
                    @gmail.com
                  </p>
                  <p className="font-medium text-base text-grey20 flex items-center gap-2">
                    <MdOutlinePhone size={"22px"} />
                    876e5r6789
                  </p>
                  <p className="font-medium text-base text-grey20 flex items-center gap-2">
                    <IconDriver />
                    Laundry Shop Driver
                  </p>

                  <p className="font-medium text-base text-grey20 flex items-center gap-2">
                    <IconShop />
                    Laundry Dryer
                  </p>
                </div>

                <div className="flex gap-x-4">
                  <CiEdit size={30} />
                  <IoEye size={30} />
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    />
  );
}
