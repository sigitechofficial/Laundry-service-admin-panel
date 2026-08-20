import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { sidebarHide } from "../../shared/constants";
import { toggleSidebar } from "../../store/slices/uiSlice";
import DsScope from "../DsScope";
import "../styles/shell.css";
import DsSidebar from "./DsSidebar";
import DsHeader from "./DsHeader";

function useMatchMedia(query) {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    const apply = () => setMatches(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [query]);

  return matches;
}

export default function DsShell({ children }) {
  const dispatch = useDispatch();
  const open = useSelector((s) => s.ui.sidebarOpen);
  const isNarrow = useMatchMedia(sidebarHide);
  const searchRef = useRef(null);
  const collapsed = !isNarrow && !open;
  const mobileOpen = isNarrow && open;

  return (
    <DsScope className={`jd-app${collapsed ? " is-collapsed" : ""}${mobileOpen ? " is-mobile-open" : ""}`}>
      {mobileOpen ? (
        <div
          className="jd-scrim-side"
          onClick={() => dispatch(toggleSidebar())}
          aria-hidden="true"
        />
      ) : null}
      <DsSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        searchRef={searchRef}
        onToggle={() => dispatch(toggleSidebar())}
      />
      <div className="jd-stage">
        <DsHeader onMenu={() => dispatch(toggleSidebar())} />
        <div className="jd-content">{children}</div>
      </div>
    </DsScope>
  );
}
