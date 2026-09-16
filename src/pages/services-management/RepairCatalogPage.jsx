import { useMemo, useState } from "react";
import {
  Button,
  Field,
  Input,
  Table,
  Modal,
} from "../../design-system";
import useToaster from "../../components/ui/Toaster";
import { QueryState } from "./QueryState";
import {
  DirectoryActionDelete,
  DirectoryActionEdit,
  DirectoryActions,
  DirectoryDotPills,
  DirectoryIdentity,
  DirectoryMoney,
  DirectorySearch,
  DirectoryTableWrap,
  DirectoryToolbar,
} from "../directory-table/directoryTable";
import CatalogChrome, { useCatalogScope } from "./catalogChrome";
import ZoneModeGuard from "./ZoneModeGuard";
import { formatAmount } from "../../utilities/formatters";
import {
  useCreateRepairGarmentMutation,
  useCreateRepairOptionMutation,
  useDeleteRepairGarmentMutation,
  useDeleteRepairOptionMutation,
  useGetRepairGarmentsQuery,
  useGetRepairOptionsQuery,
  useSeedRepairCatalogMutation,
  useUpdateRepairGarmentMutation,
  useUpdateRepairOptionMutation,
} from "../../store/services/api";

function unwrapList(res) {
  const d = res?.data !== undefined ? res.data : res;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.garments)) return d.garments;
  if (Array.isArray(d?.options)) return d.options;
  return [];
}

/** Catalog prices have no zone row — use platform default (zone→country→GBP). */
function money(value) {
  return formatAmount(value, null, { applyDefault: true });
}

