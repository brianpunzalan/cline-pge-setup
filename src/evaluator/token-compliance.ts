import type { GeneratedFile, CriterionResult, Violation } from "../types.js";
import {
  ALLOWED_RAW_PX,
  SPACING_PX_WITH_TOKEN,
  BREAKPOINT_PX_WITH_TOKEN,
} from "../config/ds-tokens.js";

// ── Patterns ─────────────────────────────────────────────────────────────────

const HEX_COLOR    = /#([0-9a-fA-F]{3,8})\b/g;
const RGB_COLOR    = /rgba?\(\s*\d+/g;
const HSL_COLOR    = /hsl\(/g;
const NAMED_COLORS = /\bcolor:\s*["']?(red|blue|green|black|white|gray|grey|purple|orange|yellow|pink|brown|cyan|magenta|teal|navy|olive|maroon|aqua|lime|silver|fuchsia)["']?/gi;

// CSS properties that take spacing values
const SPACING_PROPS = /(?:margin|padding|gap|top|right|bottom|left|width|height|max-width|max-height|min-width|min-height)\s*:\s*([^;}\n]+)/gi;
const RAW_PX_IN_SPACING = /(\d+(?:\.\d+)?)px/g;

const FONT_SIZE_RAW    = /font-size\s*:\s*(?!var\()([^;}\n]+)/gi;
const FONT_WEIGHT_RAW  = /font-weight\s*:\s*(?!var\()([^;}\n]+)/gi;
const FONT_FAMILY_RAW  = /font-family\s*:\s*(?!var\()([^;}\n]+)/gi;
const LINE_HEIGHT_RAW  = /line-height\s*:\s*(?!var\()([^;}\n]+)/gi;

const BOX_SHADOW_RAW = /box-shadow\s*:\s*(?!var\()(?!none)([^;}\n]+)/gi;

// Matches inline style JSX props that contain raw color/spacing
const INLINE_STYLE_COLOR   = /style=\{\{[^}]*color\s*:\s*["']?(?:#[0-9a-fA-F]{3,8}|rgba?\(|hsl\()/gi;
const INLINE_STYLE_SPACING = /style=\{\{[^}]*(?:margin|padding|gap)\s*:\s*["']?\d+px/gi;

// ── Helpers ───────────────────────────────────────────────────────────────────

function countMatches(text: string, pattern: RegExp): RegExpMatchArray[] {
  const matches: RegExpMatchArray[] = [];
  let match: RegExpMatchArray | null;
  const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g");
  while ((match = re.exec(text)) !== null) {
    matches.push(match);
  }
  return matches;
}

function lineOf(text: string, index: number): number {
  return text.slice(0, index).split("\n").length;
}

// ── Color Tokens ──────────────────────────────────────────────────────────────

export function checkColorTokens(files: GeneratedFile[]): CriterionResult {
  const violations: Violation[] = [];

  for (const file of files) {
    const text = file.content;

    for (const pattern of [HEX_COLOR, RGB_COLOR, HSL_COLOR, NAMED_COLORS, INLINE_STYLE_COLOR]) {
      for (const match of countMatches(text, pattern)) {
        violations.push({
          file: file.path,
          line: lineOf(text, match.index ?? 0),
          message: `Hardcoded color value: "${match[0].trim()}"`,
          value: match[0].trim(),
          suggestion: "Replace with a CSS variable from --color-* tokens",
        });
      }
    }
  }

  const score = Math.max(0, 1 - violations.length * 0.15);
  return {
    id: "color_tokens",
    score,
    passed: score >= 0.7,
    violations,
    details: `Found ${violations.length} hardcoded color value(s).`,
  };
}

// ── Spacing Tokens ────────────────────────────────────────────────────────────

export function checkSpacingTokens(files: GeneratedFile[]): CriterionResult {
  const violations: Violation[] = [];

  for (const file of files) {
    const text = file.content;
    let match: RegExpMatchArray | null;

    // Check CSS/SCSS spacing properties
    const propRe = new RegExp(SPACING_PROPS.source, SPACING_PROPS.flags);
    while ((match = propRe.exec(text)) !== null) {
      const value = match[1];
      const pxRe = new RegExp(RAW_PX_IN_SPACING.source, RAW_PX_IN_SPACING.flags);
      let pxMatch: RegExpMatchArray | null;
      while ((pxMatch = pxRe.exec(value)) !== null) {
        const px = parseFloat(pxMatch[1] ?? "0");
        if (!ALLOWED_RAW_PX.has(px) && SPACING_PX_WITH_TOKEN.has(px)) {
          violations.push({
            file: file.path,
            line: lineOf(text, match.index ?? 0),
            message: `Hardcoded spacing: "${px}px" — a spacing token exists`,
            value: `${px}px`,
            suggestion: `Use var(--spacing-${px / 4}) instead of ${px}px`,
          });
        }
      }
    }

    // Inline JSX style overrides for spacing
    for (const m of countMatches(text, INLINE_STYLE_SPACING)) {
      violations.push({
        file: file.path,
        line: lineOf(text, m.index ?? 0),
        message: `Inline style spacing override: "${m[0].trim()}"`,
        suggestion: "Use DS Stack/Grid gap props or spacing tokens",
      });
    }
  }

  const score = Math.max(0, 1 - violations.length * 0.1);
  return {
    id: "spacing_tokens",
    score,
    passed: score >= 0.7,
    violations,
    details: `Found ${violations.length} hardcoded spacing value(s).`,
  };
}

// ── Typography Tokens ─────────────────────────────────────────────────────────

export function checkTypographyTokens(files: GeneratedFile[]): CriterionResult {
  const violations: Violation[] = [];

  for (const file of files) {
    const text = file.content;

    for (const [pattern, prop] of [
      [FONT_SIZE_RAW, "font-size"],
      [FONT_WEIGHT_RAW, "font-weight"],
      [FONT_FAMILY_RAW, "font-family"],
      [LINE_HEIGHT_RAW, "line-height"],
    ] as [RegExp, string][]) {
      for (const match of countMatches(text, pattern)) {
        const value = match[1].trim();
        // Skip if the value is already a var() or "inherit"
        if (value.startsWith("var(") || value === "inherit" || value === "initial" || value === "unset") continue;
        violations.push({
          file: file.path,
          line: lineOf(text, match.index ?? 0),
          message: `Hardcoded ${prop}: "${value}"`,
          value,
          suggestion: `Use a var(--font-${prop.replace("font-", "")}-*) token or a DS typography component`,
        });
      }
    }
  }

  const score = Math.max(0, 1 - violations.length * 0.15);
  return {
    id: "typography_tokens",
    score,
    passed: score >= 0.7,
    violations,
    details: `Found ${violations.length} raw typography value(s).`,
  };
}

// ── Shadow Tokens ─────────────────────────────────────────────────────────────

export function checkShadowTokens(files: GeneratedFile[]): CriterionResult {
  const violations: Violation[] = [];

  for (const file of files) {
    const text = file.content;
    for (const match of countMatches(text, BOX_SHADOW_RAW)) {
      const value = match[1].trim();
      if (value.startsWith("var(")) continue;
      violations.push({
        file: file.path,
        line: lineOf(text, match.index ?? 0),
        message: `Raw box-shadow value: "${value.slice(0, 60)}"`,
        value,
        suggestion: "Use var(--shadow-sm/md/lg/xl) tokens instead",
      });
    }
  }

  const score = Math.max(0, 1 - violations.length * 0.2);
  return {
    id: "shadow_tokens",
    score,
    passed: true, // threshold is 0
    violations,
    details: `Found ${violations.length} raw box-shadow value(s).`,
  };
}
