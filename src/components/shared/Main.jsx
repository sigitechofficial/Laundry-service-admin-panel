import { Box, useMediaQuery } from "@mui/material";
import { breakPoints, sidebarHide } from "../../shared/constants";
import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";

export default function Main({ content }) {
  // const isMobile = useMediaQuery("(max-width:640px)");
  // const isLaptop = useMediaQuery(breakPoints.laptop);
  const location = useLocation();
  const open = useSelector((state) => state.ui.sidebarOpen);
  const isDesktop = useMediaQuery(breakPoints.desktop);
  const isFullWidth = useMediaQuery(sidebarHide);

  const marginTop = isDesktop ? "!mt-[80px]" : "!mt-[60px]";
  const minHeight = isDesktop
    ? "min-h-[calc(100vh-80px)]"
    : "min-h-[calc(100vh-60px)]";
  const spacing =
    location.pathname === "/" ? "" : "!py-[60px] !px-4 sm:!px-[40px]";
  const marginLeft = isFullWidth
    ? "!ml-0"
    : !open
    ? "!ml-[80px]"
    : isDesktop
    ? "!ml-[320px]"
    : "!ml-[280px]";

  return (
    <div
      className={`w-full bg-grey60 transition-[margin-left] duration-300 ease-in-out overflow-hidden px-
        ${marginTop} ${minHeight} ${spacing} ${marginLeft}`}
    >
      {content}
    </div>
  );
}
