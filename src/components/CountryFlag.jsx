import { useEffect, useMemo, useState } from "react";
import { joinMediaUrl } from "../utilities/formatters";
import { getCountryFlagFallback, isIsoAlpha2CountryCode } from "../utilities/countryFlag";

export default function CountryFlag({
  imagePath,
  countryCode,
  countryName = "Country",
  width = 36,
  height = 26,
  borderRadius = 4,
}) {
  const imageUrl = useMemo(() => joinMediaUrl(imagePath), [imagePath]);
  const [imageState, setImageState] = useState(imageUrl ? "loading" : "failed");
  const fallback = getCountryFlagFallback(countryCode, countryName);

  useEffect(() => {
    setImageState(imageUrl ? "loading" : "failed");
  }, [imageUrl]);

  const showImage = Boolean(imageUrl) && imageState !== "failed";

  return (
    <span
      style={{
        position: "relative",
        display: "inline-flex",
        flex: `0 0 ${width}px`,
        width,
        height,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        border: "1px solid var(--line)",
        borderRadius,
        background: "var(--surface, #fff)",
        boxSizing: "border-box",
      }}
    >
      <span
        role={showImage ? undefined : "img"}
        aria-hidden={showImage ? true : undefined}
        aria-label={showImage ? undefined : `${countryName} flag`}
        style={{
          fontSize: Math.max(12, Math.min(width, height) * 0.68),
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: fallback.length === 2 && !isIsoAlpha2CountryCode(countryCode)
            ? "0.04em"
            : 0,
          color: "var(--muted)",
        }}
      >
        {fallback}
      </span>
      {showImage ? (
        <img
          src={imageUrl}
          alt={`${countryName} flag`}
          width={width}
          height={height}
          onLoad={() => setImageState("loaded")}
          onError={() => setImageState("failed")}
          style={{
            position: "absolute",
            inset: 0,
            display: "block",
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: imageState === "loaded" ? 1 : 0,
          }}
        />
      ) : null}
    </span>
  );
}
