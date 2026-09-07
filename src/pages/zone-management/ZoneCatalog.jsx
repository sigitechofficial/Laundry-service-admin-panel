import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Field, Input, PageHeader, Select } from "../../design-system";
import { Delay } from "../../components/shared/Loaders";
import useToaster from "../../components/ui/Toaster";
import {
  useGetAllZonesQuery,
  useGetZoneCatalogQuery,
  useUpsertZoneCatalogOverrideMutation,
  useResetZoneCatalogOverrideMutation,
  useCopyZoneCatalogOverridesMutation,
} from "../../store/services/api";
import { zonesArrayFromGetZonesResponse } from "../../utilities/zonesList";

const CARD = {
  padding: 16,
  border: "1px solid #e6e9f0",
  borderRadius: 16,
  background: "#fff",
  marginBottom: 12,
};

export default function ZoneCatalog() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToaster();
  const [zoneId, setZoneId] = useState("");
  const [fromZoneId, setFromZoneId] = useState("");
  const { data: zonesRes } = useGetAllZonesQuery();
  const zones = useMemo(
    () => zonesArrayFromGetZonesResponse(zonesRes),
    [zonesRes]
  );
  const { data, isLoading, isError, refetch } = useGetZoneCatalogQuery(zoneId, {
    skip: !zoneId,
  });
  const [upsert, { isLoading: saving }] = useUpsertZoneCatalogOverrideMutation();
  const [reset, { isLoading: resetting }] = useResetZoneCatalogOverrideMutation();
  const [copyFrom, { isLoading: copying }] = useCopyZoneCatalogOverridesMutation();

  const catalog = data?.data || {};
  const services = catalog.services || [];
  const addOnCategories = catalog.addOnCategories || [];
  const repair = catalog.repair || [];
  const busy = saving || resetting;

  const save = async (body, okMsg) => {
    try {
      await upsert({ zoneId, body }).unwrap();
      success(okMsg);
    } catch (err) {
      toastError(err?.data?.message || "Could not save");
    }
  };

  const resetRow = async (body, okMsg) => {
    try {
      await reset({ zoneId, body }).unwrap();
      success(okMsg || "Reset to master");
    } catch (err) {
      toastError(err?.data?.message || "Could not reset");
    }
  };

  const handleCopy = async () => {
    if (!fromZoneId || !zoneId) return;
    try {
      await copyFrom({
        zoneId,
        body: { fromZoneId, replace: false },
      }).unwrap();
      success("Copied overlays from the other zone");
    } catch (err) {
      toastError(err?.data?.message || "Copy failed");
    }
  };

  return (
    <div>
      <PageHeader
        title="Zone Catalog"
        description="Master items stay global. Here you only override price, visibility, and item↔add-on attach for one zone. Empty = inherit master. Shop Services still decide who fulfills."
        actions={
          <Button variant="secondary" onClick={() => navigate("/zone-management")}>
            Zones
          </Button>
        }
      />

      <div style={{ ...CARD, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "end" }}>
        <Field label="Zone">
          <Select
            aria-label="Zone"
            value={zoneId}
            onChange={setZoneId}
            placeholder="Select a zone"
            options={zones.map((z) => ({
              value: String(z.id),
              label: z.name || `Zone ${z.id}`,
            }))}
          />
        </Field>
        <Field label="Copy overlays from">
          <Select
            aria-label="Copy overlays from"
            value={fromZoneId}
            onChange={setFromZoneId}
            disabled={!zoneId}
            placeholder="Another zone"
            options={zones
              .filter((z) => String(z.id) !== String(zoneId))
              .map((z) => ({
                value: String(z.id),
                label: z.name || `Zone ${z.id}`,
              }))}
          />
        </Field>
        <Button
          variant="secondary"
          disabled={!fromZoneId || copying}
          onClick={handleCopy}
        >
          {copying ? "Copying…" : "Copy overlays"}
        </Button>
      </div>

      {!zoneId ? (
        <p className="jd-lead">Pick a zone to see inherited vs overridden prices.</p>
      ) : isLoading ? (
        <Delay />
      ) : isError ? (
        <div>
          <p className="jd-lead">Could not load this zone catalog.</p>
          <Button variant="secondary" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <>
          <p className="jd-lead" style={{ marginBottom: 12 }}>
            Overlays {catalog.overlaysEnabled ? "ON" : "OFF (customers still pay master)"}.
            Hidden rows stay here so you can show them again. Staged prices apply only after
            Runtime Settings → Zone catalog overlays is on.
          </p>

          {services.map((svc) => (
            <div key={svc.serviceId} style={CARD}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <strong>{svc.name}</strong>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    {svc.inherited ? "Inherited" : "Overridden"} ·{" "}
                    {svc.isEnabled ? "Visible" : "Hidden"}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() =>
                    save(
                      {
                        type: "service",
                        serviceId: svc.serviceId,
                        entityId: svc.serviceId,
                        isEnabled: !svc.isEnabled,
                      },
                      svc.isEnabled ? "Service hidden in zone" : "Service enabled in zone"
                    )
                  }
                >
                  {svc.isEnabled ? "Hide in zone" : "Show in zone"}
                </Button>
              </div>
              {(svc.categories || []).map((cat) => (
                <div key={cat.categoryId} style={{ marginTop: 12 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      marginBottom: 6,
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>{cat.name}</span>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() =>
                        save(
                          {
                            type: "category",
                            categoryId: cat.categoryId,
                            entityId: cat.categoryId,
                            isEnabled: !cat.isEnabled,
                          },
                          cat.isEnabled ? "Category hidden" : "Category shown"
                        )
                      }
                    >
                      {cat.isEnabled ? "Hide category" : "Show category"}
                    </Button>
                  </div>
                  {(cat.items || []).map((item) => (
                    <ItemRow
                      key={`${item.subCategoryId}-${item.price}-${item.isEnabled}-${item.staged}`}
                      item={item}
                      disabled={busy}
                      onSave={(price) =>
                        save(
                          {
                            type: "item",
                            subCategoryId: item.subCategoryId,
                            entityId: item.subCategoryId,
                            price,
                          },
                          "Zone price saved"
                        )
                      }
                      onReset={() =>
                        resetRow({ type: "item", entityId: item.subCategoryId })
                      }
                      onAttach={(addOnCategoryId, isEnabled) =>
                        save(
                          {
                            type: "attach",
                            subCategoryId: item.subCategoryId,
                            addOnCategoryId,
                            isEnabled,
                          },
                          isEnabled ? "Add-on attached" : "Add-on hidden on this item"
                        )
                      }
                    />
                  ))}
                </div>
              ))}
            </div>
          ))}

          {addOnCategories.length > 0 ? (
            <div style={CARD}>
              <strong>Add-ons</strong>
              <p className="jd-lead">Zone prices and visibility for add-on services.</p>
              {addOnCategories.map((cat) => (
                <div key={cat.addOnCategoryId} style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    {cat.name}{" "}
                    <span style={{ fontWeight: 400, color: "#6b7280" }}>
                      {cat.inherited ? "Inherited" : "Overridden"}
                    </span>
                  </div>
                  {(cat.addOns || []).map((addon) => (
                    <PriceRow
                      key={`${addon.addOnServiceId}-${addon.price}-${addon.isEnabled}-${addon.staged}`}
                      name={addon.name}
                      price={addon.price}
                      inherited={addon.priceInherited}
                      staged={addon.staged}
                      hidden={!addon.isEnabled}
                      disabled={busy}
                      onToggle={() =>
                        save(
                          {
                            type: "addOn",
                            addOnServiceId: addon.addOnServiceId,
                            entityId: addon.addOnServiceId,
                            isEnabled: !addon.isEnabled,
                          },
                          addon.isEnabled ? "Add-on hidden in zone" : "Add-on shown in zone"
                        )
                      }
                      onSave={(price) =>
                        save(
                          {
                            type: "addOn",
                            addOnServiceId: addon.addOnServiceId,
                            entityId: addon.addOnServiceId,
                            price,
                          },
                          "Add-on price saved"
                        )
                      }
                      onReset={() =>
                        resetRow({ type: "addOn", entityId: addon.addOnServiceId })
                      }
                    />
                  ))}
                </div>
              ))}
            </div>
          ) : null}

          {repair.length > 0 ? (
            <div style={CARD}>
              <strong>Repair</strong>
              <p className="jd-lead">Zone prices and visibility for repair options.</p>
              {repair.map((garment) => (
                <div key={garment.repairGarmentId} style={{ marginTop: 12 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      marginBottom: 6,
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>{garment.name}</span>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() =>
                        save(
                          {
                            type: "repairGarment",
                            repairGarmentId: garment.repairGarmentId,
                            entityId: garment.repairGarmentId,
                            isEnabled: !garment.isEnabled,
                          },
                          garment.isEnabled ? "Garment hidden" : "Garment shown"
                        )
                      }
                    >
                      {garment.isEnabled ? "Hide garment" : "Show garment"}
                    </Button>
                  </div>
                  {(garment.options || []).map((opt) => (
                    <PriceRow
                      key={`${opt.repairOptionId}-${opt.price}-${opt.isEnabled}-${opt.staged}`}
                      name={opt.name}
                      price={opt.price}
                      inherited={opt.priceInherited}
                      staged={opt.staged}
                      hidden={!opt.isEnabled}
                      disabled={busy}
                      onToggle={() =>
                        save(
                          {
                            type: "repairOption",
                            repairOptionId: opt.repairOptionId,
                            entityId: opt.repairOptionId,
                            isEnabled: !opt.isEnabled,
                          },
                          opt.isEnabled ? "Repair option hidden" : "Repair option shown"
                        )
                      }
                      onSave={(price) =>
                        save(
                          {
                            type: "repairOption",
                            repairOptionId: opt.repairOptionId,
                            entityId: opt.repairOptionId,
                            price,
                          },
                          "Repair price saved"
                        )
                      }
                      onReset={() =>
                        resetRow({
                          type: "repairOption",
                          entityId: opt.repairOptionId,
                        })
                      }
                    />
                  ))}
                </div>
              ))}
            </div>
          ) : null}

          {services.length === 0 ? (
            <p className="jd-lead">No services in this zone catalog.</p>
          ) : null}
        </>
      )}
    </div>
  );
}

