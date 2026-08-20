import { useState } from "react";
import { TbPlus, TbPencil, TbTrash } from "../../shared/icons/index";
import { Button, Modal, PageHeader, Table } from "../../design-system";
import AddFAQModal from "./AddFAQModal";
import { useGetAllFAQsQuery, useCreateFAQMutation, useUpdateFAQMutation, useDeleteFAQMutation } from "../../store/services/api";
import {
  DirectoryActions,
  DirectoryError,
  DirectoryIdentity,
  DirectoryTableWrap,
  PageLoading,
} from "../directory-table/directoryTable";
import useToaster from "../../components/ui/Toaster";

function extractFaqs(payload) {
  if (Array.isArray(payload?.message)) return payload.message;
  if (Array.isArray(payload?.data?.faqs)) return payload.data.faqs;
  if (Array.isArray(payload?.faqs)) return payload.faqs;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
}

export default function FAQ() {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [faqToEdit, setFaqToEdit] = useState(null);
  const [faqToDelete, setFaqToDelete] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const { success, error: showError } = useToaster();
  const { data, isLoading, isError, refetch } = useGetAllFAQsQuery();
  const [createFAQ, { isLoading: isCreating }] = useCreateFAQMutation();
  const [updateFAQ, { isLoading: isUpdating }] = useUpdateFAQMutation();
  const [deleteFAQ, { isLoading: isDeleting }] = useDeleteFAQMutation();

  const faqs = extractFaqs(data);

  const handleEdit = (faq) => {
    setFaqToEdit(faq);
    setAddModalOpen(true);
  };

  const handleDelete = (faq) => {
    setFaqToDelete(faq);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!faqToDelete || isDeleting) return;
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

  const handleSave = async (form, faqId) => {
    const body = {
      question: form.question,
      answer: form.answer,
      icon: form.icon ? `${form.icon}-icon.png` : "help-icon.png",
      status: true,
    };
    try {
      if (faqId) {
        await updateFAQ({ faqId, body }).unwrap();
        success("FAQ updated successfully!");
      } else {
        await createFAQ(body).unwrap();
        success("FAQ added successfully!");
      }
      refetch();
    } catch (err) {
      showError(err?.data?.message || err?.error || "Failed to save FAQ. Please try again.");
      throw err;
    }
  };

  if (isLoading) return <PageLoading label="Loading FAQs…" />;

  return (
    <div>
      <PageHeader
        title="FAQ"
        description="Questions and answers shown in the customer app."
        actions={
          <Button onClick={handleAdd}>
            <TbPlus size={18} />
            Add
          </Button>
        }
      />

      {isError ? (
        <DirectoryError onRetry={() => refetch()}>
          Could not load FAQs. Check your connection and try again.
        </DirectoryError>
      ) : (
        <DirectoryTableWrap>
          <Table
            columns={[
              {
                key: "question",
                header: "Question",
                render: (faq) => (
                  <DirectoryIdentity
                    name={faq.question}
                    meta={faq.answer}
                    id={faq.id}
                  />
                ),
              },
              {
                key: "actions",
                header: "Actions",
                render: (faq) => (
                  <DirectoryActions>
                    <Button variant="secondary" size="sm" onClick={() => handleEdit(faq)}>
                      <TbPencil size={16} />
                      Edit
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => handleDelete(faq)}>
                      <TbTrash size={16} />
                      Delete
                    </Button>
                  </DirectoryActions>
                ),
              },
            ]}
            rows={faqs}
            rowKey={(faq) => faq.id}
            empty="No FAQs yet. Click Add to create your first FAQ."
          />
        </DirectoryTableWrap>
      )}

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

      <Modal
        open={deleteConfirmOpen}
        title="Delete FAQ"
        description="Are you sure you want to delete this FAQ?"
        onClose={handleCancelDelete}
        onPrimary={handleConfirmDelete}
        primaryLabel={isDeleting ? "Deleting…" : "Delete"}
        secondaryLabel="Cancel"
        danger
      >
        {faqToDelete ? (
          <p style={{ margin: 0, color: "var(--muted)", fontStyle: "italic" }}>
            &quot;{faqToDelete.question}&quot;
          </p>
        ) : null}
        <p style={{ margin: "12px 0 0", color: "var(--danger)", fontSize: "var(--text-sm)" }}>
          This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
