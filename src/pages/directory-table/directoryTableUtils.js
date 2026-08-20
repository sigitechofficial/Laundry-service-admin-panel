export function formatDisplayDate(value) {
  if (value == null || value === "" || value === "—") return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

export function joinMeta(...parts) {
  return parts.filter((part) => part && part !== "—" && part !== "-").join(" · ") || "—";
}

/** Matches All Orders status pills without importing order-management. */
export function directoryStatusTone(status) {
  const value = String(status || "").toLowerCase();
  if (/deliver/.test(value)) return "teal";
  if (/complete/.test(value)) return "success";
  if (/cancel|fail|hold/.test(value)) return "danger";
  if (/process|pending|waiting|invoice|facility/.test(value)) return "warning";
  if (/new|created|confirm/.test(value)) return "created";
  return "neutral";
}
