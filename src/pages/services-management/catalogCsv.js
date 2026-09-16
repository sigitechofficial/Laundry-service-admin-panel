// CSV export helpers for the service catalog (services, service categories,
// categories, sub-categories/items, and add-ons). Kept self-contained so the
// dashboard can offer one-click downloads without pulling in report UI code.

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function stripHtml(value) {
  return String(value ?? "")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function statusLabel(value) {
  return value ? "Active" : "Inactive";
}

/** Download an array of rows as a CSV file using the given column definitions. */
export function downloadCatalogCsv(filename, columns, rows) {
  const head = columns.map((c) => csvEscape(c.header));
  const lines = [head.join(",")];
  (rows || []).forEach((row) => {
    lines.push(
      columns
        .map((c) => csvEscape(c.value ? c.value(row) : row[c.key]))
        .join(",")
    );
  });
  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Build all catalog CSV export descriptors from the global catalog datasets.
 * Each descriptor: { key, label, filename, columns, rows }.
 */
export function buildCatalogExports({
  services = [],
  categories = [],
  subCategories = [],
  addOns = [],
} = {}) {
  const stamp = dateStamp();

  const categoryById = new Map();
  categories.forEach((cat) => {
    if (cat?.id != null) categoryById.set(String(cat.id), cat);
  });

  const servicesExport = {
    key: "services",
    label: "Services",
    filename: `services-${stamp}.csv`,
    columns: [
      { header: "ID", value: (r) => r.id },
      { header: "Name", value: (r) => r.name },
      { header: "Description", value: (r) => stripHtml(r.description) },
      { header: "Pricing basis", value: (r) => r.pricingBasis || "" },
      { header: "Time required", value: (r) => r.timeRequired || "" },
      { header: "Status", value: (r) => statusLabel(r.status) },
      { header: "Sort order", value: (r) => r.sortOrder ?? "" },
    ],
    rows: services,
  };

  // Service ↔ category relationship view.
  const serviceCategoriesExport = {
    key: "serviceCategories",
    label: "Service categories",
    filename: `service-categories-${stamp}.csv`,
    columns: [
      { header: "Service ID", value: (r) => r.serviceId ?? r.service?.id ?? "" },
      { header: "Service", value: (r) => r.service?.name || "" },
      { header: "Category ID", value: (r) => r.id },
      { header: "Category", value: (r) => r.name },
      { header: "Status", value: (r) => statusLabel(r.status) },
      { header: "Sort order", value: (r) => r.sortOrder ?? "" },
    ],
    rows: categories,
  };

  const categoriesExport = {
    key: "categories",
    label: "Categories",
    filename: `categories-${stamp}.csv`,
    columns: [
      { header: "ID", value: (r) => r.id },
      { header: "Name", value: (r) => r.name },
      { header: "Service", value: (r) => r.service?.name || "" },
      { header: "Service ID", value: (r) => r.serviceId ?? r.service?.id ?? "" },
      { header: "Description", value: (r) => stripHtml(r.description) },
      { header: "Status", value: (r) => statusLabel(r.status) },
      { header: "Sort order", value: (r) => r.sortOrder ?? "" },
      {
        header: "Linked add-on categories",
        value: (r) =>
          (r.addOnCategories || [])
            .map((a) => a?.name)
            .filter(Boolean)
            .join("; "),
      },
    ],
    rows: categories,
  };

  const subCategoriesExport = {
    key: "subCategories",
    label: "Sub-categories (items)",
    filename: `sub-categories-${stamp}.csv`,
    columns: [
      { header: "ID", value: (r) => r.id },
      { header: "Name", value: (r) => r.name },
      { header: "Category ID", value: (r) => r.categoryId ?? "" },
      {
        header: "Category",
        value: (r) => categoryById.get(String(r.categoryId))?.name || "",
      },
      {
        header: "Service",
        value: (r) =>
          categoryById.get(String(r.categoryId))?.service?.name || "",
      },
      { header: "Price", value: (r) => (r.price != null ? r.price : "") },
      { header: "Weight (kg)", value: (r) => (r.weightKg != null ? r.weightKg : "") },
      { header: "Unit count", value: (r) => (r.unitCount != null ? r.unitCount : "") },
      { header: "Barcode", value: (r) => r.barCode || "" },
      { header: "Status", value: (r) => statusLabel(r.status) },
      { header: "Description", value: (r) => stripHtml(r.description) },
      { header: "Sort order", value: (r) => r.sortOrder ?? "" },
    ],
    rows: subCategories,
  };

  const addOnsExport = {
    key: "addOns",
    label: "Add-ons",
    filename: `add-ons-${stamp}.csv`,
    columns: [
      { header: "ID", value: (r) => r.id },
      { header: "Name", value: (r) => r.name },
      { header: "Price", value: (r) => (r.price != null ? r.price : "") },
      {
        header: "Add-on category ID",
        value: (r) => r.addOnCategoryId ?? r.category?.id ?? "",
      },
      {
        header: "Add-on category",
        value: (r) => r.category?.name || "",
      },
      {
        header: "Linked item IDs",
        value: (r) => (r.subCategoryIds || []).join("; "),
      },
      { header: "Status", value: (r) => statusLabel(r.status) },
      { header: "Sort order", value: (r) => r.sortOrder ?? "" },
    ],
    rows: addOns,
  };

  return [
    servicesExport,
    serviceCategoriesExport,
    categoriesExport,
    subCategoriesExport,
    addOnsExport,
  ];
}
