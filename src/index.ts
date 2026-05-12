#!/usr/bin/env node
import { writeFileSync, mkdirSync } from "fs";
import { dirname, join, resolve } from "path";
import { runHarness } from "./harness.js";
import type { UIRequest, HarnessConfig } from "./types.js";
import { UIRequestSchema } from "./types.js";

function usage(): void {
  console.log(`
Usage: pge-ui [options]

Options:
  --description <text>    UI request description (required)
  --context <text>        Additional context about the project
  --target <path>         Target file path for the generated component
  --model <id>            Claude model ID (default: claude-sonnet-4-6)
  --max-attempts <n>      Max generation attempts (default: 3)
  --threshold <n>         Pass score threshold 0–1 (default: 0.80)
  --output-dir <path>     Directory to write generated files (default: ./generated)
  --help                  Show this help message

Environment variables:
  ANTHROPIC_API_KEY       Required — your Anthropic API key
  HARNESS_MODEL           Model override
  HARNESS_MAX_ATTEMPTS    Max attempts override
  HARNESS_PASS_THRESHOLD  Pass threshold override

Example:
  pge-ui --description "A login form with email and password fields" \\
         --context "Uses our design system from @company/design-system" \\
         --output-dir ./src/components
`);
}

function parseArgs(): { request: UIRequest; config: Partial<HarnessConfig>; outputDir: string } {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) { usage(); process.exit(0); }

  const get = (flag: string): string | undefined => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : undefined;
  };

  const description = get("--description");
  if (!description) { console.error("Error: --description is required\n"); usage(); process.exit(1); }

  const request = UIRequestSchema.parse({ description, context: get("--context"), targetFile: get("--target") });
  const config: Partial<HarnessConfig> = {};
  const model = get("--model"); if (model) config.model = model;
  const maxAttempts = get("--max-attempts"); if (maxAttempts) config.maxAttempts = parseInt(maxAttempts);
  const threshold = get("--threshold"); if (threshold) config.passThreshold = parseFloat(threshold);
  const outputDir = get("--output-dir") ?? "./generated";
  return { request, config, outputDir };
}

async function main(): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) { console.error("Error: ANTHROPIC_API_KEY environment variable is required"); process.exit(1); }

  const { request, config, outputDir } = parseArgs();

  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  PGE UI Generator — Design System Compliance Harness     ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");
  console.log(`Request: ${request.description}\n`);

  const result = await runHarness(request, config);

  console.log("\n─────────────────────────────────────────────────────────");
  console.log(`Result:  ${result.success ? "✓ PASSED" : "✗ FAILED (best effort)"}`);
  console.log(`Score:   ${(result.finalEvaluation.weightedScore * 100).toFixed(1)}%`);
  console.log(`Attempts:${result.attempts}`);
  console.log("─────────────────────────────────────────────────────────\n");

  const resolvedOutputDir = resolve(outputDir);
  let writtenCount = 0;
  for (const file of result.finalCode.files) {
    const filePath = join(resolvedOutputDir, file.path);
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, file.content, "utf-8");
    console.log(`  wrote: ${filePath}`);
    writtenCount++;
  }
  console.log(`\n${writtenCount} file(s) written to ${resolvedOutputDir}`);

  const reportPath = join(resolvedOutputDir, "_evaluation-report.md");
  writeFileSync(reportPath, buildReport(result), "utf-8");
  console.log(`Evaluation report: ${reportPath}`);
  process.exit(result.success ? 0 : 1);
}

function buildReport(result: Awaited<ReturnType<typeof runHarness>>): string {
  const { finalEvaluation: ev } = result;
  const lines: string[] = [
    "# Design System Evaluation Report", "",
    `**Overall Score:** ${(ev.weightedScore * 100).toFixed(1)}%  `,
    `**Result:** ${ev.passed ? "✓ PASSED" : "✗ FAILED"}  `,
    `**Attempts:** ${result.attempts}  `,
    `**Hard Gates:** ${ev.hardGatesPassed ? "✓ All passed" : "✗ Failed"}`,
    "", "## Criterion Scores", "",
    "| Criterion | Score | Violations |",
    "|-----------|-------|------------|`,
    ...ev.criteria.map(c => `| ${c.id} | ${(c.score * 100).toFixed(0)}% | ${c.violations.length} |`),
    "",
  ];
  if (ev.feedback) { lines.push("## Violations Detail", "", ev.feedback); }
  return lines.join("\n");
}

main().catch(err => { console.error("Fatal error:", err); process.exit(1); });
