/**
 * Coupon codes as the server accepts them: 3–30 capital letters, numbers, - or _.
 * Typing is cleaned as you go: spaces and other symbols are simply ignored, letters become capitals.
 */
export const CODE_RULE = /^[A-Z0-9_-]{3,30}$/;
export const cleanCode = (value) => String(value ?? "").toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 30);
export const codeError = (code) => (CODE_RULE.test(code) ? null : "A code needs at least 3 letters or numbers");
