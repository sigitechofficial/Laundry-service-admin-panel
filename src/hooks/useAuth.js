import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useToaster from "../components/ui/Toaster";
import { clearAuthTokens, hasValidSession } from "../utilities/authStorage";

export const AuthCheck = ({ children }) => {
  const navigate = useNavigate();
  const { info } = useToaster();
  const allowed = hasValidSession();

  useEffect(() => {
    if (allowed) return;
    clearAuthTokens();
    info("Please login first !");
    navigate("/auth/login", { replace: true });
    // `info` is recreated each render; gate only on session + navigate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, navigate]);

  if (!allowed) return null;
  return children;
};
