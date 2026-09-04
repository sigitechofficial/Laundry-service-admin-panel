import { PageHeader } from "../../design-system";
import NotifyLogs from "./NotifyLogs";

export default function NotifyLogsPage() {
  return (
    <div>
      <PageHeader
        title="Notify / Call Logs"
        description="Every push, SMS and call — with time and whether it was for pickup or delivery."
      />
      <NotifyLogs />
    </div>
  );
}
