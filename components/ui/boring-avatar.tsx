"use client";

import React from "react";

const PALETTES = [
  ["hsl(var(--primary))", "hsl(var(--primary) / 0.7)", "hsl(var(--primary) / 0.15)"],
  ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))"],
  ["#3D405B", "#81B29A", "#F2CC8F"],
  ["#264653", "#2A9D8F", "#E9C46A"],
  ["#606C38", "#283618", "#FEFAE0"],
];

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getUnit(num: number, range: number, index: number): number {
  const value = num % range;
  return index % 2 === 0 ? value : -value;
}

interface BoringAvatarProps {
  name: string;
  size?: number;
  className?: string;
}

export function BoringAvatar({ name, size = 40, className = "" }: BoringAvatarProps) {
  const hash = hashCode(name || "Unknown");
  // Use deterministic but safe fallback colors for SVG
  const colorSets = [
    ["#2D5016", "#7FA650", "#EBF2E4"],
    ["#1B4332", "#40916C", "#95D5B2"],
    ["#3D405B", "#81B29A", "#F2CC8F"],
    ["#264653", "#2A9D8F", "#E9C46A"],
    ["#606C38", "#283618", "#FEFAE0"],
  ];
  const palette = colorSets[hash % colorSets.length];
  const bg = palette[0];
  const fg1 = palette[1];
  const fg2 = palette[2];

  const numFromName = hashCode(name);
  const range = 10;
  const wrapperTranslateX = getUnit(numFromName, range, 1);
  const wrapperTranslateY = getUnit(numFromName, range, 2);
  const faceTranslateX = getUnit(numFromName, 8, 3);
  const faceTranslateY = getUnit(numFromName, 5, 4);
  const faceRotate = getUnit(numFromName, 360, 5);

  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      className={className}
    >
      <mask id={`mask_${hash}`} maskUnits="userSpaceOnUse" x="0" y="0" width="36" height="36">
        <rect width="36" height="36" rx="8" fill="white" />
      </mask>
      <g mask={`url(#mask_${hash})`}>
        <rect width="36" height="36" fill={bg} />
        <rect
          x="0" y="0" width="36" height="36"
          transform={`translate(${wrapperTranslateX} ${wrapperTranslateY})`}
          fill={fg1}
          rx="36"
        />
        <g transform={`translate(${faceTranslateX} ${faceTranslateY}) rotate(${faceRotate} 18 18)`}>
          <circle cx="12" cy="14" r="1.5" fill={fg2} />
          <circle cx="24" cy="14" r="1.5" fill={fg2} />
          <path
            d="M13 21C13 21 15 24 18 24C21 24 23 21 23 21"
            stroke={fg2}
            fill="none"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </g>
      </g>
    </svg>
  );
}
