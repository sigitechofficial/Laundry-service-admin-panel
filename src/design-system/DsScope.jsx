import "./styles/tokens.css";
import "./styles/components.css";

/**
 * Opt-in island for the new Just Dry system.
 * Wrap only the subtree you are migrating. Ancestors stay on MUI / old Tailwind.
 */
export default function DsScope({ as: Tag = "div", className = "", children, ...props }) {
  const classes = ["jd-ds", className].filter(Boolean).join(" ");
  return (
    <Tag className={classes} data-jd-ds="" {...props}>
      {children}
    </Tag>
  );
}
