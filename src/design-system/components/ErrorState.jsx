import Button from "./Button";
import DsScope from "../DsScope";

const DEFAULT_TITLE = "This page failed to load";
const DEFAULT_DESCRIPTION =
  "Something unexpected happened on this screen. Reload to try again, or return to the dashboard.";

/**
 * Shared recovery / failure panel. Used by the app ErrorBoundary.
 * Pages that already handle API errors should keep doing so — this is not a query state.
 */
export default function ErrorState({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  detail,
  onReload,
  onHome,
  reloadLabel = "Reload",
  homeLabel = "Go home",
  compact = false,
}) {
  return (
    <DsScope
      as="main"
      className={compact ? "jd-error jd-error--compact" : "jd-error"}
      role="alert"
      aria-live="assertive"
    >
      <div className="jd-error__panel">
        <div className="jd-error__icon" aria-hidden>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 16h.01" />
          </svg>
        </div>
        <h1 className="jd-error__title">{title}</h1>
        <p className="jd-error__desc">{description}</p>
        {detail ? <pre className="jd-error__detail">{detail}</pre> : null}
        <div className="jd-error__actions">
          {onReload ? (
            <Button type="button" onClick={onReload}>
              {reloadLabel}
            </Button>
          ) : null}
          {onHome ? (
            <Button type="button" variant="secondary" onClick={onHome}>
              {homeLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </DsScope>
  );
}
