import Anthropic from "@anthropic-ai/sdk";
import type {
  UIRequest,
  HarnessConfig,
  HarnessResult,
  GenerationFeedback,
  EvaluationResult,
} from "./types.js";
import { runPlanner } from "./agents/planner.js";
import { runGenerator } from "./agents/generator.js";
import { evaluate } from "./evaluator/index.js";

const DEFAULT_CONFIG: HarnessConfig = {
  maxAttempts: parseInt(process.env.HARNESS_MAX_ATTEMPTS ?? "3"),
  passThreshold: parseFloat(process.env.HARNESS_PASS_THRESHOLD ?? "0.80"),
  model: process.env.HARNESS_MODEL ?? "claude-sonnet-4-6",
};

export async function runHarness(
  request: UIRequest,
  config: Partial<HarnessConfig> = {},
  logger: (msg: string) => void = console.log
): Promise<HarnessResult> {
  const cfg: HarnessConfig = { ...DEFAULT_CONFIG, ...config };

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // ── Step 1: Plan ────────────────────────────────────────────────────────────
  logger("[harness] Running Planner...");
  const plan = await runPlanner(client, cfg.model, request);
  logger(`[harness] Plan ready: ${plan.summary}`);
  logger(`[harness] Required DS components: ${plan.requiredDSComponents.join(", ")}`);

  // ── Step 2: Generate → Evaluate loop ────────────────────────────────────────
  let attempt = 0;
  let feedback: GenerationFeedback | undefined;
  let lastEvaluation: EvaluationResult | undefined;

  while (attempt < cfg.maxAttempts) {
    attempt++;
    logger(`\n[harness] Generation attempt ${attempt}/${cfg.maxAttempts}...`);

    const generated = await runGenerator(client, cfg.model, plan, feedback);
    logger(`[harness] Generated ${generated.files.length} file(s).`);

    logger("[harness] Evaluating against design system rubric...");
    const evaluation = await evaluate(generated, cfg.passThreshold);
    lastEvaluation = evaluation;

    logEvaluationSummary(evaluation, logger);

    if (evaluation.passed) {
      logger(`\n[harness] ✓ Passed on attempt ${attempt} — score: ${(evaluation.weightedScore * 100).toFixed(1)}%`);
      return {
        success: true,
        attempts: attempt,
        finalCode: generated,
        finalEvaluation: evaluation,
      };
    }

    if (attempt < cfg.maxAttempts) {
      logger(`[harness] Score ${(evaluation.weightedScore * 100).toFixed(1)}% below threshold ${(cfg.passThreshold * 100).toFixed(0)}% — retrying with feedback...`);
      feedback = {
        evaluation,
        previousCode: generated,
        attempt,
      };
    }
  }

  logger(`\n[harness] ✗ Failed after ${attempt} attempt(s) — returning best result.`);
  return {
    success: false,
    attempts: attempt,
    finalCode: feedback!.previousCode,
    finalEvaluation: lastEvaluation!,
  };
}

function logEvaluationSummary(
  evaluation: EvaluationResult,
  logger: (msg: string) => void
): void {
  const score = (evaluation.weightedScore * 100).toFixed(1);
  const status = evaluation.passed ? "PASS" : "FAIL";

  logger(`[evaluator] Score: ${score}% [${status}]`);

  if (!evaluation.hardGatesPassed) {
    logger("[evaluator] ⛔ Hard gate(s) failed");
  }

  const failing = evaluation.criteria
    .filter(c => c.score < 1.0)
    .sort((a, b) => a.score - b.score);

  for (const c of failing) {
    const pct = (c.score * 100).toFixed(0);
    const violations = c.violations.length;
    logger(`[evaluator]   ${c.id}: ${pct}% (${violations} violation${violations === 1 ? "" : "s"})`);
  }
}
