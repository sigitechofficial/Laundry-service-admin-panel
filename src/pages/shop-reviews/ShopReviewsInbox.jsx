import { useMemo, useState } from "react";
import {
  Box,
  Typography,
  Chip,
  MenuItem,
  TextField,
  Stack,
  Rating,
} from "@mui/material";
import { BsCardList } from "../../shared/icons/index";
import DataTable from "../../components/ui/DataTable";
import ActionButtons from "../../components/ui/ActionButtons";
import ModalComponent from "../../components/shared/Modal";
import InputFieldModal from "../../components/ui/InputFieldModal";
import ButtonBlue from "../../components/ui/ButtonBlue";
import {
  useGetShopReviewsQuery,
  useHideShopReviewMutation,
  useUnhideShopReviewMutation,
} from "../../store/services/api";
import { Delay } from "../../components/shared/Loaders";
import useToaster from "../../components/ui/Toaster";

export default function ShopReviewsInbox() {
  const { success, error: showError } = useToaster();
  const [visibility, setVisibility] = useState("");
  const [rating, setRating] = useState("");
  const [sentiment, setSentiment] = useState("");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState(null);
  const [hideOpen, setHideOpen] = useState(false);
  const [hideReason, setHideReason] = useState("");
  const [hideTarget, setHideTarget] = useState(null);

  const queryArgs = useMemo(
    () => ({
      page,
      limit: 25,
      ...(visibility ? { visibility } : {}),
      ...(rating ? { rating } : {}),
      ...(sentiment ? { sentiment } : {}),
    }),
    [page, visibility, rating, sentiment]
  );

  const { data, isLoading, refetch } = useGetShopReviewsQuery(queryArgs);
  const [hideReview, { isLoading: isHiding }] = useHideShopReviewMutation();
  const [unhideReview, { isLoading: isUnhiding }] =
    useUnhideShopReviewMutation();

  const payload = data?.data || data || {};
  const reviews = Array.isArray(payload.reviews) ? payload.reviews : [];
  const pagination = payload.pagination || { page: 1, totalPages: 1, total: 0 };

  const tableRows = reviews.map((row, index) => ({
    id: row.id,
    sl: (page - 1) * 25 + index + 1,
    orderTrackId: row.orderTrackId || "—",
    customer: row.customer?.name || "—",
    shopName: row.shopName || "—",
    rating: row.rating,
    comment: row.comment || "—",
    visibility: row.visibility,
    submittedAt: row.submittedAt
      ? new Date(row.submittedAt).toLocaleString()
      : "—",
    reasons: row.reasons || [],
    raw: row,
  }));

  const columns = [
    { field: "sl", headerName: "SL", flex: 0.05, minWidth: 60 },
    { field: "orderTrackId", headerName: "ORDER", flex: 0.12, minWidth: 120 },
    { field: "customer", headerName: "CUSTOMER", flex: 0.12, minWidth: 120 },
    { field: "shopName", headerName: "SHOP", flex: 0.14, minWidth: 140 },
    {
      field: "rating",
      headerName: "RATING",
      flex: 0.12,
      minWidth: 120,
      renderCell: (row) => <Rating value={row.rating} readOnly size="small" />,
    },
    {
      field: "reasons",
      headerName: "REASONS",
      flex: 0.2,
      minWidth: 180,
      renderCell: (row) => (
        <Stack direction="row" gap={0.5} flexWrap="wrap">
          {(row.reasons || []).slice(0, 3).map((r) => (
            <Chip
              key={`${row.id}-${r.code}`}
              size="small"
              label={r.label || r.code}
              color={r.sentiment === "positive" ? "success" : "error"}
              variant="outlined"
            />
          ))}
        </Stack>
      ),
    },
    {
      field: "visibility",
      headerName: "STATUS",
      flex: 0.1,
      minWidth: 100,
      renderCell: (row) => (
        <Chip
          size="small"
          label={row.visibility}
          color={row.visibility === "published" ? "success" : "default"}
        />
      ),
    },
    { field: "submittedAt", headerName: "SUBMITTED", flex: 0.14, minWidth: 140 },
    {
      field: "actions",
      headerName: "ACTIONS",
      flex: 0.12,
      minWidth: 120,
      sortable: false,
      renderCell: (row) => (
        <ActionButtons
          showView
          showEdit={false}
          showDelete={false}
          onView={() => setDetail(row.raw)}
        />
      ),
    },
  ];

  const handleHide = async () => {
    if (!hideTarget) return;
    try {
      await hideReview({
        id: hideTarget.id,
        body: { hiddenReason: hideReason },
      }).unwrap();
      success("Review hidden");
      setHideOpen(false);
      setHideTarget(null);
      setHideReason("");
      setDetail(null);
      refetch();
    } catch (err) {
      showError(err?.data?.message || "Failed to hide review");
    }
  };

  const handleUnhide = async (id) => {
    try {
      await unhideReview(id).unwrap();
      success("Review published");
      setDetail(null);
      refetch();
    } catch (err) {
      showError(err?.data?.message || "Failed to unhide review");
    }
  };

  if (isLoading) return <Delay />;

  return (
    <div className="!space-y-8">
      <Box className="flex items-center justify-between gap-x-5 flex-wrap">
        <Box className="flex items-center gap-x-5">
          <Typography color="blue.50">
            <BsCardList size="24px" color="blue.50" />
          </Typography>
          <Box>
            <Typography variant="h4" fontFamily="Switzer" color="grey.20">
              Shop reviews
            </Typography>
            <Typography variant="body2" color="grey.70" fontFamily="Switzer">
              Moderate customer feedback and audit reason codes across shops
            </Typography>
          </Box>
        </Box>
      </Box>

      <Stack direction="row" gap={2} flexWrap="wrap">
        <TextField
          select
          size="small"
          label="Visibility"
          value={visibility}
          onChange={(e) => {
            setVisibility(e.target.value);
            setPage(1);
          }}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="published">Published</MenuItem>
          <MenuItem value="hidden">Hidden</MenuItem>
        </TextField>
        <TextField
          select
          size="small"
          label="Rating"
          value={rating}
          onChange={(e) => {
            setRating(e.target.value);
            setPage(1);
          }}
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="">All</MenuItem>
          {[5, 4, 3, 2, 1].map((n) => (
            <MenuItem key={n} value={String(n)}>
              {n} stars
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Sentiment"
          value={sentiment}
          onChange={(e) => {
            setSentiment(e.target.value);
            setPage(1);
          }}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="positive">Has positive</MenuItem>
          <MenuItem value="negative">Has negative</MenuItem>
        </TextField>
      </Stack>

      <DataTable
        data={tableRows}
        columns={columns}
        searchPlaceholder="Search reviews…"
        showFilters={false}
        showDateRange={false}
        showDownload={false}
        height={520}
      />

      <Stack direction="row" gap={2} alignItems="center">
        <Typography variant="body2" color="grey.70">
          Page {pagination.page} of {pagination.totalPages || 1} ({pagination.total || 0}{" "}
          total)
        </Typography>
        <ButtonBlue
          size="small"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Previous
        </ButtonBlue>
        <ButtonBlue
          size="small"
          disabled={page >= (pagination.totalPages || 1)}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </ButtonBlue>
      </Stack>

      <ModalComponent
        open={!!detail}
        title="Review detail"
        onClose={() => setDetail(null)}
        primaryAction={
          detail?.visibility === "published"
            ? {
                label: "Hide review",
                onClick: () => {
                  setHideTarget(detail);
                  setHideOpen(true);
                },
              }
            : {
                label: "Unhide review",
                onClick: () => handleUnhide(detail.id),
                isLoading: isUnhiding,
              }
        }
        secondaryAction={{
          label: "Close",
          onClick: () => setDetail(null),
        }}
      >
        {detail && (
          <Box className="space-y-3">
            <Typography fontFamily="Switzer">
              <strong>Order:</strong> {detail.orderTrackId || detail.bookingId}
            </Typography>
            <Typography fontFamily="Switzer">
              <strong>Shop:</strong> {detail.shopName}
            </Typography>
            <Typography fontFamily="Switzer">
              <strong>Customer:</strong> {detail.customer?.name}
            </Typography>
            <Rating value={detail.rating} readOnly />
            <Stack direction="row" gap={0.5} flexWrap="wrap">
              {(detail.reasons || []).map((r) => (
                <Chip
                  key={r.code}
                  size="small"
                  label={`${r.label}${r.otherText ? `: ${r.otherText}` : ""}`}
                  color={r.sentiment === "positive" ? "success" : "error"}
                  variant="outlined"
                />
              ))}
            </Stack>
            <Typography fontFamily="Switzer" color="grey.80">
              {detail.comment || "No comment"}
            </Typography>
            {detail.visibility === "hidden" && detail.hiddenReason && (
              <Typography fontFamily="Switzer" color="error.main">
                Hidden reason: {detail.hiddenReason}
              </Typography>
            )}
          </Box>
        )}
      </ModalComponent>

      <ModalComponent
        open={hideOpen}
        title="Hide review"
        onClose={() => {
          setHideOpen(false);
          setHideTarget(null);
          setHideReason("");
        }}
        primaryAction={{
          label: "Hide",
          onClick: handleHide,
          isLoading: isHiding,
        }}
        secondaryAction={{
          label: "Cancel",
          onClick: () => {
            setHideOpen(false);
            setHideTarget(null);
            setHideReason("");
          },
        }}
      >
        <InputFieldModal
          label="Moderation note (optional)"
          placeholder="Why is this review being hidden?"
          value={hideReason}
          onChange={(e) => setHideReason(e.target.value)}
        />
      </ModalComponent>
    </div>
  );
}
