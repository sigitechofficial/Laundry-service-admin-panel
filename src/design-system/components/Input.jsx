import { forwardRef } from "react";

const Input = forwardRef(function Input(
  { error, className = "", "aria-invalid": ariaInvalid, ...props },
  ref
) {
  const classes = ["jd-input", error ? "is-error" : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <input
      ref={ref}
      className={classes}
      {...props}
      aria-invalid={ariaInvalid ?? Boolean(error)}
    />
  );
});

export default Input;

export const Textarea = forwardRef(function Textarea(
  { error, className = "", "aria-invalid": ariaInvalid, ...props },
  ref
) {
  const classes = ["jd-input", error ? "is-error" : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <textarea
      ref={ref}
      className={classes}
      {...props}
      aria-invalid={ariaInvalid ?? Boolean(error)}
    />
  );
});
