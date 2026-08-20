import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function CountriesAndCities() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/countries-cities/countries", { replace: true });
  }, [navigate]);

  return null;
}
