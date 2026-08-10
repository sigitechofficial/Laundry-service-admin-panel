import { useMemo } from "react";
import SelectField from "../../components/ui/SelectField";
import { useGetAllZonesQuery } from "../../store/services/api";

function normalizeZones(data) {
  const raw = Array.isArray(data) ? data : data?.zones ?? data?.data ?? [];
  return Array.isArray(raw) ? raw : [];
}

export default function OrderZoneFilter({ value, onChange }) {
  const { data: zonesRes } = useGetAllZonesQuery();

  const zoneOptions = useMemo(() => {
    const zones = normalizeZones(zonesRes?.data);
    return zones
      .map((z) => ({
        value: String(z.id ?? z.zoneId ?? ""),
        label: z.name ?? z.zoneName ?? String(z.id ?? z.zoneId ?? ""),
      }))
      .filter((opt) => opt.value !== "");
  }, [zonesRes?.data]);

  return (
    <SelectField
      onChange={(e) => onChange?.(e.target.value)}
      options={zoneOptions}
      value={value || ""}
      placeholder="All zones"
      width="160px"
      radius="4px"
      height="44px"
      bgcolor="grey.60"
    />
  );
}

/** Spread into RTK order list queries: `{ page, limit, ...orderListZoneQueryArg(zoneId) }` */
export function orderListZoneQueryArg(zoneId) {
  if (zoneId == null || String(zoneId).trim() === "") return {};
  return { zoneId: String(zoneId) };
}
