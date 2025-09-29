import { createTheme } from "@mui/material";

export const themeOptions = {
  palette: {
    primary: {
      main: "#1F69FF",
    },
    error: {
      main: "#F53939",
    },
    grey: {
      10: "#FFFFFF",
      20: "#8F95B2", //sidebar text / icons / table header / main bg?? /
      30: "#D0D5DD", //Search border color
      40: "#00000099", //graph side lable color and input label color
      50: "#F8F8F8", //Search bar bgcolor
      60: "#FAFAFA", //Main bg color
      70: "#64748B", //Main cards p tag color
      100: "#F3F3F3", //login screen card color
      200: "#F4F7FF", // inputs bg color
      300: "#00000066", // switch bg color off
      400: "#667085", // Icon color
    },
    blue: {
      10: "#F1F5F9", //card header color
      50: "#248ECF", //theme blue color lite / logo bgcolor
      100: "#000099", //theme blue color
      200: "#0391C4", //button color
      300: "#248ECF", // un used or duplicate
      400: "#00009933", // sidebar inner list bg color
    },
    black: {
      50: "#1E293B", //sub text color
      900: "#000", //heading color
    },
    red: {
      50: "#FFE2E2",
    },
    purple: {
      50: "#E8E5FF",
    },
    green: {
      50: "#DFF5FA",
      100: "#01C7B8", //switch bg color on
      200: "#39BE7B33",
      300: "#379465", //success status text
      301: "##37946533", //success status bg
    },
    orange: {
      50: "#EC8559", //status pill text color
      51: "#EC855914", //status pill bg color
      60: "#FF6D6D", // delete icon color
    },
    pink: {
      50: "#FF4BB7", //status pill text color
      51: "#FF4BB714", //status pill bg color
    },
    yellow: {
      50: "#FDE24F", // view detail icon color
      51: "#FF4BB714", //status pill bg color
    },
  },
  typography: {
    fontFamily: "SF Pro, Switzer, Inter, sans-serif",
    fontSize: 14,
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 600,
    h1: {
      fontSize: "6rem",
      lineHeight: 1.167,
      fontWeight: 300,
    },
    h2: {
      fontSize: "3.75rem",
      fontWeight: 300,
      lineHeight: 1.2,
    },
    h3: {
      fontSize: "32px",
      fontWeight: 400,
      lineHeight: "36px",
    },
    h4: {
      fontSize: "24px",
      fontWeight: 600,
      lineHeight: "32px",
    },
    h5: {
      // used
      fontSize: "20px",
      fontWeight: 600,
      lineHeight: "28px",
    },
    h6: {
      fontSize: "18px",
      fontWeight: 400,
      lineHeight: "24px",
    },
    subtitle1: {
      fontSize: "14px",
      fontWeight: 600,
      lineHeight: "20px",
    },
    subtitle2: {
      fontSize: "14px",
      fontWeight: 400,
      lineHeight: "16px",
    },
    body1: {
      fontSize: "16px",
      fontWeight: 500,
      lineHeight: "20px",
    },
    body2: {
      fontSize: "16px",
      fontWeight: 400,
      lineHeight: "24px",
    },
    button: {
      fontSize: "0.875rem",
      fontWeight: 500,
      lineHeight: 1.75,
    },
    caption: {
      fontSize: "12px",
      fontWeight: 400,
      lineHeight: "16px",
    },
    overline: {
      fontSize: "10px",
      fontWeight: 400,
      lineHeight: "14px",
      letterSpacing: "1px",
    },
  },
  // components: {
  //   MuiTextField: {
  //     styleOverrides: {
  //       root: {
  //         "::placeholder": {
  //           opacity: 1,
  //           color: "#8B93A7",
  //         },
  //       },
  //     },
  //   },
  //   MuiOutlinedInput: {
  //     styleOverrides: {
  //       input: {
  //         "&::placeholder": {
  //           opacity: 1,
  //           color: "#8B93A7",
  //         },
  //       },
  //     },
  //   },
  //   MuiMenu: {
  //     styleOverrides: {
  //       paper: {
  //         borderRadius: "8px",
  //         marginTop: "4px",
  //       },
  //       list: {
  //         padding: "8px",
  //       },
  //     },
  //   },
  //   MuiMenuItem: {
  //     styleOverrides: {
  //       root: {
  //         borderRadius: "8px",
  //         padding: "8px",
  //       },
  //     },
  //   },
  //   MuiTableHead: {
  //     styleOverrides: {
  //       root: {
  //         fontSize: "14px",
  //         lineHeight: "20px",
  //         fontWeight: 400,
  //         color: "#353A46",
  //       },
  //     },
  //   },
  //   MuiTableCell: {
  //     styleOverrides: {
  //       root: {
  //         paddingLeft: "12px",
  //         paddingRight: "12px",
  //         paddingTop: "2px",
  //         paddingBottom: "2px",
  //         minHeight: "20px",
  //         height: "fit-content",
  //       },
  //     },
  //   },
  //   MuiTooltip: {
  //     styleOverrides: {
  //       tooltip: {
  //         backgroundColor: "#000000",
  //       },
  //       arrow: {
  //         "&::before": {
  //           backgroundColor: "#000000",
  //           border: "2px solid #000000",
  //         },
  //       },
  //     },
  //   },
  //   MuiButton: {
  //     styleOverrides: {
  //       root: {
  //         textTransform: "none",
  //         fontWeight: 600,
  //         borderRadius: "8px",
  //         boxShadow:
  //           "0px 0px 2px 0px rgba(53, 58, 70, 0.16), 0px 2px 4px 0px rgba(53, 58, 70, 0.12)",
  //       },
  //     },
  //     variants: [
  //       {
  //         props: { variant: "outlined" },
  //         style: {
  //           border: "none",
  //           color: "#4F5668",
  //           "&:hover": {
  //             backgroundColor: "#F3F4F6",
  //             outline: "none",
  //             border: "none",
  //             color: "#4F5650",
  //           },
  //         },
  //       },
  //     ],
  //   },
  // },
};

export const theme = createTheme(themeOptions);
