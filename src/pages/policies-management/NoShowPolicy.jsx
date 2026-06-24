import { Box, Typography, Button, Menu, MenuItem, Tooltip } from "@mui/material";
import { BsCardList, TbPlus, TbFilter } from "../../shared/icons/index";
import NoShowPolicyContent from "./NoShowPolicyContent";
import ButtonBlueLight from "../../components/ui/ButtonBlueLight";
import { useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useGetAllZonesQuery } from "../../store/services/api";

export default function NoShowPolicy() {
  const addButtonHandlerRef = useRef(null);
  const [selectedZoneId, setSelectedZoneId] = useState("");
  const [zoneMenuAnchor, setZoneMenuAnchor] = useState(null);
  const zones = useSelector((state) => state?.apiData?.zones?.zones || []);
  useGetAllZonesQuery(undefined, { refetchOnMountOrArgChange: false });
  const zoneOptions = zones?.map((z) => ({ value: String(z.id), label: z.name })) || [];
  const selectedZoneLabel = zoneOptions.find((z) => z.value === String(selectedZoneId))?.label;

  return (
    <Box>
          {/* Header Section */}
          <Box className="flex items-center gap-x-5 justify-between" sx={{ mb: "44px" }}>
            <Box className="flex items-center gap-x-5">
              <Typography color="blue.50">
                <BsCardList size="24px" color="blue.50" />
              </Typography>
              <Typography variant="h4" fontFamily={"Switzer"} color="grey.20">
                No Show Policy
              </Typography>
            </Box>
            <Box className="flex items-center gap-3">
              <Tooltip
                title={
                  selectedZoneLabel ? `Zone: ${selectedZoneLabel}` : "Filter by zone"
                }
              >
                <Button
                  variant="outlined"
                  onClick={(e) => setZoneMenuAnchor(e.currentTarget)}
                  startIcon={<TbFilter size={18} />}
                  sx={{
                    height: 40,
                    minWidth: 0,
                    px: 1.5,
                    borderRadius: "8px",
                    textTransform: "none",
                    fontFamily: "Inter",
                    bgcolor: "white",
                    border: selectedZoneId
                      ? "2px solid #000099"
                      : "1px solid #E5E7EB",
                    color: selectedZoneId ? "#000099" : "#64748B",
                    "&:hover": {
                      bgcolor: "#F8FAFC",
                      borderColor: selectedZoneId ? "#000099" : "#CBD5E1",
                    },
                    "& .MuiButton-startIcon": { mr: 0.5 },
                  }}
                >
                  Zone
                </Button>
              </Tooltip>
              <Menu
                anchorEl={zoneMenuAnchor}
                open={Boolean(zoneMenuAnchor)}
                onClose={() => setZoneMenuAnchor(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                PaperProps={{ sx: { minWidth: 220, borderRadius: 2, mt: 1 } }}
              >
                <MenuItem
                  onClick={() => {
                    setSelectedZoneId("");
                    setZoneMenuAnchor(null);
                  }}
                  selected={selectedZoneId === ""}
                >
                  All zones
                </MenuItem>
                {zoneOptions.map((z) => (
                  <MenuItem
                    key={z.value}
                    onClick={() => {
                      setSelectedZoneId(z.value);
                      setZoneMenuAnchor(null);
                    }}
                    selected={String(selectedZoneId) === String(z.value)}
                  >
                    {z.label}
                  </MenuItem>
                ))}
              </Menu>
              <ButtonBlueLight
                variant="outlined"
                bgColor="blue.200"
                color="white"
                radius="8px"
                startIcon={<TbPlus size={"24px"} />}
                onClick={() => {
                  if (addButtonHandlerRef.current) {
                    addButtonHandlerRef.current();
                  }
                }}
              >
                Add No Show Policy
              </ButtonBlueLight>
            </Box>
          </Box>

          <NoShowPolicyContent
            onAddButtonRef={addButtonHandlerRef}
            zoneId={selectedZoneId}
            onZoneIdChange={setSelectedZoneId}
            showZoneFilter={false}
          />
        </Box>
  );
}
