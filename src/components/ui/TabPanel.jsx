import PropTypes from "prop-types";
import { Suspense, useState } from "react";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import { Delay } from "../shared/Loaders";

export default function CustomTabs({
  tabs,
  defaultValue = 0,
  variant = "scrollable",
  indicatorColor = "primary",
  textColor = "primary",
  tabWidth = "auto",
  fontWeight = 700,
}) {
  const [value, setValue] = useState(defaultValue);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <Box className="w-full">
      {/* Tab headers */}
      <Box
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          width: tabWidth,
        }}
      >
        <Tabs
          style={{ width: "600px" }}
          scrollButtons="auto"
          value={value}
          onChange={handleChange}
          variant={variant}
          indicatorColor={indicatorColor}
          textColor={textColor}
          aria-label="custom tabs"
          sx={{
            "& .MuiTab-root": {
              textTransform: "none",
              fontWeight: 500,
              color: "gray", // default tab color
            },

            "& .MuiTab-root.Mui-selected": {
              color: "#000099", // ✅ active tab text color
              fontWeight: 700,
            },

            "& .MuiTabs-indicator": {
              backgroundColor: "#000099", // ✅ underline color
            },
          }}
        >
          {tabs.map((tab, index) => (
            <Tab
              key={index}
              label={tab.label}
              id={`tab-${index}`}
              aria-controls={`tabpanel-${index}`}
              sx={{
                textTransform: "none",
                fontFamily: "Inter",
                fontWeight: fontWeight,
              }}
            />
          ))}
        </Tabs>
      </Box>

      {/* Tab panels */}
      {tabs.map((tab, index) => (
        <div
          key={index}
          role="tabpanel"
          hidden={value !== index}
          id={`tabpanel-${index}`}
          aria-labelledby={`tab-${index}`}
        >
          {value === index && (
            <Suspense fallback={<Delay />}>
              <Box>{tab.content}</Box>
            </Suspense>
          )}
        </div>
      ))}
    </Box>
  );
}

CustomTabs.propTypes = {
  tabs: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      content: PropTypes.node.isRequired,
    })
  ).isRequired,
  defaultValue: PropTypes.number,
  variant: PropTypes.oneOf(["standard", "scrollable", "fullWidth"]),
  indicatorColor: PropTypes.string,
  textColor: PropTypes.string,
};
