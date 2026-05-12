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
    checkThemeProviderScope(files),
    checkFocusManagement(files),
    checkColorTokens(files),
    checkSpacingTokens(files),
    checkTypographyTokens(files),
    checkShadowTokens(files),
    checkNativeOverrideRate(files),
    checkPropCorrectness(files),
    checkLayoutPrimitives(files),
    checkAxeViolations(files),
    checkContrastRatio(files),
    checkMotionTokens(files),
    checkReducedMotionGuard(files),
  ];

  return assembleEvaluation(criteria, passThreshold);
}
