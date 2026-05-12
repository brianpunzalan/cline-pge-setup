/**
 * Design system token registry.
 * Update this to match your actual design system tokens.
 */

export interface TokenGroup {
  cssVariable: string;
  value: string;
}

export const COLOR_TOKENS: TokenGroup[] = [
  { cssVariable: "--color-primary-50",  value: "#eff6ff" },
  { cssVariable: "--color-primary-100", value: "#dbeafe" },
  { cssVariable: "--color-primary-200", value: "#bfdbfe" },
  { cssVariable: "--color-primary-300", value: "#93c5fd" },
  { cssVariable: "--color-primary-400", value: "#60a5fa" },
  { cssVariable: "--color-primary-500", value: "#3b82f6" },
  { cssVariable: "--color-primary-600", value: "#2563eb" },
  { cssVariable: "--color-primary-700", value: "#1d4ed8" },
  { cssVariable: "--color-primary-800", value: "#1e40af" },
  { cssVariable: "--color-primary-900", value: "#1e3a8a" },
  { cssVariable: "--color-neutral-0",   value: "#ffffff" },
  { cssVariable: "--color-neutral-50",  value: "#f9fafb" },
  { cssVariable: "--color-neutral-100", value: "#f3f4f6" },
  { cssVariable: "--color-neutral-200", value: "#e5e7eb" },
  { cssVariable: "--color-neutral-300", value: "#d1d5db" },
  { cssVariable: "--color-neutral-400", value: "#9ca3af" },
  { cssVariable: "--color-neutral-500", value: "#6b7280" },
  { cssVariable: "--color-neutral-600", value: "#4b5563" },
  { cssVariable: "--color-neutral-700", value: "#374151" },
  { cssVariable: "--color-neutral-800", value: "#1f2937" },
  { cssVariable: "--color-neutral-900", value: "#111827" },
  { cssVariable: "--color-success-500", value: "#22c55e" },
  { cssVariable: "--color-warning-500", value: "#f59e0b" },
  { cssVariable: "--color-error-500",   value: "#ef4444" },
  { cssVariable: "--color-info-500",    value: "#3b82f6" },
];

// Raw pixel values that have a spacing token equivalent
export const SPACING_TOKENS: TokenGroup[] = [
  { cssVariable: "--spacing-0",  value: "0px" },
  { cssVariable: "--spacing-1",  value: "4px" },
  { cssVariable: "--spacing-2",  value: "8px" },
  { cssVariable: "--spacing-3",  value: "12px" },
  { cssVariable: "--spacing-4",  value: "16px" },
  { cssVariable: "--spacing-5",  value: "20px" },
  { cssVariable: "--spacing-6",  value: "24px" },
  { cssVariable: "--spacing-8",  value: "32px" },
  { cssVariable: "--spacing-10", value: "40px" },
  { cssVariable: "--spacing-12", value: "48px" },
  { cssVariable: "--spacing-16", value: "64px" },
  { cssVariable: "--spacing-20", value: "80px" },
  { cssVariable: "--spacing-24", value: "96px" },
];

export const TYPOGRAPHY_TOKENS = {
  fontSize: [
    { cssVariable: "--font-size-xs",   value: "12px" },
    { cssVariable: "--font-size-sm",   value: "14px" },
    { cssVariable: "--font-size-base", value: "16px" },
    { cssVariable: "--font-size-lg",   value: "18px" },
    { cssVariable: "--font-size-xl",   value: "20px" },
    { cssVariable: "--font-size-2xl",  value: "24px" },
    { cssVariable: "--font-size-3xl",  value: "30px" },
    { cssVariable: "--font-size-4xl",  value: "36px" },
  ],
  fontWeight: [
    { cssVariable: "--font-weight-normal",   value: "400" },
    { cssVariable: "--font-weight-medium",   value: "500" },
    { cssVariable: "--font-weight-semibold", value: "600" },
    { cssVariable: "--font-weight-bold",     value: "700" },
  ],
  fontFamily: [
    { cssVariable: "--font-family-sans",  value: "Inter, sans-serif" },
    { cssVariable: "--font-family-mono",  value: "JetBrains Mono, monospace" },
  ],
};

export const SHADOW_TOKENS: TokenGroup[] = [
  { cssVariable: "--shadow-xs", value: "0 1px 2px 0 rgb(0 0 0 / 0.05)" },
  { cssVariable: "--shadow-sm", value: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)" },
  { cssVariable: "--shadow-md", value: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)" },
  { cssVariable: "--shadow-lg", value: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)" },
  { cssVariable: "--shadow-xl", value: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)" },
];

export const BREAKPOINT_TOKENS: TokenGroup[] = [
  { cssVariable: "--breakpoint-sm",  value: "640px" },
  { cssVariable: "--breakpoint-md",  value: "768px" },
  { cssVariable: "--breakpoint-lg",  value: "1024px" },
  { cssVariable: "--breakpoint-xl",  value: "1280px" },
  { cssVariable: "--breakpoint-2xl", value: "1536px" },
];

export const MOTION_TOKENS = {
  duration: [
    { cssVariable: "--duration-fast",   value: "100ms" },
    { cssVariable: "--duration-normal", value: "200ms" },
    { cssVariable: "--duration-slow",   value: "300ms" },
    { cssVariable: "--duration-slower", value: "500ms" },
  ],
  easing: [
    { cssVariable: "--easing-linear",    value: "linear" },
    { cssVariable: "--easing-ease-in",   value: "cubic-bezier(0.4, 0, 1, 1)" },
    { cssVariable: "--easing-ease-out",  value: "cubic-bezier(0, 0, 0.2, 1)" },
    { cssVariable: "--easing-ease-both", value: "cubic-bezier(0.4, 0, 0.2, 1)" },
  ],
};

// Pixel values that are explicitly allowed as raw values (sub-pixel nudges etc.)
export const ALLOWED_RAW_PX = new Set([0, 1]);

// Spacing pixel values that have a token equivalent (for fast lookup)
export const SPACING_PX_WITH_TOKEN = new Set(
  SPACING_TOKENS.map(t => parseInt(t.value))
);

// Breakpoint pixel values that have a token equivalent
export const BREAKPOINT_PX_WITH_TOKEN = new Set(
  BREAKPOINT_TOKENS.map(t => parseInt(t.value))
);
