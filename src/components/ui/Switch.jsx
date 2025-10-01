// ChangeStatus.js
import React from "react";
import { styled } from "@mui/material/styles";
import Switch from "@mui/material/Switch";

const ChangeStatus = styled(Switch)(
  ({ theme, width = 42, height = 26, thumbSize = 22 }) => ({
    width,
    height,
    padding: 0,
    "& .MuiSwitch-switchBase": {
      padding: 0,
      margin: 2,
      transitionDuration: "300ms",
      "&.Mui-checked": {
        transform: `translateX(${width - thumbSize - 4}px)`,
        color: "#fff",
        "& + .MuiSwitch-track": {
          backgroundColor: "#01C7B8", //checked bg color
          opacity: 1,
          border: 0,
          ...theme.applyStyles("dark", {
            backgroundColor: "#2ECA45",
          }),
        },
        "&.Mui-disabled + .MuiSwitch-track": {
          opacity: 0.5,
        },
      },
      "&.Mui-focusVisible .MuiSwitch-thumb": {
        color: "#33cf4d",
        border: "6px solid #fff",
      },
      "&.Mui-disabled .MuiSwitch-thumb": {
        color: theme.palette.grey[100],
        ...theme.applyStyles("dark", {
          color: theme.palette.grey[600],
        }),
      },
      "&.Mui-disabled + .MuiSwitch-track": {
        opacity: 0.7,
        ...theme.applyStyles("dark", {
          opacity: 0.3,
        }),
      },
    },

    "& .MuiSwitch-thumb": {
      boxSizing: "border-box",
      width: thumbSize,
      height: thumbSize,
    },

    "& .MuiSwitch-track": {
      borderRadius: 9999,
      backgroundColor: "#00000066", //unchecked bg color
      opacity: 1,
      transition: theme.transitions.create(["background-color"], {
        duration: 500,
      }),
      ...theme.applyStyles("dark", {
        backgroundColor: "#39393D",
      }),
    },
  })
);

export default ChangeStatus;
