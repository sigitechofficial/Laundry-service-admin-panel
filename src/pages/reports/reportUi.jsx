import { useNavigate } from "react-router-dom";
import { Button } from "../../design-system";
import { DirectoryError, DirectoryIdentity, PageLoading } from "../directory-table/directoryTable";

export function ReportQueryState({ isLoading, isError, error, onRetry, children }) {
  if (isLoading) return <PageLoading label="Loading report…" />;
  if (isError) {
    return (
      <DirectoryError onRetry={onRetry}>
        {error?.data?.message || "Failed to load report. Adjust filters or try again."}
      </DirectoryError>
    );
  }
  return children;
}

export function ReportInfo({ children }) {
  return (
    <p
      role="note"
      style={{
        margin: "0 0 16px",
        padding: "10px 12px",
        borderRadius: "var(--r-md)",
        background: "var(--info-bg)",
        color: "var(--ink-2)",
        border: "1px solid var(--info-50)",
        fontSize: "var(--text-sm)",
        lineHeight: 1.45,
      }}
    >
      {children}
    </p>
  );
}

export function ReportEntityLink({ to, name, meta, id, title }) {
  const navigate = useNavigate();
  return (
    <DirectoryIdentity
      name={name}
      meta={meta}
      id={id}
      title={title || (to ? "Open details" : undefined)}
      onClick={to ? () => navigate(to) : undefined}
    />
  );
}

export function ReportQueueLink({ to, children }) {
  const navigate = useNavigate();
  return (
    <Button variant="secondary" size="sm" onClick={() => navigate(to)}>
      {children}
    </Button>
  );
}

export function RatingHistogram({ histogram }) {
  const buckets = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: Number(histogram?.[stars] ?? histogram?.[String(stars)] ?? 0) || 0,
  }));
  const max = Math.max(...buckets.map((b) => b.count), 0);

  return (
    <div style={{ display: "grid", gap: 4, minWidth: 140 }}>
      {buckets.map((bucket) => (
        <div
          key={bucket.stars}
          style={{ display: "grid", gridTemplateColumns: "28px 1fr 28px", gap: 6, alignItems: "center" }}
        >
          <span style={{ fontSize: 12, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
            {bucket.stars}★
          </span>
          <div
            style={{
              height: 6,
              background: "var(--n-100)",
              borderRadius: 999,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: max > 0 ? `${(bucket.count / max) * 100}%` : "0%",
                height: "100%",
                background: "var(--accent)",
                borderRadius: 999,
              }}
            />
          </div>
          <span style={{ fontSize: 12, color: "var(--muted)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
            {bucket.count}
          </span>
        </div>
      ))}
    </div>
  );
}
