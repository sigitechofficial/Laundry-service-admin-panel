import { Box, Typography } from "@mui/material";
import { useMemo, useState } from "react";
import { PiHeadsetBold } from "../../shared/icons/index";
import useToaster from "../../components/ui/Toaster";
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

export default function RepairCatalogPage() {
  const { success, error } = useToaster();
  const { data: garmentsRes, isLoading: garmentsLoading } =
    useGetRepairGarmentsQuery();
  const { data: optionsRes, isLoading: optionsLoading } =
    useGetRepairOptionsQuery();

  const [createGarment] = useCreateRepairGarmentMutation();
  const [updateGarment] = useUpdateRepairGarmentMutation();
  const [deleteGarment] = useDeleteRepairGarmentMutation();
  const [createOption] = useCreateRepairOptionMutation();
  const [updateOption] = useUpdateRepairOptionMutation();
  const [deleteOption] = useDeleteRepairOptionMutation();
  const [seedCatalog, { isLoading: seeding }] = useSeedRepairCatalogMutation();

  const garments = useMemo(
    () => garmentsRes?.data || garmentsRes || [],
    [garmentsRes]
  );
  const options = useMemo(
    () => optionsRes?.data || optionsRes || [],
    [optionsRes]
  );

  const [garmentForm, setGarmentForm] = useState({
    id: null,
    name: "",
    repairOptionIds: [],
  });
  const [optionForm, setOptionForm] = useState({
    id: null,
    name: "",
    price: "",
  });

  const resetGarmentForm = () =>
    setGarmentForm({ id: null, name: "", repairOptionIds: [] });
  const resetOptionForm = () =>
    setOptionForm({ id: null, name: "", price: "" });

  const onSaveOption = async () => {
    const name = optionForm.name.trim();
    if (!name) return error("Option name is required");
    const price = Number(optionForm.price || 0);
    if (Number.isNaN(price) || price < 0) return error("Valid price required");

    try {
      if (optionForm.id) {
        await updateOption({
          repairOptionId: optionForm.id,
          body: { name, price },
        }).unwrap();
        success("Repair option updated");
      } else {
        await createOption({ name, price }).unwrap();
        success("Repair option created");
      }
      resetOptionForm();
    } catch (e) {
      error(e?.data?.message || "Failed to save repair option");
    }
  };

  const onSaveGarment = async () => {
    const name = garmentForm.name.trim();
    if (!name) return error("Garment name is required");
    try {
      if (garmentForm.id) {
        await updateGarment({
          repairGarmentId: garmentForm.id,
          body: {
            name,
            repairOptionIds: garmentForm.repairOptionIds,
          },
        }).unwrap();
        success("Repair garment updated");
      } else {
        await createGarment({
          name,
          repairOptionIds: garmentForm.repairOptionIds,
        }).unwrap();
        success("Repair garment created");
      }
      resetGarmentForm();
    } catch (e) {
      error(e?.data?.message || "Failed to save repair garment");
    }
  };

  const onSeed = async () => {
    try {
      const result = await seedCatalog().unwrap();
      success(result?.message || result?.data?.message || "Seed complete");
    } catch (e) {
      error(e?.data?.message || "Failed to seed catalog");
    }
  };

  const toggleOptionOnGarment = (optionId) => {
    setGarmentForm((prev) => {
      const ids = prev.repairOptionIds.includes(optionId)
        ? prev.repairOptionIds.filter((id) => id !== optionId)
        : [...prev.repairOptionIds, optionId];
      return { ...prev, repairOptionIds: ids };
    });
  };

  return (
    <div className="space-y-8">
      <Box className="flex items-center gap-x-5 justify-between">
        <Box className="flex items-center gap-x-5">
          <Typography color="blue.50">
            <PiHeadsetBold size="24px" color="blue.50" />
          </Typography>
          <Box>
            <Typography variant="h4" fontFamily={"Switzer"} color="grey.20">
              Repair Catalog
            </Typography>
            <Typography variant="body2" color="grey.50" className="mt-1">
              Dedicated garments &amp; repair options for Alteration &amp; Repair.
              Separate from wash categories / add-ons.
            </Typography>
          </Box>
        </Box>
        <button
          onClick={onSeed}
          disabled={seeding}
          className="border border-blue100 text-blue100 hover:bg-blue-50 px-6 py-2.5 rounded-lg font-medium text-sm min-w-[160px] h-[40px]"
        >
          {seeding ? "Seeding…" : "Seed defaults"}
        </button>
      </Box>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="font-semibold text-lg text-gray-800">Repair options</h3>
          <div className="flex gap-2">
            <input
              className="flex-1 border rounded-lg px-3 py-2 text-sm"
              placeholder="Option name (e.g. Hemming)"
              value={optionForm.name}
              onChange={(e) =>
                setOptionForm((p) => ({ ...p, name: e.target.value }))
              }
            />
            <input
              className="w-28 border rounded-lg px-3 py-2 text-sm"
              placeholder="Price"
              value={optionForm.price}
              onChange={(e) =>
                setOptionForm((p) => ({ ...p, price: e.target.value }))
              }
            />
            <button
              onClick={onSaveOption}
              className="bg-blue100 text-white px-4 py-2 rounded-lg text-sm"
            >
              {optionForm.id ? "Update" : "Add"}
            </button>
            {optionForm.id ? (
              <button
                onClick={resetOptionForm}
                className="border px-3 py-2 rounded-lg text-sm"
              >
                Cancel
              </button>
            ) : null}
          </div>

          {optionsLoading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : (
            <ul className="divide-y">
              {(Array.isArray(options) ? options : []).map((opt) => (
                <li
                  key={opt.id}
                  className="py-2 flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {opt.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      £{Number(opt.price || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="text-sm text-blue100"
                      onClick={() =>
                        setOptionForm({
                          id: opt.id,
                          name: opt.name,
                          price: String(opt.price ?? ""),
                        })
                      }
                    >
                      Edit
                    </button>
                    <button
                      className="text-sm text-red-500"
                      onClick={async () => {
                        try {
                          await deleteOption(opt.id).unwrap();
                          success("Option deleted");
                        } catch (e) {
                          error(e?.data?.message || "Delete failed");
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="font-semibold text-lg text-gray-800">Garments</h3>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="Garment name (e.g. Shirt)"
            value={garmentForm.name}
            onChange={(e) =>
              setGarmentForm((p) => ({ ...p, name: e.target.value }))
            }
          />
          <div>
            <p className="text-xs text-gray-500 mb-2">
              Link repair options available for this garment
            </p>
            <div className="flex flex-wrap gap-2">
              {(Array.isArray(options) ? options : []).map((opt) => {
                const selected = garmentForm.repairOptionIds.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleOptionOnGarment(opt.id)}
                    className={`px-3 py-1.5 rounded-full text-xs border ${
                      selected
                        ? "bg-blue-50 border-blue100 text-blue100"
                        : "border-gray-200 text-gray-600"
                    }`}
                  >
                    {opt.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onSaveGarment}
              className="bg-blue100 text-white px-4 py-2 rounded-lg text-sm"
            >
              {garmentForm.id ? "Update garment" : "Add garment"}
            </button>
            {garmentForm.id ? (
              <button
                onClick={resetGarmentForm}
                className="border px-3 py-2 rounded-lg text-sm"
              >
                Cancel
              </button>
            ) : null}
          </div>

          {garmentsLoading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : (
            <ul className="divide-y">
              {(Array.isArray(garments) ? garments : []).map((g) => (
                <li key={g.id} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {g.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {(g.options || []).map((o) => o.name).join(", ") ||
                          "No options linked"}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        className="text-sm text-blue100"
                        onClick={() =>
                          setGarmentForm({
                            id: g.id,
                            name: g.name,
                            repairOptionIds:
                              g.repairOptionIds ||
                              (g.options || []).map((o) => o.id),
                          })
                        }
                      >
                        Edit
                      </button>
                      <button
                        className="text-sm text-red-500"
                        onClick={async () => {
                          try {
                            await deleteGarment(g.id).unwrap();
                            success("Garment deleted");
                          } catch (e) {
                            error(e?.data?.message || "Delete failed");
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
