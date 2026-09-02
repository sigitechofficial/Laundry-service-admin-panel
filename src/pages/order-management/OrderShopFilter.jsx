import { useMemo } from "react";
import { useGetShopsDataQuery } from "../../store/services/api";
import FilterDetails from "./FilterDetails";
import styles from "./orderList.module.css";

/**
 * Shop dropdown for the order list. The value sent up is `shopAddressId`
 * (addressDb.id) because that is what `booking.laundryShopId` stores — filtering
 * by `bussinessInformation.id` would never match.
 */
export default function OrderShopFilter({ value, onChange }) {
  const { data: shopsRes } = useGetShopsDataQuery();

  const shopOptions = useMemo(() => {
    const shops = shopsRes?.data?.AllShopsData || [];
    return [
      { value: "", label: "All shops" },
      ...shops
        .map((s) => ({
          value: String(s.shopAddressId ?? ""),
          label: s.shopName || `Shop ${s.id}`,
        }))
        .filter((opt) => opt.value !== ""),
    ];
  }, [shopsRes?.data?.AllShopsData]);

  const selected = shopOptions.find(
    (opt) => String(opt.value) === String(value || "")
  );
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
            <path d="M3 9l1-5h16l1 5M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9M4 9h16M9 20v-6h6v6" />
          </svg>
          <span className="max-w-[140px] truncate">{selected?.label || "All shops"}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-4 w-4 text-[#8a94a2] transition group-open:rotate-180">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </summary>
      }
      panelClassName="absolute left-0 z-30 mt-2 max-h-[320px] min-w-[220px] overflow-auto rounded-xl border border-[#e6e9f0] bg-white p-1.5 shadow-[0_20px_48px_-16px_rgba(16,21,31,.34)]"
    >
      <p className="px-2.5 pb-1 pt-2 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#5c6673]">Shop</p>
      {shopOptions.map((opt) => {
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
