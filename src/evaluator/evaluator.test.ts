import { describe, it, expect } from "vitest";
import type { GeneratedFile } from "../types.js";
import { checkColorTokens, checkSpacingTokens, checkTypographyTokens, checkShadowTokens } from "./token-compliance.js";
import { checkNativeOverrideRate, checkPropCorrectness, checkThemeProviderScope } from "./component-usage.js";
import { checkFocusManagement, checkAxeViolations } from "./accessibility.js";
import { checkMotionTokens, checkReducedMotionGuard } from "./motion.js";
import { assembleEvaluation, RUBRIC } from "./rubric.js";

const tsxFile = (content: string): GeneratedFile => ({ path: "TestComponent.tsx", content, language: "tsx" });
const cssFile = (content: string): GeneratedFile => ({ path: "TestComponent.module.css", content, language: "css" });

describe("checkColorTokens", () => {
  it("flags hardcoded hex colors", () => {
    const result = checkColorTokens([tsxFile(`<div style={{ color: "#3b82f6" }} />`)]);
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(1);
  });
  it("flags rgb() colors", () => {
    const result = checkColorTokens([tsxFile(`<div style={{ color: "rgb(100, 100, 100)" }} />`)]);
    expect(result.violations.length).toBeGreaterThan(0);
  });
  it("passes when no hardcoded colors exist", () => {
    const result = checkColorTokens([tsxFile(`<div style={{ color: "var(--color-primary-500)" }} />`)]);
    expect(result.violations).toHaveLength(0);
    expect(result.score).toBe(1);
  });
});

describe("checkSpacingTokens", () => {
  it("flags hardcoded spacing with a token equivalent", () => {
    const result = checkSpacingTokens([cssFile(`.box { padding: 16px; }`)]);
    expect(result.violations.length).toBeGreaterThan(0);
  });
  it("allows sub-pixel values (1px, 0px)", () => {
    const result = checkSpacingTokens([cssFile(`.box { border: 1px solid; transform: translateX(-1px); }`)]);
    expect(result.violations).toHaveLength(0);
  });
  it("passes token-based spacing", () => {
    const result = checkSpacingTokens([cssFile(`.box { padding: var(--spacing-4); }`)]);
    expect(result.violations).toHaveLength(0);
  });
});

describe("checkTypographyTokens", () => {
  it("flags raw font-size", () => {
    const result = checkTypographyTokens([cssFile(`.text { font-size: 14px; }`)]);
    expect(result.violations.length).toBeGreaterThan(0);
  });
  it("flags raw font-weight", () => {
    const result = checkTypographyTokens([cssFile(`.text { font-weight: 700; }`)]);
    expect(result.violations.length).toBeGreaterThan(0);
  });
  it("allows var() typography", () => {
    const result = checkTypographyTokens([cssFile(`.text { font-size: var(--font-size-sm); font-weight: var(--font-weight-bold); }`)]);
    expect(result.violations).toHaveLength(0);
  });
});

describe("checkShadowTokens", () => {
  it("flags raw box-shadow", () => {
    const result = checkShadowTokens([cssFile(`.card { box-shadow: 0 4px 6px rgba(0,0,0,0.1); }`)]);
    expect(result.violations.length).toBeGreaterThan(0);
  });
  it("passes var(--shadow-*)", () => {
    const result = checkShadowTokens([cssFile(`.card { box-shadow: var(--shadow-md); }`)]);
    expect(result.violations).toHaveLength(0);
  });
});

describe("checkNativeOverrideRate", () => {
  it("flags native button", () => {
    const result = checkNativeOverrideRate([tsxFile(`<button onClick={save}>Save</button>`)]);
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(1);
  });
  it("flags native input", () => {
    const result = checkNativeOverrideRate([tsxFile(`<input type="text" />`)]);
    expect(result.violations.length).toBeGreaterThan(0);
  });
  it("passes with DS components only", () => {
    const result = checkNativeOverrideRate([tsxFile(`<Button onClick={save}>Save</Button>`)]);
    expect(result.violations).toHaveLength(0);
    expect(result.score).toBe(1);
  });
});

