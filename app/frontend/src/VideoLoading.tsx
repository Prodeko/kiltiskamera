import React, { useEffect, useState } from "react";
import LoadingSpinner from "./LoadingSpinner";

type BgColor = "#1D4ED8" | "#B91C1C" | "#C2410C" | "#ecd000" | "#15803D";

const bgColors: BgColor[] = [
  "#1D4ED8",
  "#B91C1C",
  "#C2410C",
  "#ecd000",
  "#15803D",
];

const VideoLoading = () => {
  const [bgColor, setBgColor] = useState<BgColor>(bgColors[0]);

  useEffect(() => {
    const interval = setInterval(() => {
      setBgColor(bgColors[(bgColors.indexOf(bgColor) + 1) % bgColors.length]);
    }, 1000);
    return () => clearInterval(interval);
  }, [bgColor]);

  return (
    <div
      className={`w-full h-full flex items-center justify-center transition-all duration-700`}
      style={{ backgroundColor: bgColor }}
    >
      <LoadingSpinner />
    </div>
  );
};

export default VideoLoading;
