import { useEffect } from "react";

/** Open a page at the top, not at the scroll position of the page before it. */
export default function useScrollTop(key) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [key]);
}
