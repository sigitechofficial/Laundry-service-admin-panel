import { useState } from "react";
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
} from "@mui/material";
import Layout from "../../components/shared/Layout";
import { TbHelp, TbPlus, TbPencil, TbTrash, TbChevronDown } from "../../shared/icons/index";
import ButtonBlue from "../../components/ui/ButtonBlue";
import AddFAQModal from "./AddFAQModal";
import ModalComponent from "../../components/shared/Modal";
import { useGetAllFAQsQuery, useCreateFAQMutation, useUpdateFAQMutation, useDeleteFAQMutation } from "../../store/services/api";
import { Delay } from "../../components/shared/Loaders";
import useToaster from "../../components/ui/Toaster";

export default function FAQ() {
  const [expanded, setExpanded] = useState(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [faqToEdit, setFaqToEdit] = useState(null);
  const [faqToDelete, setFaqToDelete] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const { success, error: showError } = useToaster();
  const { data, isLoading, refetch } = useGetAllFAQsQuery();
  const [createFAQ, { isLoading: isCreating }] = useCreateFAQMutation();
  const [updateFAQ, { isLoading: isUpdating }] = useUpdateFAQMutation();
  const [deleteFAQ, { isLoading: isDeleting }] = useDeleteFAQMutation();

  const faqs = Array.isArray(data?.message)
    ? data.message
    : Array.isArray(data?.data?.faqs)
      ? data.data.faqs
      : Array.isArray(data?.faqs)
        ? data.faqs
        : [];

  const handleChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : null);
  };

  const handleEdit = (faq) => {
    setFaqToEdit(faq);
    setAddModalOpen(true);
  };

  const handleDelete = (faq) => {
    setFaqToDelete(faq);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!faqToDelete) return;
    try {
      await deleteFAQ(faqToDelete.id).unwrap();
      success("FAQ deleted successfully!");
      setDeleteConfirmOpen(false);
      setFaqToDelete(null);
      refetch();
    } catch (err) {
      showError(err?.data?.message || "Failed to delete FAQ. Please try again.");
      setDeleteConfirmOpen(false);
      setFaqToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
    setFaqToDelete(null);
  };

  const handleAdd = () => {
    setFaqToEdit(null);
    setAddModalOpen(true);
  };

  const handleSave = async (data, faqId) => {
    const body = {
      question: data.question,
      answer: data.answer,
      icon: data.icon ? `${data.icon}-icon.png` : "help-icon.png",
      status: true,
    };
    if (faqId) {
      await updateFAQ({ faqId, body }).unwrap();
      success("FAQ updated successfully!");
    } else {
      await createFAQ(body).unwrap();
      success("FAQ added successfully!");
    }
    refetch();
  };

  if (isLoading) {
    return (
      <Layout content={<Delay />} />
    );
  }

  return (
    <Layout
      content={
        <div className="!space-y-11">
          <Box className="flex items-center justify-between gap-x-5 flex-wrap">
            <Box className="flex items-center gap-x-5">
              <Typography color="blue.50">
                <TbHelp size="24px" color="blue.50" />
              </Typography>
              <Typography variant="h4" fontFamily={"Switzer"} color="grey.20">
                FAQ
              </Typography>
            </Box>
            <ButtonBlue
              size="medium"
              startIcon={<TbPlus size={20} />}
              onClick={handleAdd}
            >
              Add
            </ButtonBlue>
          </Box>

          <Box sx={{ width: "100%" }}>
            {faqs.length === 0 ? (
              <Typography color="grey.70" sx={{ py: 4, textAlign: "center" }}>
                No FAQs yet. Click Add to create your first FAQ.
              </Typography>
            ) : (
            faqs.map((faq) => (
              <Accordion
                key={faq.id}
                expanded={expanded === faq.id}
                onChange={handleChange(faq.id)}
                sx={{
                  boxShadow: "0px 1px 3px rgba(0,0,0,0.08)",
                  borderRadius: "12px !important",
                  mb: 2,
                  "&:before": { display: "none" },
                  "&.Mui-expanded": { margin: 0, marginBottom: 2 },
                }}
              >
                <AccordionSummary
                  expandIcon={<TbChevronDown size={24} />}
                  sx={{
                    minHeight: 56,
                    "& .MuiAccordionSummary-content": {
                      my: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                      pr: 1,
                    },
                  }}
                >
                  <Typography
                    fontFamily="Switzer"
                    fontWeight={600}
                    color="black.50"
                    sx={{ flex: 1, pr: 1 }}
                  >
                    {faq.question}
                  </Typography>
                  <Box
                    sx={{ display: "flex", alignItems: "center", gap: 0.25 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(faq);
                      }}
                      sx={{ p: 0.5 }}
                      aria-label="Edit"
                    >
                      <TbPencil size={18} />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(faq);
                      }}
                      sx={{ p: 0.5, color: "#F53939", "&:hover": { color: "#d32f2f", bgcolor: "rgba(245, 57, 57, 0.08)" } }}
                      aria-label="Delete"
                    >
                      <TbTrash size={18} />
                    </IconButton>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0, pb: 2 }}>
                  <Typography
                    variant="body2"
                    color="grey.70"
                    sx={{ lineHeight: 1.6 }}
                  >
                    {faq.answer}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            ))
            )}
          </Box>

          <AddFAQModal
            open={addModalOpen}
            onClose={() => {
              setAddModalOpen(false);
              setFaqToEdit(null);
            }}
            onSave={handleSave}
            isLoading={isCreating || isUpdating}
            faqToEdit={faqToEdit}
          />

          <ModalComponent
            open={deleteConfirmOpen}
            title="Delete FAQ"
            onClose={handleCancelDelete}
            primaryAction={{
              label: "Delete",
              onClick: handleConfirmDelete,
              isLoading: isDeleting,
            }}
            secondaryAction={{
              label: "Cancel",
              onClick: handleCancelDelete,
            }}
          >
            <Box>
              <Typography variant="body1" sx={{ color: "grey.80", fontFamily: "Switzer" }}>
                Are you sure you want to delete this FAQ?
              </Typography>
              {faqToDelete && (
                <Typography variant="body2" sx={{ color: "grey.70", mt: 1, fontStyle: "italic" }}>
                  "{faqToDelete.question}"
                </Typography>
              )}
              <Typography variant="body2" sx={{ color: "error.main", mt: 2, fontFamily: "Switzer" }}>
                This action cannot be undone.
              </Typography>
            </Box>
          </ModalComponent>
        </div>
      }
    />
  );
}
