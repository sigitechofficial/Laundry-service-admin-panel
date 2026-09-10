/**
 * Shared phone helpers for admin contact modals (tel / WhatsApp / Zoiper).
 * Zoiper click-to-dial uses the `zoiper:` URI scheme so the softphone opens
 * with the number pre-filled (Voipfone-compatible desktop softphone).
 * @see https://www.voipfone.co.uk/support/guides/software/softphone/softphone-desktop
 */

export function normalizeTel(raw) {
  return String(raw || "")
    .trim()
    .replace(/[^+\d]/g, "");
}

export function normalizeWhatsAppDigits(raw) {
  return normalizeTel(raw).replace(/\D/g, "");
}

/** Digits only — Zoiper dial URIs reject spaces and most punctuation. */
export function normalizeZoiperDigits(raw) {
  return normalizeWhatsAppDigits(raw);
}

export function telHref(raw) {
  const tel = normalizeTel(raw);
  return tel ? `tel:${tel}` : null;
}

export function whatsappHref(raw) {
  const digits = normalizeWhatsAppDigits(raw);
  return digits ? `https://wa.me/${digits}` : null;
}

/**
 * Opens Zoiper with the number ready to dial.
 * Prefer `zoiper:` (registered protocol handler); falls back gracefully if unset.
 */
export function zoiperHref(raw) {
  const digits = normalizeZoiperDigits(raw);
  if (!digits) return null;
  return `zoiper:${digits}`;
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

export function openZoiper(raw) {
  const href = zoiperHref(raw);
  if (!href) return false;
  // Softphone apps register a custom protocol; navigate like tel: so the OS hands off.
  window.location.href = href;
  return true;
}
