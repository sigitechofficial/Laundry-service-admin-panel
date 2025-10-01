export default function StatCard({
  title,
  value,
  bgColor = "gray.100",
  titleColor = "#000",
  onClick,
}) {
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-lg !px-3.5 !py-3 2xl:!py-5 font-Inter !h-[122px] flex flex-col justify-between ${bgColor}`}
    >
      <h6
        className={`font-semibold 2xl:text-lg uppercase text-[${titleColor}] `}
      >
        {title}
      </h6>
      <p className="font-medium text-lg 2xl:text-[22px]">{value}</p>
    </div>
  );
}
