import { z } from "zod";

// ── Request ──────────────────────────────────────────────────────────────────

export const UIRequestSchema = z.object({
  description: z.string().min(1),
  context: z.string().optional(),
  targetFile: z.string().optional(),
  existingCode: z.string().optional(),
});
export type UIRequest = z.infer<typeof UIRequestSchema>;

// ── Plan ─────────────────────────────────────────────────────────────────────

export const ComponentNodeSchema: z.ZodType<ComponentNode> = z.lazy(() =>
  z.object({
    name: z.string(),
    dsComponent: z.string().optional(),
    props: z.record(z.string()).optional(),
    children: z.array(ComponentNodeSchema).optional(),
    notes: z.string().optional(),
  })
);

export interface ComponentNode {
  name: string;
  dsComponent?: string;
  props?: Record<string, string>;
  children?: ComponentNode[];
  notes?: string;
}

export const PlanSchema = z.object({
  summary: z.string(),
  componentTree: ComponentNodeSchema,
  requiredDSComponents: z.array(z.string()),
  layoutApproach: z.string(),
  stateRequirements: z.array(
    z.object({ name: z.string(), type: z.string(), purpose: z.string() })
  ),
  accessibilityNotes: z.array(z.string()),
  files: z.array(
    z.object({ path: z.string(), purpose: z.string() })
  ),
});
export type Plan = z.infer<typeof PlanSchema>;

// ── Generated Code ────────────────────────────────────────────────────────────

export interface GeneratedFile {
  path: string;
  content: string;
  language: "tsx" | "ts" | "css" | "scss";
}

export interface GeneratedCode {
  files: GeneratedFile[];
  entryPoint: string;
}

// ── Evaluation ────────────────────────────────────────────────────────────────

export type ScoringType = "metric" | "binary";

export interface RubricCriterion {
  id: string;
  weight: number;
  threshold: number;
  scoring: { type: ScoringType };
}

export interface CriterionResult {
  id: string;
  score: number;
  passed: boolean;
  violations: Violation[];
  details?: string;
}

export interface Violation {
  file: string;
  line?: number;
  column?: number;
  message: string;
  value?: string;
  suggestion?: string;
}

export interface EvaluationResult {
  weightedScore: number;
  passed: boolean;
  hardGatesPassed: boolean;
  criteria: CriterionResult[];
  feedback: string;
}

// ── Harness ───────────────────────────────────────────────────────────────────

export interface GenerationFeedback {
  evaluation: EvaluationResult;
  previousCode: GeneratedCode;
  attempt: number;
}

export interface HarnessResult {
  success: boolean;
  attempts: number;
  finalCode: GeneratedCode;
  finalEvaluation: EvaluationResult;
}

export interface HarnessConfig {
  maxAttempts: number;
  passThreshold: number;
  model: string;
}
