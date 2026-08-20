import { useNavigate } from "react-router-dom";
import { Button, PageHeader } from "../design-system";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div>
      <PageHeader
        title="Page not found"
        description="This screen does not exist or has moved. Use the sidebar to open a valid area."
        actions={<Button onClick={() => navigate("/")}>Back to dashboard</Button>}
      />
    </div>
  );
}
