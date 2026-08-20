import { getApiErrorMessage } from "../../store/services/apiErrors";
import { DirectoryError, PageLoading } from "../directory-table/directoryTable";

export function QueryState({
  loading,
  error,
  onRetry,
  loadingLabel = "Loading…",
  errorLabel = "Could not load data. Please try again.",
}) {
  if (loading) {
    return <PageLoading label={loadingLabel} />;
  }

  if (error) {
    const resolvedLabel =
      error && typeof error === "object"
        ? getApiErrorMessage(error, errorLabel)
        : errorLabel;

    return <DirectoryError onRetry={onRetry}>{resolvedLabel}</DirectoryError>;
  }

  return null;
}

export function EmptyHint({ children }) {
  return (
    <p style={{ color: "#5c6673", margin: 0, padding: "28px 16px", textAlign: "center", fontSize: 13.5 }}>
      {children}
    </p>
  );
}
