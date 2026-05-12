import type { GeneratedCode, EvaluationResult, CriterionResult } from "../types.js";
import { assembleEvaluation } from "./rubric.js";
import { checkColorTokens, checkSpacingTokens, checkTypographyTokens, checkShadowTokens } from "./token-compliance.js";
import { checkNativeOverrideRate, checkPropCorrectness, checkLayoutPrimitives, checkThemeProviderScope } from "./component-usage.js";
import { checkFocusManagement, checkAxeViolations, checkContrastRatio } from "./accessibility.js";
import { checkMotionTokens, checkReducedMotionGuard } from "./motion.js";

export async function evaluate(
  code: GeneratedCode,
  passThreshold: number
): Promise<EvaluationResult> {
  const { files } = code;

  const criteria: CriterionResult[] = [
    // Hard gates
    checkThemeProviderScope(files),
    checkFocusManagement(files),

    // Token compliance
    checkColorTokens(files),
    checkSpacingTokens(files),
    checkTypographyTokens(files),
    checkShadowTokens(files),

    // Component usage
    checkNativeOverrideRate(files),
    checkPropCorrectness(files),
    checkLayoutPrimitives(files),

    // Accessibility
    checkAxeViolations(files),
    checkContrastRatio(files),

    // Motion
    checkMotionTokens(files),
    checkReducedMotionGuard(files),
  ];

  return assembleEvaluation(criteria, passThreshold);
}
