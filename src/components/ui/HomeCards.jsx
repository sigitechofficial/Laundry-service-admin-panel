export default function HomeCards(props) {
  const {
    Icon,
    bgColor,
    iconBg,
    iconColor,
    title,
    total,
    description,
    ...rest
  } = props;

  return (
    <div
      {...rest}
      title={description}
      className={`${bgColor} !p-3 2xl:!p-6 rounded-xl border bg-white/60 border-white backdrop-blur-md shadow-lg`}
    >
      <div className="flex flex-col">
        <div
          className={`flex justify-center items-center ${iconBg} h-12 w-12 rounded-xl !mb-4`}
        >
          <Icon size={24} color={iconColor} />
        </div>
        <h2 className="text-secondary font-Inter text-sm !mb-2">{title}</h2>
        <p className="text-dark text-xl 2xl:text-3xl font-Inter font-semibold">
          {/* {props?.title?.toLowerCase()?.includes("revenue")
            ? `${props?.currecncyunit ? props?.currecncyunit:'£'}${(parseFloat(props?.total))?.toFixed(2)}`
            : props?.total} */}
          {total}
        </p>
      </div>
    </div>
  );
}
