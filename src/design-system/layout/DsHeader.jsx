import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { DS_NAV, childMatchesPath, itemMatchesPath, isGroupOpenPath } from "../nav";
import DsIcon from "../icons";
import DeploymentInfo from "../../components/ui/DeploymentInfo";
import { clearAuthTokens, getUserProfile } from "../../utilities/authStorage";
import { useAdminLogoutMutation } from "../../store/services/api";
import useToaster from "../../components/ui/Toaster";

function crumbsFor(pathname) {
  if (pathname === "/privacy-policy") return ["System", "Privacy Policy"];
  if (pathname === "/fcm-debug") return ["System", "FCM Push Debug"];
  for (const sec of DS_NAV) {
    for (const item of sec.items) {
      if (item.children) {
        const child = item.children.find((c) => childMatchesPath(c, pathname));
        if (child) return [sec.section, item.label, child.label];
        if (isGroupOpenPath(item, pathname)) return [sec.section, item.label];
      } else if (itemMatchesPath(item, pathname)) {
        return [sec.section, item.label];
      }
    }
  }
  return ["Admin", "Page not found"];
}

function displayName(profile) {
  const full = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim();
  if (full) return full;
  return profile?.email || "User";
}

function initials(profile) {
  const f = profile?.firstName?.[0];
  const l = profile?.lastName?.[0];
  if (f && l) return `${f}${l}`.toUpperCase();
  if (f) return f.toUpperCase();
  return (profile?.email?.[0] || "U").toUpperCase();
}

export default function DsHeader({ onMenu }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { success, error } = useToaster();
  const [adminLogout] = useAdminLogoutMutation();
  const parts = useMemo(() => crumbsFor(pathname), [pathname]);
  const profile = getUserProfile();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDoc = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  async function handleLogout() {
    setMenuOpen(false);
    try {
      await adminLogout().unwrap();
      success("Logged out successfully");
    } catch {
      error("Server session could not be revoked. Local session was cleared.");
    } finally {
      clearAuthTokens();
      navigate("/auth/login");
    }
  }

  return (
    <header className="jd-top">
      <button
        type="button"
        className="jd-btn jd-btn--ghost jd-btn--sm jd-menu-btn"
        id="jd-mobile-menu"
        aria-label="Open menu"
        onClick={onMenu}
      >
        <DsIcon name="grid" size={18} />
      </button>
      <nav className="crumbs" aria-label="Breadcrumb">
        <ol>
          {parts.map((p, i) => (
            <li key={`${p}-${i}`} className={i === parts.length - 1 ? "is-current" : undefined}>
              {i === parts.length - 1 ? <b>{p}</b> : p}
            </li>
          ))}
        </ol>
      </nav>
      <div className="jd-top-actions">
        <div className="jd-top-build">
          <DeploymentInfo variant="header" />
        </div>
        <button
          type="button"
          className="jd-icon-btn"
          aria-label="Alert settings"
          title="Alert settings"
          onClick={() => navigate("/admin-notification-settings")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9" />
            <path d="M10 21a2 2 0 0 0 4 0" />
          </svg>
        </button>
        <div className="jd-account" ref={menuRef}>
          <button
            type="button"
            className="jd-account__btn"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Account menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="av">{initials(profile)}</span>
            <span className="jd-account__meta">
              <b>{displayName(profile)}</b>
              <small>{profile?.roleLabel || "Administrator"}</small>
            </span>
            <span className={`jd-account__chev${menuOpen ? " is-open" : ""}`}>
              <DsIcon name="chev" size={16} />
            </span>
          </button>
          {menuOpen ? (
            <div className="jd-account__menu" role="menu">
              {profile?.email ? (
                <p className="jd-account__email">{profile.email}</p>
              ) : null}
              <button type="button" role="menuitem" onClick={handleLogout}>
                <DsIcon name="logout" size={16} />
                Log out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
