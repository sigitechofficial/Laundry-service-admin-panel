import { useState } from "react";
import { Box, Typography } from "@mui/material";
import Layout from "../../components/shared/Layout";
import { BsCardList, TbFileDownload } from "../../shared/icons/index";
import Search from "../../components/ui/Search";
import FiltersButton from "../../components/ui/FiltersButton";
import DateRangeSelector from "../../components/ui/DateRangeSelector";
import DataTable from "../../components/ui/DataTable";

export default function CustomerManagement() {
  const [dateRange, setDateRange] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const handleDateChange = (selectedRange) => {
    console.log("Selected Date Range:", selectedRange);
    setDateRange(selectedRange);

    // You can use the date range for filtering customers
    // Example: Filter customers by registration date, last activity, etc.
    if (selectedRange) {
      console.log("Start Date:", selectedRange.startDate.format("YYYY-MM-DD"));
      console.log("End Date:", selectedRange.endDate.format("YYYY-MM-DD"));
      console.log("Label:", selectedRange.label);
      console.log("Type:", selectedRange.type);

      // Here you would typically call an API or filter your data
      // filterCustomers(selectedRange.startDate, selectedRange.endDate);
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    console.log("Search term:", e.target.value);
    // Implement search logic here
  };
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
                Customer Management
              </Typography>
            </Box>

            <Box className="flex items-center gap-x-5">
              <Search
                placeholder="Search customer"
                onChange={handleSearchChange}
                value={searchTerm}
              />
              <FiltersButton
                text="Download"
                Icon={<TbFileDownload size="24px" color="#667085" />}
              />
              <DateRangeSelector
                value={dateRange}
                onChange={handleDateChange}
                placeholder="Select Date Range"
                className="w-fit"
              />
              <FiltersButton text="Zone" />
            </Box>
          </Box>

          <div className="grid grid-cols-4 gap-7 font-Inter">
            <div className="rounded-lg !px-3.5 !py-5 bg-purple50">
              <h6 className="font-Inter font-semibold text-lg uppercase">
                Total customers
              </h6>
              <p className="font-Inter font-medium text-[22px] !pt-10">
                130000
              </p>
            </div>

            <div className="rounded-lg !px-3.5 !py-5 bg-red50">
              <h6 className="font-Inter font-semibold text-lg uppercase">
                new customers
              </h6>
              <p className="font-Inter font-medium text-[22px] !pt-10">
                130000
              </p>
            </div>

            <div className="rounded-lg !px-3.5 !py-5 bg-green50">
              <h6 className="font-Inter font-semibold text-lg uppercase">
                Frequent customers
              </h6>
              <p className="font-Inter font-medium text-[22px] !pt-10">
                130000
              </p>
            </div>

            <div className="rounded-lg !px-3.5 !py-5 bg-green200">
              <h6 className="font-Inter font-semibold text-lg uppercase">
                Top performing customers
              </h6>
              <p className="font-Inter font-medium text-[22px] !pt-10">
                130000
              </p>
            </div>
          </div>

          {/* <div className="w-full">
            <DataTable
              searchPlaceholder="Search by ID, product, or others..."
              showFilters={true}
              showDateRange={true}
              showDownload={true}
              height={600}
            />
          </div> */}
        </div>
      }
    />
  );
}
