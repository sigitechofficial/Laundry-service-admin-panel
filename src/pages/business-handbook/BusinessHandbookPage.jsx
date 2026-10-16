import { useEffect, useState } from "react";
import { Button, PageHeader } from "../../design-system";
// Copy of laundryAll/BUSINESS_DOCUMENTATION.html; refresh with `npm run handbook:sync`.
import handbookHtml from "./businessHandbook.html?raw";

function handbookUrl() {
  return URL.createObjectURL(new Blob([handbookHtml], { type: "text/html" }));
}

function openInNewTab() {
  const url = handbookUrl();
  window.open(url, "_blank", "noopener");
  // The new tab has loaded the page by then; free the copy.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export default function BusinessHandbookPage() {
  // A blob URL rather than srcDoc: inside srcDoc the handbook's "#section" links
  // resolve against the admin URL and would load the admin app in the frame.
  const [src, setSrc] = useState(null);
  useEffect(() => {
    const url = handbookUrl();
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, []);

  return (
    <div>
      <PageHeader
        title="Business Handbook"
        description="Every rule, flow and screen of the customer app, shop app and admin panel in plain language."
        actions={<Button onClick={openInNewTab}>Open in new tab</Button>}
      />
      {src ? (
        <iframe
          title="Business Handbook"
          src={src}
          style={{
            display: "block",
            width: "100%",
            height: "calc(100vh - 190px)",
            minHeight: 480,
            border: "1px solid #e2e7ee",
            borderRadius: 12,
            background: "#f6f8fb",
          }}
        />
      ) : null}
    </div>
  );
}
