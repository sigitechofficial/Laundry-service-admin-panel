import { Modal, Box, Typography, Button, IconButton, Slide, useMediaQuery, useTheme } from "@mui/material";
import { TbX } from "../../shared/icons/index";
import { MiniLoader } from "./Loaders";

export default function ModalComponent({
  open,
  onClose,
  title,
  children,
  primaryAction,
  secondaryAction,
  width = 584,
  height = "auto",
  maxHeight = "90vh",
  hideHeader = false,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md")); // md is 900px

  const modalStyle = {
    position: "absolute",
    ...(isMobile
      ? {
          bottom: 0,
          left: 0,
          right: 0,
          width: "100%",
          borderRadius: "16px 16px 0 0",
        }
      : {
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: width,
          borderRadius: "8px",
        }),
    height: height,
    maxHeight: maxHeight,
    bgcolor: "white",
    boxShadow: "0px 8px 24px rgba(0, 0, 0, 0.15)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    outline: "none",
  };

  const headerStyle = {
    position: "relative",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "20px 24px",
    // borderBottom: "1px solid #E4E7EC",
    bgcolor: "white",
  };

  const contentStyle = {
    flex: 1,
    padding: "24px",
    overflowY: "auto",
    bgcolor: "white",
    // Custom scrollbar styling
    "&::-webkit-scrollbar": {
      width: "6px",
    },
    "&::-webkit-scrollbar-track": {
      background: "transparent",
    },
    "&::-webkit-scrollbar-thumb": {
      background: "#9CA3AF",
      borderRadius: "10px",
    },
    "&::-webkit-scrollbar-thumb:hover": {
      background: "#6B7280",
    },
    // Firefox scrollbar
    scrollbarWidth: "thin",
    scrollbarColor: "#9CA3AF transparent",
  };

  const footerStyle = {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    padding: "20px 24px",
    // borderTop: "1px solid #E4E7EC",
    bgcolor: "white",
  };

  const modalContent = (
    <Box sx={modalStyle}>
      {/* Header */}
      {!hideHeader && (
        <Box sx={headerStyle}>
          <Typography
            id="modal-title"
            component="h2"
            sx={{
              fontWeight: 500,
              fontSize: "20px",
              color: "#101828",
              fontFamily: "Switzer",
              textTransform: "uppercase",
            }}
          >
            {title}
          </Typography>
          <IconButton
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose?.(e);
            }}
            sx={{
              padding: "4px",
              color: "#000",
              zIndex: 1,
              "&:hover": {
                bgcolor: "#F2F4F7",
              },
              position: "absolute",
              top: "10px",
              right: "10px",
            }}
          >
            <TbX size="24px" />
          </IconButton>
        </Box>
      )}

      {/* Content */}
      <Box sx={contentStyle} id="modal-content">
        {children}
      </Box>

      {/* Footer with Action Buttons */}
      {(primaryAction || secondaryAction) && (
        <Box sx={footerStyle}>
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant="outlined"
              sx={{
                height: "40px",
                minHeight: "40px",
                borderRadius: "8px",
                border: "1px solid #2B2D42",
                color: "#344054",
                bgcolor: "white",
                fontFamily: "Switzer",
                fontWeight: 500,
                fontSize: "14px",
                textTransform: "none",
                padding: "8px 16px",
                minWidth: "80px",
                "&:hover": {
                  bgcolor: "#F9FAFB",
                  border: "1px solid #2B2D42",
                },
              }}
              disabled={secondaryAction.disabled}
            >
              {secondaryAction.label}
            </Button>
          )}
          {primaryAction && (
            <Button
              onClick={primaryAction.onClick}
              variant="contained"
              sx={{
                height: "40px",
                minHeight: "40px",
                borderRadius: "8px",
                bgcolor: "#000099",
                color: "white",
                fontFamily: "Switzer",
                fontWeight: 500,
                fontSize: "14px",
                textTransform: "none",
                padding: "8px 24px",
                minWidth: "100px",
                boxShadow: "0px 1px 2px rgba(16, 24, 40, 0.05)",
              }}
              disabled={primaryAction.disabled || primaryAction.isLoading}
            >
              {primaryAction.isLoading ? (
                <MiniLoader size="30px" />
              ) : (
                primaryAction.label
              )}
            </Button>
          )}
        </Box>
      )}
    </Box>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="modal-title"
      aria-describedby="modal-content"
      sx={{
        display: "flex",
        alignItems: isMobile ? "flex-end" : "center",
        justifyContent: "center",
        border: "none",
        outline: "none",
      }}
    >
      {isMobile ? (
        <Slide direction="up" in={open} mountOnEnter unmountOnExit>
          {modalContent}
        </Slide>
      ) : (
        modalContent
      )}
    </Modal>
  );
}
