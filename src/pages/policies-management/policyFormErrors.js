/**
 * When Save is stopped by a field check, show where: scroll the popup to the first message
 * (they can sit far above the Save button) and say so, instead of nothing happening.
 */
export function showFirstFormError(showError) {
  return (errors) => {
    const first = Object.values(errors || {})[0];
    showError?.(first?.message ? `Please fix: ${first.message}` : "Please fix the highlighted fields");
    // The messages render after this tick.
    setTimeout(() => {
      const modal = document.querySelector(".jd-modal");
      const target = modal && [...modal.querySelectorAll("p, span")].find((el) =>
        el.children.length === 0 && first?.message && el.textContent.trim() === first.message);
      target?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 50);
  };
}