export default function RepairCatalogPage() {
  const { isZoneMode } = useCatalogScope();
  const { success, error } = useToaster();
  const {
    data: garmentsRes,
    isLoading: garmentsLoading,
    isError: garmentsError,
    error: garmentsQueryError,
    refetch: refetchGarments,
  } = useGetRepairGarmentsQuery(undefined, { skip: isZoneMode });
  const {
    data: optionsRes,
    isLoading: optionsLoading,
    isError: optionsError,
    error: optionsQueryError,
    refetch: refetchOptions,
  } = useGetRepairOptionsQuery(undefined, { skip: isZoneMode });

  const [createGarment, { isLoading: creatingGarment }] =
    useCreateRepairGarmentMutation();
  const [updateGarment, { isLoading: updatingGarment }] =
    useUpdateRepairGarmentMutation();
  const [deleteGarment] = useDeleteRepairGarmentMutation();
  const [createOption, { isLoading: creatingOption }] =
    useCreateRepairOptionMutation();
  const [updateOption, { isLoading: updatingOption }] =
    useUpdateRepairOptionMutation();
  const [deleteOption] = useDeleteRepairOptionMutation();
  const [seedCatalog, { isLoading: seeding }] = useSeedRepairCatalogMutation();

  const garments = useMemo(() => unwrapList(garmentsRes), [garmentsRes]);
  const options = useMemo(() => unwrapList(optionsRes), [optionsRes]);

  const [activeTab, setActiveTab] = useState("repairs");
  const [searchTerm, setSearchTerm] = useState("");

  const [optionModal, setOptionModal] = useState({
    open: false,
    id: null,
    name: "",
    price: "",
  });

  const [garmentModal, setGarmentModal] = useState({
    open: false,
    id: null,
    name: "",
    repairOptionIds: [],
  });

  const [confirmDelete, setConfirmDelete] = useState(null);

  const isEditingOption = Boolean(optionModal.id);
  const isEditingGarment = Boolean(garmentModal.id);
  const savingOption = creatingOption || updatingOption;
  const savingGarment = creatingGarment || updatingGarment;

  const openAddOption = () =>
    setOptionModal({ open: true, id: null, name: "", price: "" });

  const openEditOption = (opt) =>
    setOptionModal({
      open: true,
      id: opt.id,
      name: opt.name || "",
      price: String(opt.price ?? ""),
    });

  const closeOptionModal = () =>
    setOptionModal({ open: false, id: null, name: "", price: "" });

  const openAddGarment = () => {
    if (!options.length) {
      error("Add at least one repair first (Repairs tab), then create a garment.");
      setActiveTab("repairs");
      return;
    }
    setGarmentModal({
      open: true,
      id: null,
      name: "",
      repairOptionIds: options.map((o) => o.id),
    });
  };

  const openEditGarment = (g) =>
    setGarmentModal({
      open: true,
      id: g.id,
      name: g.name || "",
      repairOptionIds:
        g.repairOptionIds || (g.options || []).map((o) => o.id) || [],
    });

  const closeGarmentModal = () =>
    setGarmentModal({
      open: false,
      id: null,
      name: "",
      repairOptionIds: [],
    });

  const toggleGarmentOption = (optionId) => {
    setGarmentModal((prev) => {
      const ids = prev.repairOptionIds.includes(optionId)
        ? prev.repairOptionIds.filter((id) => id !== optionId)
        : [...prev.repairOptionIds, optionId];
      return { ...prev, repairOptionIds: ids };
    });
  };

  const saveOption = async () => {
    const name = optionModal.name.trim();
    if (!name) return error("Repair name is required");
    const price = Number(optionModal.price || 0);
    if (Number.isNaN(price) || price < 0) return error("Enter a valid price");
    try {
      if (optionModal.id) {
        await updateOption({
          repairOptionId: optionModal.id,
          body: { name, price },
        }).unwrap();
        success("Repair option updated");
      } else {
        await createOption({ name, price }).unwrap();
        success("Repair option added");
      }
      closeOptionModal();
    } catch (e) {
      error(e?.data?.message || "Failed to save repair option");
    }
  };

  const saveGarment = async () => {
    const name = garmentModal.name.trim();
    if (!name) return error("Garment name is required");
    if (!garmentModal.repairOptionIds.length) {
      return error("Tick at least one repair to link to this garment");
    }
    try {
      if (garmentModal.id) {
        await updateGarment({
          repairGarmentId: garmentModal.id,
          body: {
            name,
            repairOptionIds: garmentModal.repairOptionIds,
          },
        }).unwrap();
        success("Garment updated");
      } else {
        await createGarment({
          name,
          repairOptionIds: garmentModal.repairOptionIds,
        }).unwrap();
        success("Garment added");
      }
      closeGarmentModal();
    } catch (e) {
      error(e?.data?.message || "Failed to save garment");
    }
  };

  const onSeed = async () => {
    try {
      const result = await seedCatalog().unwrap();
      success(result?.message || result?.data?.message || "Defaults loaded");
    } catch (e) {
      error(e?.data?.message || "Failed to seed catalog");
    }
  };

  const runDelete = async () => {
    if (!confirmDelete) return;
    try {
      if (confirmDelete.type === "option") {
        await deleteOption(confirmDelete.id).unwrap();
        if (optionModal.id === confirmDelete.id) closeOptionModal();
        success("Repair option deleted");
      } else {
        await deleteGarment(confirmDelete.id).unwrap();
        if (garmentModal.id === confirmDelete.id) closeGarmentModal();
        success("Garment deleted");
      }
    } catch (e) {
      error(e?.data?.message || "Delete failed");
    } finally {
      setConfirmDelete(null);
    }
  };

  const optionColumns = [
    {
      key: "name",
      header: "Repair",
      render: (row) => <DirectoryIdentity name={row.name} />,
    },
    {
      key: "price",
      header: "Price",
      render: (row) => <DirectoryMoney>{row.price}</DirectoryMoney>,
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <DirectoryActions>
          <DirectoryActionEdit onClick={() => openEditOption(row)} />
          <DirectoryActionDelete
            onClick={() =>
              setConfirmDelete({ type: "option", id: row.id, label: row.name })
            }
          />
        </DirectoryActions>
      ),
    },
  ];

  const optionRows = options
    .map((opt) => ({
      ...opt,
      price: money(opt.price),
    }))
    .filter((row) => {
      const q = searchTerm.trim().toLowerCase();
      if (!q) return true;
      return String(row.name ?? "").toLowerCase().includes(q);
    });

  const garmentRows = garments.filter((row) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    const linked = (row.options || []).map((o) => o.name).join(" ");
    return `${row.name} ${linked}`.toLowerCase().includes(q);
  });

  const garmentColumns = [
    {
      key: "name",
      header: "Garment",
      render: (row) => <DirectoryIdentity name={row.name} />,
    },
    {
      key: "linked",
      header: "Linked repairs",
      render: (row) => {
        const linked = row.options || [];
        if (!linked.length) {
          return <DirectoryDotPills items={[{ label: "No repairs linked", tone: "warning" }]} />;
        }
        return (
          <DirectoryDotPills
            items={linked.map((o) => ({
              key: o.id,
              label: `${o.name} · ${money(o.price)}`,
              tone: "info",
            }))}
          />
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <DirectoryActions>
          <DirectoryActionEdit onClick={() => openEditGarment(row)} />
          <DirectoryActionDelete
            onClick={() =>
              setConfirmDelete({ type: "garment", id: row.id, label: row.name })
            }
          />
        </DirectoryActions>
      ),
    },
  ];

  return (
    <CatalogChrome
      section="repairs"
      title="Repair catalog"
      description="Priced repair work, then garments that link which repairs customers can choose. Related to Alteration services in the main catalog."
      breadcrumb={["Catalog", "Repairs"]}
      actions={
        isZoneMode ? null : (
        <Button variant="secondary" onClick={onSeed} disabled={seeding}>
          {seeding ? "Loading..." : "Load defaults"}
        </Button>
        )
      }
    >
      {isZoneMode ? <ZoneModeGuard sectionName="Repairs" /> : (
      <>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <Button
          size="sm"
          variant={activeTab === "repairs" ? "primary" : "secondary"}
          onClick={() => setActiveTab("repairs")}
        >
          Repairs ({options.length})
        </Button>
        <Button
          size="sm"
          variant={activeTab === "garments" ? "primary" : "secondary"}
          onClick={() => setActiveTab("garments")}
        >
          Garments ({garments.length})
        </Button>
      </div>

      {activeTab === "repairs" ? (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
              marginBottom: 12,
            }}
          >
            <div>
              <strong>Repairs</strong>
              <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 13 }}>
                Priced repair options customers can select
              </p>
            </div>
            <Button size="sm" onClick={openAddOption}>
              Add repair
            </Button>
          </div>
          {optionsLoading || optionsError ? (
            <QueryState
              loading={optionsLoading}
              error={optionsQueryError || optionsError}
              onRetry={refetchOptions}
              errorLabel="Could not load repair options. Please try again."
            />
          ) : (
            <DirectoryTableWrap
              toolbar={
                <DirectoryToolbar>
                  <DirectorySearch
                    id="repair-option-search"
                    value={searchTerm}
                    onChange={setSearchTerm}
                    placeholder="Search repairs…"
                  />
                </DirectoryToolbar>
              }
            >
              <Table
                columns={optionColumns}
                rows={optionRows}
                rowKey={(row) => row.id}
                empty="Add your first repair — example: Hemming at 8.00 in your zone currency. Then switch to Garments to link them."
              />
            </DirectoryTableWrap>
          )}
          {options.length > 0 ? (
            <div style={{ marginTop: 12 }}>
              <Button variant="ghost" size="sm" onClick={() => setActiveTab("garments")}>
                Go to Garments →
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
              marginBottom: 12,
            }}
          >
            <div>
              <strong>Garments</strong>
              <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 13 }}>
                Clothing types · edit to link repairs
              </p>
            </div>
            <Button size="sm" onClick={openAddGarment} disabled={!options.length}>
              Add garment
            </Button>
          </div>
          {!options.length ? (
            <div style={{ padding: 32, textAlign: "center" }}>
              <p style={{ margin: "0 0 12px", color: "var(--muted)" }}>
                Garments need repair options to link. Add at least one repair first.
              </p>
              <Button onClick={() => setActiveTab("repairs")}>Go to Repairs</Button>
            </div>
          ) : garmentsLoading || garmentsError ? (
            <QueryState
              loading={garmentsLoading}
              error={garmentsQueryError || garmentsError}
              onRetry={refetchGarments}
              errorLabel="Could not load garments. Please try again."
            />
          ) : (
            <DirectoryTableWrap
              toolbar={
                <DirectoryToolbar>
                  <DirectorySearch
                    id="repair-garment-search"
                    value={searchTerm}
                    onChange={setSearchTerm}
                    placeholder="Search garments…"
                  />
                </DirectoryToolbar>
              }
            >
              <Table
                columns={garmentColumns}
                rows={garmentRows}
                rowKey={(row) => row.id}
                empty="Add a garment and link repairs — example: Shirt → Hemming, Button resew."
              />
            </DirectoryTableWrap>
          )}
        </div>
      )}

      <Modal
        open={optionModal.open}
        title={isEditingOption ? "Edit repair" : "Add repair"}
        description="A priced service customers can choose (e.g. Hemming, Zip repair)."
        onClose={closeOptionModal}
        secondaryLabel="Cancel"
        primaryLabel={
          savingOption
            ? "Saving…"
            : isEditingOption
              ? "Save changes"
              : "Add repair"
        }
        onPrimary={() => {
          if (savingOption) return;
          saveOption();
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Field label="Repair name" htmlFor="repair-name">
            <Input
              id="repair-name"
              placeholder="e.g. Hemming"
              value={optionModal.name}
              onChange={(e) =>
                setOptionModal((p) => ({ ...p, name: e.target.value }))
              }
            />
          </Field>
          <Field label="Price" htmlFor="repair-price">
            <Input
              id="repair-price"
              placeholder="0.00"
              value={optionModal.price}
              onChange={(e) =>
                setOptionModal((p) => ({ ...p, price: e.target.value }))
              }
            />
          </Field>
        </div>
      </Modal>

      <Modal
        open={garmentModal.open}
        title={
          isEditingGarment
            ? "Edit garment & linked repairs"
            : "Add garment & link repairs"
        }
        description="Name the garment, then tick every repair customers should see for it."
        onClose={closeGarmentModal}
        secondaryLabel="Cancel"
        primaryLabel={
          savingGarment
            ? "Saving…"
            : isEditingGarment
              ? "Save changes"
              : "Add garment"
        }
        onPrimary={() => {
          if (savingGarment) return;
          saveGarment();
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Field label="Garment name" htmlFor="garment-name">
            <Input
              id="garment-name"
              placeholder="e.g. Shirt"
              value={garmentModal.name}
              onChange={(e) =>
                setGarmentModal((p) => ({ ...p, name: e.target.value }))
              }
            />
          </Field>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <strong style={{ fontSize: 13 }}>
              Link repairs ({garmentModal.repairOptionIds.length}/{options.length})
            </strong>
            <div style={{ display: "flex", gap: 8 }}>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setGarmentModal((p) => ({
                    ...p,
                    repairOptionIds: options.map((o) => o.id),
                  }))
                }
              >
                Select all
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setGarmentModal((p) => ({ ...p, repairOptionIds: [] }))
                }
              >
                Clear
              </Button>
            </div>
          </div>

          {options.length === 0 ? (
            <p style={{ color: "var(--muted)", margin: 0 }}>
              No repair options available. Close this and add repairs first.
            </p>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                maxHeight: 280,
                overflowY: "auto",
                padding: 12,
                background: "var(--canvas)",
                borderRadius: "var(--r-md)",
                border: "1px solid var(--line)",
              }}
            >
              {options.map((opt) => (
                <label
                  key={opt.id}
                  style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
                >
                  <input
                    type="checkbox"
                    checked={garmentModal.repairOptionIds.includes(opt.id)}
                    onChange={() => toggleGarmentOption(opt.id)}
                  />
                  <span>
                    {opt.name}{" "}
                    <span style={{ color: "var(--muted)", fontSize: 12 }}>
                      · {money(opt.price)}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={Boolean(confirmDelete)}
        title={`Delete ${confirmDelete?.type === "option" ? "repair" : "garment"}?`}
        description={`“${confirmDelete?.label}” will be removed from the catalog${
          confirmDelete?.type === "option"
            ? " and unlinked from any garments."
            : "."
        }`}
        onClose={() => setConfirmDelete(null)}
        onPrimary={runDelete}
        primaryLabel="Delete"
        secondaryLabel="Cancel"
        danger
      />
      </>
      )}
    </CatalogChrome>
  );
}
