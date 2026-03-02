import { useEffect, useMemo, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Box, IconButton, Typography } from "@mui/material";
import { FiSearch, TbX } from "../../shared/icons/index";
import {
  setSearchValue,
  clearSearch,
  addToHistory,
} from "../../store/slices/searchSlice";
import { sidebarList } from "../shared/constants";

export default function SearchBar({ isDesktop }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { searchValue } = useSelector((state) => state.search);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapperRef = useRef(null);

  const searchableItems = useMemo(() => {
    return sidebarList.flatMap((item) => {
      const hasChildren = Array.isArray(item.children) && item.children.length > 0;
      const defaultPath = hasChildren
        ? item.path === "/orders"
          ? item.children[0].path
          : item.path
        : item.path;

      const tabItem = {
        id: `tab-${item.label}`,
        label: item.label,
        parentLabel: "",
        path: defaultPath,
        type: "tab",
        keywords: `${item.label} ${(item.children || [])
          .map((child) => child.label)
          .join(" ")}`.toLowerCase(),
      };

      const subTabItems = (item.children || []).map((child) => ({
        id: `sub-${item.label}-${child.label}`,
        label: child.label,
        parentLabel: item.label,
        path: child.path,
        type: "subtab",
        keywords: `${item.label} ${child.label}`.toLowerCase(),
      }));

      return [tabItem, ...subTabItems];
    });
  }, []);

  const filteredItems = useMemo(() => {
    const query = (searchValue || "").trim().toLowerCase();
    if (!query) return searchableItems.slice(0, 8);

    const matched = searchableItems.filter((item) => item.keywords.includes(query));
    return matched
      .sort((a, b) => {
        const aStarts = a.label.toLowerCase().startsWith(query) ? 1 : 0;
        const bStarts = b.label.toLowerCase().startsWith(query) ? 1 : 0;
        if (aStarts !== bStarts) return bStarts - aStarts;

        const aParentStarts = a.parentLabel.toLowerCase().startsWith(query) ? 1 : 0;
        const bParentStarts = b.parentLabel.toLowerCase().startsWith(query) ? 1 : 0;
        if (aParentStarts !== bParentStarts) return bParentStarts - aParentStarts;

        return a.label.localeCompare(b.label);
      })
      .slice(0, 10);
  }, [searchValue, searchableItems]);

  useEffect(() => {
    setActiveIndex(0);
  }, [searchValue]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNavigate = (item) => {
    if (!item?.path) return;
    dispatch(setSearchValue(item.label));
    dispatch(addToHistory(item.label));
    navigate(item.path);
    setIsOpen(false);
  };

  const handleSearchChange = (event) => {
    dispatch(setSearchValue(event.target.value));
    setIsOpen(true);
  };

  const handleSearchSubmit = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!isOpen) setIsOpen(true);
      setActiveIndex((prev) =>
        filteredItems.length ? (prev + 1) % filteredItems.length : 0
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) setIsOpen(true);
      setActiveIndex((prev) =>
        filteredItems.length ? (prev - 1 + filteredItems.length) % filteredItems.length : 0
      );
      return;
    }

    if (event.key === "Escape") {
      setIsOpen(false);
      return;
    }

    if (event.key === "Enter" && searchValue.trim()) {
      event.preventDefault();
      const selected = filteredItems[activeIndex] || filteredItems[0];
      if (selected) {
        handleNavigate(selected);
      } else {
        dispatch(addToHistory(searchValue.trim()));
      }
    }
  };

  const handleClearSearch = () => {
    dispatch(clearSearch());
    setIsOpen(false);
  };

  return (
    <Box
      ref={wrapperRef}
      position="relative"
      display="flex"
      alignItems="center"
      px={"16px"}
      height={isDesktop ? "52px" : "45px"}
      width="360px"
      borderRadius="4px"
      bgcolor="grey.60"
      fontFamily="inter"
    >
      <span>
        <FiSearch size={"22px"} />
      </span>
      <input
        className="w-full h-full !pl-3 outline-none"
        type="search"
        placeholder="Search..."
        value={searchValue}
        onChange={handleSearchChange}
        onKeyDown={handleSearchSubmit}
        onFocus={() => setIsOpen(true)}
      />
      {searchValue && (
        <IconButton onClick={handleClearSearch}>
          <TbX size={"16px"} />
        </IconButton>
      )}

      {isOpen && (
        <Box
          position="absolute"
          top="calc(100% + 8px)"
          left={0}
          right={0}
          bgcolor="white"
          border="1px solid #E5E7EB"
          borderRadius="8px"
          boxShadow="0 8px 24px rgba(0,0,0,0.12)"
          maxHeight="320px"
          overflow="auto"
          zIndex={200}
        >
          {filteredItems.length === 0 ? (
            <Box px={2} py={1.5}>
              <Typography variant="body2" color="grey.500">
                No tabs found
              </Typography>
            </Box>
          ) : (
            filteredItems.map((item, index) => (
              <Box
                key={item.id}
                px={2}
                py={1.5}
                sx={{
                  cursor: "pointer",
                  backgroundColor: index === activeIndex ? "#F3F4F6" : "transparent",
                  "&:hover": { backgroundColor: "#F3F4F6" },
                }}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => handleNavigate(item)}
              >
                <Typography variant="body2" sx={{ fontWeight: 600, color: "grey.900" }}>
                  {item.label}
                </Typography>
                {item.parentLabel ? (
                  <Typography variant="caption" sx={{ color: "grey.500" }}>
                    {item.parentLabel}
                  </Typography>
                ) : (
                  <Typography variant="caption" sx={{ color: "grey.500" }}>
                    Tab
                  </Typography>
                )}
              </Box>
            ))
          )}
        </Box>
      )}
    </Box>
  );
}
