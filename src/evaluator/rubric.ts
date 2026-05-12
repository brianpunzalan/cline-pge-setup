import type { RubricCriterion, EvaluationResult, CriterionResult } from "../types.js";

export const RUBRIC: RubricCriterion[] = [
  // ── Hard gates (weight 0, must score 1.0) ──────────────────────────────────
  { id: "theme_provider_scope", weight: 0.00, threshold: 1.0, scoring: { type: "binary" } },
  { id: "focus_management",     weight: 0.00, threshold: 1.0, scoring: { type: "binary" } },

  // ── Token compliance (0.40 total) ──────────────────────────────────────────
  { id: "color_tokens",      weight: 0.15, threshold: 0.7, scoring: { type: "metric" } },
  { id: "spacing_tokens",    weight: 0.12, threshold: 0.7, scoring: { type: "metric" } },
  { id: "typography_tokens", weight: 0.08, threshold: 0.7, scoring: { type: "metric" } },
  { id: "shadow_tokens",     weight: 0.05, threshold: 0.0, scoring: { type: "metric" } },

  // ── Component usage (0.35 total) ─────────────────────────────────────────
  { id: "native_override_rate", weight: 0.15, threshold: 0.8, scoring: { type: "metric" } },
  { id: "prop_correctness",     weight: 0.12, threshold: 0.8, scoring: { type: "metric" } },
  { id: "layout_primitives",    weight: 0.08, threshold: 0.0, scoring: { type: "metric" } },

  // ── Accessibility (0.20 total) ──────────────────────────────────────────
  { id: "axe_violations", weight: 0.12, threshold: 0.7, scoring: { type: "metric" } },
  { id: "contrast_ratio", weight: 0.08, threshold: 0.9, scoring: { type: "metric" } },

  // ── Motion (0.05 total) ───────────────────────────────────────────────────
  { id: "motion_tokens",        weight: 0.03, threshold: 0.0, scoring: { type: "metric" } },
  { id: "reduced_motion_guard", weight: 0.02, threshold: 0.0, scoring: { type: "metric" } },
];

export function assembleEvaluation(
  criteria: CriterionResult[],
  passThreshold: number
): EvaluationResult {
  const resultById = new Map(criteria.map(c => [c.id, c]));

  const hardGates = RUBRIC.filter(r => r.threshold === 1.0 && r.weight === 0);
  const hardGatesPassed = hardGates.every(gate => {
    const result = resultById.get(gate.id);
    return result ? result.score >= 1.0 : true;
  });

  const weightedCriteria = RUBRIC.filter(r => r.weight > 0);
  const totalWeight = weightedCriteria.reduce((sum, r) => sum + r.weight, 0);

  const weightedScore = weightedCriteria.reduce((sum, r) => {
    const result = resultById.get(r.id);
    const score = result?.score ?? 1.0;
    return sum + score * r.weight;
  }, 0) / totalWeight;

  const thresholdFailures = RUBRIC.filter(r => r.threshold > 0 && r.weight > 0)
    .filter(r => {
      const result = resultById.get(r.id);
      return result ? result.score < r.threshold : false;
    });

  const passed = hardGatesPassed &&
    weightedScore >= passThreshold &&
    thresholdFailures.length === 0;

  const feedback = buildFeedback(criteria, hardGatesPassed, thresholdFailures.map(r => r.id));

  return {
    weightedScore: Math.round(weightedScore * 1000) / 1000,
    passed,
    hardGatesPassed,
    criteria,
    feedback,
  };
}

function buildFeedback(
  criteria: CriterionResult[],
  hardGatesPassed: boolean,
  thresholdFailureIds: string[]
): string {
  const lines: string[] = [];

  if (!hardGatesPassed) {
    const failed = criteria.filter(c =>
      ["theme_provider_scope", "focus_management"].includes(c.id) && c.score < 1.0
    );
    lines.push("## Hard Gate Failures (must fix)");
    for (const c of failed) {
      lines.push(`\n### ${c.id}`);
      for (const v of c.violations) {
        lines.push(`- ${v.file}${v.line ? `:${v.line}` : ""}: ${v.message}`);
        if (v.suggestion) lines.push(`  Fix: ${v.suggestion}`);
      }
    }
  }

  const failing = criteria.filter(c =>
    c.score < 1.0 && !["theme_provider_scope", "focus_management"].includes(c.id)
  ).sort((a, b) => a.score - b.score);

  if (failing.length > 0) {
    lines.push("\n## Design System Violations");
    for (const c of failing) {
      const isThresholdFail = thresholdFailureIds.includes(c.id);
      lines.push(`\n### ${c.id} — score: ${(c.score * 100).toFixed(0)}%${isThresholdFail ? " ⚠️ below threshold" : ""}`);
      if (c.details) lines.push(c.details);
      for (const v of c.violations.slice(0, 5)) {
        lines.push(`- ${v.file}${v.line ? `:${v.line}` : ""}: ${v.message}`);
        if (v.suggestion) lines.push(`  → ${v.suggestion}`);
      }
      if (c.violations.length > 5) {
        lines.push(`  ... and ${c.violations.length - 5} more violations`);
      }
    }
  }

  return lines.join("\n");
}
