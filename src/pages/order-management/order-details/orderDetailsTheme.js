/** Order Details page tokens — one meaning per status color. */
export const OD = {
  ink: "#0F1720",
  inkSoft: "#5B6472",
  inkFaint: "#94A0AF",
  line: "#E6E9EE",
  canvas: "#F5F6F8",
  card: "#FFFFFF",
  accent: "#2454FF",
  accentSoft: "#EEF2FF",
  amber: "#B5730A",
  amberSoft: "#FCF3E1",
  green: "#0E8A5F",
  greenSoft: "#E7F6EF",
  red: "#C4402A",
  redSoft: "#FCECE8",
  font: "Inter, sans-serif",
  fontTight: '"Inter Tight", Inter, sans-serif',
};

export const CARD_SX = {
  borderRadius: "8px",
  border: `1px solid ${OD.line}`,
  boxShadow: "none",
  overflow: "hidden",
  bgcolor: OD.card,
};

export const SECTION_HEADER_SX = {
  px: 2.25,
  py: 1.5,
  borderBottom: `1px solid ${OD.line}`,
  bgcolor: OD.card,
};

export const sectionLabelSx = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: OD.inkFaint,
  fontFamily: OD.font,
};

export const primaryBtnSx = {
  textTransform: "none",
  borderRadius: "8px",
  bgcolor: OD.accent,
  color: "#fff",
  fontWeight: 600,
  fontSize: 13,
  minHeight: 40,
  px: 2,
  fontFamily: OD.font,
  boxShadow: "none",
  "&:hover": { bgcolor: "#1C45D6", boxShadow: "none" },
  "&.Mui-disabled": {
    bgcolor: "#CBD5E1",
    color: "#fff",
  },
};

export const secondaryBtnSx = {
  textTransform: "none",
  borderRadius: "8px",
  borderColor: OD.line,
  color: OD.ink,
  bgcolor: OD.card,
  fontWeight: 600,
  fontSize: 13,
  minHeight: 40,
  px: 2,
  fontFamily: OD.font,
  "&:hover": { borderColor: OD.accent, bgcolor: OD.accentSoft },
};

export function statusTone(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized.includes("complete")) {
    return { bg: OD.greenSoft, color: OD.green, dot: OD.green };
  }
  if (normalized.includes("pending")) {
    return { bg: OD.amberSoft, color: OD.amber, dot: OD.amber };
  }
  if (normalized.includes("cancel") || normalized.includes("fail")) {
    return { bg: OD.redSoft, color: OD.red, dot: OD.red };
  }
  if (normalized.includes("hold")) {
    return { bg: OD.amberSoft, color: OD.amber, dot: OD.amber };
  }
  return { bg: OD.accentSoft, color: OD.accent, dot: OD.accent };
}

export function paymentTone(status) {
  const normalized = String(status || "pending").toLowerCase();
  if (normalized === "paid") {
    return { bg: OD.greenSoft, color: OD.green, label: "Paid" };
  }
  if (normalized === "failed") {
    return { bg: OD.redSoft, color: OD.red, label: "Failed" };
  }
  return { bg: OD.amberSoft, color: OD.amber, label: "Pending" };
}

export function activityDotColor(tone) {
  if (tone === "completed") return OD.green;
  if (tone === "error") return OD.red;
  if (tone === "system") return OD.accent;
  return "#CBD5E1";
}
