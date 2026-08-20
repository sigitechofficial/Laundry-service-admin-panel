export const Delay = ({ size = "5vw", width = "100%", height = "100%" }) => (
  <div
    className="flex items-center justify-center"
    style={{ minHeight: width, maxHeight: height, width: "100%" }}
  >
    <span
      className="inline-block animate-spin rounded-full border-2 border-[#000099]/20 border-t-[#000099]"
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    />
  </div>
);

export const DelayFull = () => (
  <div className="flex min-h-screen max-h-screen items-center justify-center">
    <Delay />
  </div>
);

export const MiniLoader = ({ size = "50px" }) => (
  <div className="flex items-center justify-center">
    <Delay size={size} />
  </div>
);
