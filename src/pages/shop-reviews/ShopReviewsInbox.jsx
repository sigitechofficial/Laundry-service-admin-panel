import { useMemo, useState } from "react";
import {
  PageHeader,
  Button,
  Field,
  Input,
  Select,
  Table,
  Modal,
} from "../../design-system";
import {
  useGetShopReviewsQuery,
  useHideShopReviewMutation,
  useUnhideShopReviewMutation,
} from "../../store/services/api";
import { Delay } from "../../components/shared/Loaders";
import {
  DirectoryActions,
  DirectoryActionView,
  DirectoryClearButton,
  DirectoryDotPill,
  DirectoryIdentity,
  DirectoryMetric,
  DirectoryMetrics,
  DirectoryTableWrap,
  DirectoryToolSelect,
  DirectoryToolbar,
  DirectoryToolbarEnd,
} from "../directory-table/directoryTable";
import { joinMeta } from "../directory-table/directoryTableUtils";
import useToaster from "../../components/ui/Toaster";
import { DATE_TIME_FORMAT, formatDate } from "../../utilities/formatters";

const VISIBILITY_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "published", label: "Published" },
  { value: "hidden", label: "Hidden" },
];

const RATING_OPTIONS = [
  { value: "", label: "All ratings" },
  ...[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} stars` })),
];

const SENTIMENT_OPTIONS = [
  { value: "", label: "All sentiments" },
  { value: "positive", label: "Has positive" },
  { value: "negative", label: "Has negative" },
];

function Stars({ value }) {
  const n = Math.max(0, Math.min(5, Number(value) || 0));
  return (
    <span aria-label={`${n} of 5 stars`} style={{ letterSpacing: 1, fontSize: 14 }}>
      <span style={{ color: "var(--warning)" }}>{"★".repeat(n)}</span>
      <span style={{ color: "var(--n-300)" }}>{"★".repeat(5 - n)}</span>
    </span>
  );
}

function ReasonBadges({ reasons, limit }) {
  const items = Array.isArray(reasons) ? reasons : [];
  if (!items.length) return "—";
  const visible = limit ? items.slice(0, limit) : items;
  const extra = items.length - visible.length;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
      {visible.map((r) => (
        <DirectoryDotPill key={r.code} tone={r.sentiment === "positive" ? "success" : "danger"}>
          {limit ? r.label || r.code : `${r.label}${r.otherText ? `: ${r.otherText}` : ""}`}
        </DirectoryDotPill>
      ))}
      {extra > 0 ? <DirectoryDotPill tone="neutral">+{extra}</DirectoryDotPill> : null}
    </div>
  );
}

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
    submittedAt: formatDate(row.submittedAt, DATE_TIME_FORMAT),
    reasons: row.reasons || [],
    raw: row,
  }));

  const columns = [
    {
      key: "shopName",
      header: "Review",
      render: (row) => (
        <DirectoryIdentity
          name={row.shopName}
          meta={joinMeta(row.customer, row.orderTrackId)}
        />
      ),
    },
    {
      key: "visibility",
      header: "Status",
      render: (row) => (
        <DirectoryDotPill tone={row.visibility === "published" ? "success" : "neutral"}>
          {row.visibility === "published" ? "Published" : "Hidden"}
        </DirectoryDotPill>
      ),
    },
    {
      key: "reasons",
      header: "Reasons",
      render: (row) => <ReasonBadges reasons={row.reasons} limit={2} />,
    },
    {
      key: "rating",
      header: "Rating",
      render: (row) => (
        <DirectoryMetric value={`${row.rating}/5`} hint={row.submittedAt} />
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <DirectoryActions>
          <DirectoryActionView onClick={() => setDetail(row.raw)} />
        </DirectoryActions>
      ),
    },
  ];

  const closeHideModal = () => {
    setHideOpen(false);
    setHideTarget(null);
    setHideReason("");
  };

  const handleHide = async () => {
    if (!hideTarget || isHiding) return;
    try {
      await hideReview({
        id: hideTarget.id,
        body: { hiddenReason: hideReason },
      }).unwrap();
      success("Review hidden");
      closeHideModal();
      setDetail(null);
      refetch();
    } catch (err) {
      showError(err?.data?.message || "Failed to hide review");
    }
  };

  const handleUnhide = async (id) => {
    if (isUnhiding) return;
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

  const published = detail?.visibility === "published";

  return (
    <div>
      <PageHeader
        title="Shop reviews"
        description="Moderate customer feedback and audit reason codes across shops"
      />

      <DirectoryMetrics
        items={[{ label: "Reviews", value: pagination.total || 0, tone: "brand" }]}
      />

      <DirectoryTableWrap
        toolbar={
          <DirectoryToolbar>
            <DirectoryToolSelect label="Status">
              <Select
                aria-label="Status"
                value={visibility}
                onChange={(value) => {
                  setVisibility(value);
                  setPage(1);
                }}
                options={VISIBILITY_OPTIONS}
              />
            </DirectoryToolSelect>
            <DirectoryToolSelect label="Rating">
              <Select
                aria-label="Rating"
                value={rating}
                onChange={(value) => {
                  setRating(value);
                  setPage(1);
                }}
                options={RATING_OPTIONS}
              />
            </DirectoryToolSelect>
            <DirectoryToolSelect label="Sentiment">
              <Select
                aria-label="Sentiment"
                value={sentiment}
                onChange={(value) => {
                  setSentiment(value);
                  setPage(1);
                }}
                options={SENTIMENT_OPTIONS}
              />
            </DirectoryToolSelect>
            {visibility || rating || sentiment ? (
              <DirectoryToolbarEnd>
                <DirectoryClearButton
                  onClick={() => {
                    setVisibility("");
                    setRating("");
                    setSentiment("");
                    setPage(1);
                  }}
                />
              </DirectoryToolbarEnd>
            ) : null}
          </DirectoryToolbar>
        }
        footer={
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
            <p className="jd-lead" style={{ margin: 0 }}>
              Page {pagination.page} of {pagination.totalPages || 1} (
              {pagination.total || 0} total)
            </p>
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= (pagination.totalPages || 1)}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        }
      >
        <Table
          columns={columns}
          rows={tableRows}
          rowKey={(row) => row.id}
          empty="No reviews match these filters"
        />
      </DirectoryTableWrap>

      <Modal
        open={!!detail}
        title="Review detail"
        onClose={() => setDetail(null)}
        secondaryLabel="Close"
        primaryLabel={
          published
            ? "Hide review"
            : isUnhiding
              ? "Publishing…"
              : "Unhide review"
        }
        danger={published}
        onPrimary={() => {
          if (!detail) return;
          if (published) {
            setHideTarget(detail);
            setHideOpen(true);
            return;
          }
          handleUnhide(detail.id);
        }}
      >
        {detail ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ margin: 0 }}>
              <strong>Order:</strong> {detail.orderTrackId || detail.bookingId}
            </p>
            <p style={{ margin: 0 }}>
              <strong>Shop:</strong> {detail.shopName}
            </p>
            <p style={{ margin: 0 }}>
              <strong>Customer:</strong> {detail.customer?.name}
            </p>
            <Stars value={detail.rating} />
            <ReasonBadges reasons={detail.reasons} />
            <p style={{ margin: 0, color: "var(--ink-2)" }}>
              {detail.comment || "No comment"}
            </p>
            {detail.visibility === "hidden" && detail.hiddenReason ? (
              <p style={{ margin: 0, color: "var(--danger)", fontWeight: 500 }}>
                Hidden reason: {detail.hiddenReason}
              </p>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={hideOpen}
        title="Hide review"
        description="This review will no longer appear on the shop."
        onClose={closeHideModal}
        primaryLabel={isHiding ? "Hiding…" : "Hide"}
        secondaryLabel="Cancel"
        danger
        onPrimary={handleHide}
      >
        <Field
          label="Moderation note"
          hint="Optional. Why is this review being hidden?"
          htmlFor="hide-reason"
        >
          <Input
            id="hide-reason"
            placeholder="Why is this review being hidden?"
            value={hideReason}
            onChange={(e) => setHideReason(e.target.value)}
          />
        </Field>
      </Modal>
    </div>
  );
}
