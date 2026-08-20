import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { DsScope } from "../../design-system";
import { setNetworkOffline } from "../../store/slices/uiSlice";

/**
 * Persistent, non-blocking offline notice.
 * Cached RTK data is left as-is (may be stale). Reconnect refetch is owned by
 * createApi({ refetchOnReconnect: true }) + setupListeners — not faked here.
 */
export default function OfflineBanner() {
  const dispatch = useDispatch();
  const isOffline = useSelector((state) => state.ui.isOffline);

  useEffect(() => {
    const sync = () => {
      dispatch(setNetworkOffline(typeof navigator !== "undefined" && !navigator.onLine));
    };

    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    sync();

    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, [dispatch]);

  if (!isOffline) return null;

  return (
    <DsScope
      as="div"
      className="jd-offline-banner"
      role="status"
      aria-live="polite"
    >
      You’re offline — some data may be stale.
    </DsScope>
  );
}
