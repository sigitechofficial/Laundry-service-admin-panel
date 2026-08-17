import FigureShimmer from "./FigureShimmer";

export default function HomeMiniCards({
  title,
  total,
  description,
  Icon,
  loading = false,
  ...rest
}) {
  return (
    <div
      {...rest}
      title={description}
      className="!p-2.5 2xl:!p-5 shadow-lg rounded-xl font-Inter"
    >
      <div className="flex justify-between items-start gap-y-4 gap-x-2">
        <div className="flex justify-center items-center gap-x-3">
          {Icon && <Icon size={24} className="text-dark" />}
          <p className="2xl:text-xl font-semibold">{title}</p>
        </div>
        {loading ? (
          <FigureShimmer width={72} height={22} />
        ) : (
          <div className="text-sm 2xl:text-xl font-semibold text-blue50">
            {total}
          </div>
        )}
      </div>
    </div>
  );
}
