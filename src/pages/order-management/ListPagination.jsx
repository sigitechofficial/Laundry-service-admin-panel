const PAGE_SIZES = [
  { value: 10, label: "10 / page" },
  { value: 25, label: "25 / page" },
  { value: 50, label: "50 / page" },
  { value: 100, label: "100 / page" },
];

export default function ListPagination({
  page,
  pageSize,
  totalRows,
  onPageChange,
  onPageSizeChange,
  noun = "orders",
}) {
  const safePageSize = pageSize || 25;
  const totalPages = Math.max(1, Math.ceil((totalRows || 0) / safePageSize));
  const start = totalRows === 0 ? 0 : (page - 1) * safePageSize + 1;
  const end = Math.min(page * safePageSize, totalRows || 0);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <p className="m-0 text-[13px] text-[#5c6673] tabular-nums">
        {totalRows === 0 ? (
          `No ${noun}`
        ) : (
          <>
            Showing <b className="font-semibold text-[#0e131c]">{start}–{end}</b> of{" "}
            <b className="font-semibold text-[#0e131c]">{totalRows}</b> {noun}
          </>
        )}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <select
          aria-label="Rows per page"
          value={safePageSize}
          onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
          className="h-[34px] rounded-[9px] border border-[#e6e9f0] bg-white px-2 text-[13px] font-medium text-[#38424f]"
        >
          {PAGE_SIZES.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange?.(page - 1)}
          className="grid h-[34px] min-w-[34px] place-items-center rounded-[9px] border border-[#e6e9f0] bg-white text-[#38424f] disabled:cursor-not-allowed disabled:opacity-40 hover:enabled:bg-[#f4f5f8]"
          aria-label="Previous page"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-[15px] w-[15px]">
            <path d="m15 6-6 6 6 6" />
          </svg>
        </button>
        <span className="grid h-[34px] min-w-[34px] place-items-center rounded-[9px] border border-[#2c3ba0] bg-[#2c3ba0] px-2 text-[13px] font-medium text-white">
          {page}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange?.(page + 1)}
          className="grid h-[34px] min-w-[34px] place-items-center rounded-[9px] border border-[#e6e9f0] bg-white text-[#38424f] disabled:cursor-not-allowed disabled:opacity-40 hover:enabled:bg-[#f4f5f8]"
          aria-label="Next page"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-[15px] w-[15px]">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
