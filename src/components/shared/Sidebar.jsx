import { memo, useEffect, useRef, useState } from "react";
import { useSelector, useDispatch, shallowEqual } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  useMediaQuery,
  IconButton,
} from "@mui/material";
import {
  bottomMenuItem,
  getInitialSubmenuOpen,
  sidebarList,
} from "./constants";
import {
  TbChevronUp,
  TbChevronDown,
  TbMenu2,
  TbChevronRight,
  TbChevronLeft,
} from "../../shared/icons/index";
import { breakPoints, sidebarHide } from "../../shared/constants";
import { toggleSidebar } from "../../store/slices/uiSlice";
import useToaster from "../ui/Toaster";
import { useGetOrdersCountQuery } from "../../store/services/api";

function Sidebar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { success } = useToaster();
  const open = useSelector((state) => state.ui.sidebarOpen, shallowEqual);
  const [submenuOpen, setSubmenuOpen] = useState(getInitialSubmenuOpen);
  const [hoverItem, setHoverItem] = useState({
    position: null,
    list: null,
    isOverflowing: false,
    menuHeight: 0,
    prevent: null,
  });

  const isSidebarhide = useMediaQuery(sidebarHide);
  const isDesktop = useMediaQuery(breakPoints.desktop);

  // Fetch order counts
  const { data: orderCountsData } = useGetOrdersCountQuery();

  // Get order count for a specific menu item label
  const getOrderCount = (label) => {
    if (!orderCountsData?.data) return 0;

    const counts = orderCountsData.data;

    switch (label) {
      case "All Order":
        return counts.allOrderCount || 0;
      case "Complete":
        return counts.completedOrders || 0;
      case "Pending":
        return counts.pendingOrders || 0;
      case "Cancelled":
        return counts.cancelledOrders || 0;
      case "On hold":
        return counts.onHoldOrders || 0;
      default:
        return 0;
    }
  };

  const handleToggleSidebar = () => dispatch(toggleSidebar());

  const isParentActive = (item) => {
    if (!item.children) return false;
    return item.children.some((child) => location.pathname === child.path);
  };

  const handleNavigation = (path) => {
    if (path) {
      navigate(path);
    }
  };

  const toggleSubmenu = (label) => {
    setSubmenuOpen((prev) => ({ ...prev, [label]: !prev[label] }));

    console.log("clicked   ", label);
  };

  const handleHoverIn = (e, item) => {
    if (open) return false;

    const rect = e.currentTarget.getBoundingClientRect();
    const estimatedMenuHeight = item.children
      ? item.children.length * 56 + 16
      : 64;
    const spaceBelow = window.innerHeight - rect.top;
    const shouldFlipUp = spaceBelow < estimatedMenuHeight;

    setHoverItem({
      position: rect,
      list: item,
      isOverflowing: shouldFlipUp,
      menuHeight: estimatedMenuHeight,
    });
  };

  const timeoutRef = useRef(null);

  const handleHoverOut = () => {
    if (hoverItem.prevent || open) return null;

    if (hoverItem?.list?.children) {
      timeoutRef.current = setTimeout(() => {
        setHoverItem({
          position: null,
          list: null,
          isOverflowing: false,
          menuHeight: 0,
        });
      }, 200);
    } else {
      setHoverItem({
        position: null,
        list: null,
        isOverflowing: false,
        menuHeight: 0,
      });
    }
  };

  const handleMenuMouseEnterList = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (hoverItem.list.children) {
      setHoverItem({
        ...hoverItem,
        prevent: true,
      });
    }
  };

  const handleMenuMouseLeaveList = () => {
    setHoverItem({
      position: null,
      list: null,
      isOverflowing: false,
      menuHeight: 0,
      prevent: null,
    });
  };

  useEffect(() => {
    sidebarList.forEach((item) => {
      if (
        item.children &&
        item.children.some((child) => location.pathname === child.path)
      ) {
        setSubmenuOpen((prev) => ({ ...prev, [item.label]: true }));
      }
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return (
    <Box position={"relative"}>
      <Drawer
        variant={isSidebarhide ? "temporary" : "permanent"}
        anchor={isSidebarhide ? "bottom" : "left"}
        open={open}
        onClose={handleToggleSidebar}
        sx={{
          "& .MuiDrawer-paper": {
            width: isSidebarhide
              ? "100%"
              : open
                ? isDesktop
                  ? "320px"
                  : "280px"
                : "80px",
            height: isSidebarhide
              ? "100vh"
              : `calc(100vh - ${isDesktop ? "197px" : "176px"})`,
            transition: "width 0.3s ease",
            overflowX: "hidden",
            bgcolor: "grey.10",
            borderRight: "1px solid rgba(0, 0, 0, 0.20)",
            top: isSidebarhide ? "0" : isDesktop ? "80px" : "60px",
            fontFamily: "Inter, sans-serif",
          },
        }}
        PaperProps={{
          className: "custom-scrollbar",
        }}
      >
        <Box mt="5px" px={isDesktop ? (open ? "20px" : "10px") : "12px"}>
          {isSidebarhide && (
            <Box
              width="100%"
              height={isDesktop ? "80px" : "60px"}
              bgcolor="grey.10"
              display="flex"
              alignItems="center"
              borderBottom="1px solid rgba(0, 0, 0, 0.20)"
            >
              <Box
                width="100%"
                container
                display={"flex"}
                alignItems="center"
                justifyContent={"space-between"}
                px={"10px"}
              >
                <Box
                  height={isDesktop ? "59px" : "45px"}
                // width={isDesktop ? "320px" : "200px"}
                >
                  <img
                    className="w-full h-full object-contain"
                    src="/images/logo.png"
                    alt="Logo"
                  />
                </Box>

                <IconButton onClick={handleToggleSidebar}>
                  <TbMenu2 size="24px" />
                </IconButton>
              </Box>
            </Box>
          )}

          <List>
            {sidebarList.map((item) => (
              <div key={item.label}>
                <ListItemButton
                  onClick={() =>
                    item.children
                      ? toggleSubmenu(item.label)
                      : handleNavigation(item.path)
                  }
                  onMouseEnter={(e) => handleHoverIn(e, item)}
                  onMouseLeave={(e) => handleHoverOut(e)}
                  selected={
                    location.pathname === item.path || isParentActive(item)
                  }
                  sx={{
                    transition: "none !important",
                    color: "#8F95B2",
                    borderRadius: "12px",
                    mb: 1,
                    height: "48px",
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: open ? "flex-start" : "center",
                    px: open ? 2 : 0,
                    "&.Mui-selected": {
                      bgcolor: "#0000A0",
                      color: "white",
                      "& .MuiListItemIcon-root, & .MuiListItemText-primary": {
                        color: "white",
                      },
                    },
                    "&.Mui-selected:hover": {
                      bgcolor: "#00008B",
                    },
                    "&:hover": {
                      bgcolor: "#000099",
                      color: "#fff",
                      "& .MuiListItemIcon-root, & .MuiListItemText-primary": {
                        color: "white",
                      },
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: "unset",
                      mr: open ? "8px" : 0,
                      color: "inherit",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: open ? "flex-start" : "center",
                      width: open ? "auto" : "100%",
                      position: open ? "relative" : "absolute",
                      left: open ? "auto" : "50%",
                      transform: open ? "none" : "translateX(-50%)",
                    }}
                  >
                    {<item.Icon size={item.size} />}
                  </ListItemIcon>
                  {open && (
                    <>
                      <ListItemText
                        primary={item.label}
                        slotProps={{
                          primary: { variant: "body1", color: "grey.20" },
                        }}
                      />
                      {item.children &&
                        (submenuOpen[item.label] ? (
                          <TbChevronUp size="20px" />
                        ) : (
                          <TbChevronDown size="20px" />
                        ))}
                    </>
                  )}
                </ListItemButton>

                {item.children && (
                  <Collapse
                    in={submenuOpen[item.label] && open}
                    timeout="auto"
                    unmountOnExit
                  >
                    <List component="div" disablePadding sx={{ mb: 1 }}>
                      {item.children.map((sub) => (
                        <ListItemButton
                          key={sub.label}
                          onClick={() => handleNavigation(sub.path)}
                          selected={location.pathname === sub.path}
                          sx={{
                            transition: "none !important",
                            pl: 2,
                            pr: 2,
                            mb: 1,
                            borderRadius: "12px",
                            height: "40px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            "&.Mui-selected": {
                              bgcolor: "#00009933",
                              color: "#000099",
                              "& .MuiListItemIcon-root, & .MuiListItemText-primary":
                              {
                                color: "#000099",
                              },
                              "& .badge": {
                                bgcolor: "#00008B",
                                color: "white",
                              },
                            },
                            "&.Mui-selected:hover": {
                              bgcolor: "#00009933",
                              color: "#000099",
                              "& .MuiListItemIcon-root, & .MuiListItemText-primary":
                              {
                                color: "#000099",
                              },
                              "& .badge": {
                                bgcolor: "#00008B",
                                color: "white",
                              },
                            },
                            "&:hover": {
                              bgcolor: "#00009933",
                              color: "#000099",
                              "& .MuiListItemIcon-root, & .MuiListItemText-primary":
                              {
                                color: "#000099",
                              },
                              "& .badge": {
                                bgcolor: "#00008B",
                                color: "white",
                              },
                            },
                          }}
                        >
                          <Box display="flex" alignItems="center">
                            <ListItemIcon
                              sx={{
                                minWidth: "unset",
                                mr: open ? "8px" : 0,
                                color: "grey.20",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: open ? "flex-start" : "center",
                                width: open ? "auto" : "100%",
                                position: open ? "relative" : "absolute",
                                left: open ? "auto" : "50%",
                                transform: open ? "none" : "translateX(-50%)",
                              }}
                            >
                              {sub.Icon && <sub.Icon size={sub.size} />}
                            </ListItemIcon>

                            <ListItemText
                              primary={sub.label}
                              slotProps={{
                                primary: { variant: "body1", color: "grey.20" },
                              }}
                            />
                          </Box>

                          {item.label === "Order Management" && (
                            <Box
                              component="span"
                              width="24px"
                              height="24px"
                              borderRadius="100%"
                              bgcolor="grey.700"
                              color="white"
                              display="flex"
                              alignItems="center"
                              justifyContent="center"
                              fontSize="12px"
                              className="badge"
                            >
                              {getOrderCount(sub.label)}
                            </Box>
                          )}
                        </ListItemButton>
                      ))}
                    </List>
                  </Collapse>
                )}
              </div>
            ))}
          </List>
        </Box>

        {/* -------- Bottom Menu -------- */}
        <Box
          px={isDesktop ? (open ? "20px" : "10px") : "12px"}
          pb="5px"
          position={!isSidebarhide ? "fixed" : "relative"}
          bottom={0}
          bgcolor={"white"}
          width={
            isSidebarhide
              ? "100%"
              : open
                ? isDesktop
                  ? "320px"
                  : "280px"
                : "80px"
          }
          borderRight={"1px solid rgba(0, 0, 0, 0.20)"}
          sx={{
            transition: "width 0.3s ease",
          }}
        >
          <List>
            {bottomMenuItem.map((item) => {
              return (
                <ListItemButton
                  key={item.label}
                  onClick={() => {
                    if (item.label === "Logout") {
                      document.cookie =
                        "accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                      success("Logged out successfully");
                      navigate(item.path);
                    } else {
                      handleNavigation(item.path);
                    }
                  }}
                  onMouseEnter={(e) => handleHoverIn(e, item)}
                  onMouseLeave={(e) => handleHoverOut(e)}
                  selected={location.pathname === item.path}
                  sx={{
                    transition: "none !important",
                    color: "#8F95B2",
                    borderRadius: "12px",
                    height: "48px",
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: open ? "flex-start" : "center",
                    px: open ? 2 : 0,
                    "&:hover": {
                      bgcolor: "#000099",
                      color: "white",
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: "unset",
                      mr: open ? "8px" : 0,
                      color: "inherit",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: open ? "flex-start" : "center",
                      width: open ? "auto" : "100%",
                      position: open ? "relative" : "absolute",
                      left: open ? "auto" : "50%",
                      transform: open ? "none" : "translateX(-50%)",
                    }}
                  >
                    {<item.Icon size={item.size} />}
                  </ListItemIcon>
                  {open && <ListItemText primary={item.label} />}
                </ListItemButton>
              );
            })}
          </List>
        </Box>
      </Drawer>

      {!isSidebarhide && (
        <Box
          position="fixed"
          top={isDesktop ? "100px" : "80px"}
          left={open ? (isDesktop ? "320px" : "275px") : "80px"}
          zIndex={1200}
          width="24px"
          height="24px"
          borderRadius="50%"
          display="flex"
          justifyContent="center"
          alignItems="center"
          bgcolor="blue.100"
          onClick={handleToggleSidebar}
          sx={{
            transform: "translateX(-50%)",
            cursor: "pointer",
            transition: "all 0.3s ease",
          }}
        >
          <IconButton>
            {open ? (
              <TbChevronLeft color="white" size={"16px"} />
            ) : (
              <TbChevronRight color="white" size={"16px"} />
            )}
          </IconButton>
        </Box>
      )
      }

      {
        !open && hoverItem.position && (
          <Box
            fontFamily={"Inter"}
            fontWeight={500}
            position="fixed"
            left={hoverItem.position.right + 8}
            top={
              hoverItem.isOverflowing
                ? Math.max(10, window.innerHeight - hoverItem.menuHeight - 10)
                : hoverItem.position.top
            }
            bgcolor="white"
            borderRadius="12px"
            boxShadow="0 4px 12px rgba(0, 0, 0, 0.15)"
            border="1px solid rgba(0, 0, 0, 0.1)"
            minWidth="200px"
            py={1}
            zIndex={1300}
            onMouseEnter={handleMenuMouseEnterList}
            onMouseLeave={handleMenuMouseLeaveList}
          >
            {hoverItem.list.children ? (
              hoverItem.list.children.map((child) => (
                <Box
                  key={child.label}
                  px={2}
                  py={1.5}
                  display="flex"
                  alignItems="center"
                  color="#8F95B2"
                  sx={{
                    cursor: "pointer",
                    "&:hover": {
                      bgcolor: "#000099",
                      color: "white",
                    },
                  }}
                  onClick={() => {
                    navigate(child.path);
                    handleMenuMouseLeaveList();
                  }}
                >
                  {child.Icon && (
                    <Box mr={1} display="flex" alignItems="center">
                      <child.Icon size={child.size || "20px"} />
                    </Box>
                  )}
                  {child.label}
                </Box>
              ))
            ) : (
              <Box
                px={2}
                py={1.5}
                display="flex"
                alignItems="center"
                color="#8F95B2"
                sx={{
                  cursor: "pointer",
                  "&:hover": {
                    bgcolor: "#000099",
                    color: "white",
                  },
                }}
                onClick={() => {
                  console.log(`Clicked: ${hoverItem.list.label}`);
                  handleHoverOut();
                }}
              >
                {hoverItem.list.Icon && (
                  <Box mr={1} display="flex" alignItems="center">
                    <hoverItem.list.Icon size={hoverItem.list.size || "20px"} />
                  </Box>
                )}
                {hoverItem.list.label}
              </Box>
            )}
          </Box>
        )
      }
    </Box >
  );
}

export default memo(Sidebar);
