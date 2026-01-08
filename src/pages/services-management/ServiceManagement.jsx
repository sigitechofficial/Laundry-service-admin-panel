import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function ServiceManagement() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to services page by default
    navigate("/services-management/services", { replace: true });
  }, [navigate]);

  return null;
}
