<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="32"
    height="32"
    viewBox="0 0 32 32"
    aria-hidden="true"
  >
    <defs>
      <linearGradient
        id="grad"
        gradientUnits="userSpaceOnUse"
        x1="0"
        y1="0"
        x2="32"
        y2="0"
        gradientTransform="rotate(-315 16 16)"
      >
        <stop offset="0%" stop-color="#20e2d7" />
        <stop offset="100%" stop-color="#f9fea5" />
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="32" height="32" rx="6" ry="6" fill="#f5f5f5" />
    <circle cx="16" cy="16" r="9" fill="url(#grad)" />
  </svg>
</template>
