import styles from "./orderList.module.css";

function IconCart() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]">
      <path d="M6 6h15l-1.5 9H7.5zM6 6 5 3H2M9 20a1 1 0 1 0 0 .01M18 20a1 1 0 1 0 0 .01" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]">
      <path d="M12 6v6l4 2" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

function IconRepeat() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]">
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" />
    </svg>
  );
}

function IconDownload() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path d="M12 3v12M8 11l4 4 4-4M4 21h16" />
    </svg>
  );
}

function IconPlusMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

const TONES = {
  brand: { line: "bg-[#2c3ba0]", icon: "bg-[#eef0fb] text-[#2c3ba0]", Icon: IconCart },
  danger: { line: "bg-[#c9403f]", icon: "bg-[#fdecec] text-[#c9403f]", Icon: IconPlus },
  navy: { line: "bg-[#20307f]", icon: "bg-[#e8effe] text-[#2a63d6]", Icon: IconClock },
  warning: { line: "bg-[#2a63d6]", icon: "bg-[#e8effe] text-[#2a63d6]", Icon: IconClock },
  success: { line: "bg-[#0b8a5e]", icon: "bg-[#e2f3ea] text-[#0b8a5e]", Icon: IconRepeat },
  neutral: { line: "bg-[#5c6673]", icon: "bg-[#eef1f6] text-[#5c6673]", Icon: IconClock },
};

export function OrderPageHeader({ title, description, actions }) {
  return (
    <header className={styles.pageHead}>
      <div className="min-w-0">
        <h1 className="text-[22px] font-bold tracking-[-0.4px] text-[#0e131c]">{title}</h1>
        <p className="mt-1 max-w-3xl text-[13.5px] leading-5 text-[#5c6673]">{description}</p>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function OrderHeaderActions({ onExport, showNewOrder = true }) {
  return (
    <>
      {onExport ? (
        <button
          type="button"
          onClick={onExport}
          className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#d7dce4] bg-white px-4 text-[13.5px] font-semibold text-[#38424f] hover:bg-[#f4f5f8]"
        >
          <IconDownload />
          Export
        </button>
      ) : null}
      {showNewOrder ? (
        <button
          type="button"
          disabled
          title="Orders are placed by customers — admin create is not available"
          className="inline-flex h-10 cursor-not-allowed items-center gap-2 rounded-[10px] border border-[#2c3ba0] bg-[#2c3ba0] px-4 text-[13.5px] font-semibold text-white opacity-60 shadow-[0_10px_20px_-12px_rgba(44,59,160,.7)]"
        >
          <IconPlusMark />
          New order
        </button>
      ) : null}
    </>
  );
}

export function OrderMetrics({ items }) {
  return (
    <section className={styles.metrics} aria-label="Order metrics">
      {items.map((item, index) => {
        const tone = TONES[item.tone || (index === 0 ? "brand" : "neutral")];
        const Icon = item.icon || tone.Icon;
        return (
          <article key={item.label} className={styles.metricCard}>
            <span className={`${styles.metricBar} ${tone.line}`} aria-hidden="true" />
            <div className={styles.metricTop}>
              <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#5c6673]">{item.label}</p>
              <span className={`${styles.metricIcon} ${tone.icon}`} aria-hidden="true">
                <Icon />
              </span>
            </div>
            <p className="text-[29px] font-bold leading-none tracking-[-1px] text-[#0e131c] tabular-nums">
              {Number(item.value || 0).toLocaleString("en-GB")}
            </p>
            {item.hint ? <p className="mt-2 text-[12.5px] text-[#5c6673]">{item.hint}</p> : null}
          </article>
        );
      })}
    </section>
  );
}

export function OrderError({ children }) {
  return (
    <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
      {children}
    </div>
  );
}

export function OrderTablePanel({ children }) {
  return <section className={styles.panel}>{children}</section>;
}
