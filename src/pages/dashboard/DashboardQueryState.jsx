import { getApiErrorMessage } from "../../store/services/apiErrors";

export function DashboardQueryState({
  loading,
  error,
  onRetry,
  loadingLabel = "Loading operations…",
  errorLabel = "Could not load the dashboard. Please try again.",
}) {
  if (loading) {
    return (
      <p className="m-0 text-[13.5px] text-[var(--muted)]">{loadingLabel}</p>
    );
  }

  if (error) {
    const resolvedLabel =
      error && typeof error === "object"
        ? getApiErrorMessage(error, errorLabel)
        : errorLabel;

    return (
      <div
        role="alert"
        className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-7 py-10 text-center shadow-[0_1px_2px_rgba(16,21,31,0.04)]"
      >
        <p className="m-0 mb-2 text-[15px] font-semibold text-[var(--ink)]">
          Something went wrong
        </p>
        <p className="m-0 mb-4 text-[13.5px] text-[var(--muted)]">
          {resolvedLabel}
        </p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-10 items-center rounded-[10px] border border-[var(--line-2)] bg-[var(--surface)] px-4 text-[13.5px] font-semibold text-[var(--ink-2)] hover:bg-[var(--canvas)]"
          >
            Retry
          </button>
        ) : null}
      </div>
    );
  }

  return null;
}

export function DashboardEmptyHint({ children }) {
  return (
    <p className="m-0 px-1 py-3 text-[13.5px] text-[var(--muted)]">{children}</p>
  );
}
