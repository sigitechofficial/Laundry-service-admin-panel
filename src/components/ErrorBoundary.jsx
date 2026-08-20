import { Component } from "react";
import { useLocation } from "react-router-dom";
import ErrorState from "../design-system/components/ErrorState";

/**
 * Catches render/lifecycle crashes in the route tree so operators see a recovery
 * screen instead of a blank page.
 *
 * Does not wrap async work, event handlers, or network failures — pages that
 * already surface API errors (snackbars, QueryState, local banners) keep that
 * ownership. Do not add window.onerror / unhandledrejection handlers here.
 */
class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[admin] page render crash", error, errorInfo?.componentStack);
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return this.props.fallback(this.state.error);
    }
    return this.props.children;
  }
}

function CrashFallback({ error }) {
  const detail = import.meta.env.DEV && error?.message ? String(error.message) : undefined;

  return (
    <ErrorState
      detail={detail}
      onReload={() => window.location.reload()}
      onHome={() => {
        window.location.assign("/");
      }}
    />
  );
}

export default function ErrorBoundary({ children }) {
  const location = useLocation();
  const resetKey = `${location.pathname}${location.search}`;

  return (
    <RouteErrorBoundary resetKey={resetKey} fallback={(error) => <CrashFallback error={error} />}>
      {children}
    </RouteErrorBoundary>
  );
}
