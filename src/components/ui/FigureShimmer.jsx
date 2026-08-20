import "./FigureShimmer.css";

function sxToStyle(sx) {
  if (!sx || typeof sx !== "object") return undefined;
  const style = { ...sx };
  if (sx.mb != null) {
    style.marginBottom = typeof sx.mb === "number" ? sx.mb * 8 : sx.mb;
    delete style.mb;
  }
  return style;
}

/** Inline figure placeholder — keeps layout stable while data loads */
export default function FigureShimmer({
  width = 96,
  height = 28,
  radius = 6,
  sx,
}) {
  return (
    <div
      aria-hidden
      className="jd-figure-shimmer shrink-0"
      style={{
        width,
        height,
        borderRadius: `${radius}px`,
        background:
          "linear-gradient(90deg, #E8EEF7 0%, #F4F7FF 40%, #E8EEF7 80%)",
        backgroundSize: "200% 100%",
        animation: "jd-figure-shimmer 1.1s ease-in-out infinite",
        ...sxToStyle(sx),
      }}
    />
  );
}
