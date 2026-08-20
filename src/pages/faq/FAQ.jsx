import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { TbPlus, TbChevronDown } from "../../shared/icons/index";
import { Button, Modal, PageHeader } from "../../design-system";
import AddFAQModal from "./AddFAQModal";
import {
  useGetAllFAQsQuery,
  useCreateFAQMutation,
  useUpdateFAQMutation,
  useDeleteFAQMutation,
} from "../../store/services/api";
import {
  DirectoryActionDelete,
  DirectoryActionEdit,
  DirectoryActions,
  DirectoryError,
  DirectorySearch,
  DirectoryTableWrap,
  DirectoryToolbar,
  DirectoryListRow,
  PageLoading,
} from "../directory-table/directoryTable";
import useToaster from "../../components/ui/Toaster";
import styles from "./FAQ.module.css";

function extractFaqs(payload) {
  if (Array.isArray(payload?.message)) return payload.message;
  if (Array.isArray(payload?.data?.faqs)) return payload.data.faqs;
  if (Array.isArray(payload?.faqs)) return payload.faqs;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
}

function previewAnswer(answer) {
  if (!answer) return "";
  return String(answer).replace(/\s+/g, " ").trim();
}

function FAQAnswerClamp({ text }) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const ref = useRef(null);

  useLayoutEffect(() => {
    setExpanded(false);
  }, [text]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || expanded) return;
    setOverflows(el.scrollHeight > el.clientHeight + 1);
  }, [text, expanded]);

  return (
    <div>
      <p
        ref={ref}
        className={`${styles.answer} ${expanded ? "" : styles.answerClamped}`.trim()}
      >
        {text || "—"}
      </p>
      {overflows ? (
        <button
          type="button"
          className={styles.toggle}
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      ) : null}
    </div>
  );
}

export default function FAQ() {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [faqToEdit, setFaqToEdit] = useState(null);
  const [faqToDelete, setFaqToDelete] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const { success, error: showError } = useToaster();
  const { data, isLoading, isError, refetch } = useGetAllFAQsQuery();
  const [createFAQ, { isLoading: isCreating }] = useCreateFAQMutation();
  const [updateFAQ, { isLoading: isUpdating }] = useUpdateFAQMutation();
  const [deleteFAQ, { isLoading: isDeleting }] = useDeleteFAQMutation();

  const faqs = extractFaqs(data);

  const filteredFaqs = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return faqs;
    return faqs.filter((faq) => {
      const question = String(faq.question || "").toLowerCase();
      const answer = String(faq.answer || "").toLowerCase();
      return question.includes(q) || answer.includes(q);
    });
  }, [faqs, searchTerm]);

  useEffect(() => {
    if (expandedId == null) return;
    const stillVisible = filteredFaqs.some((faq) => faq.id === expandedId);
    if (!stillVisible) setExpandedId(null);
  }, [filteredFaqs, expandedId]);

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
      if (expandedId === faqToDelete.id) setExpandedId(null);
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

  const toggleExpanded = (id) => {
    setExpandedId((current) => (current === id ? null : id));
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
        <DirectoryTableWrap
          toolbar={
            <DirectoryToolbar>
              <DirectorySearch
                id="faq-search"
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search by question or answer…"
                aria-label="Search FAQs"
              />
            </DirectoryToolbar>
          }
        >
          {filteredFaqs.length === 0 ? (
            <p className={styles.empty}>
              {searchTerm.trim()
                ? "No FAQs match your search."
                : "No FAQs yet. Click Add to create your first FAQ."}
            </p>
          ) : (
            filteredFaqs.map((faq) => {
              const isOpen = expandedId === faq.id;
              const preview = previewAnswer(faq.answer);

              return (
                <div key={faq.id} className={styles.item}>
                  <DirectoryListRow
                    active={isOpen}
                    className={styles.row}
                    onClick={() => toggleExpanded(faq.id)}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isOpen}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleExpanded(faq.id);
                      }
                    }}
                  >
                    <div className={styles.rowMain}>
                      <TbChevronDown
                        size={18}
                        className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ""}`.trim()}
                        aria-hidden="true"
                      />
                      <div className={styles.question}>
                        <p className={styles.questionTitle} title={faq.question}>
                          {faq.question || "—"}
                        </p>
                        {!isOpen && preview ? (
                          <p className={styles.questionMeta}>{preview}</p>
                        ) : null}
                        {faq.id != null && faq.id !== "" ? (
                          <p className={styles.questionId}>ID {faq.id}</p>
                        ) : null}
                      </div>
                    </div>

                    <DirectoryActions
                      className={styles.actions}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <DirectoryActionEdit onClick={() => handleEdit(faq)} />
                      <DirectoryActionDelete onClick={() => handleDelete(faq)} />
                    </DirectoryActions>
                  </DirectoryListRow>

                  {isOpen ? (
                    <div className={styles.panel}>
                      <p className={styles.answerLabel}>Answer</p>
                      <FAQAnswerClamp text={faq.answer} />
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
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
