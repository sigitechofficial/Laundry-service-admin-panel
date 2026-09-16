import { forwardRef } from "react";
import Input from "./Input";
import { formatDialCode } from "../../utilities/contactLinks";

/**
 * Phone field that shows the account's dial code ("+44") as a fixed prefix
 * while the national number stays editable. The prefix is display-only:
 * the saved value is still the national number (users.phoneNum), and the
 * dial code lives in users.countryCode. If the value already starts with
 * "+" the prefix is hidden so the code is never shown twice.
 */
const PhoneInput = forwardRef(function PhoneInput(
  { countryCode, value, style, ...props },
  ref
) {
  const code = formatDialCode(countryCode);
  const showPrefix = Boolean(code) && !String(value ?? "").trim().startsWith("+");

  const input = (
    <Input
      ref={ref}
      type="tel"
      inputMode="tel"
      value={value}
      style={showPrefix ? { flex: 1, minWidth: 0, ...style } : style}
      {...props}
    />
  );

  if (!showPrefix) return input;

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
      <span
        className="jd-input"
        aria-label="Country code"
        title="Country code (from the account)"
        style={{
          flex: "0 0 auto",
          width: "auto",
          display: "inline-flex",
          alignItems: "center",
          fontWeight: 600,
          color: "var(--ink-2, #4b5563)",
          background: "var(--surface-2, #f6f7fb)",
          cursor: "default",
          userSelect: "none",
        }}
      >
        {code}
      </span>
      {input}
    </div>
  );
});

export default PhoneInput;
