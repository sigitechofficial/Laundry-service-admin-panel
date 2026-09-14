import { forwardRef, useState } from "react";
import Input from "./Input";

const PasswordInput = forwardRef(function PasswordInput(
  { id, error, autoComplete = "new-password", ...props },
  ref
) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="jd-pass">
      <Input
        id={id}
        ref={ref}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        error={error}
        {...props}
      />
      <button
        type="button"
        className="jd-pass__toggle"
        aria-pressed={visible}
        aria-label={visible ? "Hide password" : "Show password"}
        onClick={() => setVisible((v) => !v)}
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
});

export default PasswordInput;
