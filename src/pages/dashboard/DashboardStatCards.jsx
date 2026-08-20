import FigureShimmer from "./FigureShimmer";

const TONE = {
  accent: "before:bg-[var(--accent)] [--abg:var(--accent-tint)] [--a:var(--accent)]",
  blue: "before:bg-[var(--info)] [--abg:var(--info-bg)] [--a:var(--info)]",
  green: "before:bg-[var(--success)] [--abg:var(--success-bg)] [--a:var(--success)]",
  violet: "before:bg-[#5f47c4] [--abg:#efeafe] [--a:#5f47c4]",
  amber: "before:bg-[var(--warning)] [--abg:var(--warning-bg)] [--a:var(--warning)]",
  slate: "before:bg-[var(--muted)] [--abg:var(--slate-bg,#eef1f6)] [--a:var(--muted)]",
};

export function DashboardCard({
  Icon,
  title,
  total,
  description,
  hint,
  tone = "accent",
  loading = false,
  onClick,
  className = "",
  ...rest
}) {
  const Tag = onClick ? "button" : "article";
  const secondary = hint ?? description;

  return (
    <Tag
      type={onClick ? "button" : undefined}
      title={description}
      onClick={onClick}
      className={[
        "relative w-full overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-[18px] text-left font-[inherit] text-[inherit] shadow-[0_1px_2px_rgba(16,21,31,0.04)] transition-[box-shadow,transform] duration-150",
        "before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:content-['']",
        TONE[tone] || TONE.accent,
        onClick
          ? "cursor-pointer hover:-translate-y-px hover:shadow-[0_10px_26px_-16px_rgba(16,21,31,0.35)]"
          : "cursor-default",
        className,
      ].join(" ")}
      {...rest}
    >
      <div className="mb-[13px] flex items-center justify-between gap-3">
        <p className="m-0 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--muted)]">
          {title}
        </p>
        {Icon ? (
          <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[9px] bg-[var(--abg)] text-[var(--a)]">
            <Icon size={18} />
          </span>
        ) : null}
      </div>
      {loading ? (
        <FigureShimmer width={132} height={30} radius={8} />
      ) : (
        <p className="m-0 text-[29px] font-bold leading-none tracking-[-1px] text-[var(--ink)] [font-variant-numeric:tabular-nums]">
          {total}
        </p>
      )}
      {secondary ? (
        <p className="mt-2.5 mb-0 text-[12.5px] text-[var(--muted)]">
          {loading ? <FigureShimmer width={148} height={12} radius={4} /> : secondary}
        </p>
      ) : null}
    </Tag>
  );
}

export function DashboardMiniCard(props) {
  return <DashboardCard {...props} />;
}
