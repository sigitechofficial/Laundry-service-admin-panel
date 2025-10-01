import React from "react";

const getStatusPill = ({ status }) => {
  switch (status) {
    case "pending":
      return (
        <div className="text-orange50 bg-orange51 text-base rounded-sm px-2 py-1 font-medium">
          Pending
        </div>
      );
    case "active":
      return (
        <div className="text-orange50 bg-orange51 text-base rounded-sm !px-2 !py-1 font-Inter font-normal">
          Active
        </div>
      );
    case "inactive":
      return (
        <div className="text-red50 bg-red51 text-base rounded-sm px-2 py-1 font-medium">
          Inactive
        </div>
      );
    case "block":
      return (
        <div className="text-pink50 bg-pink51 text-base !px-2 !py-1 font-Inter font-normal">
          Block
        </div>
      );
    default:
      return (
        <div className="text-gray-500 bg-gray-100 text-base rounded-sm px-2 py-1 font-medium">
          Unknown
        </div>
      );
  }
};

export default function StatusPill({ status }) {
  return getStatusPill({ status: status?.toLowerCase?.() });
}
