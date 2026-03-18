import dayjs from "dayjs";

export const REPORT_PERIOD_OPTIONS = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
  { value: "custom", label: "Custom" },
];

export const toDateString = (value) => {
  if (!value) return "";
  const d = dayjs(value);
  return d.isValid() ? d.format("YYYY-MM-DD") : "";
};

export const buildReportParams = (queryState) => {
  const params = {
    period: queryState.period || "all",
  };

  if (queryState.zoneId) params.zoneId = queryState.zoneId;
  if (queryState.search) params.search = queryState.search;
  if (queryState.page) params.page = queryState.page;
  if (queryState.limit) params.limit = queryState.limit;

  if (params.period === "custom") {
    if (queryState.startDate) params.startDate = toDateString(queryState.startDate);
    if (queryState.endDate) params.endDate = toDateString(queryState.endDate);
  }

  return params;
};
