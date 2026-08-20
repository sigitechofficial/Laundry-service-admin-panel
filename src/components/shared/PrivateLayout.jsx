import { Suspense, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useSnackbar } from "notistack";
import Layout from "./Layout";
import { Delay } from "./Loaders";
import {
  startAdminForegroundNotifications,
  ensureAdminFcmRegistered,
} from "../../utilities/adminWebNotifications";

export default function PrivateLayout() {
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await startAdminForegroundNotifications({
        onNotify: ({ title, body }) => {
          if (cancelled) return;
          enqueueSnackbar(`${title}${body ? `: ${body}` : ""}`, {
            variant: "info",
            autoHideDuration: 6000,
          });
        },
      });

      if (!cancelled) await ensureAdminFcmRegistered();
    })();

    return () => {
      cancelled = true;
    };
  }, [enqueueSnackbar]);

  return (
    <Layout
      content={
        <Suspense
          fallback={
            <div className="min-h-[400px] flex items-center justify-center">
              <Delay />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      }
    />
  );
}