function ItemRow({ item, disabled, onSave, onReset, onAttach }) {
  const [price, setPrice] = useState(String(item.price ?? ""));
  return (
    <div
      style={{
        padding: "8px 0",
        borderBottom: "1px solid #f1f4f8",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
        }}
      >
        <div style={{ flex: "1 1 160px" }}>
          <div style={{ fontSize: 13 }}>{item.name}</div>
          <div style={{ fontSize: 11, color: "#6b7280" }}>
            {item.staged
              ? "Staged override (flag off)"
              : item.priceInherited
                ? "Inherited master"
                : "Zone override"}
            {item.isEnabled ? "" : " · Hidden"}
          </div>
        </div>
        <Input
          type="number"
          min={0}
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          style={{ width: 110 }}
        />
        <Button size="sm" disabled={disabled} onClick={() => onSave(price)}>
          Save
        </Button>
        {!item.priceInherited ? (
          <Button size="sm" variant="secondary" disabled={disabled} onClick={onReset}>
            Reset
          </Button>
        ) : null}
      </div>
      {(item.attach || []).length > 0 ? (
        <div style={{ marginTop: 6, fontSize: 12 }}>
          <span style={{ color: "#6b7280" }}>Add-ons on this item: </span>
          {(item.attach || []).map((link) => (
            <button
              key={link.addOnCategoryId}
              type="button"
              disabled={disabled}
              onClick={() => onAttach(link.addOnCategoryId, !link.isEnabled)}
              style={{
                margin: "0 6px 4px 0",
                padding: "2px 8px",
                borderRadius: 999,
                border: "1px solid #d7dde7",
                background: link.isEnabled ? "#eef6ff" : "#f3f4f6",
                color: link.isEnabled ? "#1d4ed8" : "#6b7280",
                cursor: "pointer",
              }}
            >
              {link.name}
              {link.inherited ? "" : link.isEnabled ? " · on" : " · hidden"}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PriceRow({
  name,
  price: initial,
  inherited,
  staged,
  hidden,
  disabled,
  onSave,
  onReset,
  onToggle,
}) {
  const [price, setPrice] = useState(String(initial ?? ""));
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        alignItems: "center",
        padding: "6px 0",
        borderBottom: "1px solid #f1f4f8",
      }}
    >
      <div style={{ flex: "1 1 160px" }}>
        <div style={{ fontSize: 13 }}>{name}</div>
        <div style={{ fontSize: 11, color: "#6b7280" }}>
          {staged
            ? "Staged override (flag off)"
            : inherited
              ? "Inherited master"
              : "Zone override"}
          {hidden ? " · Hidden" : ""}
        </div>
      </div>
      <Input
        type="number"
        min={0}
        step="0.01"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        style={{ width: 110 }}
      />
      <Button size="sm" disabled={disabled} onClick={() => onSave(price)}>
        Save
      </Button>
      {onToggle ? (
        <Button size="sm" variant="secondary" disabled={disabled} onClick={onToggle}>
          {hidden ? "Show" : "Hide"}
        </Button>
      ) : null}
      {!inherited ? (
        <Button size="sm" variant="secondary" disabled={disabled} onClick={onReset}>
          Reset
        </Button>
      ) : null}
    </div>
  );
}
