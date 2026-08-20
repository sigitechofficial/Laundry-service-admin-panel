import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { toggleSidebar } from "../../store/slices/uiSlice";
import {
  useAdminLogoutMutation,
  useGetOrdersCountQuery,
} from "../../store/services/api";
import {
  clearAuthTokens,
  getEmployeePermissions,
  getUserProfile,
  isEmployeePermissionSession,
  setActiveEmployeeFeatureId,
} from "../../utilities/authStorage";
import {
  getAllowedFeatureKeysFromPermissions,
  resolveEmployeeFeatureIdForPathname,
} from "../../utilities/employeeFeatureAccess";
import { labelToFeatureKey } from "../../components/shared/constants";
import { DS_NAV, DOT_COLOR, childMatchesPath, isGroupOpenPath, itemMatchesPath } from "../nav";
import DsIcon from "../icons";
import useToaster from "../../components/ui/Toaster";

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

function isMacPlatform() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgentData?.platform || navigator.platform || "";
  return /mac/i.test(ua);
}

/** Full order totals — never clamp to 99+. */
function formatBadgeCount(n) {
  const value = Number(n);
  if (!Number.isFinite(value) || value <= 0) return "";
  return Math.trunc(value).toLocaleString("en-GB");
}

export default function DsSidebar({ collapsed, onToggle, mobileOpen, searchRef }) {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { success, error } = useToaster();
  const [adminLogout] = useAdminLogoutMutation();
  const [query, setQuery] = useState("");
  const [openGroups, setOpenGroups] = useState({});
  const [fly, setFly] = useState(null);
  const flyRef = useRef(null);
  const searchKbd = isMacPlatform() ? "⌘K" : "Ctrl+K";

  const { data: orderCountsData } = useGetOrdersCountQuery(undefined, {
    refetchOnMountOrArgChange: 60,
  });
  const counts = orderCountsData?.data || {};

  const profile = getUserProfile();

  const allowed = useMemo(() => {
    if (!isEmployeePermissionSession()) return null;
    return getAllowedFeatureKeysFromPermissions(getEmployeePermissions());
  }, []);

  const nav = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DS_NAV.map((sec) => {
      const items = sec.items
        .filter((item) => !allowed || allowed.has(labelToFeatureKey(item.label)))
        .map((item) => {
          if (!q) return item;
          const self = item.label.toLowerCase().includes(q);
          const children = (item.children || []).filter((c) =>
            c.label.toLowerCase().includes(q)
          );
          if (self) return item;
          if (children.length) return { ...item, children };
          return null;
        })
        .filter(Boolean);
      const secHit = !q || sec.section.toLowerCase().includes(q) || items.length;
      return secHit && items.length ? { ...sec, items } : null;
    }).filter(Boolean);
  }, [allowed, query]);

  useEffect(() => {
    const next = {};
    DS_NAV.forEach((sec) => {
      sec.items.forEach((item) => {
        if (item.children && isGroupOpenPath(item, location.pathname)) {
          next[item.label] = true;
        }
      });
    });
    setOpenGroups((prev) => ({ ...prev, ...next }));
  }, [location.pathname]);

  useEffect(() => {
    if (!isEmployeePermissionSession()) {
      setActiveEmployeeFeatureId(null);
      return;
    }
    setActiveEmployeeFeatureId(resolveEmployeeFeatureIdForPathname(location.pathname));
  }, [location.pathname]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef?.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchRef]);

  useEffect(() => {
    if (!collapsed) setFly(null);
  }, [collapsed]);

  useEffect(() => {
    if (!fly) return undefined;
    const onDoc = (e) => {
      if (flyRef.current && !flyRef.current.contains(e.target)) setFly(null);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setFly(null);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [fly]);

  function go(path) {
    if (!path) return;
    setFly(null);
    navigate(path);
    if (mobileOpen) dispatch(toggleSidebar());
  }

  function toggleGroup(item, el) {
    if (collapsed) {
      const r = el.getBoundingClientRect();
      setFly({ item, top: r.top, left: r.right + 12 });
      return;
    }
    setOpenGroups((p) => ({ ...p, [item.label]: !p[item.label] }));
  }

  function countFor(child) {
    if (!child.countKey) return undefined;
    return counts[child.countKey] || 0;
  }

  async function handleLogout() {
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
    <>
      <aside className="jd-side" aria-label="Application sidebar">
        <div className="jd-brand">
          <img
            className="jd-brand__logo"
            src="/images/logo.png"
            alt="Just Dry Cleaners"
          />
          <button type="button" className="jd-col" aria-label="Collapse sidebar" onClick={onToggle}>
            <DsIcon name="chev" size={15} />
          </button>
        </div>

        <div className="jd-search">
          <div className="box">
            <DsIcon name="search" size={18} />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              aria-label="Search navigation"
            />
            <span className="kbd">{searchKbd}</span>
          </div>
        </div>

        <nav className="jd-nav" aria-label="Admin">
          {nav.map((sec) => (
            <div className="jd-nav-sec" key={sec.section}>
              <div className="jd-sec">{sec.section}</div>
              {sec.items.map((item) => {
                const active = item.children
                  ? isGroupOpenPath(item, location.pathname)
                  : itemMatchesPath(item, location.pathname);
                const opened = !!openGroups[item.label] || !!query;
                if (item.children) {
                  return (
                    <div key={item.label}>
                      <button
                        type="button"
                        className={`jd-item${active ? " active" : ""}${opened ? " open" : ""}`}
                        onClick={(e) => toggleGroup(item, e.currentTarget)}
                        title={item.label}
                        aria-expanded={opened}
                      >
                        <span className="ic">
                          <DsIcon name={item.icon} />
                        </span>
                        <span className="lbl">{item.label}</span>
                        <span className="caret">
                          <DsIcon name="chev" size={16} />
                        </span>
                      </button>
                      <div className={`jd-subs${opened && !collapsed ? " open" : ""}`}>
                        <div className="jd-subwrap">
                          {item.children.map((child) => {
                            const n = countFor(child);
                            const on = childMatchesPath(child, location.pathname);
                            return (
                              <button
                                key={child.path}
                                type="button"
                                className={`jd-sub${on ? " on" : ""}`}
                                onClick={() => go(child.path)}
                                aria-current={on ? "page" : undefined}
                              >
                                {child.dot ? (
                                  <span className="jd-dot" style={{ background: DOT_COLOR[child.dot] }} />
                                ) : (
                                  <span className="jd-dot" style={{ background: "var(--n-300)" }} />
                                )}
                                <span className="lbl">{child.label}</span>
                                {n ? (
                                  <span className={`jd-count${child.hot ? " hot" : ""}`}>{formatBadgeCount(n)}</span>
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                }
                return (
                  <button
                    key={item.path}
                    type="button"
                    className={`jd-item${active ? " active" : ""}`}
                    onClick={() => go(item.path)}
                    title={item.label}
                    aria-current={active ? "page" : undefined}
                  >
                    <span className="ic">
                      <DsIcon name={item.icon} />
                    </span>
                    <span className="lbl">{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="jd-foot">
          <div className="jd-profile">
            <div className="av">{initials(profile)}</div>
            <div className="pi">
              <b>{displayName(profile)}</b>
              <span>{profile?.roleLabel || "Administrator"}</span>
            </div>
            <div className="jd-pact">
              <button type="button" aria-label="Log out" title="Log out" onClick={handleLogout}>
                <DsIcon name="logout" size={18} />
              </button>
            </div>
          </div>
          <button type="button" className="jd-priv" onClick={() => go("/privacy-policy")}>
            Privacy Policy
          </button>
        </div>
      </aside>

      {fly ? (
        <div
          ref={flyRef}
          className="jd-ds jd-fly"
          style={{ top: Math.max(12, fly.top), left: fly.left }}
          role="menu"
        >
          <div className="jd-sec" style={{ paddingTop: 4 }}>
            {fly.item.label}
          </div>
          {(fly.item.children || []).map((child) => {
            const n = countFor(child);
            return (
              <button
                key={child.path}
                type="button"
                className={`jd-sub${childMatchesPath(child, location.pathname) ? " on" : ""}`}
                onClick={() => go(child.path)}
                role="menuitem"
              >
                <span className="lbl">{child.label}</span>
                {n ? (
                  <span className={`jd-count${child.hot ? " hot" : ""}`}>{formatBadgeCount(n)}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </>
  );
}
