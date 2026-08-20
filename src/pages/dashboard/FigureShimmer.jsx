import styles from "./Dashboard.module.css";

/** CSS figure placeholder — keeps layout stable while dashboard figures load. */
export default function FigureShimmer({
  width = 96,
  height = 28,
  radius = 6,
  className = "",
  style,
}) {
  return (
    <span
      aria-hidden
      className={`${styles.shimmer} ${className}`.trim()}
      style={{
        width,
        height,
        borderRadius: radius,
        ...style,
      }}
    />
  );
}
