import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "../../design-system";
import { DirectoryDotPill } from "../directory-table/directoryTable";
import { useCatalogScope } from "./catalogChrome";

/**
 * Shown on master-only tabs while a zone is selected in the Catalog scope
 * dropdown. Master CRUD stays locked so a zone edit can never leak into the
 * base catalog; all zone work happens inline on the Catalog tab.
 */
export default function ZoneModeGuard({ sectionName }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { search, zoneName } = useCatalogScope();

  return (
    <div
      style={{
        border: "1px solid var(--line)",
        borderLeft: "4px solid var(--brand-500)",
        borderRadius: "var(--r-lg)",
        padding: 16,
        background: "var(--canvas)",
        display: "grid",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <DirectoryDotPill tone="info">Zone scope · {zoneName}</DirectoryDotPill>
        <strong style={{ color: "var(--ink)" }}>{sectionName} is a master-catalog tab.</strong>
      </div>
      <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>
        Adding, editing, or deleting here would change the base catalog for every zone. For{" "}
        {zoneName}, hide/show rows and set zone prices on the Catalog tab — those changes stay
        inside this zone. Switch the scope back to “Master catalog” to edit master data.
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <Button
          size="sm"
          onClick={() => navigate({ pathname: "/services-management/dashboard", search })}
        >
          Manage {zoneName} in Catalog
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => navigate({ pathname: location.pathname, search: "" }, { replace: true })}
        >
          Switch to master
        </Button>
      </div>
    </div>
  );
}
