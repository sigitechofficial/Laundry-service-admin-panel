import { useNavigate } from "react-router-dom";
import { Button } from "../../design-system";
import { useCatalogScope } from "./catalogChrome";

export default function ZoneModeGuard({ sectionName }) {
  const navigate = useNavigate();
  const { search } = useCatalogScope();

  return (
    <div
      style={{
        border: "1px solid var(--line)",
        borderRadius: "var(--r-lg)",
        padding: 16,
        background: "var(--canvas)",
      }}
    >
      <p style={{ margin: 0, color: "var(--ink)" }}>
        Zone mode is active. `{sectionName}` master CRUD is locked to protect the base catalog.
      </p>
      <p style={{ margin: "6px 0 12px", color: "var(--muted)", fontSize: 13 }}>
        Use Catalog tab to manage zone overlays (show/hide, order, and price overrides).
      </p>
      <Button
        size="sm"
        onClick={() =>
          navigate({ pathname: "/services-management/dashboard", search })
        }
      >
        Open Zone Controls
      </Button>
    </div>
  );
}
