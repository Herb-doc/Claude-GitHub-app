import React from 'react'

export default function Caduceus({ size = 40 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Staff */}
      <line x1="50" y1="10" x2="50" y2="92" stroke="#D4A843" strokeWidth="3" strokeLinecap="round" />

      {/* Wings */}
      <path d="M50 15 C40 8, 25 5, 15 10 C20 12, 30 10, 40 14" stroke="#D4A843" strokeWidth="2" fill="none" />
      <path d="M50 15 C60 8, 75 5, 85 10 C80 12, 70 10, 60 14" stroke="#D4A843" strokeWidth="2" fill="none" />
      <path d="M50 18 C42 12, 30 10, 20 13 C25 15, 35 13, 43 17" stroke="#D4A843" strokeWidth="1.5" fill="none" opacity="0.7" />
      <path d="M50 18 C58 12, 70 10, 80 13 C75 15, 65 13, 57 17" stroke="#D4A843" strokeWidth="1.5" fill="none" opacity="0.7" />

      {/* Left serpent */}
      <path
        d="M50 22 C35 28, 30 32, 35 38 C40 44, 50 40, 50 40 C50 40, 35 48, 35 54 C35 60, 45 62, 50 58 C50 58, 35 66, 35 72 C35 78, 45 80, 50 76"
        stroke="#D4A843"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      {/* Left serpent head */}
      <circle cx="35" cy="72" r="3" fill="#D4A843" opacity="0.8" />

      {/* Right serpent */}
      <path
        d="M50 22 C65 28, 70 32, 65 38 C60 44, 50 40, 50 40 C50 40, 65 48, 65 54 C65 60, 55 62, 50 58 C50 58, 65 66, 65 72 C65 78, 55 80, 50 76"
        stroke="#D4A843"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      {/* Right serpent head */}
      <circle cx="65" cy="72" r="3" fill="#D4A843" opacity="0.8" />

      {/* Top orb */}
      <circle cx="50" cy="10" r="4" fill="#D4A843" />

      {/* Base */}
      <line x1="40" y1="92" x2="60" y2="92" stroke="#D4A843" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}
