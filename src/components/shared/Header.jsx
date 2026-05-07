import { useState } from "react";
import {
  Box,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { TbLogout } from "react-icons/tb";
import {
  VscBellDot,
  AiOutlineUser,
  TbChevronDown,
  TbMenu2,
} from "../../shared/icons/index";
import { breakPoints, sidebarHide } from "../../shared/constants";
import { useDispatch } from "react-redux";
import { toggleSidebar } from "../../store/slices/uiSlice";
import { clearAuthTokens, getUserProfile } from "../../utilities/authStorage";
import useToaster from "../ui/Toaster";

function displayNameFromProfile(profile) {
  const full = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim();
  if (full) return full;
  if (profile?.email) return profile.email;
  return "User";
}

function initialsFromProfile(profile) {
  const f = profile?.firstName?.[0];
  const l = profile?.lastName?.[0];
  if (f && l) return `${f}${l}`.toUpperCase();
  if (f) return f.toUpperCase();
  if (profile?.email?.[0]) return profile.email[0].toUpperCase();
  return "";
}

export default function Header() {
  const isDesktop = useMediaQuery(breakPoints.desktop);
  const isFullWidth = useMediaQuery(sidebarHide);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { success } = useToaster();

  const [menuAnchor, setMenuAnchor] = useState(null);
  const menuOpen = Boolean(menuAnchor);

  const profile = getUserProfile();

  const handleToggleSidebar = () => dispatch(toggleSidebar());

  const openMenu = (event) => setMenuAnchor(event.currentTarget);
  const closeMenu = () => setMenuAnchor(null);

  const handleLogout = () => {
    closeMenu();
    document.cookie =
      "accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    clearAuthTokens();
    localStorage.removeItem("login_status");
    success("Logged out successfully");
    navigate("/auth/login");
  };

  const displayName = displayNameFromProfile(profile);
  const roleLabel = profile?.roleLabel ?? "Admin";
  const initials = initialsFromProfile(profile);

  const userMenu = (
    <Menu
      anchorEl={menuAnchor}
      open={menuOpen}
      onClose={closeMenu}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      transformOrigin={{ vertical: "top", horizontal: "right" }}
      slotProps={{
        paper: {
          sx: { minWidth: 200, mt: 1, borderRadius: "12px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" },
        },
      }}
    >
      {profile?.email ? (
        <MenuItem
          disabled
          dense
          sx={{
            opacity: "1 !important",
            color: "text.secondary",
            whiteSpace: "normal",
            fontSize: 12,
            py: 1,
          }}
        >
          {profile.email}
        </MenuItem>
      ) : null}
      <MenuItem onClick={handleLogout} sx={{ fontFamily: "Switzer", fontSize: 14 }}>
        <ListItemIcon sx={{ minWidth: 36 }}>
          <TbLogout size={20} />
        </ListItemIcon>
        Logout
      </MenuItem>
    </Menu>
  );

  const userTriggerDesktop = (
    <Box
      onClick={openMenu}
      display="flex"
      alignItems="center"
      gap="10px"
      sx={{ cursor: "pointer", borderRadius: "12px", pr: 0.5, "&:hover": { bgcolor: "rgba(0,0,0,0.04)" } }}
    >
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        width={40}
        height={40}
        borderRadius="100%"
        bgcolor="blue.300"
      >
        {initials ? (
          <Typography variant="body2" fontWeight={700} color="white" fontFamily="Switzer">
            {initials}
          </Typography>
        ) : (
          <AiOutlineUser size={24} color="white" />
        )}
      </Box>

      <Box>
        <Typography variant="body1" color="black" fontWeight={600} fontFamily="Switzer">
          {displayName}
        </Typography>
        <Typography variant="subtitle2" color="grey.20" pt="3px" fontFamily="Switzer">
          {roleLabel}
        </Typography>
      </Box>

      <IconButton size="small" aria-label="Open account menu" onClick={(e) => { e.stopPropagation(); openMenu(e); }}>
        <TbChevronDown size={22} />
      </IconButton>
    </Box>
  );

  return (
    <Box
      position="fixed"
      zIndex={1100}
      width="100%"
      height={isDesktop ? "80px" : "60px"}
      bgcolor="grey.10"
      display="flex"
      alignItems="center"
      borderBottom="1px solid rgba(0, 0, 0, 0.20)"
    >
      <Box width="100%" display="flex" alignItems="center" justifyContent="space-between">
        <Box height={isDesktop ? "59px" : "45px"} width={isDesktop ? "320px" : "280px"}>
          <img className="w-full h-full object-contain" src="/images/logo.png" alt="" />
        </Box>

        {!isFullWidth ? (
          <Box display="flex" justifyContent="flex-end" alignItems="center" gap="16px" pr="60px">
            <Box display="flex" alignItems="center">
              <IconButton aria-label="Notifications">
                <VscBellDot size="24px" color="black" />
              </IconButton>
            </Box>

            {userTriggerDesktop}
            {userMenu}
          </Box>
        ) : (
          <Box display="flex" alignItems="center" gap={1} className="!mr-14">
            <IconButton aria-label="Account menu" onClick={openMenu} size="small">
              <Box
                display="flex"
                alignItems="center"
                justifyContent="center"
                width={36}
                height={36}
                borderRadius="100%"
                bgcolor="blue.300"
              >
                {initials ? (
                  <Typography variant="caption" fontWeight={700} color="white" fontFamily="Switzer">
                    {initials}
                  </Typography>
                ) : (
                  <AiOutlineUser size={20} color="white" />
                )}
              </Box>
            </IconButton>
            {userMenu}
            <IconButton onClick={handleToggleSidebar} aria-label="Open menu">
              <TbMenu2 size="24px" />
            </IconButton>
          </Box>
        )}
      </Box>
    </Box>
  );
}
