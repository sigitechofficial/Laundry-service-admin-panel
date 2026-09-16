import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, Field, PageHeader, Select } from "../../design-system";
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

export function useCatalogScope() {
  const location = useLocation();
  const zoneId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const parsed = Number(params.get("zoneId"));
    return Number.isFinite(parsed) && parsed > 0 ? String(parsed) : "";
  }, [location.search]);
  return {
    zoneId,
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
  const { zoneId, isZoneMode } = useCatalogScope();
  const { data: zonesRes } = useGetAllZonesQuery();
  const zones = useMemo(
    () => zonesArrayFromGetZonesResponse(zonesRes),
    [zonesRes]
  );

  const setCatalogZone = (nextZoneId) => {
    const params = new URLSearchParams(location.search);
    if (nextZoneId) params.set("zoneId", String(nextZoneId));
    else params.delete("zoneId");
    const query = params.toString();
    navigate(
      {
        pathname: location.pathname,
        search: query ? `?${query}` : "",
      },
      { replace: true }
    );
  };

  const activateZoneMode = () => {
    if (zoneId) return;
    const firstZone = zones?.[0]?.id;
    if (firstZone) setCatalogZone(firstZone);
  };

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        actions={
          <>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "end",
                gap: 8,
                minWidth: 260,
              }}
            >
              <Field label="Catalog scope">
                <div style={{ display: "flex", gap: 8 }}>
                  <Button
                    size="sm"
                    variant={!isZoneMode ? "primary" : "secondary"}
                    onClick={() => setCatalogZone("")}
                  >
                    Master
                  </Button>
                  <Button
                    size="sm"
                    variant={isZoneMode ? "primary" : "secondary"}
                    onClick={activateZoneMode}
                    disabled={!isZoneMode && !zones.length}
                  >
                    Zone
                  </Button>
                </div>
              </Field>
              {isZoneMode ? (
                <Field label="Zone">
                  <Select
                    aria-label="Catalog zone"
                    value={zoneId}
                    onChange={setCatalogZone}
                    options={zones.map((z) => ({
                      value: String(z.id),
                      label: z.name || `Zone ${z.id}`,
                    }))}
                    placeholder="Select zone"
                  />
                </Field>
              ) : null}
            </div>
            {actions}
          </>
        }
      />

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
