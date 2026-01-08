import React from "react";
import { useGetAllCustomersCountQuery } from "../../store/services/api";
import StatCard from "../../components/ui/StatCard";

export default function ShopDashboard() {
  const { data } = useGetAllCustomersCountQuery();
  return (
    <div className="w-full !space-y-11 !mt-16">
      <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-7 font-Inter">
        <StatCard
          title="TOTAL REVENUE"
          value={data?.data?.TotalRevenue || 24}
          bgColor="bg-purple50"
        />

        <StatCard
          title="GROSS PROFIT"
          value={data?.data?.GrossProfit || 17}
          bgColor="bg-red50"
        />

        <StatCard
          title="NET PROFIT"
          value={data?.data?.NetProfit || 1}
          bgColor="bg-green50"
        />
        <StatCard
          title="ADMIN EARNINGS"
          value={data?.data?.AdminEarnings || 0}
          bgColor="bg-green200"
        />
        <StatCard
          title="REFUND"
          value={data?.data?.Refund || 24}
          bgColor="bg-purple50"
        />
        <StatCard
          title="PENALTIES"
          value={data?.data?.Penalties || 17}
          bgColor="bg-red50"
        />
      </div>

      <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-7 font-Inter !py-3 2xl:!py-6">
        <StatCard
          title="TOTAL ORDERS"
          value={data?.data?.TotalOrders || 24}
          bgColor="bg-purple50"
        />
        <StatCard
          title="PROCESSING ORDERS"
          value={data?.data?.ProcessingOrders || 17}
          bgColor="bg-red50"
        />
        <StatCard
          title="CANCELLED ORDERS"
          value={data?.data?.CancelledOrders || 1}
          bgColor="bg-green50"
        />
      </div>

      {/* Employees Section */}
      <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-7 font-Inter">
        <StatCard
          title="TOTAL EMPLOYEES"
          value={data?.data?.TotalCustomer}
          bgColor="bg-purple50"
        />
        <StatCard
          title="ACTIVE EMPLOYEES"
          value={data?.data?.NewCustomers}
          bgColor="bg-red50"
        />
        <StatCard
          title="BLOCK EMPLOYEES"
          value={data?.data?.RepeatedCustomers}
          bgColor="bg-green50"
        />
      </div>
    </div>
  );
}
