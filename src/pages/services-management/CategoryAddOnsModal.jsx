import {
  Box,
  Typography,
  Chip,
  Divider,
} from "@mui/material";
import ModalComponent from "../../components/shared/Modal";
import { formatGbp } from "../../utils/formatGbp";
import {
  getAddOnsForSubCategory,
  groupAddOnsByCategory,
} from "./serviceAddOnsUtils";

export default function CategoryAddOnsModal({
  open,
  onClose,
  categoryName,
  subCategories = [],
  addOnsList = [],
  subCategoriesByServiceId,
}) {
  const hasSubs = subCategories.length > 0;

  return (
    <ModalComponent
      open={open}
      title={`Add-ons — ${categoryName || "Category"}`}
      onClose={onClose}
      secondaryAction={{ label: "Close", onClick: onClose }}
      width={720}
    >
      <Typography
        variant="body2"
        sx={{ color: "text.secondary", mb: 2, fontSize: 13 }}
      >
        Same add-ons customers and agents see when selecting items in this
        category (linked via sub-category → add-on category).
      </Typography>

      {!hasSubs ? (
        <Typography variant="body2" color="text.secondary">
          No sub-categories in this category.
        </Typography>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          {subCategories.map((sub) => {
            const addOns = getAddOnsForSubCategory(
              sub.id,
              addOnsList,
              subCategoriesByServiceId
            );
            const grouped = groupAddOnsByCategory(addOns);

            return (
              <Box
                key={sub.id}
                sx={{
                  border: "1px solid #E2E8F0",
                  borderRadius: 2,
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    px: 2,
                    py: 1.25,
                    bgcolor: "#F1F5F9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 2,
                    flexWrap: "wrap",
                  }}
                >
                  <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
                    {sub.name ?? "Sub-category"}
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: "#64748B" }}>
                    Item price: {formatGbp(sub.price)}
                  </Typography>
                </Box>

                <Box sx={{ px: 2, py: 1.5 }}>
                  {addOns.length === 0 ? (
                    <Typography variant="body2" sx={{ color: "#94A3B8", fontSize: 13 }}>
                      No add-ons linked to this item.
                    </Typography>
                  ) : (
                    [...grouped.entries()].map(([groupName, services], gi) => (
                      <Box key={groupName} sx={{ mb: gi < grouped.size - 1 ? 2 : 0 }}>
                        <Typography
                          sx={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#000099",
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                            mb: 1,
                          }}
                        >
                          {groupName}
                        </Typography>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                          {services.map((svc) => (
                            <Box
                              key={svc.id}
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 2,
                                py: 0.75,
                                px: 1,
                                borderRadius: 1,
                                bgcolor: "#FAFAFA",
                              }}
                            >
                              <Typography sx={{ fontSize: 14, fontWeight: 500 }}>
                                {svc.name}
                              </Typography>
                              <Chip
                                label={formatGbp(svc.price)}
                                size="small"
                                sx={{
                                  fontWeight: 600,
                                  bgcolor: "#E6F0FF",
                                  color: "#000099",
                                }}
                              />
                            </Box>
                          ))}
                        </Box>
                        {gi < grouped.size - 1 ? (
                          <Divider sx={{ mt: 1.5 }} />
                        ) : null}
                      </Box>
                    ))
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </ModalComponent>
  );
}
