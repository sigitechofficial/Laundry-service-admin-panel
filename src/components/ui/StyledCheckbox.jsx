import { Checkbox } from "@mui/material";
import { styled } from "@mui/material/styles";

// Custom checkbox icon (unchecked state)
const BpIcon = styled("span")(({ theme }) => ({
    borderRadius: "4px",
    width: 22,
    height: 22,
    border: "2px solid #D1D5DB",
    backgroundColor: "#FFFFFF",
    transition: "all 0.2s ease-in-out",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    ".Mui-focusVisible &": {
        outline: "2px solid #000099",
        outlineOffset: "2px",
    },
    "input:hover ~ &": {
        borderColor: "#000099",
        backgroundColor: "#F4F7FF",
    },
    "input:disabled ~ &": {
        borderColor: "#E5E7EB",
        backgroundColor: "#F9FAFB",
    },
}));

// Custom checkbox icon (checked state)
const BpCheckedIcon = styled(BpIcon)({
    backgroundColor: "#000099",
    borderColor: "#000099",
    "&:before": {
        display: "block",
        width: "16px",
        height: "16px",
        backgroundImage:
            "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath" +
            " fill-rule='evenodd' clip-rule='evenodd' d='M12 5c-.28 0-.53.11-.71.29L7 9.59l-2.29-2.3a1.003 1.003 0 00-1.42 1.42l3 3c.18.18.43.29.71.29s.53-.11.71-.29l5-5A1.003 1.003 0 0012 5z' fill='%23fff'/%3E%3C/svg%3E\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center center",
        backgroundSize: "cover",
        content: '""',
        margin: "auto",
    },
    "input:hover ~ &": {
        backgroundColor: "#0000CC",
        borderColor: "#0000CC",
    },
});

// Custom styled checkbox component
function StyledCheckbox(props) {
    return (
        <Checkbox
            disableRipple
            color="default"
            checkedIcon={<BpCheckedIcon />}
            icon={<BpIcon />}
            sx={{
                padding: "6px",
                "&:hover": {
                    backgroundColor: "transparent",
                },
            }}
            {...props}
        />
    );
}

export default StyledCheckbox;

