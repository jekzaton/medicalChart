import Image from "next/image";
import React from "react";

type ShapeProps = {
  position: "top-right" | "bottom-left";
  rotate?: boolean;
};

const Shape = ({ position, rotate }: ShapeProps) => {
  const positionClass =
    position === "top-right"
      ? "top-0 right-0 translate-x-1/4 -translate-y-1/4"
      : "bottom-0 left-0 -translate-x-1/4 translate-y-1/4";

  return (
    <div
      className={`pointer-events-none absolute -z-10 h-[140px] w-[260px] sm:h-[180px] sm:w-[340px] ${positionClass} ${
        rotate ? "rotate-180" : ""
      }`}
    >
      {/* 🌈 Gradient Glow */}
      <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-3xl" />

      {/* Grid */}
      <Image
        src="/images/shape/grid-01.svg"
        alt="grid"
        fill
        className="object-contain opacity-20"
      />
    </div>
  );
};

export default function GridShape() {
  return (
    <>
      <Shape position="top-right" />
      <Shape position="bottom-left" rotate />
    </>
  );
}
