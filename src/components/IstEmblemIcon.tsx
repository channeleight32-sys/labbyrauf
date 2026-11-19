import React from "react";
import labEmblemIcon from "../assets/images/ist_islamabad_icon_1794907770384.jpg";

interface IstEmblemIconProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  glow?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<IstEmblemIconProps["size"]>, string> = {
  xs: "w-6 h-6 rounded-md",
  sm: "w-8 h-8 rounded-lg",
  md: "w-10 h-10 rounded-xl",
  lg: "w-14 h-14 rounded-2xl",
  xl: "w-20 h-20 rounded-2xl",
};

export default function IstEmblemIcon({
  size = "sm",
  glow = false,
  className = "",
}: IstEmblemIconProps) {
  return (
    <span
      className={`relative inline-flex items-center justify-center shrink-0 overflow-hidden bg-[#0B1220] border border-[#35BDF2]/45 ${
        SIZE_CLASSES[size]
      } ${
        glow
          ? "shadow-[0_0_18px_rgba(53,189,242,0.28)]"
          : "shadow-sm"
      } ${className}`}
      title="Circuit & Logic Lab"
    >
      <img
        src={labEmblemIcon}
        alt="Circuit & Logic Lab Emblem"
        referrerPolicy="no-referrer"
        className="w-full h-full object-cover object-center select-none pointer-events-none"
      />
    </span>
  );
}
