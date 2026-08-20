const ISO_ALPHA_2 = /^[A-Z]{2}$/;

export function isIsoAlpha2CountryCode(countryCode) {
  return ISO_ALPHA_2.test(String(countryCode || "").trim().toUpperCase());
}

export function getCountryFlagFallback(countryCode, countryName = "") {
  const normalizedCode = String(countryCode || "").trim().toUpperCase();
  if (isIsoAlpha2CountryCode(normalizedCode)) {
    return String.fromCodePoint(
      ...normalizedCode.split("").map((character) => 127397 + character.charCodeAt(0))
    );
  }

  const initials = String(countryName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return initials || "??";
}
