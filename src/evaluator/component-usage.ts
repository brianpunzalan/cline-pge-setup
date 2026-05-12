import type { GeneratedFile, CriterionResult, Violation } from "../types.js";
import { DS_COMPONENT_MAP, DS_LAYOUT_COMPONENTS, DS_COMPONENT_SCHEMAS, BANNED_DS_PROPS, CLASSNAME_ALLOWED_COMPONENTS } from "../config/ds-components.js";

function nativeElementPattern(tag: string) {
  return new RegExp(`<${tag}(?:\\s|>|/)`, "g");
}

function dsComponentWithProps(componentName: string) {
  return new RegExp(`<${componentName}\\s([^>]+?)(?:/>|>)`, "gs");
}

const INLINE_STYLE = /<\w+[^>]+\bstyle=\{/g;

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

export function checkNativeOverrideRate(files: GeneratedFile[]): CriterionResult {
  const violations: Violation[] = [];
  let totalNative = 0;
  let shouldBeDS = 0;
  const nativeTags = Object.keys(DS_COMPONENT_MAP);

  for (const file of files) {
    const text = file.content;
    for (const tag of nativeTags) {
      const matches = countMatches(text, nativeElementPattern(tag));
      totalNative += matches.length;
      const dsAlternatives = DS_COMPONENT_MAP[tag]!.join(" | ");
      for (const match of matches) {
        shouldBeDS++;
        violations.push({ file: file.path, line: lineOf(text, match.index ?? 0), message: `Native <${tag}> used — design system equivalent exists`, value: match[0].trim(), suggestion: `Replace with DS component: ${dsAlternatives}` });
      }
    }
  }

  const score = totalNative === 0 ? 1.0 : 1 - shouldBeDS / totalNative;
  return { id: "native_override_rate", score: Math.max(0, score), passed: score >= 0.8, violations, details: `${shouldBeDS}/${totalNative} native elements should be DS components.` };
}

export function checkPropCorrectness(files: GeneratedFile[]): CriterionResult {
  const violations: Violation[] = [];

  for (const file of files) {
    const text = file.content;
    for (const [componentName, schema] of Object.entries(DS_COMPONENT_SCHEMAS)) {
      const matches = countMatches(text, dsComponentWithProps(componentName));
      for (const match of matches) {
        const propsStr = match[1] ?? "";
        for (const [prop, validValues] of Object.entries(schema)) {
          const propMatch = new RegExp(`\\b${prop}=["']([^"']+)["']`).exec(propsStr);
          if (!propMatch) continue;
          const usedValue = propMatch[1];
          if (!validValues.includes(usedValue)) {
            violations.push({ file: file.path, line: lineOf(text, match.index ?? 0), message: `<${componentName} ${prop}="${usedValue}"> — invalid value`, value: usedValue, suggestion: `Valid values: ${validValues.join(", ")}` });
          }
        }
        for (const banned of BANNED_DS_PROPS) {
          if (new RegExp(`\\b${banned}=\\{`).test(propsStr)) {
            violations.push({ file: file.path, line: lineOf(text, match.index ?? 0), message: `<${componentName}> uses banned prop "${banned}"`, suggestion: `Remove the "${banned}" prop; use DS tokens or variant props instead` });
          }
        }
        if (/\bclassName=/.test(propsStr) && !CLASSNAME_ALLOWED_COMPONENTS.has(componentName)) {
          violations.push({ file: file.path, line: lineOf(text, match.index ?? 0), message: `<${componentName} className="..."> — className injection not allowed`, suggestion: "Remove className; use variant/size props or DS tokens instead" });
        }
      }
    }
    for (const match of countMatches(text, INLINE_STYLE)) {
      violations.push({ file: file.path, line: lineOf(text, match.index ?? 0), message: `Inline style override detected: "${match[0].slice(0, 60)}"`, suggestion: "Use DS token CSS variables or component variant props" });
    }
  }

  const score = Math.max(0, 1 - violations.length * 0.2);
  return { id: "prop_correctness", score, passed: score >= 0.8, violations, details: `Found ${violations.length} prop violation(s).` };
}

export function checkLayoutPrimitives(files: GeneratedFile[]): CriterionResult {
  const violations: Violation[] = [];
  const RAW_FLEX = /display\s*:\s*flex\b/g;
  const RAW_GRID = /display\s*:\s*grid\b/g;
  let rawLayouts = 0;
  let dsLayouts = 0;

  for (const file of files) {
    const text = file.content;
    if (file.language === "css" || file.language === "scss") {
      const flexMatches = countMatches(text, RAW_FLEX);
      const gridMatches = countMatches(text, RAW_GRID);
      rawLayouts += flexMatches.length + gridMatches.length;
      for (const match of [...flexMatches, ...gridMatches]) {
        violations.push({ file: file.path, line: lineOf(text, match.index ?? 0), message: `Raw ${match[0].trim()} — use DS layout primitive instead`, suggestion: "Replace with <Stack>, <Grid>, <Cluster>, or <Sidebar>" });
      }
    }
    if (file.language === "tsx" || file.language === "ts") {
      for (const layoutComp of DS_LAYOUT_COMPONENTS) {
        const matches = countMatches(text, new RegExp(`<${layoutComp}[\\s/>]`, "g"));
        dsLayouts += matches.length;
      }
    }
  }

  const total = rawLayouts + dsLayouts;
  const score = total === 0 ? 1.0 : dsLayouts / total;
  return { id: "layout_primitives", score, passed: true, violations, details: `${dsLayouts} DS layout component(s) vs ${rawLayouts} raw flex/grid.` };
}

export function checkThemeProviderScope(files: GeneratedFile[]): CriterionResult {
  const violations: Violation[] = [];
  const hasThemeProvider = files.some(f => f.language === "tsx" && /ThemeProvider/.test(f.content));
  if (!hasThemeProvider) {
    violations.push({ file: files[0]?.path ?? "unknown", message: "No <ThemeProvider> found — component tree must be wrapped in ThemeProvider", suggestion: "Import ThemeProvider and wrap the root component: <ThemeProvider theme={theme}>...</ThemeProvider>" });
  }
  return { id: "theme_provider_scope", score: hasThemeProvider ? 1.0 : 0.0, passed: hasThemeProvider, violations };
}
