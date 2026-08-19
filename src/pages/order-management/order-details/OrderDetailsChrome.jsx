import { Box, Typography } from "@mui/material";
import {
  OD,
  CARD_SX,
  SECTION_HEADER_SX,
  sectionLabelSx,
  activityDotColor,
} from "./orderDetailsTheme";

export function OdSectionTitle({ children }) {
  return (
    <Box sx={SECTION_HEADER_SX}>
      <Typography sx={sectionLabelSx}>{children}</Typography>
    </Box>
  );
}

export function OdCard({ children, sx }) {
  return <Box sx={{ ...CARD_SX, ...sx }}>{children}</Box>;
}

export function OdMetaRow({ label, value, valueSx }) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 1.5,
      }}
    >
      <Typography sx={{ ...sectionLabelSx, fontSize: 11 }}>{label}</Typography>
      <Typography
        sx={{
          fontSize: 13,
          fontWeight: 500,
          color: OD.inkSoft,
          textAlign: "right",
          fontFamily: OD.font,
          ...valueSx,
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

export function OdStatCell({ label, value, warnZero = false }) {
  const n = Number(value) || 0;
  const warn = warnZero && n === 0;
  return (
    <Box
      sx={{
        p: 1.1,
        border: `1px solid ${OD.line}`,
        borderRadius: "8px",
        bgcolor: OD.card,
      }}
    >
      <Typography sx={{ ...sectionLabelSx, fontSize: 10 }}>{label}</Typography>
      <Typography
        sx={{
          mt: 0.35,
          fontSize: 15,
          fontWeight: 700,
          fontFamily: OD.fontTight,
          color: warn ? OD.red : OD.ink,
        }}
      >
        {n}
      </Typography>
    </Box>
  );
}

export function OdProofMeta({ label, value, muted = false }) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        py: 1,
        borderTop: `1px solid ${OD.line}`,
      }}
    >
      <Typography sx={{ fontSize: 11, color: OD.inkFaint, fontFamily: OD.font }}>
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: muted ? 400 : 600,
          fontStyle: muted ? "italic" : "normal",
          color: muted ? OD.inkFaint : OD.inkSoft,
          fontFamily: OD.font,
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

export function OdTimeline({ rows }) {
  return (
    <Box sx={{ p: 2.25, display: "flex", flexDirection: "column", gap: 1.5 }}>
      {rows.map((activity, idx) => (
        <Box key={`${activity.text}-${idx}`} sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mt: "4px" }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                bgcolor: activityDotColor(activity.tone),
                flexShrink: 0,
              }}
            />
            {idx < rows.length - 1 ? (
              <Box sx={{ width: 1, height: 22, bgcolor: OD.line, mt: 0.75 }} />
            ) : null}
          </Box>
          <Box>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: OD.ink, fontFamily: OD.font }}>
              {activity.text}
            </Typography>
            <Typography sx={{ fontSize: 10, color: OD.inkFaint, fontFamily: OD.font }}>
              {activity.time}
            </Typography>
          </Box>
        </Box>
      ))}
    </Box>
  );
}
