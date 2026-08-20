import { useNavigate } from "react-router-dom";
import { Button, PageHeader } from "../../design-system";

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

  return (
    <div>
      <PageHeader title={title} description={description} actions={actions} />

      <div style={TAB_ROW} role="tablist" aria-label="Service catalog sections">
        {CATALOG_SECTIONS.map((item) => (
          <Button
            key={item.id}
            size="sm"
            variant={item.id === section ? "primary" : "secondary"}
            aria-current={item.id === section ? "page" : undefined}
            onClick={() => navigate(item.path)}
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
