import { LuEye, LuPencil, LuTrash2, LuBan, LuUserCheck } from "react-icons/lu";

const BASE_CLASS =
  "grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[9px] border border-[#e6e9f0] bg-white text-[#5c6673] disabled:cursor-not-allowed disabled:opacity-50";

const TONE_CLASS = {
  default:
    "hover:border-[#2c3ba0] hover:bg-[#eef0fb] hover:text-[#2c3ba0]",
  danger:
    "hover:border-[#c9403f] hover:bg-[#fdecec] hover:text-[#c9403f]",
};

/**
 * Compact icon action matching the orders list Actions cell
 * (34×34 outline square, eye / pencil / trash).
 */
export function DirectoryActionIcon({
  tone = "default",
  title,
  "aria-label": ariaLabel,
  onClick,
  disabled,
  children,
  className = "",
  type = "button",
  ...rest
}) {
  const classes = [
    BASE_CLASS,
    TONE_CLASS[tone] || TONE_CLASS.default,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      title={title}
      aria-label={ariaLabel || title}
      disabled={disabled}
      className={classes}
      onClick={onClick}
      {...rest}
    >
      {children}
    </button>
  );
}

export function DirectoryActionView({
  title = "View",
  "aria-label": ariaLabel,
  ...rest
}) {
  return (
    <DirectoryActionIcon title={title} aria-label={ariaLabel || title} {...rest}>
      <LuEye size={16} aria-hidden />
    </DirectoryActionIcon>
  );
}

export function DirectoryActionEdit({
  title = "Edit",
  "aria-label": ariaLabel,
  ...rest
}) {
  return (
    <DirectoryActionIcon title={title} aria-label={ariaLabel || title} {...rest}>
      <LuPencil size={16} aria-hidden />
    </DirectoryActionIcon>
  );
}

export function DirectoryActionDelete({
  title = "Delete",
  "aria-label": ariaLabel,
  ...rest
}) {
  return (
    <DirectoryActionIcon
      tone="danger"
      title={title}
      aria-label={ariaLabel || title}
      {...rest}
    >
      <LuTrash2 size={16} aria-hidden />
    </DirectoryActionIcon>
  );
}

export function DirectoryActionBlock({
  isBlocked = false,
  title,
  "aria-label": ariaLabel,
  ...rest
}) {
  const label = title || (isBlocked ? "Unblock" : "Block");
  return (
    <DirectoryActionIcon
      tone={isBlocked ? "default" : "danger"}
      title={label}
      aria-label={ariaLabel || label}
      {...rest}
    >
      {isBlocked ? (
        <LuUserCheck size={16} aria-hidden />
      ) : (
        <LuBan size={16} aria-hidden />
      )}
    </DirectoryActionIcon>
  );
}