describe("checkPropCorrectness", () => {
  it("flags invalid size prop on Button", () => {
    const result = checkPropCorrectness([tsxFile(`<Button size="tiny">Click</Button>`)]);
    expect(result.violations.length).toBeGreaterThan(0);
  });
  it("flags inline style override on DS component", () => {
    const result = checkPropCorrectness([tsxFile(`<Button style={{ color: "red" }}>Click</Button>`)]);
    expect(result.violations.length).toBeGreaterThan(0);
  });
  it("passes valid DS component usage", () => {
    const result = checkPropCorrectness([tsxFile(`<Button variant="primary" size="md">Click</Button>`)]);
    const schemaViolations = result.violations.filter(v => v.message.includes("invalid value"));
    expect(schemaViolations).toHaveLength(0);
  });
});

describe("checkThemeProviderScope", () => {
  it("fails when no ThemeProvider", () => {
    const result = checkThemeProviderScope([tsxFile(`<Button>Click</Button>`)]);
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
  });
  it("passes when ThemeProvider present", () => {
    const result = checkThemeProviderScope([tsxFile(`<ThemeProvider theme={defaultTheme}><Button>Click</Button></ThemeProvider>`)]);
    expect(result.score).toBe(1);
    expect(result.passed).toBe(true);
  });
});

describe("checkFocusManagement", () => {
  it("flags onClick on div without role/tabIndex", () => {
    const result = checkFocusManagement([tsxFile(`<div onClick={handleClick}>click me</div>`)]);
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.score).toBe(0);
  });
  it("allows onClick on div with role", () => {
    const result = checkFocusManagement([tsxFile(`<div role="button" tabIndex={0} onClick={handleClick}>click me</div>`)]);
    expect(result.violations).toHaveLength(0);
    expect(result.score).toBe(1);
  });
  it("passes no interactive misuse", () => {
    const result = checkFocusManagement([tsxFile(`<Button onClick={handleClick}>Click</Button>`)]);
    expect(result.score).toBe(1);
  });
});

describe("checkAxeViolations", () => {
  it("flags img without alt", () => {
    const result = checkAxeViolations([tsxFile(`<img src="photo.jpg" />`)]);
    expect(result.violations.length).toBeGreaterThan(0);
  });
  it("passes img with alt", () => {
    const result = checkAxeViolations([tsxFile(`<img src="photo.jpg" alt="User profile photo" />`)]);
    const altViolations = result.violations.filter(v => v.message.includes("alt"));
    expect(altViolations).toHaveLength(0);
  });
});

describe("checkMotionTokens", () => {
  it("flags raw transition value", () => {
    const result = checkMotionTokens([cssFile(`.btn { transition: all 200ms ease; }`)]);
    expect(result.violations.length).toBeGreaterThan(0);
  });
  it("passes var(--duration-*) transition", () => {
    const result = checkMotionTokens([cssFile(`.btn { transition: all var(--duration-normal) var(--easing-ease-out); }`)]);
    expect(result.violations).toHaveLength(0);
  });
});

describe("checkReducedMotionGuard", () => {
  it("flags @keyframes without prefers-reduced-motion guard", () => {
    const result = checkReducedMotionGuard([cssFile(`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`)]);
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(1);
  });
  it("passes @keyframes with reduced-motion guard", () => {
    const content = `@media (prefers-reduced-motion: no-preference) { @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } }`;
    const result = checkReducedMotionGuard([cssFile(content)]);
    expect(result.violations).toHaveLength(0);
    expect(result.score).toBe(1);
  });
});

describe("assembleEvaluation", () => {
  it("fails when hard gate is not passed", () => {
    const criteria = RUBRIC.map(r => ({ id: r.id, score: r.id === "theme_provider_scope" ? 0.0 : 1.0, passed: r.id !== "theme_provider_scope", violations: r.id === "theme_provider_scope" ? [{ file: "test.tsx", message: "no ThemeProvider" }] : [] }));
    const result = assembleEvaluation(criteria, 0.8);
    expect(result.passed).toBe(false);
    expect(result.hardGatesPassed).toBe(false);
  });
  it("passes when all criteria score above threshold", () => {
    const criteria = RUBRIC.map(r => ({ id: r.id, score: 1.0, passed: true, violations: [] }));
    const result = assembleEvaluation(criteria, 0.8);
    expect(result.passed).toBe(true);
    expect(result.weightedScore).toBe(1.0);
  });
  it("computes weighted score correctly", () => {
    const criteria = RUBRIC.map(r => ({ id: r.id, score: r.id === "color_tokens" ? 0.0 : 1.0, passed: r.id !== "color_tokens", violations: [] }));
    const result = assembleEvaluation(criteria, 0.8);
    expect(result.weightedScore).toBeLessThan(1.0);
    expect(result.weightedScore).toBeGreaterThan(0.8);
  });
});
