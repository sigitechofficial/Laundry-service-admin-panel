import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, Field, PageHeader, Select } from "../../design-system";
import { DirectoryDotPill } from "../directory-table/directoryTable";
import { useGetAllZonesQuery } from "../../store/services/api";
import { zonesArrayFromGetZonesResponse } from "../../utilities/zonesList";

const CATALOG_SECTIONS = [
  {
    id: "overview",
    label: "Catalog",
    path: "/services-management/dashboard",
  },
  {
    id: "services",
    label: "Services",
    path: "/services-management/services",
  },
  {
    id: "categories",
    label: "Categories",
    path: "/services-management/categories",
  },
  {
    id: "addons",
    label: "Add-ons",
    path: "/services-management/add-on-services",
  },
  {
    id: "preferences",
    label: "Preferences",
    path: "/services-management/preferences",
  },
  {
    id: "repairs",
    label: "Repairs",
    path: "/services-management/repair-catalog",
  },
  {
    id: "configure",
    label: "Configure",
    path: "/services-management/configure-services",
  },
];

const TAB_ROW = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginBottom: 16,
};

const CRUMB = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 6,
  margin: "0 0 16px",
  fontSize: 13,
  color: "var(--muted)",
};

const MASTER_SCOPE = "master";

export function useCatalogScope() {
  const location = useLocation();
  const zoneId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const parsed = Number(params.get("zoneId"));
    return Number.isFinite(parsed) && parsed > 0 ? String(parsed) : "";
  }, [location.search]);
  const { data: zonesRes } = useGetAllZonesQuery();
  const zones = useMemo(
    () => zonesArrayFromGetZonesResponse(zonesRes),
    [zonesRes]
  );
  const zone = useMemo(
    () => zones.find((z) => String(z.id) === String(zoneId)) || null,
    [zones, zoneId]
  );
  return {
    zoneId,
    zone,
    zoneName: zone?.name || (zoneId ? `Zone ${zoneId}` : ""),
    zones,
    isZoneMode: Boolean(zoneId),
    search: location.search,
  };
}

/**
 * Shared catalog chrome. Tabs navigate existing routes so nav.js feature
 * keys and permissions stay intact.
 */
export default function CatalogChrome({
  section,
  title,
  description,
  actions,
  breadcrumb = [],
  children,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { zoneId, isZoneMode, zones, zoneName } = useCatalogScope();

  const setCatalogZone = (nextZoneId) => {
    const params = new URLSearchParams(location.search);
    if (nextZoneId && nextZoneId !== MASTER_SCOPE) {
      params.set("zoneId", String(nextZoneId));
    } else {
      params.delete("zoneId");
    }
    const query = params.toString();
    navigate(
      {
        pathname: location.pathname,
        search: query ? `?${query}` : "",
      },
      { replace: true }
    );
  };

  const scopeOptions = useMemo(
    () => [
      { value: MASTER_SCOPE, label: "Master catalog" },
      ...zones.map((z) => ({
        value: String(z.id),
        label: z.name || `Zone ${z.id}`,
      })),
    ],
    [zones]
  );

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        actions={
          <>
            <div style={{ minWidth: 220 }}>
              <Field label="Catalog scope" htmlFor="catalog-scope-select">
                <Select
                  id="catalog-scope-select"
                  aria-label="Catalog scope"
                  value={isZoneMode ? zoneId : MASTER_SCOPE}
                  onChange={setCatalogZone}
                  options={scopeOptions}
                  placeholder="Master catalog"
                />
              </Field>
            </div>
            {actions}
          </>
        }
      />

      {isZoneMode ? (
        <div
          role="status"
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 10,
            margin: "0 0 12px",
            padding: "10px 14px",
            border: "1px solid var(--line)",
            borderLeft: "4px solid var(--brand-500)",
            borderRadius: "var(--r-md)",
            background: "var(--canvas)",
            fontSize: 13,
            color: "var(--ink)",
          }}
        >
          <DirectoryDotPill tone="info">Zone scope</DirectoryDotPill>
          <span>
            Editing <strong>{zoneName}</strong>. Changes here are zone overlays only — the
            master catalog stays unchanged.
          </span>
          <span style={{ marginLeft: "auto" }}>
            <Button size="sm" variant="ghost" onClick={() => setCatalogZone(MASTER_SCOPE)}>
              Back to master
            </Button>
          </span>
        </div>
      ) : null}

      <div style={TAB_ROW} role="tablist" aria-label="Service catalog sections">
        {CATALOG_SECTIONS.map((item) => (
          <Button
            key={item.id}
            size="sm"
            variant={item.id === section ? "primary" : "secondary"}
            aria-current={item.id === section ? "page" : undefined}
            onClick={() => navigate({ pathname: item.path, search: location.search })}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {breadcrumb.length ? (
        <nav style={CRUMB} aria-label="Catalog breadcrumb">
          {breadcrumb.map((crumb, index) => (
            <span key={`${crumb}-${index}`} style={{ display: "inline-flex", gap: 6 }}>
              {index > 0 ? <span aria-hidden="true">/</span> : null}
              <span
                style={{
                  color: index === breadcrumb.length - 1 ? "var(--ink)" : "var(--muted)",
                  fontWeight: index === breadcrumb.length - 1 ? 600 : 400,
                }}
              >
                {crumb}
              </span>
            </span>
          ))}
        </nav>
      ) : null}

      {children}
    </div>
  );
}
