// AuthCheck.js
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useToaster from "../components/ui/Toaster";

export const setLoginStatus = (data) => {
  try {
    localStorage.setItem("login_status", data);
  } catch (_) {}
};

export const AuthCheck = ({ children }) => {
  const navigate = useNavigate();
  const { success, info, error } = useToaster();

  useEffect(() => {
    const loggedIn = localStorage.getItem("login_status");
    // const token = localStorage.getItem("accessToken");

    if (!loggedIn) {
      localStorage.removeItem("login_status");
      localStorage.removeItem("userEmail");
      info("Please login first !");
      navigate("/auth/login", { replace: true });
    }
  }, [navigate]);

  return children;
};
