import dayjs from "dayjs";

export const calculateDateRange = (option) => {
  const today = dayjs();

  switch (option) {
    case "today":
      return {
        startDate: today.startOf("day"),
        endDate: today.endOf("day"),
        label: today.format("MMM DD"),
      };
    case "currentWeek":
      return {
        startDate: today.startOf("week"),
        endDate: today.endOf("week"),
        label: `${today.startOf("week").format("MMM DD")} - ${today
          .endOf("week")
          .format("MMM DD")}`,
      };
    case "currentMonth":
      return {
        startDate: today.startOf("month"),
        endDate: today.endOf("month"),
        label: today.format("MMMM YYYY"),
      };
    case "currentYear":
      return {
        startDate: today.startOf("year"),
        endDate: today.endOf("year"),
        label: today.format("YYYY"),
      };
    case "last7Days":
      return {
        startDate: today.subtract(6, "day").startOf("day"),
        endDate: today.endOf("day"),
        label: `${today.subtract(6, "day").format("MMM DD")} - ${today.format(
          "MMM DD"
        )}`,
      };
    case "last30Days":
      return {
        startDate: today.subtract(29, "day").startOf("day"),
        endDate: today.endOf("day"),
        label: `${today.subtract(29, "day").format("MMM DD")} - ${today.format(
          "MMM DD"
        )}`,
      };
    default:
      return null;
  }
};

export const DATE_RANGE_OPTIONS = [
  { label: "Today", value: "today" },
  { label: "Current Week", value: "currentWeek" },
  { label: "Current Month", value: "currentMonth" },
  { label: "Current Year", value: "currentYear" },
  { label: "Last 7 Days", value: "last7Days" },
  { label: "Last 30 Days", value: "last30Days" },
  { label: "Custom", value: "custom" },
];
