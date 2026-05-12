import type { GeneratedFile, CriterionResult, Violation } from "../types.js";
import { COLOR_TOKENS } from "../config/ds-tokens.js";

// ── Patterns ──────────────────────────────────────────────────────────────────

// onClick on a div/span without role or tabIndex
const CLICK_ON_NON_INTERACTIVE = /<(div|span|p|section|article|aside|header|footer|main|li|ul|ol|nav)[^>]+onClick/g;
const HAS_ROLE      = /\brole=/;
const HAS_TAB_INDEX = /\btabIndex=/;

function lineOf(text: string, index: number): number {
  return text.slice(0, index).split("\n").length;
}

function countMatches(text: string, pattern: RegExp): RegExpMatchArray[] {
  const matches: RegExpMatchArray[] = [];
  let match: RegExpMatchArray | null;
  const re = new RegExp(pattern.source, pattern.flags);
  while ((match = re.exec(text)) !== null) {
    matches.push(match);
  }
  return matches;
}

// ── Focus Management ──────────────────────────────────────────────────────────

export function checkFocusManagement(files: GeneratedFile[]): CriterionResult {
  const violations: Violation[] = [];

  for (const file of files) {
    if (file.language !== "tsx") continue;
    const text = file.content;

    for (const match of countMatches(text, CLICK_ON_NON_INTERACTIVE)) {
      const element = match[0];
      if (!HAS_ROLE.test(element) && !HAS_TAB_INDEX.test(element)) {
        violations.push({
          file: file.path,
          line: lineOf(text, match.index ?? 0),
          message: `onClick on <${match[1]}> without role or tabIndex — not keyboard accessible`,
          value: element.slice(0, 80),
          suggestion: "Add role=\"button\" and tabIndex={0}, or use a DS <Button> component instead",
        });
      }
    }
  }

  return {
    id: "focus_management",
    score: violations.length === 0 ? 1.0 : 0.0,
    passed: violations.length === 0,
    violations,
  };
}

// ── Axe Violations (static approximation) ────────────────────────────────────
// Full axe-playwright analysis runs only when a rendered URL is available.
// This static pass catches common structural violations.

const MISSING_ALT       = /<img(?![^>]*\balt=)[^>]*>/g;
const MISSING_LABEL     = /<input(?![^>]*(?:aria-label|aria-labelledby|id=))[^>]*>/gi;
const EMPTY_BUTTON      = /<button[^>]*>\s*<\/button>/g;
const HEADING_SKIP      = /<h([1-6])[^>]*>/g;

export function checkAxeViolations(files: GeneratedFile[]): CriterionResult {
  const violations: Violation[] = [];

  for (const file of files) {
    if (file.language !== "tsx") continue;
    const text = file.content;

    // img without alt
    for (const match of countMatches(text, MISSING_ALT)) {
      violations.push({
        file: file.path,
        line: lineOf(text, match.index ?? 0),
        message: "img element missing alt attribute",
        suggestion: 'Add alt="" for decorative images or alt="description" for informational ones',
      });
    }

    // input without label association
    for (const match of countMatches(text, MISSING_LABEL)) {
      violations.push({
        file: file.path,
        line: lineOf(text, match.index ?? 0),
        message: "input element missing accessible label",
        suggestion: "Add aria-label, aria-labelledby, or associate with a <label> via id",
      });
    }

    // Empty button
    for (const match of countMatches(text, EMPTY_BUTTON)) {
      violations.push({
        file: file.path,
        line: lineOf(text, match.index ?? 0),
        message: "Empty button element — no accessible text",
        suggestion: "Add text content or aria-label to the button",
      });
    }

    // Check for heading level skips (h1 → h3, skipping h2)
    const headingMatches = countMatches(text, HEADING_SKIP);
    if (headingMatches.length > 1) {
      const levels = headingMatches.map(m => parseInt(m[1]!));
      for (let i = 1; i < levels.length; i++) {
        if (levels[i]! - levels[i - 1]! > 1) {
          violations.push({
            file: file.path,
            line: lineOf(text, headingMatches[i]!.index ?? 0),
            message: `Heading level skip: h${levels[i - 1]} → h${levels[i]}`,
            suggestion: "Do not skip heading levels — use sequential h1, h2, h3...",
          });
        }
      }
    }
  }

  // Score: critical violations at -0.3, serious at -0.1 (treating all as serious here)
  const score = Math.max(0, 1 - violations.length * 0.1);
  return {
    id: "axe_violations",
    score,
    passed: score >= 0.7,
    violations,
    details: `Found ${violations.length} accessibility violation(s) via static analysis.`,
  };
}

// ── Contrast Ratio ────────────────────────────────────────────────────────────
// Evaluates color token pairs used in the generated code.

interface ColorPair {
  fg: string;
  bg: string;
  context: string;
  file: string;
}

function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.replace("#", "");
  if (clean.length === 3) {
    return [
      parseInt(clean[0]! + clean[0], 16),
      parseInt(clean[1]! + clean[1], 16),
      parseInt(clean[2]! + clean[2], 16),
    ];
  }
  if (clean.length === 6) {
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16),
    ];
  }
  return null;
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const srgb = [r, g, b].map(c => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  }) as [number, number, number];
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

function wcagContrast(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) return 21; // assume passing if we can't compute
  const l1 = relativeLuminance(rgb1);
  const l2 = relativeLuminance(rgb2);
  const lighter = Math.max(l1, l2);
  const darker  = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Build a lookup from CSS var name to hex value
const TOKEN_HEX = new Map(COLOR_TOKENS.map(t => [t.cssVariable, t.value]));

// Common text-on-background pairs to check from the token map
const TEXT_BG_PAIRS: ColorPair[] = [
  { fg: "--color-neutral-900", bg: "--color-neutral-0",   context: "body text on white",   file: "tokens" },
  { fg: "--color-neutral-0",   bg: "--color-primary-600", context: "white text on primary", file: "tokens" },
  { fg: "--color-neutral-900", bg: "--color-neutral-100", context: "text on light bg",      file: "tokens" },
  { fg: "--color-neutral-500", bg: "--color-neutral-0",   context: "muted text on white",   file: "tokens" },
];

export function checkContrastRatio(_files: GeneratedFile[]): CriterionResult {
  const violations: Violation[] = [];

  for (const pair of TEXT_BG_PAIRS) {
    const fgHex = TOKEN_HEX.get(pair.fg);
    const bgHex = TOKEN_HEX.get(pair.bg);
    if (!fgHex || !bgHex) continue;

    const ratio = wcagContrast(fgHex, bgHex);
    if (ratio < 4.5) {
      violations.push({
        file: pair.file,
        message: `Contrast ratio ${ratio.toFixed(2)}:1 for "${pair.context}" — fails WCAG AA (requires 4.5:1)`,
        value: `${pair.fg} on ${pair.bg}`,
        suggestion: "Use a darker foreground or lighter background token to meet 4.5:1",
      });
    }
  }

  const score = 1 - violations.length / Math.max(TEXT_BG_PAIRS.length, 1);
  return {
    id: "contrast_ratio",
    score: Math.max(0, score),
    passed: score >= 0.9,
    violations,
    details: `Checked ${TEXT_BG_PAIRS.length} color pair(s); ${violations.length} failed WCAG AA.`,
  };
}
