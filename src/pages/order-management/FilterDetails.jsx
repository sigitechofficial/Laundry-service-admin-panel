import { useState } from "react";

/** Closed native <details> content stays in the a11y tree; hide + inert the panel when shut. */
export default function FilterDetails({
  summary,
  children,
  className = "group relative",
  panelClassName,
}) {
  const [open, setOpen] = useState(false);
  return (
    <details className={className} onToggle={(e) => setOpen(e.currentTarget.open)}>
      {summary}
      <div
        className={panelClassName}
        hidden={!open}
        {...(!open ? { inert: "" } : {})}
      >
        {children}
      </div>
    </details>
  );
}
