import type { GeneratedFile, CriterionResult, Violation } from "../types.js";

function lineOf(text: string, index: number): number {
  return text.slice(0, index).split("\n").length;
}

function countMatches(text: string, pattern: RegExp): RegExpMatchArray[] {
  const matches: RegExpMatchArray[] = [];
  let match: RegExpMatchArray | null;
  const re = new RegExp(pattern.source, pattern.flags);
  while ((match = re.exec(text)) !== null) { matches.push(match); }
  return matches;
}

const RAW_TRANSITION_TIMING = /transition\s*:[^;}\n]*?(?<!\bvar\([^)\-]*)\b(\d+(?:\.\d+)?(?:ms|s))\b/g;
const RAW_ANIMATION_TIMING  = /animation(?:-duration)?\s*:[^;}\n]*?(?<!\bvar\([^)\-]*)\b(\d+(?:\.\d+)?(?:ms|s))\b/g;
const RAW_DURATION = /(?:animation-duration|transition-duration)\s*:\s*(?!var\()(\d+(?:\.\d+)?(?:ms|s))/g;
const NEW_KEYFRAMES = /@keyframes\s+\w+/g;
const REDUCED_MOTION_GUARD = /@media[^{]*prefers-reduced-motion/g;

export function checkMotionTokens(files: GeneratedFile[]): CriterionResult {
  const violations: Violation[] = [];
  for (const file of files) {
    const text = file.content;
    for (const [pattern, prop] of [
      [RAW_TRANSITION_TIMING, "transition timing"],
      [RAW_ANIMATION_TIMING, "animation timing"],
      [RAW_DURATION, "duration"],
    ] as [RegExp, string][]) {
      for (const match of countMatches(text, pattern)) {
        const value = (match[1] ?? match[0]).trim();
        violations.push({ file: file.path, line: lineOf(text, match.index ?? 0), message: `Raw ${prop} value: "${value}" — use a token`, value, suggestion: "Use var(--duration-fast/normal/slow) and var(--easing-*) tokens" });
      }
    }
  }
  const score = Math.max(0, 1 - violations.length * 0.2);
  return { id: "motion_tokens", score, passed: true, violations, details: `Found ${violations.length} raw motion value(s).` };
}

export function checkReducedMotionGuard(files: GeneratedFile[]): CriterionResult {
  const violations: Violation[] = [];
  let totalNewAnimations = 0;
  let guardedAnimations = 0;
  for (const file of files) {
    const text = file.content;
    const newAnimations = countMatches(text, NEW_KEYFRAMES);
    totalNewAnimations += newAnimations.length;
    if (newAnimations.length > 0) {
      const hasGuard = REDUCED_MOTION_GUARD.test(text);
      if (hasGuard) {
        guardedAnimations += newAnimations.length;
      } else {
        for (const match of newAnimations) {
          violations.push({ file: file.path, line: lineOf(text, match.index ?? 0), message: `Animation "${match[0]}" missing @media (prefers-reduced-motion) guard`, suggestion: "Wrap animation in @media (prefers-reduced-motion: no-preference) { ... }" });
        }
      }
    }
  }
  const score = totalNewAnimations === 0 ? 1.0 : guardedAnimations / totalNewAnimations;
  return { id: "reduced_motion_guard", score, passed: true, violations, details: `${guardedAnimations}/${totalNewAnimations} new animation(s) have a prefers-reduced-motion guard.` };
}
