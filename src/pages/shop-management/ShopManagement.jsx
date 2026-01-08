import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function ShopManagement() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to dashboard by default
    navigate("/shop-management/dashboard", { replace: true });
  }, [navigate]);

  return null;
}
