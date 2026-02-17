export default function StatCard({
  title,
  value,
  bgColor = "gray.100",
  titleColor = "#101828",
  onClick,
}) {
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-lg !px-3.5 !py-3 2xl:!py-5 font-Inter h-[122px] 2xl:!h-[140px] flex flex-col justify-between ${bgColor}`}
    >
      <h6
        className="font-semibold text-sm 2xl:text-base uppercase tracking-wide line-clamp-2"
        style={{ color: titleColor }}
      >
        {title}
      </h6>
      <p className="font-bold text-lg 2xl:text-xl mt-1" style={{ color: titleColor }}>
        {value}
      </p>
    </div>
  );
}
