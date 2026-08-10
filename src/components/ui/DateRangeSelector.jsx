import { useState, useRef, memo } from "react";
import {
  Box,
  Button,
  Menu,
  MenuItem,
  Typography,
  Popover,
  TextField,
  IconButton,
} from "@mui/material";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import {
  TbCalendar,
  TbChevronDown,
  TbChevronLeft,
  TbChevronRight,
} from "../../shared/icons/index";
import { calculateDateRange, DATE_RANGE_OPTIONS } from "./constants";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const DateRangeSelector = ({
  value,
  onChange,
  placeholder = "Select Date Range",
  className = "",
  disabled = false,
  bgColor = "white",
  border = "1px solid #D0D5DD",
  boxShadow = "0px 1px 2px rgba(16, 24, 40, 0.08)",
}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [dateRangeAnchorEl, setDateRangeAnchorEl] = useState(null);
  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);
  const [selectingStart, setSelectingStart] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const buttonRef = useRef(null);

  const open = Boolean(anchorEl);
  const dateRangeOpen = Boolean(dateRangeAnchorEl);

  const handleClick = (event) => {
    if (!disabled) {
      setAnchorEl(event.currentTarget);
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleOptionSelect = (option) => {
    if (option === "allTime") {
      if (onChange) onChange(null);
      handleClose();
      return;
    }
    if (option === "custom") {
      setDateRangeAnchorEl(buttonRef.current);
      setSelectingStart(true);
      setCustomStartDate(null);
      setCustomEndDate(null);
      handleClose();
    } else {
      const dateRange = calculateDateRange(option);
      if (dateRange && onChange) {
        onChange({
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          label: dateRange.label,
          type: option,
        });
      }
      handleClose();
    }
  };

  const handleDateRangeClose = () => {
    setDateRangeAnchorEl(null);
    setCustomStartDate(null);
    setCustomEndDate(null);
    setSelectingStart(true);
  };

  const handleDateClick = (date) => {
    if (selectingStart) {
      setCustomStartDate(date);
      setSelectingStart(false);
      setCustomEndDate(null);
    } else {
      if (date.isBefore(customStartDate)) {
        // If end date is before start date, swap them
        setCustomEndDate(customStartDate);
        setCustomStartDate(date);
      } else {
        setCustomEndDate(date);
      }

      // Apply the range
      const startDate = date.isBefore(customStartDate) ? date : customStartDate;
      const endDate = date.isBefore(customStartDate) ? customStartDate : date;

      if (onChange) {
        onChange({
          startDate: startDate.startOf("day"),
          endDate: endDate.endOf("day"),
          label: `${startDate.format("MMM DD")} - ${endDate.format("MMM DD")}`,
          type: "custom",
        });
      }

      // Close after selection
      setTimeout(() => {
        handleDateRangeClose();
      }, 300);
    }
  };

  const shouldHighlightDate = (date) => {
    if (!customStartDate) return false;
    if (selectingStart) return date.isSame(customStartDate, "day");
    if (!customEndDate) return date.isSame(customStartDate, "day");

    const start = customStartDate.isBefore(customEndDate)
      ? customStartDate
      : customEndDate;
    const end = customStartDate.isBefore(customEndDate)
      ? customEndDate
      : customStartDate;

    return date.isSameOrAfter(start, "day") && date.isSameOrBefore(end, "day");
  };

  const getDateRangeString = () => {
    if (!customStartDate && !customEndDate) return "MM/DD/YYYY - MM/DD/YYYY";
    if (customStartDate && !customEndDate)
      return `${customStartDate.format("MM/DD/YYYY")} - MM/DD/YYYY`;
    if (customStartDate && customEndDate) {
      const start = customStartDate.isBefore(customEndDate)
        ? customStartDate
        : customEndDate;
      const end = customStartDate.isBefore(customEndDate)
        ? customEndDate
        : customStartDate;
      return `${start.format("MM/DD/YYYY")} - ${end.format("MM/DD/YYYY")}`;
    }
    return "MM/DD/YYYY - MM/DD/YYYY";
  };

  const displayText = value?.label || placeholder;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box className={className}>
        <Button
          ref={buttonRef}
          onClick={handleClick}
          disabled={disabled}
          variant="outlined"
          sx={{
            height: "44px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            px: 2,
            py: 1.5,
            borderRadius: "8px",
            border: border,
            color: "#000",
            bgcolor: bgColor,
            boxShadow: boxShadow,
            fontFamily: "Inter",
            textTransform: "none",
            padding: "10px 14px",
            fontSize: "14px",
            fontWeight: 500,
            minWidth: "200px",
            "&:hover": {
              bgcolor: "grey.50",
            },
          }}
        >
          <Box className="flex items-center gap-2">
            <Typography color="grey.400">
              <TbCalendar size="22px" />
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontFamily: "Inter, sans-serif",
                fontSize: "14px",
                fontWeight: 500,
                color: "#374151",
              }}
            >
              {displayText}
            </Typography>
          </Box>
          <TbChevronDown
            size="16px"
            style={{
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease",
            }}
          />
        </Button>

        {/* Dropdown Menu */}
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "left",
          }}
          transformOrigin={{
            vertical: "top",
            horizontal: "left",
          }}
          sx={{
            "& .MuiPaper-root": {
              borderRadius: "8px",
              border: "1px solid #E4E7EC",
              boxShadow: "0px 4px 16px rgba(0, 0, 0, 0.1)",
              mt: 1,
              minWidth: buttonRef.current?.offsetWidth || 200,
            },
          }}
        >
          {DATE_RANGE_OPTIONS.map((option) => (
            <MenuItem
              key={option.value}
              onClick={() => handleOptionSelect(option.value)}
              sx={{
                px: 2,
                py: 1.5,
                fontFamily: "Inter, sans-serif",
                fontSize: "14px",
                color: "#374151",
                "&:hover": {
                  backgroundColor: "#F3F4F6",
                },
                ...(option.value === "custom" && {
                  borderTop: "1px solid #E4E7EC",
                  mt: 1,
                }),
              }}
            >
              {option.label}
            </MenuItem>
          ))}
        </Menu>

        {/* Custom Date Range Popover */}
        <Popover
          open={dateRangeOpen}
          anchorEl={dateRangeAnchorEl}
          onClose={handleDateRangeClose}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "left",
          }}
          transformOrigin={{
            vertical: "top",
            horizontal: "left",
          }}
          sx={{
            "& .MuiPaper-root": {
              borderRadius: "12px",
              border: "1px solid #E4E7EC",
              boxShadow: "0px 4px 16px rgba(0, 0, 0, 0.1)",
              mt: 1,
              p: 2,
            },
          }}
        >
          <Box sx={{ minWidth: 650, p: 2 }}>
            {/* Date Range Input Display */}
            <Box sx={{ mb: 2 }}>
              <TextField
                value={getDateRangeString()}
                placeholder="MM/DD/YYYY - MM/DD/YYYY"
                fullWidth
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <TbCalendar size="20px" style={{ color: "#6B7280" }} />
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                    fontFamily: "Inter, sans-serif",
                    "& input": {
                      textAlign: "center",
                      color:
                        customStartDate || customEndDate
                          ? "#374151"
                          : "#9CA3AF",
                    },
                  },
                }}
              />
            </Box>

            {/* Dual Calendar View */}
            <Box sx={{ display: "flex", gap: 2 }}>
              {/* Left Calendar */}
              <Box>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <IconButton
                    onClick={() =>
                      setCurrentMonth(currentMonth.subtract(1, "month"))
                    }
                    size="small"
                  >
                    <TbChevronLeft size="20px" />
                  </IconButton>
                  <Typography
                    variant="subtitle2"
                    sx={{ fontFamily: "Inter, sans-serif", fontWeight: 600 }}
                  >
                    {currentMonth.format("MMMM YYYY")}
                  </Typography>
                  <Box sx={{ width: 32 }} /> {/* Spacer */}
                </Box>
                <DateCalendar
                  value={null}
                  onChange={handleDateClick}
                  views={["day"]}
                  displayWeekNumber={false}
                  showDaysOutsideCurrentMonth
                  referenceDate={currentMonth}
                  sx={{
                    width: 280,
                    "& .MuiPickersDay-root": {
                      fontFamily: "Inter, sans-serif",
                      fontSize: "14px",
                    },
                    "& .MuiPickersDay-root.Mui-selected": {
                      backgroundColor: shouldHighlightDate(currentMonth)
                        ? "#3B82F6"
                        : "transparent",
                    },
                  }}
                />
              </Box>

              {/* Right Calendar */}
              <Box>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Box sx={{ width: 32 }} /> {/* Spacer */}
                  <Typography
                    variant="subtitle2"
                    sx={{ fontFamily: "Inter, sans-serif", fontWeight: 600 }}
                  >
                    {currentMonth.add(1, "month").format("MMMM YYYY")}
                  </Typography>
                  <IconButton
                    onClick={() =>
                      setCurrentMonth(currentMonth.add(1, "month"))
                    }
                    size="small"
                  >
                    <TbChevronRight size="20px" />
                  </IconButton>
                </Box>
                <DateCalendar
                  value={null}
                  onChange={handleDateClick}
                  views={["day"]}
                  displayWeekNumber={false}
                  showDaysOutsideCurrentMonth
                  referenceDate={currentMonth.add(1, "month")}
                  sx={{
                    width: 280,
                    "& .MuiPickersDay-root": {
                      fontFamily: "Inter, sans-serif",
                      fontSize: "14px",
                    },
                    "& .MuiPickersDay-root.Mui-selected": {
                      backgroundColor: shouldHighlightDate(
                        currentMonth.add(1, "month")
                      )
                        ? "#3B82F6"
                        : "transparent",
                    },
                  }}
                />
              </Box>
            </Box>

            {/* Status Text */}
            <Box sx={{ mt: 2, textAlign: "center" }}>
              <Typography
                variant="caption"
                sx={{ color: "#6B7280", fontFamily: "Inter, sans-serif" }}
              >
                {selectingStart ? "Select start date" : "Select end date"}
              </Typography>
            </Box>
          </Box>
        </Popover>
      </Box>
    </LocalizationProvider>
  );
};

export default memo(DateRangeSelector);
