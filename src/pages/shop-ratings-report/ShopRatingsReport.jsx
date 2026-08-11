import { useMemo, useState } from "react";
import {
  Box,
  Typography,
  Chip,
  MenuItem,
  TextField,
  Stack,
  LinearProgress,
} from "@mui/material";
import { TbReportSearch } from "../../shared/icons/index";
import DataTable from "../../components/ui/DataTable";
import {
  useGetShopRatingsReportQuery,
  useGetReviewReasonInsightsQuery,
} from "../../store/services/api";
import { Delay } from "../../components/shared/Loaders";

function performanceColor(perf) {
  if (perf === "good") return "success";
  if (perf === "fair") return "warning";
  return "error";
}

export default function ShopRatingsReport() {
  const [sort, setSort] = useState("avg_desc");
  const [minReviews, setMinReviews] = useState("5");
  const [period, setPeriod] = useState("all");

  const ratingsQuery = useMemo(
    () => ({
      sort,
      minReviews,
      page: 1,
      limit: 50,
    }),
    [sort, minReviews]
  );

  const insightsQuery = useMemo(() => ({ period }), [period]);

  const { data: ratingsData, isLoading: ratingsLoading } =
    useGetShopRatingsReportQuery(ratingsQuery);
  const { data: insightsData, isLoading: insightsLoading } =
    useGetReviewReasonInsightsQuery(insightsQuery);

  const shops = ratingsData?.data?.data || [];
  const insightsPayload = insightsData?.data?.data || insightsData?.data || {};
  const positives = Array.isArray(insightsPayload.positives)
    ? insightsPayload.positives
    : [];
  const negatives = Array.isArray(insightsPayload.negatives)
    ? insightsPayload.negatives
    : [];
  const insights = insightsPayload;

  const shopRows = (Array.isArray(shops) ? shops : []).map((row) => ({
    id: row.shopId,
    sl: row.sl,
    shopName: row.shopName,
    avgRating: row.avgRating,
    publishedCount: row.publishedCount,
    lowRatingPercent: `${row.lowRatingPercent}%`,
    performance: row.performance,
    topPositiveReasonCode: row.topPositiveReasonCode || "—",
    topNegativeReasonCode: row.topNegativeReasonCode || "—",
  }));

  const shopColumns = [
    { field: "sl", headerName: "SL", flex: 0.06, minWidth: 60 },
    { field: "shopName", headerName: "SHOP", flex: 0.22, minWidth: 160 },
    { field: "avgRating", headerName: "AVG", flex: 0.1, minWidth: 80 },
    { field: "publishedCount", headerName: "REVIEWS", flex: 0.1, minWidth: 90 },
    {
      field: "lowRatingPercent",
      headerName: "LOW % (1–2)",
      flex: 0.12,
      minWidth: 110,
    },
    {
      field: "performance",
      headerName: "HEALTH",
      flex: 0.12,
      minWidth: 100,
      renderCell: (row) => (
        <Chip
          size="small"
          label={row.performance}
          color={performanceColor(row.performance)}
        />
      ),
    },
    {
      field: "topPositiveReasonCode",
      headerName: "TOP +",
      flex: 0.14,
      minWidth: 120,
    },
    {
      field: "topNegativeReasonCode",
      headerName: "TOP −",
      flex: 0.14,
      minWidth: 120,
    },
  ];

  const reasonColumns = [
    { field: "sl", headerName: "SL", flex: 0.08, minWidth: 60 },
    { field: "code", headerName: "CODE", flex: 0.18, minWidth: 120 },
    { field: "label", headerName: "LABEL", flex: 0.3, minWidth: 180 },
    {
      field: "selectionCount",
      headerName: "SELECTIONS",
      flex: 0.14,
      minWidth: 110,
    },
    { field: "shopCount", headerName: "SHOPS", flex: 0.12, minWidth: 90 },
    { field: "reviewCount", headerName: "REVIEWS", flex: 0.12, minWidth: 90 },
    {
      field: "bar",
      headerName: "SHARE",
      flex: 0.2,
      minWidth: 140,
      renderCell: (row) => (
        <Box sx={{ width: "100%", pr: 1 }}>
          <LinearProgress
            variant="determinate"
            value={Math.min(100, row.share || 0)}
            color={row.sentiment === "positive" ? "success" : "error"}
          />
        </Box>
      ),
    },
  ];

  const maxPos = Math.max(...positives.map((p) => p.selectionCount || 0), 1);
  const maxNeg = Math.max(...negatives.map((n) => n.selectionCount || 0), 1);

  const positiveRows = positives.map((r, i) => ({
    id: `p-${r.reasonId}`,
    sl: i + 1,
    code: r.code,
    label: r.label,
    selectionCount: r.selectionCount,
    shopCount: r.shopCount,
    reviewCount: r.reviewCount,
    sentiment: "positive",
    share: Math.round(((r.selectionCount || 0) / maxPos) * 100),
  }));

  const negativeRows = negatives.map((r, i) => ({
    id: `n-${r.reasonId}`,
    sl: i + 1,
    code: r.code,
    label: r.label,
    selectionCount: r.selectionCount,
    shopCount: r.shopCount,
    reviewCount: r.reviewCount,
    sentiment: "negative",
    share: Math.round(((r.selectionCount || 0) / maxNeg) * 100),
  }));

  if (ratingsLoading || insightsLoading) return <Delay />;

  return (
    <div className="!space-y-8">
      <Box className="flex items-center gap-x-5">
        <Typography color="blue.50">
          <TbReportSearch size="24px" color="blue.50" />
        </Typography>
        <Box>
          <Typography variant="h4" fontFamily="Switzer" color="grey.20">
            Shop ratings & insights
          </Typography>
          <Typography variant="body2" color="grey.70" fontFamily="Switzer">
            See which shops perform well, which need attention, and what reason
            codes drive platform feedback
          </Typography>
        </Box>
      </Box>

      <Stack direction="row" gap={2} flexWrap="wrap">
        <TextField
          select
          size="small"
          label="Shop sort"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="avg_desc">Best rated</MenuItem>
          <MenuItem value="avg_asc">Lowest rated</MenuItem>
          <MenuItem value="low_pct_desc">Highest low-rating %</MenuItem>
          <MenuItem value="count_desc">Most reviews</MenuItem>
        </TextField>
        <TextField
          select
          size="small"
          label="Min reviews"
          value={minReviews}
          onChange={(e) => setMinReviews(e.target.value)}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="1">1+</MenuItem>
          <MenuItem value="5">5+</MenuItem>
          <MenuItem value="10">10+</MenuItem>
          <MenuItem value="25">25+</MenuItem>
        </TextField>
        <TextField
          select
          size="small"
          label="Insights period"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="all">All time</MenuItem>
          <MenuItem value="this_month">This month</MenuItem>
          <MenuItem value="this_week">This week</MenuItem>
          <MenuItem value="today">Today</MenuItem>
        </TextField>
      </Stack>

      <Box>
        <Typography variant="h6" fontFamily="Switzer" mb={2}>
          Shop performance
        </Typography>
        <DataTable
          data={shopRows}
          columns={shopColumns}
          searchPlaceholder="Search shops…"
          showFilters={false}
          showDateRange={false}
          showDownload={false}
          height={420}
        />
      </Box>

      <Box>
        <Typography variant="h6" fontFamily="Switzer" mb={1}>
          What&apos;s going well
        </Typography>
        <Typography variant="body2" color="grey.70" mb={2} fontFamily="Switzer">
          Top positive: {insights.topPositive?.label || "—"} (
          {insights.topPositive?.selectionCount ?? 0})
        </Typography>
        <DataTable
          data={positiveRows}
          columns={reasonColumns}
          showFilters={false}
          showDateRange={false}
          showDownload={false}
          height={280}
        />
      </Box>

      <Box>
        <Typography variant="h6" fontFamily="Switzer" mb={1}>
          What needs attention
        </Typography>
        <Typography variant="body2" color="grey.70" mb={2} fontFamily="Switzer">
          Top negative: {insights.topNegative?.label || "—"} (
          {insights.topNegative?.selectionCount ?? 0})
        </Typography>
        <DataTable
          data={negativeRows}
          columns={reasonColumns}
          showFilters={false}
          showDateRange={false}
          showDownload={false}
          height={280}
        />
      </Box>
    </div>
  );
}
