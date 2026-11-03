/**
 * Shared phone helpers for admin contact modals (tel / WhatsApp / Linphone).
 */

export function normalizeTel(raw) {
  return String(raw || "")
    .trim()
    .replace(/[^+\d]/g, "");
}

/** "+44" / "44" / " +44 " → "+44"; anything without digits → "". */
export function formatDialCode(countryCode) {
  const digits = String(countryCode || "").replace(/\D/g, "");
  return digits ? `+${digits}` : "";
}

/** Display phone for any users row ({ countryCode, phoneNum | phone }). */
export function formatUserPhone(user) {
  if (!user) return "";
  return formatPhoneWithCountryCode(
    user.countryCode,
    user.phoneNum ?? user.phone ?? user.phoneNumber ?? ""
  );
}

/**
 * Join a stored dial code ("+44" / "44") with a national number ("07123…")
 * into one display string ("+44 7123…"). Numbers already carrying a "+" or
 * already starting with the dial code are returned as-is so nothing doubles up.
 */
export function formatPhoneWithCountryCode(countryCode, phoneNum) {
  const phone = String(phoneNum || "").trim();
  if (!phone) return "";
  const codeDigits = String(countryCode || "").replace(/\D/g, "");
  if (!codeDigits || phone.startsWith("+")) return phone;
  const phoneDigits = phone.replace(/\D/g, "");
  if (phoneDigits.startsWith(codeDigits) && phoneDigits.length > codeDigits.length + 6) {
    return `+${phoneDigits}`;
  }
  // Drop a single trunk "0" (e.g. UK 07… → +44 7…) when prefixing a dial code.
  const national = phoneDigits.replace(/^0/, "");
  return `+${codeDigits} ${national}`;
}

export function normalizeWhatsAppDigits(raw) {
  return normalizeTel(raw).replace(/\D/g, "");
}

export function telHref(raw) {
  const tel = normalizeTel(raw);
  return tel ? `tel:${tel}` : null;
}

export function whatsappHref(raw) {
  const digits = normalizeWhatsAppDigits(raw);
  return digits ? `https://wa.me/${digits}` : null;
}

export function openTel(raw) {
  const href = telHref(raw);
  if (!href) return false;
  window.location.href = href;
  return true;
}

export function openWhatsApp(raw) {
  const href = whatsappHref(raw);
  if (!href) return false;
  window.open(href, "_blank", "noopener,noreferrer");
  return true;
}

export const LINPHONE_DOWNLOAD_URL = "https://www.linphone.org/en/download/";

/**
 * Linphone desktop (macOS / Windows) registers `sip-linphone:` for itself, so
 * the number opens in Linphone even when another app owns `sip:` / `tel:`.
 */
export function linphoneHref(raw) {
  const tel = normalizeTel(raw);
  return tel ? `sip-linphone:${tel}` : null;
}

/**
 * Hands the number to Linphone and reports whether the OS picked it up.
 * Browsers cannot ask whether a protocol is registered, so we watch for the
 * page losing focus (the "Open Linphone?" prompt or the app coming forward).
 * No focus change within `timeoutMs` → `onMissing` (app not installed).
 */
export function openLinphone(raw, { onLaunched, onMissing, timeoutMs = 2000 } = {}) {
  const href = linphoneHref(raw);
  if (!href) return false;

  let settled = false;
  let timer;
  const cleanup = () => {
    clearTimeout(timer);
    window.removeEventListener("blur", handleLaunched);
    document.removeEventListener("visibilitychange", handleVisibility);
  };
  function handleLaunched() {
    if (settled) return;
    settled = true;
    cleanup();
    onLaunched?.();
  }
  function handleVisibility() {
    if (document.hidden) handleLaunched();
  }

  window.addEventListener("blur", handleLaunched);
  document.addEventListener("visibilitychange", handleVisibility);
  timer = setTimeout(() => {
    if (settled) return;
    settled = true;
    cleanup();
    onMissing?.();
  }, timeoutMs);

  // Firefox replaces the page with an error for unknown schemes, so it gets a
  // throwaway iframe; Chromium and Safari stay put on a plain navigation.
  if (/firefox/i.test(navigator.userAgent)) {
    const frame = document.createElement("iframe");
    frame.style.display = "none";
    frame.src = href;
    document.body.appendChild(frame);
    setTimeout(() => frame.remove(), timeoutMs + 500);
  } else {
    window.location.href = href;
  }
  return true;
}
