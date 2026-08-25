const VARIANTS = ["primary", "secondary", "ghost", "danger", "warning"];
const TYPES = ["button", "submit", "reset"];

export default function Button({
  variant = "primary",
  size,
  className = "",
  type = "button",
  children,
  ...props
}) {
  const tone = VARIANTS.includes(variant) ? variant : "primary";
  const safeType = TYPES.includes(type) ? type : "button";
  const classes = [
    "jd-btn",
    `jd-btn--${tone}`,
    size === "sm" ? "jd-btn--sm" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} {...props} type={safeType}>
      {children}
    </button>
  );
}
