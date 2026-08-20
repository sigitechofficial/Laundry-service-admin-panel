import { PageHeader } from "../../design-system";
import NotifyLogs from "./NotifyLogs";

export default function NotifyLogsPage() {
  return (
    <div>
      <PageHeader
        title="Notify / Call Logs"
        description="Push, SMS, and dialer session history for bookings."
      />
      <NotifyLogs />
    </div>
  );
}
