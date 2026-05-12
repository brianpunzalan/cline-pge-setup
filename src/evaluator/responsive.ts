import type { GeneratedFile, CriterionResult, Violation } from "../types.js";
import { BREAKPOINT_PX_WITH_TOKEN, BREAKPOINT_TOKENS } from "../config/ds-tokens.js";

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

const RAW_MEDIA_QUERY = /@media[^{]+(?:min|max)-width:\s*(\d+)px/g;
const DS_BREAKPOINT_USAGE = /(?:breakpoints\.\w+|var\(--breakpoint-)/g;

export function checkBreakpointTokens(files: GeneratedFile[]): CriterionResult {
  const violations: Violation[] = [];

  for (const file of files) {
    if (file.language !== "css" && file.language !== "scss" && file.language !== "ts" && file.language !== "tsx") continue;
    const text = file.content;

    for (const match of countMatches(text, RAW_MEDIA_QUERY)) {
      const px = parseInt(match[1]!);
      if (BREAKPOINT_PX_WITH_TOKEN.has(px)) {
        const token = BREAKPOINT_TOKENS.find(t => parseInt(t.value) === px);
        violations.push({
          file: file.path,
          line: lineOf(text, match.index ?? 0),
          message: `Raw media query breakpoint ${px}px — a DS breakpoint token exists`,
          value: match[0].trim(),
          suggestion: token
            ? `Use var(${token.cssVariable}) or the DS breakpoints.${token.cssVariable.replace("--breakpoint-", "")} mixin`
            : "Use DS breakpoint tokens",
        });
      }
    }
  }

  const score = violations.length === 0
    ? 1.0
    : Math.max(0, 1 - violations.length * 0.2);

  return {
    id: "breakpoint_tokens",
    score,
    passed: true,
    violations,
    details: `Found ${violations.length} raw breakpoint value(s).`,
  };
}
