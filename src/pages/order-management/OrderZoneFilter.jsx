import { useMemo } from "react";
import { useGetAllZonesQuery } from "../../store/services/api";
import FilterDetails from "./FilterDetails";
import styles from "./orderList.module.css";

function normalizeZones(data) {
  const raw = Array.isArray(data) ? data : data?.zones ?? data?.data ?? [];
  return Array.isArray(raw) ? raw : [];
}

export default function OrderZoneFilter({ value, onChange }) {
  const { data: zonesRes } = useGetAllZonesQuery();

  const zoneOptions = useMemo(() => {
    const zones = normalizeZones(zonesRes?.data);
    return [
      { value: "", label: "All zones" },
      ...zones
        .map((z) => ({
          value: String(z.id ?? z.zoneId ?? ""),
          label: z.name ?? z.zoneName ?? String(z.id ?? z.zoneId ?? ""),
        }))
        .filter((opt) => opt.value !== ""),
    ];
  }, [zonesRes?.data]);

  const selected = zoneOptions.find((opt) => String(opt.value) === String(value || ""));
  const active = Boolean(value);

  return (
    <FilterDetails
      summary={
        <summary
          className={`${styles.tool} list-none cursor-pointer hover:bg-[#f4f5f8] [&::-webkit-details-marker]:hidden ${
            active ? "border-[#2c3ba0] bg-[#eef0fb] text-[#20307f]" : ""
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-[#5c6673]">
            <path d="M12 21s-7-4.5-7-10a7 7 0 0 1 14 0c0 5.5-7 10-7 10Z" />
            <circle cx="12" cy="11" r="2.4" />
          </svg>
          <span className="max-w-[120px] truncate">{selected?.label || "All zones"}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-4 w-4 text-[#8a94a2] transition group-open:rotate-180">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </summary>
      }
      panelClassName="absolute left-0 z-30 mt-2 min-w-[212px] rounded-xl border border-[#e6e9f0] bg-white p-1.5 shadow-[0_20px_48px_-16px_rgba(16,21,31,.34)]"
    >
      <p className="px-2.5 pb-1 pt-2 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#5c6673]">Zone</p>
      {zoneOptions.map((opt) => {
        const on = String(opt.value) === String(value || "");
        return (
          <button
            key={opt.value || "all"}
            type="button"
            onClick={(e) => {
              onChange?.(opt.value);
              e.currentTarget.closest("details")?.removeAttribute("open");
            }}
            className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13.5px] ${
              on ? "bg-[#eef0fb] font-semibold text-[#20307f]" : "text-[#38424f] hover:bg-[#f4f5f8]"
            }`}
          >
            <span className="flex-1">{opt.label}</span>
            {on ? <span className="font-bold text-[#2c3ba0]">✓</span> : null}
          </button>
        );
      })}
    </FilterDetails>
  );
}
