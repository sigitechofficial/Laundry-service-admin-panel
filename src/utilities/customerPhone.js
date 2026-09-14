/**
 * Customer phone rules aligned with the customer app (UK default +44).
 */
export const PHONE_HINT =
  "Enter a valid UK phone number (e.g. 07911 123456 or +44 7911 123456).";

export function isValidCustomerPhone(raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return false;
  if (/[a-zA-Z]/.test(trimmed)) return false;

  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return false;

  if (trimmed.startsWith("+")) {
    return /^\+[1-9]\d{7,14}$/.test(`+${digits}`);
  }

  if (digits.length === 11 && digits.startsWith("0")) return true;
  if (digits.length === 10) return true;
  if (digits.startsWith("44") && digits.length >= 12 && digits.length <= 13) {
    return true;
  }

  return false;
}

export function customerPhoneError(raw) {
  if (!String(raw || "").trim()) return "Phone number is required";
  if (!isValidCustomerPhone(raw)) return PHONE_HINT;
  return null;
}
