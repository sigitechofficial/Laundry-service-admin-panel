const TONES = ["neutral", "brand", "success", "warning", "danger"];

export default function Badge({ tone = "neutral", className = "", children }) {
  const t = TONES.includes(tone) ? tone : "neutral";
  return <span className={`jd-badge jd-badge--${t} ${className}`.trim()}>{children}</span>;
}
